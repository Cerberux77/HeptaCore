import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

type MockCall = { url: string; method: string };

const originalFetch = globalThis.fetch;
let calls: MockCall[] = [];

function installFetch(handler: (url: string, init?: any) => Response | Promise<Response>) {
  calls = [];
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : String(input);
    calls.push({ url, method: (init?.method ?? "GET").toUpperCase() });
    return handler(url, init);
  }) as unknown as typeof fetch;
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

const UPLOAD_URL = "https://upload.googleapis.com/upload/session/abc123";
const MEDIA_URL = "https://cdn.example.com/video.mp4";

function successHandler(videoId: string): (url: string, init?: any) => Response {
  return (url: string, init?: any) => {
    const method = (init?.method ?? "GET").toUpperCase();
    if (url === MEDIA_URL && method === "GET") {
      return new Response(new Uint8Array([1, 2, 3, 4, 5]).buffer, {
        status: 200,
        headers: { "content-type": "video/mp4" },
      });
    }
    if (url.includes("uploadType=resumable") && method === "POST") {
      return new Response(null, { status: 200, headers: { Location: UPLOAD_URL } });
    }
    if (url === UPLOAD_URL && method === "PUT") {
      return new Response(JSON.stringify({ id: videoId, status: { privacyStatus: "private" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: { code: 404, message: "unexpected" } }), { status: 404 });
  };
}

describe("youtube provider format helpers", async () => {
  const { normalizeYouTubeFormat, withShortsMarker, youtubePublisher } = await import("../publishers/youtube.js");

  it("normalizes explicit and legacy formats", () => {
    assert.equal(normalizeYouTubeFormat("YOUTUBE_VIDEO"), "YOUTUBE_VIDEO");
    assert.equal(normalizeYouTubeFormat("YOUTUBE_SHORT"), "YOUTUBE_SHORT");
    assert.equal(normalizeYouTubeFormat("shorts"), "YOUTUBE_SHORT");
    assert.equal(normalizeYouTubeFormat("video"), "YOUTUBE_VIDEO");
    assert.equal(normalizeYouTubeFormat(null), "YOUTUBE_VIDEO");
  });

  it("adds #Shorts marker only for shorts and is idempotent", () => {
    const shorts = withShortsMarker("YOUTUBE_SHORT", "My clip", "Desc");
    assert.match(shorts.description, /#Shorts/);
    const already = withShortsMarker("YOUTUBE_SHORT", "My clip #shorts", "Desc");
    assert.equal(already.description, "Desc");
    const video = withShortsMarker("YOUTUBE_VIDEO", "My clip", "Desc");
    assert.equal(video.description, "Desc");
  });

  it("declares upload scope and youtube_oauth credential label", () => {
    assert.equal(youtubePublisher.network, "YOUTUBE");
    assert.equal(youtubePublisher.credentialLabel, "youtube_oauth");
    assert.ok(youtubePublisher.requiredScopes.includes("https://www.googleapis.com/auth/youtube.upload"));
    assert.equal(youtubePublisher.capabilities.video, true);
  });
});

describe("youtube unified format validation", async () => {
  const { validateFormatAssets, normalizePublishingFormat, buildMultiformatDryRun } = await import(
    "../publishing-formats.js"
  );

  const landscape = {
    id: "v1",
    url: "/tenant-assets/t/video.mp4",
    filename: "video.mp4",
    mimeType: "video/mp4",
    width: 1920,
    height: 1080,
    sizeBytes: 10_000_000,
    durationSeconds: 300,
    order: 1,
  };
  const vertical = {
    id: "v2",
    url: "/tenant-assets/t/short.mp4",
    filename: "short.mp4",
    mimeType: "video/mp4",
    width: 1080,
    height: 1920,
    sizeBytes: 5_000_000,
    durationSeconds: 45,
    order: 1,
  };

  it("maps YouTube network formats", () => {
    assert.equal(normalizePublishingFormat("YOUTUBE", "VIDEO"), "YOUTUBE_VIDEO");
    assert.equal(normalizePublishingFormat("YOUTUBE", "SHORTS"), "YOUTUBE_SHORT");
    assert.equal(normalizePublishingFormat("YOUTUBE", null), "YOUTUBE_VIDEO");
    assert.equal(normalizePublishingFormat("YOUTUBE", "YOUTUBE_SHORT"), "YOUTUBE_SHORT");
  });

  it("accepts a valid 16:9 video", () => {
    const r = validateFormatAssets("YOUTUBE_VIDEO", [landscape]);
    assert.equal(r.valid, true);
  });

  it("accepts a valid 9:16 short", () => {
    const r = validateFormatAssets("YOUTUBE_SHORT", [vertical]);
    assert.equal(r.valid, true);
  });

  it("rejects a short by orientation and duration", () => {
    const bad = validateFormatAssets("YOUTUBE_SHORT", [{ ...landscape, durationSeconds: 200 }]);
    assert.equal(bad.valid, false);
    assert.ok(bad.errors.some((e) => e.code === "ASSET_ASPECT_RATIO"));
    assert.ok(bad.errors.some((e) => e.code === "ASSET_DURATION"));
  });

  it("rejects a video with unsupported MIME", () => {
    const bad = validateFormatAssets("YOUTUBE_VIDEO", [{ ...landscape, mimeType: "application/pdf" }]);
    assert.equal(bad.valid, false);
    assert.ok(bad.errors.some((e) => e.code === "ASSET_MIME"));
  });

  it("builds a dry-run/preview without any external call", () => {
    installFetch(() => {
      throw new Error("dry-run must not perform network calls");
    });
    try {
      const dryRun = buildMultiformatDryRun("YOUTUBE_VIDEO", [landscape]);
      assert.equal(dryRun.previewData.format, "YOUTUBE_VIDEO");
      assert.equal(dryRun.previewData.platform, "YOUTUBE");
      assert.equal(dryRun.valid, true);
      assert.equal(calls.length, 0, "no fetch during dry-run");
    } finally {
      restoreFetch();
    }
  });
});

describe("youtube live publish (mocked provider)", async () => {
  const { youtubePublisher } = await import("../publishers/youtube.js");
  const { ProviderError } = await import("../publishers/types.js");

  afterEach(() => restoreFetch());

  const baseInput = {
    targetId: "channel-1",
    accessToken: "ya29.real-token",
    mediaUrl: MEDIA_URL,
    caption: "Caption",
    title: "Real Title",
    description: "Real description",
    format: "YOUTUBE_VIDEO",
  };

  it("publishes and returns a real video id from the provider", async () => {
    installFetch(successHandler("vid_ABC123"));
    const result = await youtubePublisher.publish(baseInput as any);
    assert.equal(result.externalPostId, "vid_ABC123");
    const pr = result.providerResponse as Record<string, unknown>;
    assert.equal(pr.videoId, "vid_ABC123");
    assert.match(String(pr.watchUrl), /vid_ABC123/);
    assert.ok(calls.some((c) => c.url.includes("uploadType=resumable")), "opened resumable session");
    assert.ok(calls.some((c) => c.url === UPLOAD_URL && c.method === "PUT"), "uploaded bytes");
  });

  it("tags shorts with #Shorts in the uploaded snippet", async () => {
    let sentBody: any = null;
    installFetch((url, init) => {
      const method = (init?.method ?? "GET").toUpperCase();
      if (url === MEDIA_URL) return new Response(new Uint8Array([1]).buffer, { status: 200 });
      if (url.includes("uploadType=resumable")) {
        sentBody = JSON.parse(init.body);
        return new Response(null, { status: 200, headers: { Location: UPLOAD_URL } });
      }
      return new Response(JSON.stringify({ id: "short_1" }), { status: 200 });
    });
    const result = await youtubePublisher.publish({ ...baseInput, format: "YOUTUBE_SHORT", description: "hi" } as any);
    assert.equal(result.externalPostId, "short_1");
    assert.match(String(sentBody.snippet.description), /#Shorts/);
  });

  it("never fabricates PUBLISHED: throws when provider returns no id", async () => {
    installFetch((url, init) => {
      const method = (init?.method ?? "GET").toUpperCase();
      if (url === MEDIA_URL) return new Response(new Uint8Array([1]).buffer, { status: 200 });
      if (url.includes("uploadType=resumable")) return new Response(null, { status: 200, headers: { Location: UPLOAD_URL } });
      return new Response(JSON.stringify({}), { status: 200 });
    });
    await assert.rejects(() => youtubePublisher.publish(baseInput as any), (err: unknown) => {
      assert.ok(err instanceof ProviderError);
      assert.equal((err as InstanceType<typeof ProviderError>).isAmbiguous, true);
      return true;
    });
  });

  it("marks 5xx upload-session failures as ambiguous", async () => {
    installFetch((url, init) => {
      const method = (init?.method ?? "GET").toUpperCase();
      if (url === MEDIA_URL) return new Response(new Uint8Array([1]).buffer, { status: 200 });
      return new Response(JSON.stringify({ error: { code: 503, message: "backend" } }), { status: 503 });
    });
    await assert.rejects(() => youtubePublisher.publish(baseInput as any), (err: unknown) => {
      assert.ok(err instanceof ProviderError);
      assert.equal((err as InstanceType<typeof ProviderError>).isAmbiguous, true);
      return true;
    });
  });

  it("blocks when access token is missing (no credentials)", async () => {
    installFetch(successHandler("should_not_reach"));
    await assert.rejects(
      () => youtubePublisher.publish({ ...baseInput, accessToken: "" } as any),
      (err: unknown) => err instanceof ProviderError
    );
    assert.equal(calls.length, 0, "no provider call without credentials");
  });

  it("requires a public media URL", async () => {
    installFetch(successHandler("should_not_reach"));
    await assert.rejects(
      () => youtubePublisher.publish({ ...baseInput, mediaUrl: null } as any),
      (err: unknown) => err instanceof ProviderError
    );
  });
});

describe("youtube live route contract", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../../app/api/publishing/publish/route.ts", import.meta.url), "utf8");

  it("passes YouTube metadata (title/description/format) to the publisher", () => {
    assert.match(source, /if \(network === "YOUTUBE"\)/);
    assert.match(source, /publishInput\.title = draft\.title/);
    assert.match(source, /publishInput\.format = format/);
  });

  it("blocks live when credentials cannot be resolved", () => {
    assert.match(source, /if \(!credentialResolution\.ok\)/);
    assert.match(source, /credentialResolution\.code/);
  });

  it("only marks PUBLISHED after a committed provider finalization", () => {
    const finalizeIdx = source.indexOf("commitConfirmedPublication");
    const publishedIdx = source.indexOf('status: "PUBLISHED"');
    assert.ok(finalizeIdx > 0, "uses transactional finalization");
    assert.ok(publishedIdx > finalizeIdx, "PUBLISHED only after finalization");
  });

  it("runs the YouTube format/asset gate before scheduled and immediate paths", () => {
    const gateIdx = source.indexOf("evaluateYouTubePublishGate");
    const scheduledIdx = source.indexOf('if (requestMode === "scheduled")');
    const immediateIdx = source.indexOf("=== IMMEDIATE");
    assert.ok(gateIdx > 0, "gate is invoked");
    assert.ok(gateIdx < scheduledIdx, "gate runs before the scheduled path");
    assert.ok(gateIdx < immediateIdx, "gate runs before the immediate path");
    assert.match(source, /LIVE_BLOCKED_FORMAT_VALIDATION/);
  });

  it("ambiguous provider error is network-generic (no Meta/Facebook literals)", () => {
    const reconcileIdx = source.indexOf("LIVE_RECONCILIATION_REQUIRED");
    const section = source.slice(reconcileIdx, reconcileIdx + 400);
    assert.match(section, /\$\{network\} devolvio un resultado ambiguo/);
    assert.doesNotMatch(section, /Meta devolvio/);
    assert.doesNotMatch(section, /verificar Facebook/);
  });

  it("selects the video asset (not the thumbnail) as the upload media", () => {
    assert.match(source, /nonThumbnailAssets/);
    assert.match(source, /asset\.role !== "thumbnail"/);
  });
});

describe("youtube publish gate (immediate + scheduled share one gate)", async () => {
  const { evaluateYouTubePublishGate } = await import("../publishing-formats.js");

  const video16x9 = {
    id: "vid",
    url: "/tenant-assets/t/v.mp4",
    filename: "v.mp4",
    mimeType: "video/mp4",
    width: 1920,
    height: 1080,
    sizeBytes: 10_000_000,
    durationSeconds: 300,
    order: 1,
    role: "primary",
  };
  const shortVertical = { ...video16x9, id: "short", filename: "s.mp4", width: 1080, height: 1920, durationSeconds: 45 };
  const shortHorizontalLong = { ...video16x9, id: "bad", width: 1920, height: 1080, durationSeconds: 200 };
  const thumbnailImage = {
    id: "thumb",
    url: "/tenant-assets/t/thumb.jpg",
    filename: "thumb.jpg",
    mimeType: "image/jpeg",
    width: 1280,
    height: 720,
    sizeBytes: 200_000,
    order: 2,
    role: "thumbnail",
  };

  it("blocks an invalid Short (horizontal + too long) before any provider/job", () => {
    const gate = evaluateYouTubePublishGate({ format: "YOUTUBE_SHORT", videoAssets: [shortHorizontalLong], thumbnail: null });
    assert.equal(gate.blocked, true);
    assert.equal(gate.code, "LIVE_BLOCKED_FORMAT_VALIDATION");
    assert.ok(gate.problems.includes("ASSET_ASPECT_RATIO"));
    assert.ok(gate.problems.includes("ASSET_DURATION"));
  });

  it("allows a valid Short", () => {
    const gate = evaluateYouTubePublishGate({ format: "YOUTUBE_SHORT", videoAssets: [shortVertical], thumbnail: null });
    assert.equal(gate.blocked, false);
    assert.equal(gate.code, null);
  });

  it("Video with video + thumbnail does not fail by asset count", () => {
    const gate = evaluateYouTubePublishGate({ format: "YOUTUBE_VIDEO", videoAssets: [video16x9], thumbnail: thumbnailImage });
    assert.equal(gate.blocked, false, "thumbnail is not counted as a second video");
    assert.ok(!gate.problems.includes("ASSET_COUNT_MAX"));
  });

  it("Video without thumbnail is blocked (thumbnail mandatory)", () => {
    const gate = evaluateYouTubePublishGate({ format: "YOUTUBE_VIDEO", videoAssets: [video16x9], thumbnail: null });
    assert.equal(gate.blocked, true);
    assert.ok(gate.problems.includes("THUMBNAIL_REQUIRED"));
  });

  it("Video with a non-image thumbnail is blocked", () => {
    const gate = evaluateYouTubePublishGate({
      format: "YOUTUBE_VIDEO",
      videoAssets: [video16x9],
      thumbnail: { ...thumbnailImage, mimeType: "application/pdf", filename: "thumb.pdf" },
    });
    assert.equal(gate.blocked, true);
    assert.ok(gate.problems.includes("THUMBNAIL_MIME"));
  });
});

