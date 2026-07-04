import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { facebookPagePublisher } from "../publishers/facebook-page.js";
import { instagramPublisher } from "../publishers/instagram.js";
import { publishInstagramMedia } from "../instagram-publisher.js";
import { normalizePublishingFormat } from "../publishing-formats.js";

type MockResponseInit = {
  status?: number;
  json?: unknown;
  text?: string;
  blob?: Blob;
};

function response(init: MockResponseInit = {}): Response {
  const status = init.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => init.json ?? {},
    text: async () => init.text ?? "",
    blob: async () => init.blob ?? new Blob(["video-bytes"], { type: "video/mp4" }),
  } as Response;
}

afterEach(() => {
  delete process.env.FACEBOOK_GRAPH_API_VERSION;
  delete process.env.INSTAGRAM_GRAPH_API_VERSION;
  delete (globalThis as { fetch?: typeof fetch }).fetch;
});

describe("publishing format routing", () => {
  it("maps new Meta live formats deterministically", () => {
    assert.equal(normalizePublishingFormat("INSTAGRAM", "reel"), "INSTAGRAM_REEL");
    assert.equal(normalizePublishingFormat("FACEBOOK", "story"), "FACEBOOK_STORY");
    assert.equal(normalizePublishingFormat("FACEBOOK", "reel"), "FACEBOOK_REEL");
  });

  it("publishers declare the new supported formats", () => {
    assert.deepEqual(instagramPublisher.supportedFormats, ["INSTAGRAM_FEED", "INSTAGRAM_STORY", "INSTAGRAM_REEL"]);
    assert.deepEqual(facebookPagePublisher.supportedFormats, ["FACEBOOK_FEED", "FACEBOOK_STORY", "FACEBOOK_REEL"]);
    assert.equal(instagramPublisher.capabilities.story, true);
    assert.equal(facebookPagePublisher.capabilities.reels, true);
  });
});

describe("Instagram publisher", () => {
  it("uses STORIES media_type for Instagram story images", async () => {
    const calls: Array<{ url: string; body?: string | null }> = [];
    (globalThis as { fetch: typeof fetch }).fetch = (async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      calls.push({ url: href, body: typeof init?.body === "string" ? init.body : null });
      if (href.includes("/me?fields=")) {
        return response({ json: { id: "ig-user-1", username: "acct" } });
      }
      if (href.endsWith("/me/media")) {
        return response({ json: { id: "container-1" } });
      }
      if (href.includes("/container-1?fields=status_code,status")) {
        return response({ json: { id: "container-1", status_code: "FINISHED" } });
      }
      if (href.endsWith("/me/media_publish")) {
        return response({ json: { id: "ig-story-1" } });
      }
      throw new Error(`Unexpected fetch ${href}`);
    }) as typeof fetch;

    const result = await publishInstagramMedia({
      igUserId: "ig-user-1",
      accessToken: "token",
      mediaUrl: "https://cdn.example.test/story.jpg",
      caption: "story",
      format: "INSTAGRAM_STORY",
      mediaType: "IMAGE",
    });

    assert.equal(result.externalPostId, "ig-story-1");
    const createCall = calls.find((call) => call.url.endsWith("/me/media"));
    assert.ok(createCall?.body?.includes("media_type=STORIES"));
    assert.ok(createCall?.body?.includes("image_url=https%3A%2F%2Fcdn.example.test%2Fstory.jpg"));
  });

  it("uses REELS media_type for Instagram reel videos", async () => {
    const calls: Array<{ url: string; body?: string | null }> = [];
    (globalThis as { fetch: typeof fetch }).fetch = (async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      calls.push({ url: href, body: typeof init?.body === "string" ? init.body : null });
      if (href.includes("/me?fields=")) return response({ json: { id: "ig-user-1" } });
      if (href.endsWith("/me/media")) return response({ json: { id: "container-1" } });
      if (href.includes("/container-1?fields=status_code,status")) return response({ json: { id: "container-1", status_code: "FINISHED" } });
      if (href.endsWith("/me/media_publish")) return response({ json: { id: "ig-reel-1" } });
      throw new Error(`Unexpected fetch ${href}`);
    }) as typeof fetch;

    await publishInstagramMedia({
      igUserId: "ig-user-1",
      accessToken: "token",
      mediaUrl: "https://cdn.example.test/reel.mp4",
      caption: "reel",
      format: "INSTAGRAM_REEL",
      mediaType: "VIDEO",
    });

    const createCall = calls.find((call) => call.url.endsWith("/me/media"));
    assert.ok(createCall?.body?.includes("media_type=REELS"));
    assert.ok(createCall?.body?.includes("video_url=https%3A%2F%2Fcdn.example.test%2Freel.mp4"));
  });
});

