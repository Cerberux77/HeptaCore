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

export async function publishInstagramMedia(
  input: PublishInstagramMediaInput
): Promise<PublishInstagramMediaOutput> {
  const { igUserId, accessToken, mediaUrl, caption, mediaType } = input;
  const baseUrl = "https://graph.facebook.com/v21.0";

  const isVideo = mediaType === "VIDEO";

  const createParams = new URLSearchParams();
  createParams.append("caption", caption);
  createParams.append("access_token", accessToken);

  if (isVideo) {
    createParams.append("video_url", mediaUrl);
    createParams.append("media_type", "REELS");
  } else {
    createParams.append("image_url", mediaUrl);
  }

  const createRes = await fetch(`${baseUrl}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: createParams.toString(),
  });

  const createJson = await createRes.json();

  if (!createRes.ok || !createJson.id) {
    const msg = createJson.error?.message || createJson.error || "Unknown error creating media container";
    throw new Error(`Instagram media creation failed: ${msg}`);
  }

  const containerId = createJson.id as string;

  const publishParams = new URLSearchParams();
  publishParams.append("creation_id", containerId);
  publishParams.append("access_token", accessToken);

  const publishRes = await fetch(`${baseUrl}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishParams.toString(),
  });

  const publishJson = await publishRes.json();

  if (!publishRes.ok || !publishJson.id) {
    const msg = publishJson.error?.message || publishJson.error || "Unknown error publishing media";
    throw new Error(`Instagram media publish failed: ${msg}`);
  }

  return {
    externalPostId: publishJson.id as string,
    providerResponse: { containerId, publish: publishJson },
  };
}
