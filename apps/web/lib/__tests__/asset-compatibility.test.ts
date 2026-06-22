import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { evaluateAssetCompatibility, filterAssetsByCompatibility } from "../asset-compatibility";

const squareImage = {
  kind: "IMAGE",
  mimeType: "image/jpeg",
  width: 1080,
  height: 1080,
  sizeBytes: 200_000,
  metadata: { aspectRatio: { value: 1, label: "1:1" }, orientation: "square" },
};

const storyImage = {
  kind: "IMAGE",
  mimeType: "image/png",
  width: 1080,
  height: 1920,
  sizeBytes: 300_000,
  metadata: { aspectRatio: { value: 9 / 16, label: "9:16" }, orientation: "portrait" },
};

const verticalVideo = {
  kind: "VIDEO",
  mimeType: "video/mp4",
  width: 1080,
  height: 1920,
  durationSeconds: 45,
  sizeBytes: 2_000_000,
  metadata: { aspectRatio: { value: 9 / 16, label: "9:16" }, orientation: "portrait" },
};

const horizontalVideo = {
  kind: "VIDEO",
  mimeType: "video/mp4",
  width: 1920,
  height: 1080,
  durationSeconds: 600,
  sizeBytes: 4_000_000,
  metadata: { aspectRatio: { value: 16 / 9, label: "16:9" }, orientation: "landscape" },
};

describe("asset compatibility", () => {
  it("classifies Instagram Feed ideal", () => {
    assert.equal(evaluateAssetCompatibility(squareImage, "INSTAGRAM_FEED").status, "IDEAL");
  });

  it("classifies Instagram Story ideal 9:16", () => {
    assert.equal(evaluateAssetCompatibility(storyImage, "INSTAGRAM_STORY").status, "IDEAL");
  });

  it("rejects images for Instagram Reel", () => {
    assert.equal(evaluateAssetCompatibility(storyImage, "INSTAGRAM_REEL").status, "INCOMPATIBLE");
  });

  it("accepts compatible vertical video for YouTube Short", () => {
    assert.equal(evaluateAssetCompatibility(verticalVideo, "YOUTUBE_SHORT").status, "IDEAL");
  });

  it("evaluates horizontal video for YouTube Video", () => {
    assert.equal(evaluateAssetCompatibility(horizontalVideo, "YOUTUBE_VIDEO").status, "IDEAL");
  });

  it("marks documents incompatible with visual targets", () => {
    const document = { kind: "DOCUMENT", mimeType: "application/pdf", width: 1000, height: 1000 };
    assert.equal(evaluateAssetCompatibility(document, "INSTAGRAM_FEED").status, "INCOMPATIBLE");
  });

  it("returns UNKNOWN for legacy assets without metadata", () => {
    assert.equal(evaluateAssetCompatibility({ kind: "IMAGE", mimeType: "image/jpeg" }, "INSTAGRAM_FEED").status, "UNKNOWN");
  });

  it("filters by target and compatibility status", () => {
    const result = filterAssetsByCompatibility([squareImage, storyImage, verticalVideo], "INSTAGRAM_STORY", "IDEAL");
    assert.deepEqual(result, [storyImage, verticalVideo]);
  });

  it("does not import or call publisher adapters from metadata compatibility code", () => {
    const compatibility = readFileSync(join(process.cwd(), "lib", "asset-compatibility.ts"), "utf8");
    const metadata = readFileSync(join(process.cwd(), "lib", "asset-metadata.ts"), "utf8");
    assert.doesNotMatch(`${compatibility}\n${metadata}`, /from "\.\/publishers|from "\.\/publishers\/|getPublisher\(|\.publish\(/);
  });
});
