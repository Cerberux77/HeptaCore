interface PublishInstagramMediaInput {
  igUserId: string;
  accessToken: string;
  mediaUrl: string;
  caption: string;
  mediaType?: "IMAGE" | "VIDEO" | "CAROUSEL";
}

interface PublishInstagramMediaOutput {
  externalPostId: string;
  providerResponse: unknown;
}

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

export async function publishInstagramMedia(
  input: PublishInstagramMediaInput
): Promise<PublishInstagramMediaOutput> {
  const { igUserId, accessToken, mediaUrl, caption, mediaType } = input;
  const apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || "v25.0";
  const baseUrl = `https://graph.instagram.com/${apiVersion}`;

  // Identity check via /me — resolves the authenticated user, not a stored ID
  const meRes = await fetch(`${baseUrl}/me?fields=id,username,account_type,media_count&access_token=${encodeURIComponent(accessToken)}`);

  const meJson = await meRes.json();

  if (!meRes.ok || !meJson.id) {
    throw new Error(`Instagram identity check failed: ${formatMetaError(meJson, meRes.status)}`);
  }

  const authenticatedUserId = meJson.id as string;
  const username = meJson.username as string | undefined;
  const accountType = meJson.account_type as string | undefined;
  const mediaCount = meJson.media_count as number | undefined;
  const storedIdMismatch = igUserId !== authenticatedUserId;

  const isVideo = mediaType === "VIDEO";

  // Create media container via /me/media
  const createParams = new URLSearchParams();
  createParams.append("caption", caption);
  createParams.append("access_token", accessToken);

  if (isVideo) {
    createParams.append("video_url", mediaUrl);
    createParams.append("media_type", "REELS");
  } else {
    createParams.append("image_url", mediaUrl);
  }

  const createRes = await fetch(`${baseUrl}/me/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: createParams.toString(),
  });

  const createJson = await createRes.json();

  if (!createRes.ok || !createJson.id) {
    throw new Error(`Instagram media creation failed: ${formatMetaError(createJson, createRes.status)}`);
  }

  const containerId = createJson.id as string;

  // Publish via /me/media_publish
  const publishParams = new URLSearchParams();
  publishParams.append("creation_id", containerId);
  publishParams.append("access_token", accessToken);

  const publishRes = await fetch(`${baseUrl}/me/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishParams.toString(),
  });

  const publishJson = await publishRes.json();

  if (!publishRes.ok || !publishJson.id) {
    throw new Error(`Instagram media publish failed: ${formatMetaError(publishJson, publishRes.status)}`);
  }

  return {
    externalPostId: publishJson.id as string,
    providerResponse: {
      authenticatedUserId,
      username,
      accountType,
      mediaCount,
      storedIdMismatch,
      containerId,
      status: publishRes.status,
    },
  };
}
