import {
  ASSET_COMPATIBILITY_CONFIGS,
  assetMediaType,
  evaluateAssetCompatibility,
  type AssetCompatibilityInput,
  type AssetCompatibilityStatus,
  type AssetCompatibilityTarget,
} from "./asset-compatibility";

export const IMAGE_DERIVATIVE_TARGETS = [
  "INSTAGRAM_FEED",
  "INSTAGRAM_CAROUSEL",
  "INSTAGRAM_STORY",
  "FACEBOOK_FEED_IMAGE",
] as const satisfies readonly AssetCompatibilityTarget[];

export type ImageDerivativeTarget = (typeof IMAGE_DERIVATIVE_TARGETS)[number];
export type AssetDerivativeFitMode = "cover" | "contain_blur" | "contain_color";
export type AssetDerivativeSource = "smart" | "manual" | "batch";
export type AssetDerivativeStatus = "READY" | "NEEDS_REVIEW" | "BLOCKED" | "VIDEO_DEFERRED";

export type AssetDerivativeCrop = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

export type AssetDerivativeFrame = {
  width: number;
  height: number;
  aspectRatioLabel: string;
};

export type AssetDerivativeSafeZones = {
  topPercent: number;
  bottomPercent: number;
  sidePercent: number;
};

export type AssetFormatDerivativePlan = {
  derivativeId: string;
  sourceAssetId: string;
  target: ImageDerivativeTarget;
  targetLabel: string;
  version: number;
  status: AssetDerivativeStatus;
  compatibilityStatus: AssetCompatibilityStatus;
  fitMode: AssetDerivativeFitMode;
  source: AssetDerivativeSource;
  sourceImmutable: true;
  sourceFrame: AssetDerivativeFrame | null;
  targetFrame: AssetDerivativeFrame;
  crop: AssetDerivativeCrop | null;
  safeZones: AssetDerivativeSafeZones | null;
  operations: string[];
  warnings: string[];
};

export type AssetDerivativeRecord = {
  id: string;
  sourceAssetId: string;
  derivativeOf: string;
  target: ImageDerivativeTarget;
  version: number;
  fitMode: AssetDerivativeFitMode;
  crop: AssetDerivativeCrop | null;
  targetFrame: AssetDerivativeFrame;
  safeZones: AssetDerivativeSafeZones | null;
  immutableSource: true;
};

const TARGET_FRAMES: Record<ImageDerivativeTarget, AssetDerivativeFrame> = {
  INSTAGRAM_FEED: { width: 1080, height: 1080, aspectRatioLabel: "1:1" },
  INSTAGRAM_CAROUSEL: { width: 1080, height: 1350, aspectRatioLabel: "4:5" },
  INSTAGRAM_STORY: { width: 1080, height: 1920, aspectRatioLabel: "9:16" },
  FACEBOOK_FEED_IMAGE: { width: 1200, height: 628, aspectRatioLabel: "1.91:1" },
};

const SAFE_ZONES: Partial<Record<ImageDerivativeTarget, AssetDerivativeSafeZones>> = {
  INSTAGRAM_STORY: { topPercent: 13, bottomPercent: 16, sidePercent: 5 },
};

function numberFrom(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function metadataObject(asset: AssetCompatibilityInput): Record<string, unknown> {
  return asset.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata) ? asset.metadata : {};
}

function dimension(asset: AssetCompatibilityInput, key: "width" | "height"): number | null {
  const metadata = metadataObject(asset);
  return numberFrom(asset[key] ?? metadata[key]);
}

function sourceFrame(asset: AssetCompatibilityInput): AssetDerivativeFrame | null {
  const width = dimension(asset, "width");
  const height = dimension(asset, "height");
  if (!width || !height) return null;
  return { width, height, aspectRatioLabel: `${width}:${height}` };
}

