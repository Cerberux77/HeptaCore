import {
  PublishInput,
  PublishResult,
  Publisher,
  PublisherCapabilities,
  ProviderError,
} from "./types";

/**
 * YouTube provider (Data API v3).
 *
 * Self-contained within the authorized publishers zone. Two differentiated
 * formats are validated by the unified pipeline in `publishing-formats.ts`:
 *   - YOUTUBE_VIDEO  : landscape 16:9 long-form video
 *   - YOUTUBE_SHORT  : vertical 9:16 short (<= 180s, tagged #Shorts)
 *
 * Real publishing uses the resumable upload protocol:
 *   1. POST .../upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
 *      -> returns an upload session URL in the Location header.
 *   2. PUT the raw video bytes to that URL -> returns the created video resource.
 *   3. (optional) POST .../upload/youtube/v3/thumbnails/set?videoId=... with image bytes.
 *
 * There is NO simulated success: externalPostId is only ever taken from a real
 * provider response containing a video id.
 */

export type YouTubeFormat = "YOUTUBE_VIDEO" | "YOUTUBE_SHORT";

export function normalizeYouTubeFormat(format?: string | null): YouTubeFormat {
  const raw = String(format ?? "").trim().toUpperCase();
  if (raw === "YOUTUBE_VIDEO" || raw === "YOUTUBE_SHORT") return raw;
  if (raw.includes("SHORT")) return "YOUTUBE_SHORT";
  return "YOUTUBE_VIDEO";
}

const SHORTS_TAG = "#Shorts";

export function withShortsMarker(
  format: YouTubeFormat,
  title: string,
  description: string
): { title: string; description: string } {
  if (format !== "YOUTUBE_SHORT") return { title, description };
  const hasMarker = `${title} ${description}`.toLowerCase().includes("#shorts");
  if (hasMarker) return { title, description };
  const nextDescription = description ? `${description}\n\n${SHORTS_TAG}` : SHORTS_TAG;
  return { title, description: nextDescription };
}

const capabilities: PublisherCapabilities = {
  textOnly: false,
  image: false,
  video: true,
  carousel: false,
  story: false,
  reels: true,
  scheduling: false,
};

function parseGoogleError(json: unknown, status: number): { message: string; code?: number; reason?: string } {
  const err = (json as Record<string, unknown>)?.error as Record<string, unknown> | undefined;
  if (!err) return { message: `HTTP ${status}: unknown YouTube error` };
  const parts: string[] = [];
  if (err.message) parts.push(String(err.message));
  const code = typeof err.code === "number" ? err.code : undefined;
  if (code) parts.push(`code=${code}`);
  const errors = err.errors as Array<Record<string, unknown>> | undefined;
  const reason = errors && errors[0]?.reason ? String(errors[0].reason) : undefined;
  if (reason) parts.push(`reason=${reason}`);
  return { message: parts.join(" | ") || `HTTP ${status}: YouTube error`, code, reason };
}

function isAmbiguousStatus(status: number): boolean {
  return status >= 500 && status < 600;
}

async function fetchMediaBytes(mediaUrl: string): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const res = await fetch(mediaUrl);
  if (!res.ok) {
    throw new ProviderError(`Failed to download media asset for YouTube upload: HTTP ${res.status}`, {
      httpStatus: res.status,
      isAmbiguous: false,
    });
  }
  const contentType = res.headers.get("content-type") || "video/mp4";
  const bytes = await res.arrayBuffer();
  return { bytes, contentType };
}

async function setThumbnail(videoId: string, accessToken: string, thumbnailUrl: string): Promise<boolean> {
  try {
    const res = await fetch(thumbnailUrl);
    if (!res.ok) return false;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const bytes = await res.arrayBuffer();
    const uploadRes = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": contentType,
        },
        body: bytes,
      }
    );
    return uploadRes.ok;
  } catch {
    return false;
  }
}

