import { PUBLISHING_FORMAT_CONFIGS, type PublishingFormat } from "./publishing-formats";
import type { AssetAspectRatio, AssetOrientation } from "./asset-metadata";

export const ASSET_COMPATIBILITY_TARGETS = [
  "INSTAGRAM_FEED",
  "INSTAGRAM_CAROUSEL",
  "INSTAGRAM_STORY",
  "INSTAGRAM_REEL",
  "FACEBOOK_FEED_IMAGE",
  "FACEBOOK_FEED_VIDEO",
  "FACEBOOK_STORY",
  "FACEBOOK_REEL",
  "YOUTUBE_SHORT",
  "YOUTUBE_VIDEO",
] as const;

export type AssetCompatibilityTarget = (typeof ASSET_COMPATIBILITY_TARGETS)[number];
export type AssetCompatibilityStatus = "IDEAL" | "USABLE" | "INCOMPATIBLE" | "UNKNOWN";
export type AssetCompatibilityFilter = AssetCompatibilityStatus | "ALL" | "ELIGIBLE" | "EVALUATED";
export type AssetMediaType = "image" | "video" | "document";

export type AssetCompatibilityInput = {
  kind?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
  durationSeconds?: number | null;
  orientation?: AssetOrientation | null;
  aspectRatio?: AssetAspectRatio | number | string | null;
  metadata?: Record<string, unknown> | null;
};

type RatioRule = { label: string; ratio: number; tolerance: number };

export type AssetCompatibilityConfig = {
  label: string;
  enabledForPublishing: boolean;
  mediaTypes: AssetMediaType[];
  acceptedMimeTypes: string[];
  blocking: {
    minWidth?: number;
    minHeight?: number;
    maxDurationSeconds?: number;
    supportedAspectRatioRange?: { min: number; max: number };
    aspectRatios?: RatioRule[];
  };
  ideal: {
    aspectRatios: RatioRule[];
    orientation?: AssetOrientation;
    width?: number;
    height?: number;
  };
};

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_MIMES = ["video/mp4", "video/quicktime"];

function formatConfig(format: PublishingFormat, mediaTypes: AssetMediaType[] = ["image", "video"]): AssetCompatibilityConfig {
  const current = PUBLISHING_FORMAT_CONFIGS[format];
  return {
    label: current.label,
    enabledForPublishing: true,
    mediaTypes,
    acceptedMimeTypes: current.assetRule.acceptedMimeTypes,
    blocking: {
      minWidth: current.assetRule.minWidth,
      minHeight: current.assetRule.minHeight,
      maxDurationSeconds: current.assetRule.maxDurationSeconds,
      aspectRatios: current.assetRule.aspectRatios,
    },
    ideal: {
      aspectRatios: current.assetRule.aspectRatios,
      orientation: format === "INSTAGRAM_STORY" ? "portrait" : undefined,
      width: format === "INSTAGRAM_STORY" ? 1080 : 1080,
      height: format === "INSTAGRAM_STORY" ? 1920 : 1080,
    },
  };
}