function focalPoint(asset: AssetCompatibilityInput): { xPercent: number; yPercent: number } {
  const metadata = metadataObject(asset);
  const raw = metadata.focalPoint;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    return {
      xPercent: clampPercent(numberFrom(record.xPercent ?? record.x) ?? 50),
      yPercent: clampPercent(numberFrom(record.yPercent ?? record.y) ?? 50),
    };
  }
  return { xPercent: 50, yPercent: 50 };
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function clampCrop(crop: AssetDerivativeCrop): AssetDerivativeCrop {
  const widthPercent = Math.min(100, Math.max(1, crop.widthPercent));
  const heightPercent = Math.min(100, Math.max(1, crop.heightPercent));
  return {
    xPercent: round(Math.min(100 - widthPercent, Math.max(0, crop.xPercent))),
    yPercent: round(Math.min(100 - heightPercent, Math.max(0, crop.yPercent))),
    widthPercent: round(widthPercent),
    heightPercent: round(heightPercent),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function smartCrop(asset: AssetCompatibilityInput, targetFrame: AssetDerivativeFrame): AssetDerivativeCrop | null {
  const source = sourceFrame(asset);
  if (!source) return null;

  const sourceRatio = source.width / source.height;
  const targetRatio = targetFrame.width / targetFrame.height;
  const focal = focalPoint(asset);

  if (sourceRatio > targetRatio) {
    const widthPercent = (targetRatio / sourceRatio) * 100;
    return clampCrop({
      xPercent: focal.xPercent - widthPercent / 2,
      yPercent: 0,
      widthPercent,
      heightPercent: 100,
    });
  }

  const heightPercent = (sourceRatio / targetRatio) * 100;
  return clampCrop({
    xPercent: 0,
    yPercent: focal.yPercent - heightPercent / 2,
    widthPercent: 100,
    heightPercent,
  });
}

function derivativeId(sourceAssetId: string, target: ImageDerivativeTarget, version: number): string {
  return `${sourceAssetId}__${target.toLowerCase()}__v${version}`;
}

function statusFor(asset: AssetCompatibilityInput, compatibilityStatus: AssetCompatibilityStatus): AssetDerivativeStatus {
  const mediaType = assetMediaType(asset);
  if (mediaType === "video") return "VIDEO_DEFERRED";
  if (mediaType !== "image") return "BLOCKED";
  if (compatibilityStatus === "UNKNOWN" || !sourceFrame(asset)) return "NEEDS_REVIEW";
  return "READY";
}

export function planFormatDerivative(
  sourceAssetId: string,
  asset: AssetCompatibilityInput,
  target: ImageDerivativeTarget,
  options: {
    version?: number;
    source?: AssetDerivativeSource;
    fitMode?: AssetDerivativeFitMode;
    crop?: AssetDerivativeCrop | null;
  } = {},
): AssetFormatDerivativePlan {
  const version = options.version ?? 1;
  const targetFrame = TARGET_FRAMES[target];
  const compatibility = evaluateAssetCompatibility(asset, target);
  const mediaType = assetMediaType(asset);
  const status = statusFor(asset, compatibility.status);
  const crop = mediaType === "image"
    ? options.crop === null
      ? null
      : clampCrop(options.crop ?? smartCrop(asset, targetFrame) ?? { xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100 })
    : null;
  const fitMode = options.fitMode ?? "cover";
  const operations = [
    "read_source_asset",
    status === "VIDEO_DEFERRED" ? "defer_video_derivative_to_followup_sprint" : `fit_${fitMode}`,
    crop ? "apply_crop_window" : "preserve_full_frame",
    SAFE_ZONES[target] ? "overlay_safe_zones" : "no_safe_zone_overlay",
    "write_derivative_record_without_mutating_source",
  ];
  const warnings = [
    ...compatibility.reasons,
    ...(status === "VIDEO_DEFERRED" ? ["Video derivatives require a dedicated transcoding sprint."] : []),
    ...(status === "NEEDS_REVIEW" ? ["Missing metadata requires manual review before export."] : []),
  ];

  return {
    derivativeId: derivativeId(sourceAssetId, target, version),
    sourceAssetId,
    target,
    targetLabel: ASSET_COMPATIBILITY_CONFIGS[target].label,
    version,
    status,
    compatibilityStatus: compatibility.status,
    fitMode,
    source: options.source ?? "smart",
    sourceImmutable: true,
    sourceFrame: sourceFrame(asset),
    targetFrame,
    crop,
    safeZones: SAFE_ZONES[target] ?? null,
    operations,
    warnings,
  };
}

export function planBatchFormatDerivatives(
  sourceAssetId: string,
  asset: AssetCompatibilityInput,
  targets: readonly ImageDerivativeTarget[] = IMAGE_DERIVATIVE_TARGETS,
): AssetFormatDerivativePlan[] {
  return targets.map((target) => planFormatDerivative(sourceAssetId, asset, target, { source: "batch" }));
}

export function applyManualDerivativeCrop(
  plan: AssetFormatDerivativePlan,
  crop: AssetDerivativeCrop,
  version = plan.version + 1,
): AssetFormatDerivativePlan {
  return {
    ...plan,
    derivativeId: derivativeId(plan.sourceAssetId, plan.target, version),
    version,
    source: "manual",
    crop: clampCrop(crop),
    operations: [...plan.operations.filter((operation) => operation !== "apply_crop_window"), "apply_crop_window"],
  };
}

export function toDerivativeRecord(plan: AssetFormatDerivativePlan): AssetDerivativeRecord {
  return {
    id: plan.derivativeId,
    sourceAssetId: plan.sourceAssetId,
    derivativeOf: plan.sourceAssetId,
    target: plan.target,
    version: plan.version,
    fitMode: plan.fitMode,
    crop: plan.crop,
    targetFrame: plan.targetFrame,
    safeZones: plan.safeZones,
    immutableSource: true,
  };
}
