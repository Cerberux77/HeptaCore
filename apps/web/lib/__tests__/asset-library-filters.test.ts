import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAssetLibraryFilters,
  clearAssetLibraryFilters,
  DEFAULT_ASSET_LIBRARY_FILTERS,
  updateAssetLibraryTarget,
} from "../asset-library-filters";
import type { TenantAssetItem } from "../dashboard";

const assets: TenantAssetItem[] = [
  {
    id: "img-square",
    filename: "square.jpg",
    kind: "IMAGE",
    path: "/square.jpg",
    storageKey: "tenants/t1/assets/a/square.jpg",
    mimeType: "image/jpeg",
    rightsStatus: "needs_review",
    draftCount: 0,
    width: 1080,
    height: 1080,
    orientation: "square",
    aspectRatio: { value: 1, label: "1:1" },
  },
  {
    id: "img-story",
    filename: "story.jpg",
    kind: "IMAGE",
    path: "/story.jpg",
    storageKey: "tenants/t1/assets/b/story.jpg",
    mimeType: "image/jpeg",
    rightsStatus: "needs_review",
    draftCount: 0,
    width: 1080,
    height: 1920,
    orientation: "portrait",
    aspectRatio: { value: 9 / 16, label: "9:16" },
  },
  {
    id: "video-reel",
    filename: "reel.mp4",
    kind: "VIDEO",
    path: "/reel.mp4",
    storageKey: "tenants/t1/assets/c/reel.mp4",
    mimeType: "video/mp4",
    rightsStatus: "needs_review",
    draftCount: 1,
    width: 1080,
    height: 1920,
    durationSeconds: 30,
    orientation: "portrait",
    aspectRatio: { value: 9 / 16, label: "9:16" },
  },
];

describe("asset library filters", () => {
  it("defaults a concrete target to ELIGIBLE compatibility", () => {
    const next = updateAssetLibraryTarget(DEFAULT_ASSET_LIBRARY_FILTERS, "INSTAGRAM_REEL");
    assert.equal(next.compatibility, "ELIGIBLE");
  });

  it("filters target + ELIGIBLE to only compatible assets", () => {
    const filtered = applyAssetLibraryFilters(assets, {
      ...DEFAULT_ASSET_LIBRARY_FILTERS,
      target: "INSTAGRAM_REEL",
      compatibility: "ELIGIBLE",
    });
    assert.deepEqual(filtered.map((asset) => asset.id), ["video-reel"]);
  });

  it("Instagram Reel does not show images as compatible", () => {
    const filtered = applyAssetLibraryFilters(assets, {
      ...DEFAULT_ASSET_LIBRARY_FILTERS,
      target: "INSTAGRAM_REEL",
      compatibility: "ELIGIBLE",
      kind: "IMAGE",
    });
    assert.equal(filtered.length, 0);
  });

  it("Instagram Reel + image + incompatible shows incompatible images", () => {
    const filtered = applyAssetLibraryFilters(assets, {
      ...DEFAULT_ASSET_LIBRARY_FILTERS,
      target: "INSTAGRAM_REEL",
      compatibility: "INCOMPATIBLE",
      kind: "IMAGE",
    });
    assert.deepEqual(filtered.map((asset) => asset.id), ["img-square", "img-story"]);
  });

  it("Todos los evaluados keeps all assets evaluated against the target", () => {
    const filtered = applyAssetLibraryFilters(assets, {
      ...DEFAULT_ASSET_LIBRARY_FILTERS,
      target: "INSTAGRAM_REEL",
      compatibility: "EVALUATED",
    });
    assert.deepEqual(filtered.map((asset) => asset.id), ["img-square", "img-story", "video-reel"]);
  });

  it("clear filters restores the full inventory", () => {
    const narrowed = applyAssetLibraryFilters(assets, {
      ...DEFAULT_ASSET_LIBRARY_FILTERS,
      kind: "VIDEO",
      target: "INSTAGRAM_REEL",
      compatibility: "ELIGIBLE",
    });
    assert.equal(narrowed.length, 1);

    const restored = applyAssetLibraryFilters(assets, clearAssetLibraryFilters());
    assert.equal(restored.length, assets.length);
  });
});
