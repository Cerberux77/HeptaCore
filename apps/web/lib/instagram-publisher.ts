interface PublishInstagramMediaInput {
  igUserId: string;
  accessToken: string;
  mediaUrl: string;
  caption: string;
  format?: string | null;
  mediaType?: "IMAGE" | "VIDEO" | "CAROUSEL";
}

interface PublishInstagramMediaOutput {
  externalPostId: string;
  providerResponse: unknown;
}

type ContainerStatus = "IN_PROGRESS" | "FINISHED" | "ERROR" | "EXPIRED";

interface ContainerStatusResponse {
  id: string;
  status_code: ContainerStatus;
  status?: string;
}

interface WaitForReadyInput {
  containerId: string;
  accessToken: string;
  apiVersion: string;
  deadlineMs: number;
}

interface WaitForReadyResult {
  ready: boolean;
  statusCode?: ContainerStatus;
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

export async function waitForInstagramContainerReady(
  input: WaitForReadyInput
): Promise<WaitForReadyResult> {
  const { containerId, accessToken, apiVersion, deadlineMs } = input;
  const baseUrl = `https://graph.instagram.com/${apiVersion}`;
  const maxAttempts = 12;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (Date.now() > deadlineMs) {
      throw new Error(
        `INSTAGRAM_CONTAINER_PROCESSING_TIMEOUT: deadline reached for container ${containerId}`
      );
    }

    const delay = Math.min(1000 * Math.pow(1.5, attempt), 8000);

    const res = await fetch(
      `${baseUrl}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`
    );
    const json = (await res.json()) as ContainerStatusResponse;

    if (!res.ok || !json.status_code) {
      throw new Error(
        `Instagram container status check failed: ${formatMetaError(json, res.status)}`
      );
    }

    const status = json.status_code as ContainerStatus;

    if (status === "FINISHED") {
      return { ready: true, statusCode: "FINISHED" };
    }

    if (status === "ERROR") {
      return { ready: false, statusCode: "ERROR" };
    }

    if (status === "EXPIRED") {
      return { ready: false, statusCode: "EXPIRED" };
    }

    await new Promise<void>((resolve) => setTimeout(resolve, delay));
  }

  throw new Error(
    `INSTAGRAM_CONTAINER_PROCESSING_TIMEOUT: container ${containerId} exceeded max attempts`
  );
}

export async function publishInstagramMedia(
  input: PublishInstagramMediaInput
): Promise<PublishInstagramMediaOutput> {
  const { igUserId, accessToken, mediaUrl, caption, format, mediaType } = input;
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
  const publishFormat = String(format ?? "INSTAGRAM_FEED").toUpperCase();

  // Create media container via /me/media
  const createParams = new URLSearchParams();
  createParams.append("caption", caption);
  createParams.append("access_token", accessToken);

  if (isVideo) {
    createParams.append("video_url", mediaUrl);
    if (publishFormat === "INSTAGRAM_REEL") {
      createParams.append("media_type", "REELS");
    } else if (publishFormat === "INSTAGRAM_STORY") {
      createParams.append("media_type", "STORIES");
    } else {
      createParams.append("media_type", "VIDEO");
    }
  } else {
    createParams.append("image_url", mediaUrl);
    if (publishFormat === "INSTAGRAM_STORY") {
      createParams.append("media_type", "STORIES");
    }
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

  // Single global deadline shared by initial readiness, repoll, and retry
  const publishDeadline = Date.now() + 50000;

  // Wait for container readiness before publishing
  const ready = await waitForInstagramContainerReady({
    containerId,
    accessToken,
    apiVersion,
    deadlineMs: publishDeadline,
  });

  if (!ready.ready) {
    throw new Error(
      `Instagram container not publishable: ${ready.statusCode ?? "unknown status"} (container: ${containerId})`
    );
  }

  // Publish via /me/media_publish with 9007 retry guard
  let publishRes: Response;
  let publishJson: Record<string, unknown>;

  const doPublish = async (): Promise<{ res: Response; json: Record<string, unknown> }> => {
    const publishParams = new URLSearchParams();
    publishParams.append("creation_id", containerId);
    publishParams.append("access_token", accessToken);

    const res = await fetch(`${baseUrl}/me/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publishParams.toString(),
    });

    const json = (await res.json()) as Record<string, unknown>;
    return { res, json };
  };

  const firstAttempt = await doPublish();
  publishRes = firstAttempt.res;
  publishJson = firstAttempt.json;

  if (!publishRes.ok) {
    const errCode = (publishJson as Record<string, unknown>)?.error as Record<string, unknown> | undefined;
    const code = errCode?.code as number | undefined;
    const subcode = errCode?.error_subcode as number | undefined;

    if (code === 9007 && subcode === 2207027) {
      const reReady = await waitForInstagramContainerReady({
        containerId,
        accessToken,
        apiVersion,
        deadlineMs: publishDeadline,
      });

      if (!reReady.ready) {
        throw new Error(
          `Instagram container still not ready on retry: ${reReady.statusCode ?? "unknown"} (container: ${containerId})`
        );
      }

      const secondAttempt = await doPublish();
      publishRes = secondAttempt.res;
      publishJson = secondAttempt.json;

      if (!publishRes.ok) {
        throw new Error(
          `Instagram media publish failed on retry: ${formatMetaError(publishJson, publishRes.status)}`
        );
      }
    } else {
      throw new Error(
        `Instagram media publish failed: ${formatMetaError(publishJson, publishRes.status)}`
      );
    }
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
