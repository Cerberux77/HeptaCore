import { PublishInput, PublishResult, Publisher, PublisherCapabilities, ProviderError } from "./types";

function formatMetaError(resJson: unknown, status: number): string {
  const err = (resJson as Record<string, unknown>)?.error as Record<string, unknown> | undefined;
  if (!err) return `HTTP ${status}: unknown error`;
  const parts: string[] = [];
  if (err.message) parts.push(String(err.message));
  if (err.type) parts.push(`type=${err.type}`);
  if (err.code) parts.push(`code=${err.code}`);
  if (err.error_subcode) parts.push(`subcode=${err.error_subcode}`);
  const fbtrace = (resJson as Record<string, unknown>)?.fbtrace_id;
  if (fbtrace) parts.push(`trace=${fbtrace}`);
  return parts.join(" | ") || `HTTP ${status}: error without details`;
}

function providerErrorFromJson(json: unknown, status: number): ProviderError {
  const errMeta = (json as Record<string, unknown>)?.error as Record<string, unknown> | undefined;
  const code = errMeta?.code as number | undefined;
  const subcode = errMeta?.error_subcode as number | undefined;
  const isAmbiguous = code === 1 || (status >= 500 && status < 600);
  return new ProviderError(formatMetaError(json, status), {
    code,
    subcode,
    fbtrace: (json as Record<string, unknown>)?.fbtrace_id as string | undefined,
    httpStatus: status,
    isAmbiguous,
  });
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  return await res.json() as T;
}

async function postForm<T>(url: string, params: URLSearchParams): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const json = await parseJsonResponse<T>(res);
  if (!res.ok) {
    throw providerErrorFromJson(json, res.status);
  }
  return json;
}

async function fetchBinary(mediaUrl: string): Promise<Blob> {
  const res = await fetch(mediaUrl);
  if (!res.ok) {
    throw new Error(`Unable to fetch media asset: HTTP ${res.status}`);
  }
  return await res.blob();
}

async function uploadHostedVideo(uploadUrl: string, mediaUrl: string, accessToken: string): Promise<void> {
  const media = await fetchBinary(mediaUrl);
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${accessToken}`,
      "Content-Type": media.type || "application/octet-stream",
    },
    body: media,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Meta hosted upload failed: HTTP ${res.status}${body ? ` | ${body}` : ""}`);
  }
}

async function initializeVideoSession(baseUrl: string, pageId: string, edge: "video_stories" | "video_reels", accessToken: string) {
  const params = new URLSearchParams();
  params.append("upload_phase", "start");
  params.append("access_token", accessToken);
  const json = await postForm<Record<string, unknown>>(`${baseUrl}/${pageId}/${edge}`, params);
  const videoId = json.video_id as string | undefined;
  const uploadUrl = json.upload_url as string | undefined;
  if (!videoId || !uploadUrl) {
    throw new Error(`${edge} initialization did not return video_id/upload_url`);
  }
  return { videoId, uploadUrl };
}

async function publishFacebookFeed(baseUrl: string, pageId: string, input: PublishInput): Promise<PublishResult> {
  const { accessToken, mediaUrl, caption, mediaType } = input;

  if (!mediaUrl || (!mediaType && caption)) {
    const params = new URLSearchParams();
    params.append("message", caption);
    params.append("access_token", accessToken);
    const json = await postForm<Record<string, unknown>>(`${baseUrl}/${pageId}/feed`, params);
    if (!json.id) {
      throw new Error("Facebook feed publish did not return id");
    }
    return { externalPostId: json.id as string, providerResponse: { feed: true } };
  }

  if (mediaType === "VIDEO") {
    const params = new URLSearchParams();
    params.append("file_url", mediaUrl);
    params.append("description", caption);
    params.append("access_token", accessToken);
    const json = await postForm<Record<string, unknown>>(`https://graph-video.facebook.com/${process.env.FACEBOOK_GRAPH_API_VERSION || "v25.0"}/${pageId}/videos`, params);
    if (!json.id) {
      throw new Error("Facebook video publish did not return id");
    }
    return {
      externalPostId: (json.post_id as string | undefined) || (json.id as string),
      providerResponse: {
        type: "video",
        postId: (json.post_id as string | undefined) ?? null,
        videoId: json.id as string,
      },
    };
  }

  const params = new URLSearchParams();
  params.append("url", mediaUrl);
  params.append("caption", caption);
  params.append("published", "true");
  params.append("access_token", accessToken);
  const json = await postForm<Record<string, unknown>>(`${baseUrl}/${pageId}/photos`, params);
  if (!json.id) {
    throw new Error("Facebook photo publish did not return id");
  }
  return {
    externalPostId: (json.post_id as string | undefined) || (json.id as string),
    providerResponse: {
      type: "photo",
      postId: (json.post_id as string | undefined) ?? null,
      photoId: json.id as string,
    },
  };
}

