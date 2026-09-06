import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { facebookPagePublisher } from "../../../apps/web/lib/publishers/facebook-page.js";
import { instagramPublisher } from "../../../apps/web/lib/publishers/instagram.js";
import { buildPub06DryRun, normalizePub06PublishingFormat } from "../../../apps/web/app/api/publishing/pub06-formats.js";

function response(status = 200, json: unknown = {}, text = "ok"): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
    text: async () => text,
  } as Response;
}

afterEach(() => {
  delete process.env.FACEBOOK_GRAPH_API_VERSION;
  delete process.env.INSTAGRAM_GRAPH_API_VERSION;
  delete (globalThis as { fetch?: typeof fetch }).fetch;
});

describe("PUB-06 format contract", () => {
  it("normalizes and advertises only validated Meta formats", () => {
    assert.equal(normalizePub06PublishingFormat("INSTAGRAM", "reel"), "INSTAGRAM_REEL");
    assert.equal(normalizePub06PublishingFormat("FACEBOOK", "story"), "FACEBOOK_STORY");
    assert.equal(normalizePub06PublishingFormat("FACEBOOK", "reel"), "FACEBOOK_REEL");
    assert.deepEqual(instagramPublisher.supportedFormats, ["INSTAGRAM_FEED", "INSTAGRAM_STORY", "INSTAGRAM_REEL"]);
    assert.deepEqual(facebookPagePublisher.supportedFormats, ["FACEBOOK_FEED", "FACEBOOK_STORY", "FACEBOOK_REEL"]);
    assert.equal(instagramPublisher.capabilities.story, true);
    assert.equal(facebookPagePublisher.capabilities.reels, true);
  });

  it("rejects an image masquerading as a Facebook Reel during dry-run", () => {
    const result = buildPub06DryRun("FACEBOOK_REEL", [{
      id: "asset-1", url: "https://cdn.test/a.jpg", filename: "a.jpg", mimeType: "image/jpeg",
      width: 1080, height: 1920, sizeBytes: 1000, durationSeconds: null, order: 1,
    }]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.code === "ASSET_MIME"));
  });
});

describe("Instagram Stories and Reels", () => {
  it("publishes an Instagram image Story with STORIES media_type", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    (globalThis as { fetch: typeof fetch }).fetch = (async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      calls.push({ url: href, body: typeof init?.body === "string" ? init.body : "" });
      if (href.endsWith("/me/media")) return response(200, { id: "container-story-image" });
      if (href.includes("container-story-image?fields=status_code,status")) return response(200, { id: "container-story-image", status_code: "FINISHED" });
      if (href.endsWith("/me/media_publish")) return response(200, { id: "ig-story-image" });
      throw new Error(`Unexpected ${href}`);
    }) as typeof fetch;

    const result = await instagramPublisher.publish({
      targetId: "ig-1", accessToken: "token", mediaUrl: "https://cdn.test/story.jpg", caption: "ignored",
      format: "INSTAGRAM_STORY", mediaType: "IMAGE",
    });
    assert.equal(result.externalPostId, "ig-story-image");
    const create = calls.find((call) => call.url.endsWith("/me/media"));
    assert.ok(create?.body.includes("media_type=STORIES"));
    assert.ok(create?.body.includes("image_url=https%3A%2F%2Fcdn.test%2Fstory.jpg"));
  });

  it("publishes an Instagram video Story with STORIES media_type", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    (globalThis as { fetch: typeof fetch }).fetch = (async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      calls.push({ url: href, body: typeof init?.body === "string" ? init.body : "" });
      if (href.endsWith("/me/media")) return response(200, { id: "container-story-video" });
      if (href.includes("container-story-video?fields=status_code,status")) return response(200, { id: "container-story-video", status_code: "FINISHED" });
      if (href.endsWith("/me/media_publish")) return response(200, { id: "ig-story-video" });
      throw new Error(`Unexpected ${href}`);
    }) as typeof fetch;

    const result = await instagramPublisher.publish({
      targetId: "ig-1", accessToken: "token", mediaUrl: "https://cdn.test/story.mp4", caption: "",
      format: "INSTAGRAM_STORY", mediaType: "VIDEO",
    });
    assert.equal(result.externalPostId, "ig-story-video");
    const create = calls.find((call) => call.url.endsWith("/me/media"));
    assert.ok(create?.body.includes("media_type=STORIES"));
    assert.ok(create?.body.includes("video_url=https%3A%2F%2Fcdn.test%2Fstory.mp4"));
  });

  it("keeps Instagram Reel publication on the durable REELS container flow", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    (globalThis as { fetch: typeof fetch }).fetch = (async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      calls.push({ url: href, body: typeof init?.body === "string" ? init.body : "" });
      if (href.includes("/me?fields=")) return response(200, { id: "ig-1", username: "acct" });
      if (href.endsWith("/me/media")) return response(200, { id: "container-reel" });
      if (href.includes("container-reel?fields=status_code,status")) return response(200, { id: "container-reel", status_code: "FINISHED" });
      if (href.endsWith("/me/media_publish")) return response(200, { id: "ig-reel" });
      throw new Error(`Unexpected ${href}`);
    }) as typeof fetch;

    const result = await instagramPublisher.publish({
      targetId: "ig-1", accessToken: "token", mediaUrl: "https://cdn.test/reel.mp4", caption: "reel",
      format: "INSTAGRAM_REEL", mediaType: "VIDEO",
    });
    assert.equal(result.externalPostId, "ig-reel");
    const create = calls.find((call) => call.url.endsWith("/me/media"));
    assert.ok(create?.body.includes("media_type=REELS"));
  });
});

