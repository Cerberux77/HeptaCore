type AssetLike = {
  sourcePath?: string | null;
  storageKey?: string | null;
  filename?: string | null;
};

const LEGACY_TENANT_SLUGS: Record<string, string> = {
  "turpial-sound": "turpial",
};

export function legacyTenantAssetSlug(tenantSlug: string): string {
  return LEGACY_TENANT_SLUGS[tenantSlug] ?? tenantSlug;
}

export function isSafeRelativeAssetPath(value: string): boolean {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
  return Boolean(normalized) && !normalized.split("/").some((part) => part === ".." || part === "");
}

export function resolveAssetUrl(asset: AssetLike | null | undefined, tenantSlug: string): string | null {
  if (!asset) return null;
  const source = asset.sourcePath || asset.storageKey || asset.filename || null;
  if (!source) return null;
  if (source.startsWith("https://") || source.startsWith("http://") || source.startsWith("/")) return source;

  const normalized = source.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!isSafeRelativeAssetPath(normalized)) return null;

  if (asset.sourcePath?.startsWith("examples/tenants/")) {
    const marker = "/content/inbox/";
    const index = normalized.indexOf(marker.replace(/^\//, ""));
    const relative = index >= 0 ? normalized.slice(index + marker.length - 1) : normalized;
    return `/tenant-assets/${legacyTenantAssetSlug(tenantSlug)}/${relative.split("/").map(encodeURIComponent).join("/")}`;
  }

  if (asset.storageKey?.startsWith("tenants/") && asset.sourcePath?.startsWith("https://")) {
    return asset.sourcePath;
  }

  return `/tenant-assets/${legacyTenantAssetSlug(tenantSlug)}/${normalized.replace(/^content\/inbox\//, "").split("/").map(encodeURIComponent).join("/")}`;
}
