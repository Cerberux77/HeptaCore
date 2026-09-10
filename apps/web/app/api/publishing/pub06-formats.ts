import {
  buildMultiformatDryRun,
  inferMimeType,
  type DraftFormatAsset,
  type PublishingFormat,
} from "../../../lib/publishing-formats";

export type Pub06PublishingFormat = PublishingFormat | "INSTAGRAM_REEL" | "FACEBOOK_STORY" | "FACEBOOK_REEL" | "YOUTUBE_VIDEO" | "YOUTUBE_SHORT";

const NEW_FORMATS = new Set<Pub06PublishingFormat>(["INSTAGRAM_REEL", "FACEBOOK_STORY", "FACEBOOK_REEL"]);

export function normalizePub06PublishingFormat(network: string, value?: string | null): Pub06PublishingFormat {
  const raw = String(value ?? "").trim().toUpperCase();
  if (network === "YOUTUBE") {
    if (raw.includes("SHORT")) return "YOUTUBE_SHORT";
    return "YOUTUBE_VIDEO";
  }
  if (network === "FACEBOOK") {
    if (raw.includes("REEL")) return "FACEBOOK_REEL";
    if (raw.includes("STORY") || raw.includes("HISTORIA")) return "FACEBOOK_STORY";
    return "FACEBOOK_FEED";
  }
  if (raw.includes("REEL")) return "INSTAGRAM_REEL";
  if (raw.includes("CAROUSEL") || raw.includes("CARRUSEL")) return "INSTAGRAM_CAROUSEL";
  if (raw.includes("STORY") || raw.includes("HISTORIA")) return "INSTAGRAM_STORY";
  return "INSTAGRAM_FEED";
}

type NewRule = {
  platform: "INSTAGRAM" | "FACEBOOK";
  label: string;
  aspectRatio: string;
  safeAreas: { topPercent: number; bottomPercent: number; sidePercent: number };
  acceptedMimeTypes: string[];
  ratio: number;
  tolerance: number;
  minWidth: number;
  minHeight: number;
  minDurationSeconds?: number;
  maxDurationSeconds: number;
  maxSizeBytes?: number;
};

const RULES: Record<"INSTAGRAM_REEL" | "FACEBOOK_STORY" | "FACEBOOK_REEL", NewRule> = {
  INSTAGRAM_REEL: {
    platform: "INSTAGRAM",
    label: "Instagram Reel",
    aspectRatio: "9 / 16",
    safeAreas: { topPercent: 10, bottomPercent: 14, sidePercent: 5 },
    acceptedMimeTypes: ["video/mp4", "video/quicktime"],
    ratio: 9 / 16,
    tolerance: 0.04,
    minWidth: 540,
    minHeight: 960,
    minDurationSeconds: 3,
    maxDurationSeconds: 900,
    maxSizeBytes: 1024 * 1024 * 1024,
  },
  FACEBOOK_STORY: {
    platform: "FACEBOOK",
    label: "Facebook Story",
    aspectRatio: "9 / 16",
    safeAreas: { topPercent: 13, bottomPercent: 16, sidePercent: 5 },
    acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"],
    ratio: 9 / 16,
    tolerance: 0.06,
    minWidth: 540,
    minHeight: 960,
    maxDurationSeconds: 60,
  },
  FACEBOOK_REEL: {
    platform: "FACEBOOK",
    label: "Facebook Reel",
    aspectRatio: "9 / 16",
    safeAreas: { topPercent: 10, bottomPercent: 14, sidePercent: 5 },
    acceptedMimeTypes: ["video/mp4", "video/quicktime"],
    ratio: 9 / 16,
    tolerance: 0.03,
    minWidth: 540,
    minHeight: 960,
    minDurationSeconds: 4,
    maxDurationSeconds: 60,
  },
};


const YOUTUBE_VIDEO_MIMES = ["video/mp4", "video/quicktime", "video/webm"];
const YOUTUBE_THUMBNAIL_MIMES = ["image/jpeg", "image/png", "image/webp"];

