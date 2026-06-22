import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeTechnicalAssetMetadata } from "../asset-metadata";

describe("asset metadata normalization", () => {
  it("normalizes square image metadata", () => {
    const metadata = normalizeTechnicalAssetMetadata({
      width: 1080,
      height: 1080,
      sizeBytes: 512000,
      mimeType: "IMAGE/JPEG",
    });
    assert.equal(metadata.width, 1080);
    assert.equal(metadata.height, 1080);
    assert.equal(metadata.orientation, "square");
    assert.deepEqual(metadata.aspectRatio, { value: 1, label: "1:1" });
    assert.equal(metadata.mimeType, "image/jpeg");
  });

  it("normalizes vertical image metadata", () => {
    const metadata = normalizeTechnicalAssetMetadata({
      width: 1080,
      height: 1920,
      sizeBytes: 1024,
      mimeType: "image/png",
    });
    assert.equal(metadata.orientation, "portrait");
    assert.deepEqual(metadata.aspectRatio, { value: 0.5625, label: "9:16" });
  });

  it("normalizes horizontal image metadata", () => {
    const metadata = normalizeTechnicalAssetMetadata({
      width: 1920,
      height: 1080,
      sizeBytes: 1024,
      mimeType: "image/webp",
    });
    assert.equal(metadata.orientation, "landscape");
    assert.deepEqual(metadata.aspectRatio, { value: 1.7778, label: "16:9" });
  });

  it("normalizes vertical video metadata with duration", () => {
    const metadata = normalizeTechnicalAssetMetadata({
      width: 1080,
      height: 1920,
      durationSeconds: 42.4,
      sizeBytes: 2048,
      mimeType: "video/mp4",
    });
    assert.equal(metadata.orientation, "portrait");
    assert.equal(metadata.durationSeconds, 42.4);
    assert.deepEqual(metadata.aspectRatio, { value: 0.5625, label: "9:16" });
  });

  it("drops invalid technical values without trusting client shape", () => {
    const metadata = normalizeTechnicalAssetMetadata({
      width: -10,
      height: "not-a-number",
      durationSeconds: -1,
      sizeBytes: 0,
      orientation: "diagonal",
      aspectRatio: { value: "bad", label: "9:16" },
    });
    assert.equal(metadata.width, null);
    assert.equal(metadata.height, null);
    assert.equal(metadata.durationSeconds, null);
    assert.equal(metadata.orientation, null);
    assert.equal(metadata.aspectRatio, null);
    assert.equal(metadata.metadataVersion, 1);
  });
});
