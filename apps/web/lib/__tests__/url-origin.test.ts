import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { resolvePublicOrigin, OriginResolutionError } from "../url-origin";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function setNodeEnv(value: string | undefined) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

function restoreNodeEnv() {
  (process.env as Record<string, string | undefined>).NODE_ENV = ORIGINAL_NODE_ENV;
}

describe("resolvePublicOrigin", () => {
  afterEach(() => restoreNodeEnv());

  describe("development mode", () => {
    beforeEach(() => setNodeEnv("development"));

    it("dev: returns origin from request when https", () => {
      const result = resolvePublicOrigin("https://myapp.vercel.app");
      assert.equal(result, "https://myapp.vercel.app");
    });

    it("dev: allows localhost http", () => {
      const result = resolvePublicOrigin("http://localhost:3000");
      assert.equal(result, "http://localhost:3000");
    });

    it("dev: allows localhost http with any port", () => {
      const result = resolvePublicOrigin("http://localhost:9999");
      assert.equal(result, "http://localhost:9999");
    });

    it("dev: falls back to localhost when no origin provided", () => {
      const result = resolvePublicOrigin(undefined);
      assert.equal(result, "http://localhost:3000");
    });

    it("dev: strips trailing slash", () => {
      const result = resolvePublicOrigin("https://myapp.vercel.app/");
      assert.equal(result, "https://myapp.vercel.app");
    });

    it("dev: rejects javascript protocol", () => {
      assert.throws(
        () => resolvePublicOrigin("javascript:alert(1)"),
        OriginResolutionError,
      );
    });

    it("dev: rejects data protocol", () => {
      assert.throws(
        () => resolvePublicOrigin("data:text/html,<script>alert(1)</script>"),
        OriginResolutionError,
      );
    });

    it("dev: empty string falls back to localhost", () => {
      const result = resolvePublicOrigin("");
      assert.equal(result, "http://localhost:3000");
    });
  });

  describe("preview/production mode", () => {
    beforeEach(() => setNodeEnv("production"));

    it("prod: returns https origin from request", () => {
      const result = resolvePublicOrigin("https://heptacore-3wgk3f5tm-bkgs-projects-829c67c1.vercel.app");
      assert.equal(result, "https://heptacore-3wgk3f5tm-bkgs-projects-829c67c1.vercel.app");
    });

    it("prod: returns production origin from request", () => {
      const result = resolvePublicOrigin("https://heptacore.vercel.app");
      assert.equal(result, "https://heptacore.vercel.app");
    });

    it("prod: rejects http even localhost", () => {
      assert.throws(
        () => resolvePublicOrigin("http://localhost:3000"),
        OriginResolutionError,
      );
    });

    it("prod: rejects missing origin", () => {
      assert.throws(
        () => resolvePublicOrigin(undefined),
        OriginResolutionError,
      );
    });

    it("prod: strips trailing slash", () => {
      const result = resolvePublicOrigin("https://example.com/");
      assert.equal(result, "https://example.com");
    });

    it("prod: rejects http origin", () => {
      assert.throws(
        () => resolvePublicOrigin("http://example.com"),
        OriginResolutionError,
      );
    });

    it("prod: rejects javascript protocol", () => {
      assert.throws(
        () => resolvePublicOrigin("javascript:void(0)"),
        OriginResolutionError,
      );
    });

    it("prod: rejects malformed string", () => {
      assert.throws(
        () => resolvePublicOrigin("not a url"),
        OriginResolutionError,
      );
    });

    it("prod: rejects empty host", () => {
      assert.throws(
        () => resolvePublicOrigin("https://"),
        OriginResolutionError,
      );
    });
  });
});
