export const MULTIFORMAT_VALUES = [
  "INSTAGRAM_FEED",
  "INSTAGRAM_CAROUSEL",
  "INSTAGRAM_STORY",
  "FACEBOOK_FEED",
] as const;

export type PublishingFormat = (typeof MULTIFORMAT_VALUES)[number];
export type PublishingPlatform = "INSTAGRAM" | "FACEBOOK";

export type DraftFormatAsset = {
  id: string;
  url: string | null;
  filename?: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  durationSeconds?: number | null;
  order: number;
  kind?: string | null;
  role?: string | null;
};

export type ValidationMessage = {
  code: string;
  message: string;
  assetId?: string;
};

export type FormatValidationResult = {
  valid: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
};

export type FormatPreviewData = {
  platform: PublishingPlatform;
  format: PublishingFormat;
  label: string;
  aspectRatio: string;
  safeAreas?: {
    topPercent: number;
    bottomPercent: number;
    sidePercent: number;
  };
  assets: DraftFormatAsset[];
};

export type MultiformatDryRunResult = FormatValidationResult & {
  format: PublishingFormat;
  assets: DraftFormatAsset[];
  previewData: FormatPreviewData;
};

type AssetRule = {
  min: number;
  max: number;
  acceptedMimeTypes: string[];
  aspectRatios: Array<{ label: string; ratio: number; tolerance: number }>;
  minWidth?: number;
  minHeight?: number;
  maxSizeBytes?: number;
  maxDurationSeconds?: number;
};

export type PublishingFormatConfig = {
  format: PublishingFormat;
  platform: PublishingPlatform;
  label: string;
  assetRule: AssetRule;
  preview: {
    aspectRatio: string;
    safeAreas?: FormatPreviewData["safeAreas"];
  };
};

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_MIMES = ["video/mp4", "video/quicktime"];

export const PUBLISHING_FORMAT_CONFIGS: Record<PublishingFormat, PublishingFormatConfig> = {
  INSTAGRAM_FEED: {
    format: "INSTAGRAM_FEED",
    platform: "INSTAGRAM",
    label: "Instagram Feed",
    assetRule: {
      min: 1,
      max: 1,
      acceptedMimeTypes: [...IMAGE_MIMES, ...VIDEO_MIMES],
      aspectRatios: [
        { label: "1:1", ratio: 1, tolerance: 0.04 },
        { label: "4:5", ratio: 4 / 5, tolerance: 0.04 },
        { label: "1.91:1", ratio: 1.91, tolerance: 0.05 },
      ],
      minWidth: 320,
      minHeight: 320,
      maxSizeBytes: 100 * 1024 * 1024,
      maxDurationSeconds: 60,
    },
    preview: { aspectRatio: "1 / 1" },
  },
  INSTAGRAM_CAROUSEL: {
    format: "INSTAGRAM_CAROUSEL",
    platform: "INSTAGRAM",
    label: "Instagram Carousel",
    assetRule: {
      min: 2,
      max: 10,
      acceptedMimeTypes: [...IMAGE_MIMES, ...VIDEO_MIMES],
      aspectRatios: [
        { label: "1:1", ratio: 1, tolerance: 0.04 },
        { label: "4:5", ratio: 4 / 5, tolerance: 0.04 },
        { label: "1.91:1", ratio: 1.91, tolerance: 0.05 },
      ],
      minWidth: 320,
      minHeight: 320,
      maxSizeBytes: 100 * 1024 * 1024,
      maxDurationSeconds: 60,
    },
    preview: { aspectRatio: "4 / 5" },
  },
  INSTAGRAM_STORY: {
    format: "INSTAGRAM_STORY",
    platform: "INSTAGRAM",
    label: "Instagram Story",
    assetRule: {
      min: 1,
      max: 1,
      acceptedMimeTypes: [...IMAGE_MIMES, ...VIDEO_MIMES],
      aspectRatios: [{ label: "9:16", ratio: 9 / 16, tolerance: 0.03 }],
      minWidth: 720,
      minHeight: 1280,
      maxSizeBytes: 100 * 1024 * 1024,
      maxDurationSeconds: 60,
    },
    preview: {
      aspectRatio: "9 / 16",
      safeAreas: { topPercent: 13, bottomPercent: 16, sidePercent: 5 },
    },
  },
  FACEBOOK_FEED: {
    format: "FACEBOOK_FEED",
    platform: "FACEBOOK",
    label: "Facebook Feed",
    assetRule: {
      min: 0,
      max: 10,
      acceptedMimeTypes: [...IMAGE_MIMES, ...VIDEO_MIMES],
      aspectRatios: [
        { label: "1.91:1", ratio: 1.91, tolerance: 0.08 },
        { label: "1:1", ratio: 1, tolerance: 0.08 },
        { label: "4:5", ratio: 4 / 5, tolerance: 0.08 },
        { label: "9:16", ratio: 9 / 16, tolerance: 0.08 },
      ],
      minWidth: 320,
      minHeight: 320,
      maxSizeBytes: 100 * 1024 * 1024,
      maxDurationSeconds: 240,
    },
    preview: { aspectRatio: "1.91 / 1" },
  },
};