type YouTubePublishingFormat = "YOUTUBE_VIDEO" | "YOUTUBE_SHORT";

function youtubeMime(asset: DraftFormatAsset): string | null {
  const inferred = inferMimeType(asset);
  if (inferred) return inferred;
  const source = `${asset.filename ?? ""} ${asset.url ?? ""}`.toLowerCase().split("?")[0];
  return source.endsWith(".webm") ? "video/webm" : null;
}

function buildYouTubeDryRun(format: YouTubePublishingFormat, assets: DraftFormatAsset[]) {
  const label = format === "YOUTUBE_SHORT" ? "YouTube Shorts" : "YouTube Video 16:9";
  const expectedRatio = format === "YOUTUBE_SHORT" ? 9 / 16 : 16 / 9;
  const aspectRatio = format === "YOUTUBE_SHORT" ? "9 / 16" : "16 / 9";
  const minWidth = format === "YOUTUBE_SHORT" ? 720 : 1280;
  const minHeight = format === "YOUTUBE_SHORT" ? 1280 : 720;
  const maxDurationSeconds = format === "YOUTUBE_SHORT" ? 180 : 12 * 60 * 60;
  const videos = assets.filter((asset) => asset.role !== "thumbnail");
  const thumbnails = assets.filter((asset) => asset.role === "thumbnail");
  const errors: Array<{ code: string; message: string; assetId?: string }> = [];
  const warnings: Array<{ code: string; message: string; assetId?: string }> = [];

  if (videos.length !== 1) errors.push({ code: "ASSET_COUNT", message: `${label} requires exactly one video asset.` });
  const video = videos[0];
  if (video) {
    const mime = youtubeMime(video);
    if (!mime || !YOUTUBE_VIDEO_MIMES.includes(mime)) errors.push({ code: "ASSET_MIME", assetId: video.id, message: `${label} requires MP4, MOV or WebM video.` });
    if (video.width != null && video.height != null) {
      if (video.width < minWidth || video.height < minHeight) errors.push({ code: "ASSET_DIMENSIONS", assetId: video.id, message: `${label} requires at least ${minWidth}x${minHeight}.` });
      const ratio = video.width / video.height;
      if (Math.abs(ratio - expectedRatio) > 0.06) errors.push({ code: "ASSET_ASPECT_RATIO", assetId: video.id, message: `${label} requires ${format === "YOUTUBE_SHORT" ? "9:16" : "16:9"}.` });
    } else warnings.push({ code: "ASSET_DIMENSIONS_UNKNOWN", assetId: video.id, message: "Video dimensions are not stored." });
    if (video.durationSeconds == null) warnings.push({ code: "ASSET_DURATION_UNKNOWN", assetId: video.id, message: "Video duration is not stored." });
    else if (video.durationSeconds > maxDurationSeconds) errors.push({ code: "ASSET_DURATION", assetId: video.id, message: `${label} exceeds ${maxDurationSeconds}s.` });
    if (video.sizeBytes != null && video.sizeBytes > 100 * 1024 * 1024) errors.push({ code: "ASSET_SIZE", assetId: video.id, message: `${label} exceeds the current safe 100MB serverless upload limit.` });
    else if (video.sizeBytes == null) warnings.push({ code: "ASSET_SIZE_UNKNOWN", assetId: video.id, message: "Video size is not stored." });
  }

  if (format === "YOUTUBE_VIDEO") {
    if (thumbnails.length !== 1) errors.push({ code: "THUMBNAIL_REQUIRED", message: "YouTube Video 16:9 requires exactly one thumbnail asset with role=thumbnail." });
    const thumbnail = thumbnails[0];
    if (thumbnail) {
      const mime = inferMimeType(thumbnail);
      if (!mime || !YOUTUBE_THUMBNAIL_MIMES.includes(mime)) errors.push({ code: "THUMBNAIL_MIME", assetId: thumbnail.id, message: "YouTube thumbnail must be JPEG, PNG or WebP." });
      if (!thumbnail.url) errors.push({ code: "THUMBNAIL_NOT_PUBLIC", assetId: thumbnail.id, message: "YouTube thumbnail requires a resolvable public URL." });
      if (thumbnail.sizeBytes != null && thumbnail.sizeBytes > 2 * 1024 * 1024) errors.push({ code: "THUMBNAIL_SIZE", assetId: thumbnail.id, message: "YouTube thumbnail exceeds 2MB." });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    format,
    assets,
    previewData: {
      platform: "YOUTUBE" as const,
      format,
      label,
      aspectRatio,
      safeAreas: format === "YOUTUBE_SHORT" ? { topPercent: 10, bottomPercent: 20, sidePercent: 6 } : undefined,
      assets,
    },
  };
}

export function buildPub06DryRun(format: Pub06PublishingFormat, assets: DraftFormatAsset[]) {
  if (format === "YOUTUBE_VIDEO" || format === "YOUTUBE_SHORT") return buildYouTubeDryRun(format, assets);
  if (!NEW_FORMATS.has(format)) return buildMultiformatDryRun(format as PublishingFormat, assets);
  const rule = RULES[format as keyof typeof RULES];
  const errors: Array<{ code: string; message: string; assetId?: string }> = [];
  const warnings: Array<{ code: string; message: string; assetId?: string }> = [];

  if (assets.length !== 1) {
    errors.push({ code: "ASSET_COUNT", message: `${rule.label} requires exactly one asset.` });
  }
  for (const asset of assets) {
    const mimeType = inferMimeType(asset);
    if (!mimeType || !rule.acceptedMimeTypes.includes(mimeType)) {
      errors.push({ code: "ASSET_MIME", assetId: asset.id, message: `${rule.label} does not support ${mimeType ?? "unknown"}.` });
    }
    if (asset.width != null && asset.height != null) {
      if (asset.width < rule.minWidth || asset.height < rule.minHeight) {
        errors.push({ code: "ASSET_DIMENSIONS", assetId: asset.id, message: `${rule.label} requires at least ${rule.minWidth}x${rule.minHeight}.` });
      }
      const ratio = asset.width / asset.height;
      if (Math.abs(ratio - rule.ratio) > rule.tolerance) {
        errors.push({ code: "ASSET_ASPECT_RATIO", assetId: asset.id, message: `${rule.label} requires a 9:16 asset.` });
      }
    } else {
      warnings.push({ code: "ASSET_DIMENSIONS_UNKNOWN", assetId: asset.id, message: "Asset dimensions are not stored." });
    }
    if (rule.maxSizeBytes != null) {
      if (asset.sizeBytes != null && asset.sizeBytes > rule.maxSizeBytes) {
        errors.push({ code: "ASSET_SIZE", assetId: asset.id, message: `${rule.label} exceeds the provider file-size limit.` });
      } else if (asset.sizeBytes == null) {
        warnings.push({ code: "ASSET_SIZE_UNKNOWN", assetId: asset.id, message: "Asset file size is not stored." });
      }
    }
    if ((mimeType ?? "").startsWith("video/")) {
      if (asset.durationSeconds == null) {
        warnings.push({ code: "ASSET_DURATION_UNKNOWN", assetId: asset.id, message: "Video duration is not stored." });
      } else {
        if (rule.minDurationSeconds != null && asset.durationSeconds < rule.minDurationSeconds) {
          errors.push({ code: "ASSET_DURATION_MIN", assetId: asset.id, message: `${rule.label} video is too short.` });
        }
        if (asset.durationSeconds > rule.maxDurationSeconds) {
          errors.push({ code: "ASSET_DURATION_MAX", assetId: asset.id, message: `${rule.label} video exceeds ${rule.maxDurationSeconds}s.` });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    format,
    assets,
    previewData: {
      platform: rule.platform,
      format,
      label: rule.label,
      aspectRatio: rule.aspectRatio,
      safeAreas: rule.safeAreas,
      assets,
    },
  };
}