describe("Facebook Stories and Reels", () => {
  it("publishes a Facebook image Story through photos then photo_stories", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    process.env.FACEBOOK_GRAPH_API_VERSION = "v99.0";
    (globalThis as { fetch: typeof fetch }).fetch = (async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      calls.push({ url: href, body: typeof init?.body === "string" ? init.body : "" });
      if (href.endsWith("/photos")) return response(200, { id: "photo-1" });
      if (href.endsWith("/photo_stories")) return response(200, { post_id: "story-image-1" });
      throw new Error(`Unexpected ${href}`);
    }) as typeof fetch;

    const result = await facebookPagePublisher.publish({
      targetId: "page-1", accessToken: "token", mediaUrl: "https://cdn.test/story.jpg", caption: "",
      format: "FACEBOOK_STORY", mediaType: "IMAGE",
    });
    assert.equal(result.externalPostId, "story-image-1");
    assert.ok(calls[0]?.body.includes("published=false"));
    assert.ok(calls[1]?.body.includes("photo_id=photo-1"));
  });

  it("publishes a Facebook video Story with hosted file_url upload", async () => {
    const calls: Array<{ url: string; body: string; fileUrl?: string | null }> = [];
    process.env.FACEBOOK_GRAPH_API_VERSION = "v99.0";
    (globalThis as { fetch: typeof fetch }).fetch = (async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      const headers = new Headers(init?.headers);
      calls.push({ url: href, body: typeof init?.body === "string" ? init.body : "", fileUrl: headers.get("file_url") });
      if (href.endsWith("/video_stories") && typeof init?.body === "string" && init.body.includes("upload_phase=start")) return response(200, { video_id: "story-video", upload_url: "https://upload.meta.test/story" });
      if (href === "https://upload.meta.test/story") return response(200, { success: true });
      if (href.endsWith("/video_stories") && typeof init?.body === "string" && init.body.includes("upload_phase=finish")) return response(200, { post_id: "story-video-post" });
      throw new Error(`Unexpected ${href}`);
    }) as typeof fetch;

    const result = await facebookPagePublisher.publish({
      targetId: "page-1", accessToken: "token", mediaUrl: "https://cdn.test/story.mp4", caption: "",
      format: "FACEBOOK_STORY", mediaType: "VIDEO",
    });
    assert.equal(result.externalPostId, "story-video-post");
    assert.equal(calls[1]?.fileUrl, "https://cdn.test/story.mp4");
  });

  it("publishes a Facebook Reel with start, hosted upload, and PUBLISHED finish", async () => {
    const calls: Array<{ url: string; body: string; fileUrl?: string | null }> = [];
    process.env.FACEBOOK_GRAPH_API_VERSION = "v99.0";
    (globalThis as { fetch: typeof fetch }).fetch = (async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      const headers = new Headers(init?.headers);
      calls.push({ url: href, body: typeof init?.body === "string" ? init.body : "", fileUrl: headers.get("file_url") });
      if (href.endsWith("/video_reels") && typeof init?.body === "string" && init.body.includes("upload_phase=start")) return response(200, { video_id: "reel-video", upload_url: "https://upload.meta.test/reel" });
      if (href === "https://upload.meta.test/reel") return response(200, { success: true });
      if (href.endsWith("/video_reels") && typeof init?.body === "string" && init.body.includes("upload_phase=finish")) return response(200, { post_id: "reel-post" });
      throw new Error(`Unexpected ${href}`);
    }) as typeof fetch;

    const result = await facebookPagePublisher.publish({
      targetId: "page-1", accessToken: "token", mediaUrl: "https://cdn.test/reel.mp4", caption: "reel",
      format: "FACEBOOK_REEL", mediaType: "VIDEO",
    });
    assert.equal(result.externalPostId, "reel-post");
    assert.equal(calls[1]?.fileUrl, "https://cdn.test/reel.mp4");
    assert.ok(calls[2]?.body.includes("video_state=PUBLISHED"));
  });
});