const EXTENSION_MIMES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

function numberFrom(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function metadataObject(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};
}

export function inferMimeType(asset: Pick<DraftFormatAsset, "mimeType" | "filename" | "url">): string | null {
  if (asset.mimeType) return asset.mimeType.toLowerCase();
  const source = asset.filename || asset.url || "";
  const ext = source.split("?")[0]?.split(".").pop()?.toLowerCase();
  return ext ? EXTENSION_MIMES[ext] ?? null : null;
}

export function normalizePublishingFormat(network: string, format?: string | null): PublishingFormat {
  const raw = String(format ?? "").trim().toUpperCase();
  if (MULTIFORMAT_VALUES.includes(raw as PublishingFormat)) return raw as PublishingFormat;
  if (network === "FACEBOOK") return "FACEBOOK_FEED";
  if (raw.includes("CAROUSEL") || raw.includes("CARRUSEL")) return "INSTAGRAM_CAROUSEL";
  if (raw.includes("STORY") || raw.includes("HISTORIA")) return "INSTAGRAM_STORY";
  return "INSTAGRAM_FEED";
}

export function formatNetwork(format: PublishingFormat): PublishingPlatform {
  return PUBLISHING_FORMAT_CONFIGS[format].platform;
}

export function roleForAssetOrder(order: number): string {
  return order <= 1 ? "primary" : `asset_${String(order).padStart(3, "0")}`;
}

export function orderFromAssetRole(role?: string | null): number {
  if (!role || role === "primary") return 1;
  if (role === "carousel") return 2;
  const match = /^asset_(\d+)$/.exec(role);
  if (match) return Number(match[1]);
  return 999;
}

export function normalizeAssetManifest<T extends {
  id?: string;
  assetId?: string;
  role?: string | null;
  asset?: {
    id: string;
    filename?: string;
    sourcePath?: string | null;
    storageKey?: string | null;
    mimeType?: string | null;
    kind?: string | null;
    metadata?: unknown;
  };
}>(links: T[], buildUrl?: (asset: T["asset"]) => string | null): DraftFormatAsset[] {
  return [...links]
    .sort((a, b) => {
      const diff = orderFromAssetRole(a.role) - orderFromAssetRole(b.role);
      if (diff !== 0) return diff;
      return String(a.asset?.filename ?? a.assetId ?? "").localeCompare(String(b.asset?.filename ?? b.assetId ?? ""));
    })
    .map((link, index) => {
      const asset = link.asset;
      const metadata = metadataObject(asset?.metadata);
      const url = buildUrl ? buildUrl(asset) : (asset?.storageKey ?? asset?.sourcePath ?? null);
      return {
        id: asset?.id ?? link.assetId ?? link.id ?? "",
        url,
        filename: asset?.filename,
        mimeType: asset?.mimeType ?? null,
        width: numberFrom(metadata.width),
        height: numberFrom(metadata.height),
        sizeBytes: numberFrom(metadata.sizeBytes ?? metadata.size),
        durationSeconds: numberFrom(metadata.durationSeconds ?? metadata.duration),
        order: index + 1,
        kind: asset?.kind ?? null,
        role: link.role ?? null,
      };
    });
}

