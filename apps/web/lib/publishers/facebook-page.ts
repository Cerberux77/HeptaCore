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

const capabilities: PublisherCapabilities = {
  textOnly: true,
  image: true,
  video: true,
  carousel: false,
  story: true,
  reels: true,
  scheduling: false,
};

function providerError(json: unknown, status: number): ProviderError {
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

async function parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

async function publishFacebookStory(
  input: PublishInput,
  baseUrl: string,
  pageId: string,
  accessToken: string,
  mediaUrl: string,
  caption: string,
  mediaType?: "IMAGE" | "VIDEO" | "CAROUSEL",
): Promise<PublishResult> {
  if (mediaType === "VIDEO") {
    const uploadParams = new URLSearchParams();
    uploadParams.append("file_url", mediaUrl);
    uploadParams.append("published", "false");
    uploadParams.append("access_token", accessToken);

    const uploadRes = await fetch(`https://graph-video.facebook.com/${process.env.FACEBOOK_GRAPH_API_VERSION || "v25.0"}/${pageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: uploadParams.toString(),
    });
    const uploadJson = await parseJsonResponse(uploadRes);
    if (!uploadRes.ok || !uploadJson.id) {
      throw providerError(uploadJson, uploadRes.status);
    }

    const videoId = uploadJson.id as string;
    const publishParams = new URLSearchParams();
    publishParams.append("video_id", videoId);
    publishParams.append("access_token", accessToken);

    const publishRes = await fetch(`${baseUrl}/${pageId}/video_stories`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publishParams.toString(),
    });
    const publishJson = await parseJsonResponse(publishRes);
    if (!publishRes.ok || !(publishJson.id || publishJson.post_id || publishJson.story_id)) {
      throw providerError(publishJson, publishRes.status);
    }

    const storyId = (publishJson.id || publishJson.post_id || publishJson.story_id) as string;
    return {
      externalPostId: storyId,
      providerResponse: {
        type: "video_story",
        videoId,
        storyId,
        status: publishRes.status,
      },
    };
  }

  const uploadParams = new URLSearchParams();
  uploadParams.append("url", mediaUrl);
  uploadParams.append("published", "false");
  uploadParams.append("access_token", accessToken);

  const uploadRes = await fetch(`${baseUrl}/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: uploadParams.toString(),
  });
  const uploadJson = await parseJsonResponse(uploadRes);
  if (!uploadRes.ok || !uploadJson.id) {
    throw providerError(uploadJson, uploadRes.status);
  }

  const photoId = uploadJson.id as string;
  const publishParams = new URLSearchParams();
  publishParams.append("photo_id", photoId);
  publishParams.append("access_token", accessToken);

  const publishRes = await fetch(`${baseUrl}/${pageId}/photo_stories`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishParams.toString(),
  });
  const publishJson = await parseJsonResponse(publishRes);
  if (!publishRes.ok || !(publishJson.id || publishJson.post_id || publishJson.story_id)) {
    throw providerError(publishJson, publishRes.status);
  }

  const storyId = (publishJson.id || publishJson.post_id || publishJson.story_id) as string;
  return {
    externalPostId: storyId,
    providerResponse: {
      type: "photo_story",
      photoId,
      storyId,
      status: publishRes.status,
    },
  };
}

async function publishFacebookReel(
  baseUrl: string,
  pageId: string,
  accessToken: string,
  mediaUrl: string,
  caption: string,
): Promise<PublishResult> {
  const params = new URLSearchParams();
  params.append("file_url", mediaUrl);
  params.append("caption", caption);
  params.append("access_token", accessToken);

  const res = await fetch(`${baseUrl}/${pageId}/video_reels`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const json = await parseJsonResponse(res);
  if (!res.ok || !(json.id || json.video_id || json.post_id)) {
    throw providerError(json, res.status);
  }

  const reelId = (json.id || json.video_id || json.post_id) as string;
  return {
    externalPostId: reelId,
    providerResponse: {
      type: "reel",
      reelId,
      status: res.status,
    },
  };
}

async function publishToFacebookPage(input: PublishInput): Promise<PublishResult> {
  const { targetId: pageId, accessToken, mediaUrl, caption, mediaType } = input;
  const apiVersion = process.env.FACEBOOK_GRAPH_API_VERSION || "v25.0";
  const baseUrl = `https://graph.facebook.com/${apiVersion}`;
  const normalizedFormat = String(input.format ?? "").trim().toUpperCase();

  if (normalizedFormat === "FACEBOOK_STORY") {
    if (!mediaUrl) {
      throw new Error("Facebook stories require a media URL.");
    }
    return publishFacebookStory(input, baseUrl, pageId, accessToken, mediaUrl, caption, mediaType);
  }

  if (normalizedFormat === "FACEBOOK_REEL") {
    if (!mediaUrl) {
      throw new Error("Facebook reels require a media URL.");
    }
    if (mediaType !== "VIDEO") {
      throw new Error("Facebook reels require a video asset.");
    }
    return publishFacebookReel(baseUrl, pageId, accessToken, mediaUrl, caption);
  }

  if (!mediaUrl || (!mediaType && caption)) {
    // Text-only post to /feed
    const params = new URLSearchParams();
    params.append("message", caption);
    params.append("access_token", accessToken);

    const res = await fetch(`${baseUrl}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const json = await res.json();

    if (!res.ok || !json.id) {
      throw providerError(json, res.status);
    }

    return { externalPostId: json.id as string, providerResponse: { feed: true, status: res.status } };
  }

  if (mediaType === "VIDEO") {
    // Video post to graph-video
    const params = new URLSearchParams();
    params.append("file_url", mediaUrl);
    params.append("description", caption);
    params.append("access_token", accessToken);

    const res = await fetch(`https://graph-video.facebook.com/${apiVersion}/${pageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const json = await res.json();

    if (!res.ok || !json.id) {
      throw providerError(json, res.status);
    }

    const videoId = json.id as string;
    const postId = json.post_id as string | undefined;
    const externalPostId = postId || videoId;

    return {
      externalPostId,
      providerResponse: {
        type: "video",
        status: res.status,
        postId: postId ?? null,
        videoId,
      },
    };
  }

  // Image post to /photos
  const params = new URLSearchParams();
  params.append("url", mediaUrl);
  params.append("caption", caption);
  params.append("published", "true");
  params.append("access_token", accessToken);

  const res = await fetch(`${baseUrl}/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const json = await res.json();

  if (!res.ok || !json.id) {
    throw providerError(json, res.status);
  }

  const photoId = json.id as string;
  const postId = json.post_id as string | undefined;
  const externalPostId = postId || photoId;

  return {
    externalPostId,
    providerResponse: {
      type: "photo",
      status: res.status,
      postId: postId ?? null,
      photoId,
    },
  };
}

export const facebookPagePublisher: Publisher = {
  network: "FACEBOOK",
  capabilities,
  credentialLabel: "facebook_page_oauth",
  requiredScopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"],
  publish: publishToFacebookPage,
};
