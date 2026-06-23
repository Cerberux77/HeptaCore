import type { AssetCompatibilityFilter, AssetCompatibilityInput, AssetCompatibilityTarget } from "./asset-compatibility";
import { filterAssetsByCompatibility } from "./asset-compatibility";
import type { TenantAssetItem } from "./dashboard";

export type AssetUsageFilter = "ALL" | "IN_USE" | "FREE";
export type AssetSortOrder = "NOMBRE" | "FECHA" | "TAMANO";

export type AssetLibraryFilters = {
  search: string;
  kind: string;
  folder: string;
  orientation: string;
  target: AssetCompatibilityTarget | "ALL";
  compatibility: AssetCompatibilityFilter;
  compatibilityExplicit: boolean;
  usage: AssetUsageFilter;
  sortOrder: AssetSortOrder;
};

export const DEFAULT_ASSET_LIBRARY_FILTERS: AssetLibraryFilters = {
  search: "",
  kind: "ALL",
  folder: "ALL",
  orientation: "ALL",
  target: "ALL",
  compatibility: "ALL",
  compatibilityExplicit: false,
  usage: "ALL",
  sortOrder: "NOMBRE",
};

export function applyAssetLibraryFilters(
  assets: TenantAssetItem[],
  filters: AssetLibraryFilters,
): TenantAssetItem[] {
  let filtered = assets.filter((asset) => {
    const kindOk = filters.kind === "ALL" || asset.kind === filters.kind;
    const folderOk = filters.folder === "ALL" || (asset.folder ?? "") === filters.folder;
    const orientationOk = filters.orientation === "ALL" || asset.orientation === filters.orientation;
    const searchOk = !filters.search || asset.filename.toLowerCase().includes(filters.search.toLowerCase());
    const usageOk = filters.usage === "ALL" || (filters.usage === "IN_USE" ? asset.draftCount > 0 : asset.draftCount === 0);
    return kindOk && folderOk && orientationOk && searchOk && usageOk;
  });

  filtered = filterAssetsByCompatibility(
    filtered as AssetCompatibilityInput[],
    filters.target,
    filters.compatibility,
  ) as TenantAssetItem[];

  if (filters.sortOrder === "FECHA") {
    return [...filtered].sort((a, b) => String(b.id).localeCompare(String(a.id)));
  }
  if (filters.sortOrder === "TAMANO") {
    return [...filtered].sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0));
  }
  return filtered;
}

export function updateAssetLibraryTarget(
  filters: AssetLibraryFilters,
  target: AssetCompatibilityTarget | "ALL",
): AssetLibraryFilters {
  if (filters.compatibilityExplicit) return { ...filters, target };
  return {
    ...filters,
    target,
    compatibility: target === "ALL" ? "ALL" : "ELIGIBLE",
  };
}

export function updateAssetLibraryCompatibility(
  filters: AssetLibraryFilters,
  compatibility: AssetCompatibilityFilter,
): AssetLibraryFilters {
  return {
    ...filters,
    compatibility,
    compatibilityExplicit: compatibility !== "ALL",
  };
}

export function clearAssetLibraryFilters(): AssetLibraryFilters {
  return { ...DEFAULT_ASSET_LIBRARY_FILTERS };
}