export function validateFormatAssets(format: PublishingFormat, assets: DraftFormatAsset[]): FormatValidationResult {
  const config = PUBLISHING_FORMAT_CONFIGS[format];
  const errors: ValidationMessage[] = [];
  const warnings: ValidationMessage[] = [];
  const { assetRule } = config;

  if (assets.length < assetRule.min) {
    errors.push({
      code: "ASSET_COUNT_MIN",
      message: `${config.label} requires at least ${assetRule.min} asset${assetRule.min === 1 ? "" : "s"}.`,
    });
  }

  if (assets.length > assetRule.max) {
    errors.push({
      code: "ASSET_COUNT_MAX",
      message: `${config.label} accepts at most ${assetRule.max} assets.`,
    });
  }

  for (const asset of assets) {
    const mimeType = inferMimeType(asset);
    if (!mimeType || !assetRule.acceptedMimeTypes.includes(mimeType)) {
      errors.push({
        code: "ASSET_MIME",
        assetId: asset.id,
        message: `${asset.filename ?? asset.id} has unsupported MIME type ${mimeType ?? "unknown"}.`,
      });
    }

    if (asset.sizeBytes != null && assetRule.maxSizeBytes != null && asset.sizeBytes > assetRule.maxSizeBytes) {
      errors.push({
        code: "ASSET_SIZE",
        assetId: asset.id,
        message: `${asset.filename ?? asset.id} exceeds the ${Math.round(assetRule.maxSizeBytes / 1024 / 1024)}MB limit.`,
      });
    } else if (asset.sizeBytes == null) {
      warnings.push({
        code: "ASSET_SIZE_UNKNOWN",
        assetId: asset.id,
        message: `${asset.filename ?? asset.id} has no stored file size metadata.`,
      });
    }

    if (asset.width != null && asset.height != null) {
      if (assetRule.minWidth != null && asset.width < assetRule.minWidth) {
        errors.push({
          code: "ASSET_WIDTH",
          assetId: asset.id,
          message: `${asset.filename ?? asset.id} width ${asset.width}px is below ${assetRule.minWidth}px.`,
        });
      }
      if (assetRule.minHeight != null && asset.height < assetRule.minHeight) {
        errors.push({
          code: "ASSET_HEIGHT",
          assetId: asset.id,
          message: `${asset.filename ?? asset.id} height ${asset.height}px is below ${assetRule.minHeight}px.`,
        });
      }
      const ratio = asset.width / asset.height;
      const matchesRatio = assetRule.aspectRatios.some((allowed) => Math.abs(ratio - allowed.ratio) <= allowed.tolerance);
      if (!matchesRatio) {
        errors.push({
          code: "ASSET_ASPECT_RATIO",
          assetId: asset.id,
          message: `${asset.filename ?? asset.id} aspect ratio ${ratio.toFixed(2)} does not match ${assetRule.aspectRatios.map((r) => r.label).join(", ")}.`,
        });
      }
    } else {
      warnings.push({
        code: "ASSET_DIMENSIONS_UNKNOWN",
        assetId: asset.id,
        message: `${asset.filename ?? asset.id} has no stored dimensions metadata.`,
      });
    }

    const isVideo = (mimeType ?? "").startsWith("video/");
    if (isVideo && assetRule.maxDurationSeconds != null) {
      if (asset.durationSeconds != null && asset.durationSeconds > assetRule.maxDurationSeconds) {
        errors.push({
          code: "ASSET_DURATION",
          assetId: asset.id,
          message: `${asset.filename ?? asset.id} duration ${asset.durationSeconds}s exceeds ${assetRule.maxDurationSeconds}s.`,
        });
      } else if (asset.durationSeconds == null) {
        warnings.push({
          code: "ASSET_DURATION_UNKNOWN",
          assetId: asset.id,
          message: `${asset.filename ?? asset.id} has no stored duration metadata.`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function buildPreviewData(format: PublishingFormat, assets: DraftFormatAsset[]): FormatPreviewData {
  const config = PUBLISHING_FORMAT_CONFIGS[format];
  return {
    platform: config.platform,
    format,
    label: config.label,
    aspectRatio: config.preview.aspectRatio,
    safeAreas: config.preview.safeAreas,
    assets,
  };
}

export function buildMultiformatDryRun(format: PublishingFormat, assets: DraftFormatAsset[]): MultiformatDryRunResult {
  const validation = validateFormatAssets(format, assets);
  return {
    ...validation,
    format,
    assets,
    previewData: buildPreviewData(format, assets),
  };
}