describe("Facebook publisher", () => {
  it("publishes Facebook image stories through photos then photo_stories", async () => {
    const calls: Array<{ url: string; body?: string | null }> = [];
    process.env.FACEBOOK_GRAPH_API_VERSION = "v99.0";
    (globalThis as { fetch: typeof fetch }).fetch = (async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      calls.push({ url: href, body: typeof init?.body === "string" ? init.body : null });
      if (href.endsWith("/photos")) return response({ json: { id: "photo-1" } });
      if (href.endsWith("/photo_stories")) return response({ json: { post_id: "story-1" } });
      throw new Error(`Unexpected fetch ${href}`);
    }) as typeof fetch;

    const result = await facebookPagePublisher.publish({
      targetId: "page-1",
      accessToken: "token",
      mediaUrl: "https://cdn.example.test/story.jpg",
      caption: "caption",
      format: "FACEBOOK_STORY",
      mediaType: "IMAGE",
    });

    assert.equal(result.externalPostId, "story-1");
    assert.equal(calls[0]?.url, "https://graph.facebook.com/v99.0/page-1/photos");
    assert.ok(calls[0]?.body?.includes("published=false"));
    assert.equal(calls[1]?.url, "https://graph.facebook.com/v99.0/page-1/photo_stories");
    assert.ok(calls[1]?.body?.includes("photo_id=photo-1"));
  });

  it("publishes Facebook reels through start, upload, and finish", async () => {
    const calls: Array<{ url: string; bodyType: string; body?: string | null }> = [];
    process.env.FACEBOOK_GRAPH_API_VERSION = "v99.0";
    (globalThis as { fetch: typeof fetch }).fetch = (async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      calls.push({
        url: href,
        bodyType: init?.body instanceof Blob ? "blob" : typeof init?.body,
        body: typeof init?.body === "string" ? init.body : null,
      });
      if (href === "https://graph.facebook.com/v99.0/page-1/video_reels" && typeof init?.body === "string" && init.body.includes("upload_phase=start")) {
        return response({ json: { video_id: "video-1", upload_url: "https://upload.meta.example/reel" } });
      }
      if (href === "https://cdn.example.test/reel.mp4") {
        return response({ blob: new Blob(["video-bytes"], { type: "video/mp4" }) });
      }
      if (href === "https://upload.meta.example/reel") {
        return response({ text: "ok" });
      }
      if (href === "https://graph.facebook.com/v99.0/page-1/video_reels" && typeof init?.body === "string" && init.body.includes("upload_phase=finish")) {
        return response({ json: { post_id: "reel-1" } });
      }
      throw new Error(`Unexpected fetch ${href}`);
    }) as typeof fetch;

    const result = await facebookPagePublisher.publish({
      targetId: "page-1",
      accessToken: "token",
      mediaUrl: "https://cdn.example.test/reel.mp4",
      caption: "caption",
      format: "FACEBOOK_REEL",
      mediaType: "VIDEO",
    });

    assert.equal(result.externalPostId, "reel-1");
    assert.equal(calls[0]?.url, "https://graph.facebook.com/v99.0/page-1/video_reels");
    assert.ok(calls[0]?.body?.includes("upload_phase=start"));
    assert.equal(calls[2]?.url, "https://upload.meta.example/reel");
    assert.equal(calls[2]?.bodyType, "blob");
    assert.equal(calls[3]?.url, "https://graph.facebook.com/v99.0/page-1/video_reels");
    assert.ok(calls[3]?.body?.includes("upload_phase=finish"));
    assert.ok(calls[3]?.body?.includes("video_state=PUBLISHED"));
  });
});
