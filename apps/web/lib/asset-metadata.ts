export type AssetOrientation = "square" | "portrait" | "landscape";
export type AspectRatioLabel = "1:1" | "4:5" | "9:16" | "16:9" | "1.91:1" | "custom";

export type AssetAspectRatio = {
  value: number;
  label: AspectRatioLabel;
};

export type TechnicalAssetMetadata = {
  sizeBytes?: number | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  orientation?: AssetOrientation | null;
  aspectRatio?: AssetAspectRatio | number | string | null;
  originalFilename?: string | null;
  folder?: string | null;
  metadataVersion?: number;
  metadataSource?: string;
  extractedAt?: string;
};

const KNOWN_RATIOS: Array<{ label: AspectRatioLabel; value: number; tolerance: number }> = [
  { label: "1:1", value: 1, tolerance: 0.015 },
  { label: "4:5", value: 4 / 5, tolerance: 0.015 },
  { label: "9:16", value: 9 / 16, tolerance: 0.015 },
  { label: "16:9", value: 16 / 9, tolerance: 0.02 },
  { label: "1.91:1", value: 1.91, tolerance: 0.03 },
];

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function positiveInteger(value: unknown): number | null {
  const number = finiteNumber(value);
  if (number == null || number <= 0) return null;
  return Math.round(number);
}

function nonNegativeNumber(value: unknown): number | null {
  const number = finiteNumber(value);
  if (number == null || number < 0) return null;
  return number;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function inferOrientation(width?: number | null, height?: number | null): AssetOrientation | null {
  if (!width || !height) return null;
  const ratio = width / height;
  if (Math.abs(ratio - 1) <= 0.015) return "square";
  return width > height ? "landscape" : "portrait";
}

export function normalizeAspectRatio(input: unknown, width?: number | null, height?: number | null): AssetAspectRatio | null {
  let value: number | null = null;
  const object = objectValue(input);
  if (typeof input === "number" || typeof input === "string") value = finiteNumber(input);
  if (value == null) value = finiteNumber(object.value);
  if (value == null && width && height) value = width / height;
  if (value == null || value <= 0) return null;

  const rounded = Number(value.toFixed(4));
  const known = KNOWN_RATIOS.find((ratio) => Math.abs(rounded - ratio.value) <= ratio.tolerance);
  const explicitLabel = typeof object.label === "string" ? object.label : null;
  const label = known?.label ?? (KNOWN_RATIOS.some((ratio) => ratio.label === explicitLabel) ? explicitLabel as AspectRatioLabel : "custom");
  return { value: rounded, label };
}

export function normalizeTechnicalAssetMetadata(
  input: unknown,
  fallback: {
    sizeBytes?: number | null;
    mimeType?: string | null;
    originalFilename?: string | null;
    folder?: string | null;
    now?: string;
  } = {},
): TechnicalAssetMetadata {
  const raw = objectValue(input);
  const width = positiveInteger(raw.width);
  const height = positiveInteger(raw.height);
  const durationSeconds = nonNegativeNumber(raw.durationSeconds);
  const sizeBytes = positiveInteger(raw.sizeBytes) ?? positiveInteger(fallback.sizeBytes);
  const mimeType = typeof raw.mimeType === "string" && raw.mimeType.trim()
    ? raw.mimeType.trim().toLowerCase()
    : fallback.mimeType?.toLowerCase() ?? null;
  const orientation = raw.orientation === "square" || raw.orientation === "portrait" || raw.orientation === "landscape"
    ? raw.orientation
    : inferOrientation(width, height);
  const aspectRatio = normalizeAspectRatio(raw.aspectRatio, width, height);

  return {
    ...(sizeBytes != null ? { sizeBytes } : {}),
    ...(mimeType ? { mimeType } : {}),
    width,
    height,
    durationSeconds,
    orientation,
    aspectRatio,
    ...(fallback.originalFilename ? { originalFilename: fallback.originalFilename } : {}),
    ...(fallback.folder != null ? { folder: fallback.folder } : {}),
    metadataVersion: 1,
    metadataSource: typeof raw.metadataSource === "string" && raw.metadataSource.trim()
      ? raw.metadataSource.trim()
      : "client-extracted",
    extractedAt: typeof raw.extractedAt === "string" && raw.extractedAt.trim()
      ? raw.extractedAt
      : fallback.now ?? new Date().toISOString(),
  };
}

export async function extractAssetMetadataFromFile(file: File): Promise<TechnicalAssetMetadata> {
  const base = {
    sizeBytes: file.size,
    mimeType: file.type,
    originalFilename: file.name,
    extractedAt: new Date().toISOString(),
  };

  if (file.type.startsWith("image/")) {
    const dimensions = await extractImageDimensions(file);
    return normalizeTechnicalAssetMetadata({ ...base, ...dimensions }, base);
  }

  if (file.type.startsWith("video/")) {
    const dimensions = await extractVideoMetadata(file);
    return normalizeTechnicalAssetMetadata({ ...base, ...dimensions }, base);
  }

  return normalizeTechnicalAssetMetadata(base, base);
}

async function extractImageDimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    } catch {
      // Fall through to Image for browsers that cannot decode this file through createImageBitmap.
    }
  }
  return new Promise((resolve) => {
    if (typeof Image === "undefined" || typeof URL === "undefined") {
      resolve({ width: null, height: null });
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth || null, height: image.naturalHeight || null });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null });
    };
    image.src = url;
  });
}
async function extractVideoMetadata(file: File): Promise<{ width: number | null; height: number | null; durationSeconds: number | null }> {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || typeof URL === "undefined") {
      resolve({ width: null, height: null, durationSeconds: null });
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null, durationSeconds: null });
    };
    video.src = url;
  });
}
