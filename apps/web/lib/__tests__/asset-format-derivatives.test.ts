import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IMAGE_DERIVATIVE_TARGETS,
  applyManualDerivativeCrop,
  planBatchFormatDerivatives,
  planFormatDerivative,
  toDerivativeRecord,
} from "../asset-format-derivatives";

const squareImage = {
  id: "asset-square",
  kind: "IMAGE",
  mimeType: "image/jpeg",
  width: 1080,
  height: 1080,
  sizeBytes: 200_000,
  metadata: {
    aspectRatio: { value: 1, label: "1:1" },
    orientation: "square",
    focalPoint: { xPercent: 55, yPercent: 40 },
  },
};

const storyVideo = {
  id: "asset-video",
  kind: "VIDEO",
  mimeType: "video/mp4",
  width: 1080,
  height: 1920,
  durationSeconds: 30,
  sizeBytes: 4_000_000,
  metadata: { aspectRatio: { value: 9 / 16, label: "9:16" }, orientation: "portrait" },
};

describe("asset format derivatives", () => {
  it("plans a smart story crop with safe zones without mutating the source asset", () => {
    const plan = planFormatDerivative(squareImage.id, squareImage, "INSTAGRAM_STORY");

    assert.equal(plan.sourceAssetId, squareImage.id);
    assert.equal(plan.sourceImmutable, true);
    assert.equal(plan.targetFrame.aspectRatioLabel, "9:16");
    assert.deepEqual(plan.safeZones, { topPercent: 13, bottomPercent: 16, sidePercent: 5 });
    assert.deepEqual(plan.crop, {
      xPercent: 26.88,
      yPercent: 0,
      widthPercent: 56.25,
      heightPercent: 100,
    });
    assert.ok(plan.operations.includes("write_derivative_record_without_mutating_source"));
  });

  it("creates a separate derivative record linked to sourceAssetId", () => {
    const plan = planFormatDerivative(squareImage.id, squareImage, "INSTAGRAM_FEED");
    const record = toDerivativeRecord(plan);

    assert.equal(record.id, "asset-square__instagram_feed__v1");
    assert.equal(record.sourceAssetId, squareImage.id);
    assert.equal(record.derivativeOf, squareImage.id);
    assert.equal(record.immutableSource, true);
    assert.notEqual(record, squareImage);
  });

  it("applies manual crop as a new derivative version", () => {
    const original = planFormatDerivative(squareImage.id, squareImage, "INSTAGRAM_CAROUSEL");
    const manual = applyManualDerivativeCrop(original, {
      xPercent: 8,
      yPercent: 10,
      widthPercent: 82,
      heightPercent: 88,
    });

    assert.equal(original.version, 1);
    assert.equal(manual.version, 2);
    assert.equal(manual.derivativeId, "asset-square__instagram_carousel__v2");
    assert.equal(manual.source, "manual");
    assert.deepEqual(manual.crop, { xPercent: 8, yPercent: 10, widthPercent: 82, heightPercent: 88 });
  });

  it("creates deterministic batch variants for all image publishing formats", () => {
    const batch = planBatchFormatDerivatives(squareImage.id, squareImage);

    assert.deepEqual(batch.map((plan) => plan.target), [...IMAGE_DERIVATIVE_TARGETS]);
    assert.deepEqual(batch.map((plan) => plan.version), [1, 1, 1, 1]);
    assert.equal(new Set(batch.map((plan) => plan.derivativeId)).size, IMAGE_DERIVATIVE_TARGETS.length);
  });

  it("rejects video derivative work safely for a later transcoding sprint", () => {
    const plan = planFormatDerivative(storyVideo.id, storyVideo, "INSTAGRAM_STORY");

    assert.equal(plan.status, "VIDEO_DEFERRED");
    assert.equal(plan.crop, null);
    assert.ok(plan.operations.includes("defer_video_derivative_to_followup_sprint"));
    assert.match(plan.warnings.join(" "), /Video derivatives require/);
  });
});
