import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import { youtubePublisher } from "../publishers/youtube";
import { ProviderError } from "../publishers/types";

describe("youtubePublisher", () => {
  it("uploads a video and optional thumbnail", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    mock.method(global, "fetch", (async (url: string | URL, init?: RequestInit) => {
      const target = String(url);
      calls.push({ url: target, method: init?.method || "GET" });
      if (target === "https://cdn.example.com/video.mp4") {
        return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "video/mp4" } });
      }
      if (target === "https://cdn.example.com/thumb.jpg") {
        return new Response(new Uint8Array([4, 5, 6]), { status: 200, headers: { "content-type": "image/jpeg" } });
      }
      if (target.startsWith("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable")) {
        return new Response(null, { status: 200, headers: { location: "https://upload.example.com/session/1" } });
      }
      if (target === "https://upload.example.com/session/1") {
        return Response.json({ id: "yt_123", snippet: { title: "Hello" } }, { status: 200 });
      }
      if (target.startsWith("https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=yt_123")) {
        return Response.json({ items: [{ default: { url: "https://img.youtube.com/yt_123/default.jpg" } }] }, { status: 200 });
      }
      throw new Error(`Unexpected fetch ${target}`);
    }) as typeof fetch);

    try {
      const result = await youtubePublisher.publish({
        targetId: "channel_1",
        accessToken: "token",
        mediaUrl: "https://cdn.example.com/video.mp4",
        thumbnailUrl: "https://cdn.example.com/thumb.jpg",
        title: "Hello",
        description: "World",
        caption: "World",
        format: "YOUTUBE_VIDEO",
        mediaType: "VIDEO",
      });

      assert.equal(result.externalPostId, "yt_123");
      assert.equal((result.providerResponse as any).kind, "video");
      assert.equal(calls.filter((call) => call.method === "POST").length, 2);
      assert.equal(calls.some((call) => call.url === "https://upload.example.com/session/1" && call.method === "PUT"), true);
    } finally {
      mock.restoreAll();
    }
  });

  it("treats provider 5xx as ambiguous", async () => {
    mock.method(global, "fetch", (async (url: string | URL) => {
      const target = String(url);
      if (target.startsWith("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable")) {
        return Response.json({ error: { message: "backendError" } }, { status: 503 });
      }
      throw new Error(`Unexpected fetch ${target}`);
    }) as typeof fetch);

    try {
      await assert.rejects(
        youtubePublisher.publish({
          targetId: "channel_1",
          accessToken: "token",
          mediaUrl: "https://cdn.example.com/video.mp4",
          caption: "World",
          title: "Hello",
          mediaType: "VIDEO",
        }),
        (error: unknown) => error instanceof ProviderError && error.isAmbiguous === true
      );
    } finally {
      mock.restoreAll();
    }
  });

  it("refreshes the access token when refresh_token is present", async () => {
    const calls: string[] = [];
    process.env.GOOGLE_CLIENT_ID = "google-client";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    mock.method(global, "fetch", (async (url: string | URL) => {
      const target = String(url);
      calls.push(target);
      if (target === "https://oauth2.googleapis.com/token") {
        return Response.json({ access_token: "fresh-token" }, { status: 200 });
      }
      if (target === "https://cdn.example.com/video.mp4") {
        return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "video/mp4" } });
      }
      if (target.startsWith("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable")) {
        return new Response(null, { status: 200, headers: { location: "https://upload.example.com/session/2" } });
      }
      if (target === "https://upload.example.com/session/2") {
        return Response.json({ id: "yt_refresh" }, { status: 200 });
      }
      throw new Error(`Unexpected fetch ${target}`);
    }) as typeof fetch);

    try {
      const result = await youtubePublisher.publish({
        targetId: "channel_1",
        accessToken: "",
        refreshToken: "refresh-token",
        mediaUrl: "https://cdn.example.com/video.mp4",
        caption: "World",
        title: "Hello",
        mediaType: "VIDEO",
      });

      assert.equal(result.externalPostId, "yt_refresh");
      assert.equal(calls[0], "https://oauth2.googleapis.com/token");
      assert.equal((result.providerResponse as any).refreshedAccessToken, true);
    } finally {
      mock.restoreAll();
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
    }
  });
});
