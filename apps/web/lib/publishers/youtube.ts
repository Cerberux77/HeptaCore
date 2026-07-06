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
 * Self-contained within the authorized publishers zone. It implements two
 * differentiated formats:
 *   - YOUTUBE_VIDEO  : landscape 16:9 long-form video
 *   - YOUTUBE_SHORTS : vertical 9:16 short (<= 180s, tagged #Shorts)
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

export type YouTubeFormat = "YOUTUBE_VIDEO" | "YOUTUBE_SHORTS";

export type YouTubeValidationMessage = {
  code: string;
  message: string;
  assetId?: string;
};

export type YouTubeDryRunAsset = {
  id: string;
  url: string | null;
  filename?: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  durationSeconds?: number | null;
};

export type YouTubeFormatValidation = {
  valid: boolean;
  errors: YouTubeValidationMessage[];
  warnings: YouTubeValidationMessage[];
};

export type YouTubePreviewData = {
  platform: "YOUTUBE";
  format: YouTubeFormat;
  label: string;
  aspectRatio: string;
  assets: YouTubeDryRunAsset[];
};

export type YouTubeDryRunResult = YouTubeFormatValidation & {
  format: YouTubeFormat;
  assets: YouTubeDryRunAsset[];
  previewData: YouTubePreviewData;
};

type YouTubeFormatRule = {
  format: YouTubeFormat;
  label: string;
  aspectRatio: string;
  aspectRatioValue: number;
  aspectTolerance: number;
  minWidth: number;
  minHeight: number;
  maxDurationSeconds: number;
  maxSizeBytes: number;
  acceptedMimeTypes: string[];
};

const VIDEO_MIMES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_YOUTUBE_SIZE_BYTES = 256 * 1024 * 1024 * 1024; // 256GB API ceiling

export const YOUTUBE_FORMAT_RULES: Record<YouTubeFormat, YouTubeFormatRule> = {
  YOUTUBE_VIDEO: {
    format: "YOUTUBE_VIDEO",
    label: "YouTube Video 16:9",
    aspectRatio: "16 / 9",
    aspectRatioValue: 16 / 9,
    aspectTolerance: 0.05,
    minWidth: 1280,
    minHeight: 720,
    maxDurationSeconds: 12 * 60 * 60,
    maxSizeBytes: MAX_YOUTUBE_SIZE_BYTES,
    acceptedMimeTypes: VIDEO_MIMES,
  },
  YOUTUBE_SHORTS: {
    format: "YOUTUBE_SHORTS",
    label: "YouTube Shorts",
    aspectRatio: "9 / 16",
    aspectRatioValue: 9 / 16,
    aspectTolerance: 0.05,
    minWidth: 720,
    minHeight: 1280,
    maxDurationSeconds: 180,
    maxSizeBytes: MAX_YOUTUBE_SIZE_BYTES,
    acceptedMimeTypes: VIDEO_MIMES,
  },
};

const EXTENSION_MIMES: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

export function normalizeYouTubeFormat(format?: string | null): YouTubeFormat {
  const raw = String(format ?? "").trim().toUpperCase();
  if (raw === "YOUTUBE_VIDEO" || raw === "YOUTUBE_SHORTS") return raw;
  if (raw.includes("SHORT")) return "YOUTUBE_SHORTS";
  return "YOUTUBE_VIDEO";
}

export function inferYouTubeMime(
  asset: Pick<YouTubeDryRunAsset, "mimeType" | "filename" | "url">
): string | null {
  if (asset.mimeType) return asset.mimeType.toLowerCase();
  const source = asset.filename || asset.url || "";
  const ext = source.split("?")[0]?.split(".").pop()?.toLowerCase();
  return ext ? EXTENSION_MIMES[ext] ?? null : null;
}

export function validateYouTubeAssets(
  format: YouTubeFormat,
  assets: YouTubeDryRunAsset[]
): YouTubeFormatValidation {
  const rule = YOUTUBE_FORMAT_RULES[format];
  const errors: YouTubeValidationMessage[] = [];
  const warnings: YouTubeValidationMessage[] = [];

  if (assets.length < 1) {
    errors.push({ code: "ASSET_COUNT_MIN", message: `${rule.label} requires exactly 1 video asset.` });
  }
  if (assets.length > 1) {
    errors.push({ code: "ASSET_COUNT_MAX", message: `${rule.label} accepts a single video asset.` });
  }

  for (const asset of assets) {
    const mimeType = inferYouTubeMime(asset);
    if (!mimeType || !rule.acceptedMimeTypes.includes(mimeType)) {
      errors.push({
        code: "ASSET_MIME",
        assetId: asset.id,
        message: `${asset.filename ?? asset.id} has unsupported MIME type ${mimeType ?? "unknown"}. YouTube requires ${rule.acceptedMimeTypes.join(", ")}.`,
      });
    }

    if (asset.sizeBytes != null && asset.sizeBytes > rule.maxSizeBytes) {
      errors.push({
        code: "ASSET_SIZE",
        assetId: asset.id,
        message: `${asset.filename ?? asset.id} exceeds the YouTube upload size ceiling.`,
      });
    }

    if (asset.width != null && asset.height != null) {
      if (asset.width < rule.minWidth || asset.height < rule.minHeight) {
        errors.push({
          code: "ASSET_DIMENSIONS",
          assetId: asset.id,
          message: `${asset.filename ?? asset.id} is ${asset.width}x${asset.height}px, below the ${rule.minWidth}x${rule.minHeight}px minimum for ${rule.label}.`,
        });
      }
      const ratio = asset.width / asset.height;
      if (Math.abs(ratio - rule.aspectRatioValue) > rule.aspectTolerance) {
        errors.push({
          code: "ASSET_ASPECT_RATIO",
          assetId: asset.id,
          message: `${asset.filename ?? asset.id} aspect ratio ${ratio.toFixed(2)} does not match ${rule.aspectRatio} required by ${rule.label}.`,
        });
      }
    } else {
      warnings.push({
        code: "ASSET_DIMENSIONS_UNKNOWN",
        assetId: asset.id,
        message: `${asset.filename ?? asset.id} has no stored dimensions metadata; aspect ratio cannot be verified before upload.`,
      });
    }

    if (asset.durationSeconds != null) {
      if (asset.durationSeconds > rule.maxDurationSeconds) {
        errors.push({
          code: "ASSET_DURATION",
          assetId: asset.id,
          message: `${asset.filename ?? asset.id} duration ${asset.durationSeconds}s exceeds ${rule.maxDurationSeconds}s for ${rule.label}.`,
        });
      }
    } else {
      warnings.push({
        code: "ASSET_DURATION_UNKNOWN",
        assetId: asset.id,
        message: `${asset.filename ?? asset.id} has no stored duration metadata.`,
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function buildYouTubePreview(
  format: YouTubeFormat,
  assets: YouTubeDryRunAsset[]
): YouTubePreviewData {
  const rule = YOUTUBE_FORMAT_RULES[format];
  return {
    platform: "YOUTUBE",
    format,
    label: rule.label,
    aspectRatio: rule.aspectRatio,
    assets,
  };
}

export function buildYouTubeDryRun(
  format: YouTubeFormat,
  assets: YouTubeDryRunAsset[]
): YouTubeDryRunResult {
  const validation = validateYouTubeAssets(format, assets);
  return {
    ...validation,
    format,
    assets,
    previewData: buildYouTubePreview(format, assets),
  };
}

const SHORTS_TAG = "#Shorts";

export function withShortsMarker(format: YouTubeFormat, title: string, description: string): { title: string; description: string } {
  if (format !== "YOUTUBE_SHORTS") return { title, description };
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
  const rule = YOUTUBE_FORMAT_RULES[format];

  if (!mediaUrl) {
    throw new ProviderError(`${rule.label} requires a public video asset URL.`, {
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
