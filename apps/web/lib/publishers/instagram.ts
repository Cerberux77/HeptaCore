import { publishInstagramMedia, waitForInstagramContainerReady } from "../instagram-publisher";
import { ProviderError, type PublishInput, type PublishResult, type Publisher, type PublisherCapabilities } from "./types";

const capabilities: PublisherCapabilities = {
  textOnly: false,
  image: true,
  video: true,
  carousel: false,
  story: true,
  reels: true,
  scheduling: false,
};

function metaError(json: unknown, status: number): ProviderError {
  const record = json as Record<string, unknown>;
  const err = record?.error as Record<string, unknown> | undefined;
  const code = err?.code as number | undefined;
  const subcode = err?.error_subcode as number | undefined;
  const message = String(err?.message ?? `Instagram HTTP ${status}`);
  return new ProviderError(message, {
    code,
    subcode,
    type: err?.type as string | undefined,
    fbtrace: (record?.fbtrace_id ?? err?.fbtrace_id) as string | undefined,
    httpStatus: status,
    isAmbiguous: code === 1 || status >= 500,
  });
}

async function publishInstagramStory(input: PublishInput): Promise<PublishResult> {
  if (!input.mediaUrl) throw new Error("Instagram Story requires mediaUrl");
  if (input.mediaType !== "IMAGE" && input.mediaType !== "VIDEO") {
    throw new Error("Instagram Story requires an image or video asset");
  }

  const apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || "v25.0";
  const baseUrl = `https://graph.instagram.com/${apiVersion}`;
  const createParams = new URLSearchParams();
  createParams.append("access_token", input.accessToken);
  createParams.append("media_type", "STORIES");
  if (input.mediaType === "VIDEO") createParams.append("video_url", input.mediaUrl);
  else createParams.append("image_url", input.mediaUrl);

  const createRes = await fetch(`${baseUrl}/me/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: createParams.toString(),
  });
  const createJson = await createRes.json() as Record<string, unknown>;
  if (!createRes.ok || !createJson.id) throw metaError(createJson, createRes.status);

  const containerId = createJson.id as string;
  const deadlineMs = Date.now() + 50_000;
  const ready = await waitForInstagramContainerReady({
    containerId,
    accessToken: input.accessToken,
    apiVersion,
    deadlineMs,
  });
  if (!ready.ready) {
    throw new Error(`Instagram Story container not publishable: ${ready.statusCode ?? "unknown"}`);
  }

  const publishOnce = async () => {
    const params = new URLSearchParams();
    params.append("creation_id", containerId);
    params.append("access_token", input.accessToken);
    const res = await fetch(`${baseUrl}/me/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const json = await res.json() as Record<string, unknown>;
    return { res, json };
  };

  let attempt = await publishOnce();
  if (!attempt.res.ok) {
    const err = attempt.json.error as Record<string, unknown> | undefined;
    if (err?.code === 9007 && err?.error_subcode === 2207027) {
      const retryReady = await waitForInstagramContainerReady({
        containerId,
        accessToken: input.accessToken,
        apiVersion,
        deadlineMs,
      });
      if (!retryReady.ready) throw new Error("Instagram Story container remained unavailable on retry");
      attempt = await publishOnce();
    }
  }
  if (!attempt.res.ok || !attempt.json.id) throw metaError(attempt.json, attempt.res.status);

  return {
    externalPostId: attempt.json.id as string,
    providerResponse: {
      type: input.mediaType === "VIDEO" ? "video_story" : "image_story",
      containerId,
      status: attempt.res.status,
    },
  };
}

async function publishViaInstagram(input: PublishInput): Promise<PublishResult> {
  const format = String(input.format ?? "INSTAGRAM_FEED").toUpperCase();
  if (format === "INSTAGRAM_STORY") return publishInstagramStory(input);

  const result = await publishInstagramMedia({
    igUserId: input.targetId,
    accessToken: input.accessToken,
    mediaUrl: input.mediaUrl!,
    caption: input.caption,
    mediaType: input.mediaType,
  });
  return { externalPostId: result.externalPostId, providerResponse: result.providerResponse };
}

export const instagramPublisher: Publisher = {
  network: "INSTAGRAM",
  capabilities,
  credentialLabel: "instagram_oauth",
  requiredScopes: ["instagram_business_content_publish"],
  supportedFormats: ["INSTAGRAM_FEED", "INSTAGRAM_STORY", "INSTAGRAM_REEL"],
  publish: publishViaInstagram,
};