export const ASSET_COMPATIBILITY_CONFIGS: Record<AssetCompatibilityTarget, AssetCompatibilityConfig> = {
  INSTAGRAM_FEED: formatConfig("INSTAGRAM_FEED"),
  INSTAGRAM_CAROUSEL: formatConfig("INSTAGRAM_CAROUSEL"),
  INSTAGRAM_STORY: formatConfig("INSTAGRAM_STORY"),
  INSTAGRAM_REEL: {
    label: "Instagram Reel",
    enabledForPublishing: false,
    mediaTypes: ["video"],
    acceptedMimeTypes: VIDEO_MIMES,
    blocking: {
      minWidth: 720,
      minHeight: 1280,
      maxDurationSeconds: 90,
      aspectRatios: [{ label: "9:16", ratio: 9 / 16, tolerance: 0.04 }],
    },
    ideal: {
      aspectRatios: [{ label: "9:16", ratio: 9 / 16, tolerance: 0.02 }],
      orientation: "portrait",
      width: 1080,
      height: 1920,
    },
  },
  FACEBOOK_FEED_IMAGE: {
    ...formatConfig("FACEBOOK_FEED", ["image"]),
    label: "Facebook Feed Image",
    acceptedMimeTypes: IMAGE_MIMES,
  },
  FACEBOOK_FEED_VIDEO: {
    ...formatConfig("FACEBOOK_FEED", ["video"]),
    label: "Facebook Feed Video",
    acceptedMimeTypes: VIDEO_MIMES,
  },
  FACEBOOK_STORY: {
    label: "Facebook Story",
    enabledForPublishing: false,
    mediaTypes: ["image", "video"],
    acceptedMimeTypes: [...IMAGE_MIMES, ...VIDEO_MIMES],
    blocking: {
      minWidth: 720,
      minHeight: 1280,
      maxDurationSeconds: 60,
      aspectRatios: [{ label: "9:16", ratio: 9 / 16, tolerance: 0.05 }],
    },
    ideal: {
      aspectRatios: [{ label: "9:16", ratio: 9 / 16, tolerance: 0.02 }],
      orientation: "portrait",
      width: 1080,
      height: 1920,
    },
  },
  FACEBOOK_REEL: {
    label: "Facebook Reel",
    enabledForPublishing: false,
    mediaTypes: ["video"],
    acceptedMimeTypes: VIDEO_MIMES,
    blocking: {
      minWidth: 720,
      minHeight: 1280,
      maxDurationSeconds: 90,
      aspectRatios: [{ label: "9:16", ratio: 9 / 16, tolerance: 0.04 }],
    },
    ideal: {
      aspectRatios: [{ label: "9:16", ratio: 9 / 16, tolerance: 0.02 }],
      orientation: "portrait",
      width: 1080,
      height: 1920,
    },
  },
  YOUTUBE_SHORT: {
    label: "YouTube Short",
    enabledForPublishing: false,
    mediaTypes: ["video"],
    acceptedMimeTypes: ["video/mp4"],
    blocking: {
      minWidth: 720,
      minHeight: 1280,
      maxDurationSeconds: 60,
      aspectRatios: [{ label: "9:16", ratio: 9 / 16, tolerance: 0.04 }],
    },
    ideal: {
      aspectRatios: [{ label: "9:16", ratio: 9 / 16, tolerance: 0.02 }],
      orientation: "portrait",
      width: 1080,
      height: 1920,
    },
  },
  YOUTUBE_VIDEO: {
    label: "YouTube Video",
    enabledForPublishing: false,
    mediaTypes: ["video"],
    acceptedMimeTypes: ["video/mp4"],
    blocking: {
      minWidth: 1280,
      minHeight: 720,
      aspectRatios: [{ label: "16:9", ratio: 16 / 9, tolerance: 0.05 }],
    },
    ideal: {
      aspectRatios: [{ label: "16:9", ratio: 16 / 9, tolerance: 0.02 }],
      orientation: "landscape",
      width: 1920,
      height: 1080,
    },
  },
};

export type AssetCompatibilityResult = {
  status: AssetCompatibilityStatus;
  reasons: string[];
  target: AssetCompatibilityTarget;
};

export function isEligibleAssetCompatibilityStatus(status: AssetCompatibilityStatus): boolean {
  return status === "IDEAL" || status === "USABLE";
}

export function matchesAssetCompatibilityFilter(
  result: AssetCompatibilityResult,
  filter: AssetCompatibilityFilter,
): boolean {
  if (filter === "ALL") return true;
  if (filter === "ELIGIBLE") return isEligibleAssetCompatibilityStatus(result.status);
  if (filter === "EVALUATED") return result.status !== "UNKNOWN";
  return result.status === filter;
}

function numberFrom(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function metadataObject(asset: AssetCompatibilityInput): Record<string, unknown> {
  return asset.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata) ? asset.metadata : {};
}

function assetMime(asset: AssetCompatibilityInput): string | null {
  const metadata = metadataObject(asset);
  const mime = asset.mimeType ?? metadata.mimeType;
  return typeof mime === "string" && mime.trim() ? mime.trim().toLowerCase() : null;
}

export function assetMediaType(asset: AssetCompatibilityInput): AssetMediaType | null {
  const mime = assetMime(asset);
  if (mime?.startsWith("image/")) return "image";
  if (mime?.startsWith("video/")) return "video";
  if (asset.kind === "DOCUMENT" || mime === "application/pdf") return "document";
  if (asset.kind === "IMAGE") return "image";
  if (asset.kind === "VIDEO") return "video";
  return null;
}

function dimensions(asset: AssetCompatibilityInput): { width: number | null; height: number | null } {
  const metadata = metadataObject(asset);
  return {
    width: numberFrom(asset.width ?? metadata.width),
    height: numberFrom(asset.height ?? metadata.height),
  };
}

function duration(asset: AssetCompatibilityInput): number | null {
  const metadata = metadataObject(asset);
  return numberFrom(asset.durationSeconds ?? metadata.durationSeconds);
}

function orientation(asset: AssetCompatibilityInput): AssetOrientation | null {
  const metadata = metadataObject(asset);
  const value = asset.orientation ?? metadata.orientation;
  if (value === "square" || value === "portrait" || value === "landscape") return value;
  const dims = dimensions(asset);
  if (!dims.width || !dims.height) return null;
  if (Math.abs(dims.width / dims.height - 1) <= 0.015) return "square";
  return dims.width > dims.height ? "landscape" : "portrait";
}

