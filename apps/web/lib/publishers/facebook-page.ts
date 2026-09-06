import { ProviderError, type PublishInput, type PublishResult, type Publisher, type PublisherCapabilities } from "./types";

function formatMetaError(resJson: unknown, status: number): string {
  const err = (resJson as Record<string, unknown>)?.error as Record<string, unknown> | undefined;
  if (!err) return `HTTP ${status}: unknown error`;
  const parts: string[] = [];
  if (err.message) parts.push(String(err.message));
  if (err.type) parts.push(`type=${err.type}`);
  if (err.code) parts.push(`code=${err.code}`);
  if (err.error_subcode) parts.push(`subcode=${err.error_subcode}`);
  const fbtrace = (resJson as Record<string, unknown>)?.fbtrace_id ?? err.fbtrace_id;
  if (fbtrace) parts.push(`trace=${fbtrace}`);
  return parts.join(" | ") || `HTTP ${status}: error without details`;
}

function providerErrorFromJson(json: unknown, status: number): ProviderError {
  const err = (json as Record<string, unknown>)?.error as Record<string, unknown> | undefined;
  const code = err?.code as number | undefined;
  return new ProviderError(formatMetaError(json, status), {
    code,
    subcode: err?.error_subcode as number | undefined,
    type: err?.type as string | undefined,
    fbtrace: ((json as Record<string, unknown>)?.fbtrace_id ?? err?.fbtrace_id) as string | undefined,
    httpStatus: status,
    isAmbiguous: code === 1 || status >= 500,
  });
}

async function postForm(url: string, params: URLSearchParams): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok) throw providerErrorFromJson(json, res.status);
  return json;
}

async function initializeVideoSession(
  baseUrl: string,
  pageId: string,
  edge: "video_stories" | "video_reels",
  accessToken: string,
): Promise<{ videoId: string; uploadUrl: string }> {
  const params = new URLSearchParams();
  params.append("upload_phase", "start");
  params.append("access_token", accessToken);
  const json = await postForm(`${baseUrl}/${pageId}/${edge}`, params);
  const videoId = json.video_id as string | undefined;
  const uploadUrl = json.upload_url as string | undefined;
  if (!videoId || !uploadUrl) throw new Error(`${edge} initialization did not return video_id/upload_url`);
  return { videoId, uploadUrl };
}

async function uploadHostedVideo(uploadUrl: string, mediaUrl: string, accessToken: string): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${accessToken}`,
      file_url: mediaUrl,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ProviderError(`Meta hosted video upload failed: HTTP ${res.status}${text ? ` | ${text}` : ""}`, {
      httpStatus: res.status,
      isAmbiguous: res.status >= 500,
    });
  }
}

async function publishFacebookFeed(baseUrl: string, pageId: string, input: PublishInput): Promise<PublishResult> {
  const { accessToken, mediaUrl, caption, mediaType } = input;
  if (!mediaUrl || (!mediaType && caption)) {
    const params = new URLSearchParams();
    params.append("message", caption);
    params.append("access_token", accessToken);
    const json = await postForm(`${baseUrl}/${pageId}/feed`, params);
    if (!json.id) throw new Error("Facebook feed publish did not return id");
    return { externalPostId: json.id as string, providerResponse: { feed: true } };
  }

  if (mediaType === "VIDEO") {
    const params = new URLSearchParams();
    params.append("file_url", mediaUrl);
    params.append("description", caption);
    params.append("access_token", accessToken);
    const apiVersion = process.env.FACEBOOK_GRAPH_API_VERSION || "v25.0";
    const json = await postForm(`https://graph-video.facebook.com/${apiVersion}/${pageId}/videos`, params);
    if (!json.id) throw new Error("Facebook video publish did not return id");
    return {
      externalPostId: (json.post_id as string | undefined) || (json.id as string),
      providerResponse: { type: "video", postId: json.post_id ?? null, videoId: json.id },
    };
  }

  const params = new URLSearchParams();
  params.append("url", mediaUrl);
  params.append("caption", caption);
  params.append("published", "true");
  params.append("access_token", accessToken);
  const json = await postForm(`${baseUrl}/${pageId}/photos`, params);
  if (!json.id) throw new Error("Facebook photo publish did not return id");
  return {
    externalPostId: (json.post_id as string | undefined) || (json.id as string),
    providerResponse: { type: "photo", postId: json.post_id ?? null, photoId: json.id },
  };
}

