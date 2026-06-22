import type { AssetKind } from "@prisma/client";
import { PUBLISHING_FORMAT_CONFIGS } from "./publishing-formats";

const publishingMimeTypes = new Set(
  Object.values(PUBLISHING_FORMAT_CONFIGS).flatMap((config) => config.assetRule.acceptedMimeTypes),
);

export const ASSET_UPLOAD_LIMITS = {
  maxSizeBytes: Math.max(
    ...Object.values(PUBLISHING_FORMAT_CONFIGS).map((config) => config.assetRule.maxSizeBytes ?? 0),
    100 * 1024 * 1024,
  ),
  acceptedMimeTypes: [...publishingMimeTypes].sort(),
};

const MIME_KIND: Record<string, AssetKind> = {
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "image/webp": "IMAGE",
  "video/mp4": "VIDEO",
  "video/quicktime": "VIDEO",
};

export function kindForMimeType(mimeType: string): AssetKind | null {
  return MIME_KIND[mimeType.toLowerCase()] ?? null;
}

export function isAllowedAssetMime(mimeType: string): boolean {
  return ASSET_UPLOAD_LIMITS.acceptedMimeTypes.includes(mimeType.toLowerCase());
}

export function normalizeLogicalFolder(input: unknown): string {
  const raw = String(input ?? "").trim().replace(/\\/g, "/");
  if (!raw) return "";
  return raw
    .split("/")
    .map((part) => sanitizeFilename(part))
    .filter(Boolean)
    .join("/");
}

export function sanitizeFilename(input: string): string {
  const base = input.replace(/\\/g, "/").split("/").pop() ?? "asset";
  const normalized = base
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return normalized || "asset";
}

export function validateAssetFile(input: { filename: string; mimeType: string; sizeBytes: number }) {
  const filename = sanitizeFilename(input.filename);
  const mimeType = input.mimeType.toLowerCase();
  if (!isAllowedAssetMime(mimeType)) {
    return { ok: false as const, code: "ASSET_MIME_NOT_ALLOWED", error: `Unsupported MIME type: ${input.mimeType}` };
  }
  if (input.sizeBytes > ASSET_UPLOAD_LIMITS.maxSizeBytes) {
    return { ok: false as const, code: "ASSET_TOO_LARGE", error: "Asset exceeds configured size limit." };
  }
  return { ok: true as const, filename, mimeType, kind: kindForMimeType(mimeType) ?? "IMAGE" };
}
