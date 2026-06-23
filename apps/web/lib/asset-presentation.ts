import { resolveAssetUrl } from "./asset-resolution";
import type { TenantAssetItem } from "./dashboard";

type AssetRecord = {
  id: string;
  filename: string;
  kind: string;
  sourcePath?: string | null;
  storageKey?: string | null;
  mimeType?: string | null;
  rightsStatus: string;
  metadata?: unknown;
  _count?: { drafts?: number } | null;
};

function assetMetadata(asset: AssetRecord): Record<string, unknown> {
  return asset.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata)
    ? asset.metadata as Record<string, unknown>
    : {};
}

export function serializeTenantAsset(asset: AssetRecord, tenantSlug: string): TenantAssetItem {
  const metadata = assetMetadata(asset);
  return {
    id: asset.id,
    filename: asset.filename,
    kind: asset.kind,
    path: resolveAssetUrl(asset, tenantSlug),
    sourcePath: asset.sourcePath ?? null,
    storageKey: asset.storageKey ?? null,
    mimeType: asset.mimeType ?? null,
    rightsStatus: asset.rightsStatus,
    draftCount: asset._count?.drafts ?? 0,
    metadata,
    folder: typeof metadata.folder === "string" ? metadata.folder : "",
    sizeBytes: typeof metadata.sizeBytes === "number" ? metadata.sizeBytes : null,
    width: typeof metadata.width === "number" ? metadata.width : null,
    height: typeof metadata.height === "number" ? metadata.height : null,
    durationSeconds: typeof metadata.durationSeconds === "number" ? metadata.durationSeconds : null,
    orientation: typeof metadata.orientation === "string" ? metadata.orientation : null,
    aspectRatio: metadata.aspectRatio ?? null,
  };
}

export function upsertTenantAssetList(assets: TenantAssetItem[], next: TenantAssetItem): TenantAssetItem[] {
  const merged = [...assets.filter((asset) => asset.id !== next.id), next];
  return merged.sort((left, right) => {
    const kindOrder = String(left.kind ?? "").localeCompare(String(right.kind ?? ""));
    if (kindOrder !== 0) return kindOrder;
    const nameOrder = String(left.filename ?? "").localeCompare(String(right.filename ?? ""));
    if (nameOrder !== 0) return nameOrder;
    return String(left.id ?? "").localeCompare(String(right.id ?? ""));
  });
}