async function publishFacebookStory(baseUrl: string, pageId: string, input: PublishInput): Promise<PublishResult> {
  if (!input.mediaUrl) throw new Error("Facebook Story requires mediaUrl");
  if (input.mediaType === "VIDEO") {
    const session = await initializeVideoSession(baseUrl, pageId, "video_stories", input.accessToken);
    await uploadHostedVideo(session.uploadUrl, input.mediaUrl, input.accessToken);
    const params = new URLSearchParams();
    params.append("video_id", session.videoId);
    params.append("upload_phase", "finish");
    params.append("access_token", input.accessToken);
    const json = await postForm(`${baseUrl}/${pageId}/video_stories`, params);
    return {
      externalPostId: (json.post_id as string | undefined) || session.videoId,
      providerResponse: { type: "video_story", storyId: json.post_id ?? null, videoId: session.videoId },
    };
  }
  if (input.mediaType !== "IMAGE") throw new Error("Facebook Story requires an image or video asset");

  const uploadParams = new URLSearchParams();
  uploadParams.append("url", input.mediaUrl);
  uploadParams.append("published", "false");
  uploadParams.append("access_token", input.accessToken);
  const uploadJson = await postForm(`${baseUrl}/${pageId}/photos`, uploadParams);
  const photoId = uploadJson.id as string | undefined;
  if (!photoId) throw new Error("Facebook Story photo upload did not return id");

  const storyParams = new URLSearchParams();
  storyParams.append("photo_id", photoId);
  storyParams.append("access_token", input.accessToken);
  const storyJson = await postForm(`${baseUrl}/${pageId}/photo_stories`, storyParams);
  return {
    externalPostId: (storyJson.post_id as string | undefined) || photoId,
    providerResponse: { type: "photo_story", storyId: storyJson.post_id ?? null, photoId },
  };
}

async function publishFacebookReel(baseUrl: string, pageId: string, input: PublishInput): Promise<PublishResult> {
  if (!input.mediaUrl || input.mediaType !== "VIDEO") throw new Error("Facebook Reel requires a video asset");
  const session = await initializeVideoSession(baseUrl, pageId, "video_reels", input.accessToken);
  await uploadHostedVideo(session.uploadUrl, input.mediaUrl, input.accessToken);
  const params = new URLSearchParams();
  params.append("video_id", session.videoId);
  params.append("upload_phase", "finish");
  params.append("video_state", "PUBLISHED");
  if (input.caption) params.append("description", input.caption);
  params.append("access_token", input.accessToken);
  const json = await postForm(`${baseUrl}/${pageId}/video_reels`, params);
  return {
    externalPostId: (json.post_id as string | undefined) || session.videoId,
    providerResponse: { type: "reel", reelId: json.post_id ?? null, videoId: session.videoId },
  };
}

const capabilities: PublisherCapabilities = {
  textOnly: true,
  image: true,
  video: true,
  carousel: false,
  story: true,
  reels: true,
  scheduling: false,
};

async function publishToFacebookPage(input: PublishInput): Promise<PublishResult> {
  const apiVersion = process.env.FACEBOOK_GRAPH_API_VERSION || "v25.0";
  const baseUrl = `https://graph.facebook.com/${apiVersion}`;
  const format = String(input.format ?? "FACEBOOK_FEED").toUpperCase();
  if (format === "FACEBOOK_STORY") return publishFacebookStory(baseUrl, input.targetId, input);
  if (format === "FACEBOOK_REEL") return publishFacebookReel(baseUrl, input.targetId, input);
  return publishFacebookFeed(baseUrl, input.targetId, input);
}

export const facebookPagePublisher: Publisher = {
  network: "FACEBOOK",
  capabilities,
  credentialLabel: "facebook_page_oauth",
  requiredScopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"],
  supportedFormats: ["FACEBOOK_FEED", "FACEBOOK_STORY", "FACEBOOK_REEL"],
  publish: publishToFacebookPage,
};