function aspectRatio(asset: AssetCompatibilityInput): number | null {
  const metadata = metadataObject(asset);
  const raw = asset.aspectRatio ?? metadata.aspectRatio;
  if (typeof raw === "object" && raw && !Array.isArray(raw)) {
    const fromObject = numberFrom((raw as Record<string, unknown>).value);
    if (fromObject) return fromObject;
  }
  const fromRaw = numberFrom(raw);
  if (fromRaw) return fromRaw;
  const dims = dimensions(asset);
  return dims.width && dims.height ? dims.width / dims.height : null;
}

function matchesRatio(ratio: number, rules: RatioRule[]): boolean {
  return rules.some((rule) => Math.abs(ratio - rule.ratio) <= rule.tolerance);
}

export function compatibilityTargetFromPublishingFormat(format: PublishingFormat): AssetCompatibilityTarget {
  if (format === "FACEBOOK_FEED") return "FACEBOOK_FEED_IMAGE";
  return format;
}

export function evaluateAssetCompatibility(
  asset: AssetCompatibilityInput,
  target: AssetCompatibilityTarget,
): AssetCompatibilityResult {
  const config = ASSET_COMPATIBILITY_CONFIGS[target];
  const reasons: string[] = [];
  const mime = assetMime(asset);
  const mediaType = assetMediaType(asset);

  if (!mime || !mediaType) {
    return { status: "UNKNOWN", reasons: ["No MIME metadata available."], target };
  }
  if (!config.mediaTypes.includes(mediaType) || !config.acceptedMimeTypes.includes(mime)) {
    return { status: "INCOMPATIBLE", reasons: [`${config.label} does not accept ${mime}.`], target };
  }

  const dims = dimensions(asset);
  const ratio = aspectRatio(asset);
  const assetOrientation = orientation(asset);
  if (!dims.width || !dims.height || !ratio || !assetOrientation) {
    return { status: "UNKNOWN", reasons: ["Dimensions or aspect ratio metadata is missing."], target };
  }

  if (config.blocking.minWidth != null && dims.width < config.blocking.minWidth) {
    reasons.push(`Width ${dims.width}px is below ${config.blocking.minWidth}px.`);
  }
  if (config.blocking.minHeight != null && dims.height < config.blocking.minHeight) {
    reasons.push(`Height ${dims.height}px is below ${config.blocking.minHeight}px.`);
  }
  if (config.blocking.supportedAspectRatioRange && (ratio < config.blocking.supportedAspectRatioRange.min || ratio > config.blocking.supportedAspectRatioRange.max)) {
    reasons.push(`Aspect ratio ${ratio.toFixed(2)} is outside the supported range.`);
  }
  if (config.blocking.aspectRatios && !matchesRatio(ratio, config.blocking.aspectRatios)) {
    reasons.push(`Aspect ratio ${ratio.toFixed(2)} does not match ${config.blocking.aspectRatios.map((rule) => rule.label).join(", ")}.`);
  }

  if (mediaType === "video" && config.blocking.maxDurationSeconds != null) {
    const seconds = duration(asset);
    if (seconds == null) return { status: "UNKNOWN", reasons: ["Duration metadata is missing."], target };
    if (seconds > config.blocking.maxDurationSeconds) {
      reasons.push(`Duration ${Math.round(seconds)}s exceeds ${config.blocking.maxDurationSeconds}s.`);
    }
  }

  if (reasons.length > 0) return { status: "INCOMPATIBLE", reasons, target };

  const idealReasons: string[] = [];
  if (config.ideal.orientation && assetOrientation !== config.ideal.orientation) {
    idealReasons.push(`Recommended orientation is ${config.ideal.orientation}.`);
  }
  if (config.ideal.aspectRatios.length > 0 && !matchesRatio(ratio, config.ideal.aspectRatios)) {
    idealReasons.push(`Recommended aspect ratio: ${config.ideal.aspectRatios.map((rule) => rule.label).join(", ")}.`);
  }
  if (config.ideal.width && dims.width < config.ideal.width) {
    idealReasons.push(`Recommended width is ${config.ideal.width}px.`);
  }
  if (config.ideal.height && dims.height < config.ideal.height) {
    idealReasons.push(`Recommended height is ${config.ideal.height}px.`);
  }

  if (idealReasons.length > 0) return { status: "USABLE", reasons: idealReasons, target };
  return { status: "IDEAL", reasons: [`Ideal for ${config.label}.`], target };
}

export function filterAssetsByCompatibility<T extends AssetCompatibilityInput>(
  assets: T[],
  target: AssetCompatibilityTarget | "ALL",
  filter: AssetCompatibilityFilter,
): T[] {
  if (target === "ALL" && filter === "ALL") return assets;
  return assets.filter((asset) => {
    if (target === "ALL") {
      return ASSET_COMPATIBILITY_TARGETS.some((candidate) => matchesAssetCompatibilityFilter(evaluateAssetCompatibility(asset, candidate), filter));
    }
    const result = evaluateAssetCompatibility(asset, target);
    return matchesAssetCompatibilityFilter(result, filter);
  });
}