async function publishToYouTube(input: PublishInput): Promise<PublishResult> {
  const { accessToken, mediaUrl } = input;
  const format = normalizeYouTubeFormat(input.format);
  const label = format === "YOUTUBE_SHORT" ? "YouTube Shorts" : "YouTube Video 16:9";

  if (!accessToken) {
    throw new ProviderError("YouTube requires a resolved OAuth access token.", {
      httpStatus: 401,
      isAmbiguous: false,
    });
  }

  if (!mediaUrl) {
    throw new ProviderError(`${label} requires a public video asset URL.`, {
      httpStatus: 400,
      isAmbiguous: false,
    });
  }

  const baseTitle = (input.title || input.caption || "").trim().slice(0, 100);
  if (!baseTitle) {
    throw new ProviderError("YouTube requires a non-empty video title.", {
      httpStatus: 400,
      isAmbiguous: false,
    });
  }
  const baseDescription = (input.description ?? input.caption ?? "").slice(0, 5000);
  const { title, description } = withShortsMarker(format, baseTitle, baseDescription);

  const snippet: Record<string, unknown> = {
    title,
    description,
    categoryId: input.categoryId || "22",
  };
  if (input.tags && input.tags.length > 0) {
    snippet.tags = input.tags.slice(0, 500);
  }

  const status: Record<string, unknown> = {
    privacyStatus: input.privacyStatus || "private",
    selfDeclaredMadeForKids: input.madeForKids ?? false,
  };

  const { bytes, contentType } = await fetchMediaBytes(mediaUrl);

  // Step 1: open a resumable upload session.
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": contentType,
        "X-Upload-Content-Length": String(bytes.byteLength),
      },
      body: JSON.stringify({ snippet, status }),
    }
  );

  if (!initRes.ok) {
    const parsed = await initRes.json().catch(() => null);
    const info = parseGoogleError(parsed, initRes.status);
    throw new ProviderError(`YouTube upload session failed: ${info.message}`, {
      code: info.code,
      httpStatus: initRes.status,
      type: info.reason,
      isAmbiguous: isAmbiguousStatus(initRes.status),
    });
  }

  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) {
    // Provider accepted the init but returned no session URL: outcome ambiguous.
    throw new ProviderError("YouTube did not return a resumable upload URL.", {
      httpStatus: initRes.status,
      isAmbiguous: true,
    });
  }

  // Step 2: upload the bytes.
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType, "Content-Length": String(bytes.byteLength) },
    body: bytes,
  });

  const uploadJson = await uploadRes.json().catch(() => null);

  if (!uploadRes.ok) {
    const info = parseGoogleError(uploadJson, uploadRes.status);
    throw new ProviderError(`YouTube video upload failed: ${info.message}`, {
      code: info.code,
      httpStatus: uploadRes.status,
      type: info.reason,
      isAmbiguous: isAmbiguousStatus(uploadRes.status),
    });
  }

  const videoId = (uploadJson as Record<string, unknown> | null)?.id as string | undefined;
  if (!videoId) {
    // Real HTTP 200 but no id: never fabricate a PUBLISHED id.
    throw new ProviderError("YouTube upload returned no video id; outcome unconfirmed.", {
      httpStatus: uploadRes.status,
      isAmbiguous: true,
    });
  }

  let thumbnailSet = false;
  if (input.thumbnailUrl) {
    thumbnailSet = await setThumbnail(videoId, accessToken, input.thumbnailUrl);
  }

  return {
    externalPostId: videoId,
    providerResponse: {
      videoId,
      format,
      privacyStatus: (uploadJson as Record<string, unknown>)?.status ?? status.privacyStatus,
      thumbnailSet,
      httpStatus: uploadRes.status,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    },
  };
}

export const youtubePublisher: Publisher = {
  network: "YOUTUBE",
  capabilities,
  credentialLabel: "youtube_oauth",
  requiredScopes: ["https://www.googleapis.com/auth/youtube.upload"],
  publish: publishToYouTube,
};
