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
  story: false,
  reels: false,
  scheduling: false,
};

async function publishToFacebookPage(input: PublishInput): Promise<PublishResult> {
  const { targetId: pageId, accessToken, mediaUrl, caption, mediaType } = input;
  const apiVersion = process.env.FACEBOOK_GRAPH_API_VERSION || "v25.0";
  const baseUrl = `https://graph.facebook.com/${apiVersion}`;

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
      const errMeta = (json as Record<string, unknown>)?.error as Record<string, unknown> | undefined;
      const code = errMeta?.code as number | undefined;
      const subcode = errMeta?.error_subcode as number | undefined;
      const isAmbiguous = code === 1 || (res.status >= 500 && res.status < 600);
      const msg = formatMetaError(json, res.status);
      throw new ProviderError(msg, { code, subcode, fbtrace: (json as Record<string, unknown>)?.fbtrace_id as string | undefined, httpStatus: res.status, isAmbiguous });
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
      const errMeta = (json as Record<string, unknown>)?.error as Record<string, unknown> | undefined;
      const code = errMeta?.code as number | undefined;
      const isAmbiguous = code === 1 || (res.status >= 500 && res.status < 600);
      throw new ProviderError(formatMetaError(json, res.status), { code, subcode: errMeta?.error_subcode as number | undefined, fbtrace: (json as Record<string, unknown>)?.fbtrace_id as string | undefined, httpStatus: res.status, isAmbiguous });
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
    const errMeta = (json as Record<string, unknown>)?.error as Record<string, unknown> | undefined;
    const code = errMeta?.code as number | undefined;
    const isAmbiguous = code === 1 || (res.status >= 500 && res.status < 600);
    throw new ProviderError(formatMetaError(json, res.status), { code, subcode: errMeta?.error_subcode as number | undefined, fbtrace: (json as Record<string, unknown>)?.fbtrace_id as string | undefined, httpStatus: res.status, isAmbiguous });
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