async function publishFacebookStory(baseUrl: string, pageId: string, input: PublishInput): Promise<PublishResult> {
  const { accessToken, mediaUrl, caption, mediaType } = input;
  if (!mediaUrl) {
    throw new Error("Facebook Story requires mediaUrl");
  }

  if (mediaType === "VIDEO") {
    const session = await initializeVideoSession(baseUrl, pageId, "video_stories", accessToken);
    await uploadHostedVideo(session.uploadUrl, mediaUrl, accessToken);
    const publishParams = new URLSearchParams();
    publishParams.append("video_id", session.videoId);
    publishParams.append("upload_phase", "finish");
    publishParams.append("description", caption);
    publishParams.append("access_token", accessToken);
    const json = await postForm<Record<string, unknown>>(`${baseUrl}/${pageId}/video_stories`, publishParams);
    return {
      externalPostId: (json.post_id as string | undefined) || session.videoId,
      providerResponse: {
        type: "video_story",
        storyId: (json.post_id as string | undefined) ?? null,
        videoId: session.videoId,
      },
    };
  }

  const uploadParams = new URLSearchParams();
  uploadParams.append("url", mediaUrl);
  uploadParams.append("published", "false");
  uploadParams.append("access_token", accessToken);
  const uploadJson = await postForm<Record<string, unknown>>(`${baseUrl}/${pageId}/photos`, uploadParams);
  const photoId = uploadJson.id as string | undefined;
  if (!photoId) {
    throw new Error("Facebook Story photo upload did not return id");
  }

  const storyParams = new URLSearchParams();
  storyParams.append("photo_id", photoId);
  storyParams.append("access_token", accessToken);
  const storyJson = await postForm<Record<string, unknown>>(`${baseUrl}/${pageId}/photo_stories`, storyParams);
  return {
    externalPostId: (storyJson.post_id as string | undefined) || photoId,
    providerResponse: {
      type: "photo_story",
      storyId: (storyJson.post_id as string | undefined) ?? null,
      photoId,
    },
  };
}

async function publishFacebookReel(baseUrl: string, pageId: string, input: PublishInput): Promise<PublishResult> {
  const { accessToken, mediaUrl, caption, mediaType } = input;
  if (!mediaUrl || mediaType !== "VIDEO") {
    throw new Error("Facebook Reel requires a video asset");
  }

  const session = await initializeVideoSession(baseUrl, pageId, "video_reels", accessToken);
  await uploadHostedVideo(session.uploadUrl, mediaUrl, accessToken);

  const publishParams = new URLSearchParams();
  publishParams.append("video_id", session.videoId);
  publishParams.append("upload_phase", "finish");
  publishParams.append("video_state", "PUBLISHED");
  publishParams.append("description", caption);
  publishParams.append("access_token", accessToken);
  const json = await postForm<Record<string, unknown>>(`${baseUrl}/${pageId}/video_reels`, publishParams);
  return {
    externalPostId: (json.post_id as string | undefined) || session.videoId,
    providerResponse: {
      type: "reel",
      reelId: (json.post_id as string | undefined) ?? null,
      videoId: session.videoId,
    },
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
  const pageId = input.targetId;
  const apiVersion = process.env.FACEBOOK_GRAPH_API_VERSION || "v25.0";
  const baseUrl = `https://graph.facebook.com/${apiVersion}`;
  const format = String(input.format ?? "FACEBOOK_FEED").toUpperCase();

  if (format === "FACEBOOK_STORY") {
    return publishFacebookStory(baseUrl, pageId, input);
  }

  if (format === "FACEBOOK_REEL") {
    return publishFacebookReel(baseUrl, pageId, input);
  }

  return publishFacebookFeed(baseUrl, pageId, input);
}

export const facebookPagePublisher: Publisher = {
  network: "FACEBOOK",
  capabilities,
  credentialLabel: "facebook_page_oauth",
  requiredScopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"],
  supportedFormats: ["FACEBOOK_FEED", "FACEBOOK_STORY", "FACEBOOK_REEL"],
  publish: publishToFacebookPage,
};
