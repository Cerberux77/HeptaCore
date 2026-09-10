import {
  buildMultiformatDryRun,
  inferMimeType,
  type DraftFormatAsset,
  type PublishingFormat,
} from "../../../lib/publishing-formats";

export type Pub06PublishingFormat = PublishingFormat | "INSTAGRAM_REEL" | "FACEBOOK_STORY" | "FACEBOOK_REEL";

const NEW_FORMATS = new Set<Pub06PublishingFormat>(["INSTAGRAM_REEL", "FACEBOOK_STORY", "FACEBOOK_REEL"]);

export function normalizePub06PublishingFormat(network: string, value?: string | null): Pub06PublishingFormat {
  const raw = String(value ?? "").trim().toUpperCase();
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

export function buildPub06DryRun(format: Pub06PublishingFormat, assets: DraftFormatAsset[]) {
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
