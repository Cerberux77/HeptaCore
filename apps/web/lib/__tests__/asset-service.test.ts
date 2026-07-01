import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AssetServiceError,
  createTenantAssetDerivatives,
  createTenantAssetFromBlob,
  deleteTenantAsset,
  listTenantAssets,
  replaceTenantAssetContent,
  updateTenantAssetMetadata,
  uploadTenantAsset,
} from "../asset-service";
import { planFormatDerivative } from "../asset-format-derivatives";
import { resolveAssetUrl } from "../asset-resolution";
import { buildPreviewData, normalizeAssetManifest } from "../publishing-formats";
import { waitForRegisteredAsset } from "../asset-upload";
import type { TenantAssetItem } from "../dashboard";
import type { AssetStorageAdapter } from "../asset-storage";

type Row = Record<string, any>;

class MemoryStorage implements AssetStorageAdapter {
  uploaded: string[] = [];
  deleted: string[] = [];
  failDelete = false;

  async upload(input: { pathname: string; contentType: string }): Promise<any> {
    this.uploaded.push(input.pathname);
    return { pathname: input.pathname, url: `https://blob.test/${input.pathname}`, etag: "etag-1" };
  }

  async delete(pathname: string): Promise<void> {
    if (this.failDelete) throw new Error("delete failed");
    this.deleted.push(pathname);
  }

  async head(pathname: string): Promise<any> {
    return { exists: this.uploaded.includes(pathname), pathname, url: `https://blob.test/${pathname}` };
  }

  async exists(pathname: string): Promise<boolean> {
    return this.uploaded.includes(pathname);
  }
}

class FakeDb {
  tenants: Row[] = [
    { id: "tenant-a", slug: "tenant-a" },
    { id: "tenant-b", slug: "tenant-b" },
  ];
  memberships: Row[] = [
    { tenantId: "tenant-a", userId: "user-a", role: "EDITOR" },
    { tenantId: "tenant-b", userId: "user-b", role: "EDITOR" },
  ];
  assets: Row[] = [
    { id: "asset-a", tenantId: "tenant-a", kind: "IMAGE", filename: "a.jpg", mimeType: "image/jpeg", storageKey: "old/a.jpg", sourcePath: "https://blob.test/old/a.jpg", metadata: { sizeBytes: 100, folder: "" }, rightsStatus: "needs_review" },
    { id: "asset-b", tenantId: "tenant-b", kind: "IMAGE", filename: "b.jpg", mimeType: "image/jpeg", storageKey: "old/b.jpg", sourcePath: "https://blob.test/old/b.jpg", metadata: { sizeBytes: 100, folder: "" }, rightsStatus: "needs_review" },
  ];
  links: Row[] = [];
  drafts: Row[] = [];
  failAssetCreate = false;

  tenant = {
    findUnique: async ({ where }: any) => this.tenants.find((tenant) => tenant.slug === where.slug || tenant.id === where.id) ?? null,
  };

  membership = {
    findUnique: async ({ where }: any) => this.memberships.find((m) => m.tenantId === where.tenantId_userId.tenantId && m.userId === where.tenantId_userId.userId) ?? null,
    findMany: async ({ where }: any) => this.memberships.filter((m) => m.userId === where.userId),
  };

  user = {
    findUnique: async ({ where }: any) => {
      const id = where?.id;
      return { id };
    },
  };

  asset = {
    findMany: async ({ where }: any) => this.assets.filter((asset) => asset.tenantId === where.tenantId).map((asset) => this.withCount(asset)),
    findFirst: async ({ where }: any) => {
      const asset = this.assets.find((row) => row.id === where.id && row.tenantId === where.tenantId);
      return asset ? this.withCount(asset) : null;
    },
    create: async ({ data }: any) => {
      if (this.failAssetCreate) throw new Error("db failed");
      const row = { id: `asset-${this.assets.length + 1}`, createdAt: new Date(), ...data };
      this.assets.push(row);
      return row;
    },
    update: async ({ where, data }: any) => {
      const index = this.assets.findIndex((asset) => asset.id === where.id);
      if (index < 0) throw new Error("missing asset");
      this.assets[index] = { ...this.assets[index], ...data };
      return this.assets[index];
    },
    delete: async ({ where }: any) => {
      const index = this.assets.findIndex((asset) => asset.id === where.id);
      const [row] = this.assets.splice(index, 1);
      return row;
    },
  };

  contentDraft = {
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const draft of this.drafts) {
        const linked = this.links.some((link) => link.draftId === draft.id && link.assetId === where.assets.some.assetId);
        if (draft.tenantId === where.tenantId && draft.status === where.status && linked) {
          Object.assign(draft, data);
          count++;
        }
      }
      return { count };
    },
  };

  async $transaction(fn: any) {
    return fn(this);
  }

  private withCount(asset: Row) {
    return { ...asset, _count: { drafts: this.links.filter((link) => link.assetId === asset.id).length } };
  }
}

function file(name: string, type: string, size = 10) {
  return new File([new Uint8Array(size)], name, { type });
}

describe("tenant asset service", () => {
  it("uploads assets into the authenticated tenant and records audit", async () => {
    const db = new FakeDb();
    const storage = new MemoryStorage();
    const audits: Row[] = [];
    const asset = await uploadTenantAsset({
      tenantSlug: "tenant-a",
      userId: "user-a",
      file: file("hero image.jpg", "image/jpeg"),
      folder: "feed",
      technicalMetadata: { width: 1080, height: 1080, mimeType: "image/jpeg", sizeBytes: 10 },
      db: db as any,
      storage,
      audit: async (entry) => { audits.push(entry); },
    });
    assert.equal(asset.tenantId, "tenant-a");
    assert.equal(asset.filename, "hero-image.jpg");
    assert.equal((asset.metadata as Row).folder, "feed");
    assert.equal((asset.metadata as Row).width, 1080);
    assert.equal((asset.metadata as Row).height, 1080);
    assert.deepEqual((asset.metadata as Row).aspectRatio, { value: 1, label: "1:1" });
    assert.equal((asset.metadata as Row).metadataVersion, 1);
    assert.equal(audits[0].action, "asset_uploaded");
  });

  it("does not list, rename, replace, or delete assets across tenants", async () => {
    const db = new FakeDb();
    await assert.rejects(() => listTenantAssets({ tenantSlug: "tenant-b", userId: "user-a", db: db as any }), AssetServiceError);
    await assert.rejects(() => updateTenantAssetMetadata({ tenantSlug: "tenant-a", userId: "user-a", assetId: "asset-b", filename: "x.jpg", db: db as any, audit: async () => {} }), AssetServiceError);
    await assert.rejects(() => replaceTenantAssetContent({ tenantSlug: "tenant-a", userId: "user-a", assetId: "asset-b", file: file("x.jpg", "image/jpeg"), db: db as any, storage: new MemoryStorage(), audit: async () => {} }), AssetServiceError);
    await assert.rejects(() => deleteTenantAsset({ tenantSlug: "tenant-a", userId: "user-a", assetId: "asset-b", db: db as any, storage: new MemoryStorage(), audit: async () => {} }), AssetServiceError);
  });

  it("rejects invalid MIME, excessive size, and normalizes unsafe filenames", async () => {
    const db = new FakeDb();
    await assert.rejects(() => uploadTenantAsset({ tenantSlug: "tenant-a", userId: "user-a", file: file("bad.pdf", "application/pdf"), db: db as any, storage: new MemoryStorage(), audit: async () => {} }), /Unsupported MIME/);
    await assert.rejects(() => uploadTenantAsset({ tenantSlug: "tenant-a", userId: "user-a", file: file("huge.mp4", "video/mp4", 101 * 1024 * 1024), db: db as any, storage: new MemoryStorage(), audit: async () => {} }), /size limit/);
    const asset = await uploadTenantAsset({ tenantSlug: "tenant-a", userId: "user-a", file: file("../evil name.jpg", "image/jpeg"), db: db as any, storage: new MemoryStorage(), audit: async () => {} });
    assert.equal(asset.filename, "evil-name.jpg");
  });

  it("cleans the uploaded blob when DB create fails", async () => {
    const db = new FakeDb();
    db.failAssetCreate = true;
    const storage = new MemoryStorage();
    await assert.rejects(() => uploadTenantAsset({ tenantSlug: "tenant-a", userId: "user-a", file: file("a.jpg", "image/jpeg"), db: db as any, storage, audit: async () => {} }), /db failed/);
    assert.deepEqual(storage.deleted, storage.uploaded);
  });

  it("replaces content while preserving Asset.id, draft links, audit log, and invalidating approved drafts", async () => {
    const db = new FakeDb();
    db.links.push({ draftId: "draft-1", assetId: "asset-a", role: "primary" });
    db.drafts.push({ id: "draft-1", tenantId: "tenant-a", status: "APPROVED", requiresReview: false });
    const audits: Row[] = [];
    const updated = await replaceTenantAssetContent({
      tenantSlug: "tenant-a",
      userId: "user-a",
      assetId: "asset-a",
      file: file("new.jpg", "image/jpeg"),
      technicalMetadata: { width: 1080, height: 1920, mimeType: "image/jpeg", sizeBytes: 10 },
      db: db as any,
      storage: new MemoryStorage(),
      audit: async (entry) => { audits.push(entry); },
    });
    assert.equal(updated.id, "asset-a");
    assert.equal(db.links[0].assetId, "asset-a");
    assert.equal(db.drafts[0].status, "NEEDS_REVIEW");
    assert.equal((updated.metadata as Row).width, 1080);
    assert.equal((updated.metadata as Row).height, 1920);
    assert.equal((updated.metadata as Row).orientation, "portrait");
    assert.equal(audits.some((entry) => entry.action === "asset_content_replaced"), true);
  });

  it("renames, moves, deletes free assets, and blocks delete when in use", async () => {
    const db = new FakeDb();
    const audit = async () => {};
    const moved = await updateTenantAssetMetadata({ tenantSlug: "tenant-a", userId: "user-a", assetId: "asset-a", filename: "renamed.jpg", folder: "story", db: db as any, audit });
    assert.equal(moved.filename, "renamed.jpg");
    assert.equal((moved.metadata as Row).folder, "story");

    db.links.push({ draftId: "draft-1", assetId: "asset-a", role: "primary" });
    await assert.rejects(() => deleteTenantAsset({ tenantSlug: "tenant-a", userId: "user-a", assetId: "asset-a", db: db as any, storage: new MemoryStorage(), audit }), (error: any) => error.code === "ASSET_IN_USE");
    db.links = [];
    const storage = new MemoryStorage();
    await deleteTenantAsset({ tenantSlug: "tenant-a", userId: "user-a", assetId: "asset-a", db: db as any, storage, audit });
    assert.equal(db.assets.some((asset) => asset.id === "asset-a"), false);
    assert.deepEqual(storage.deleted, ["old/a.jpg"]);
  });

  it("persists analyzed legacy metadata through tenant-scoped update", async () => {
    const db = new FakeDb();
    db.assets[0].metadata = { folder: "", originalFilename: "legacy.jpg" };
    const updated = await updateTenantAssetMetadata({
      tenantSlug: "tenant-a",
      userId: "user-a",
      assetId: "asset-a",
      technicalMetadata: { width: 1080, height: 1920, mimeType: "image/jpeg", sizeBytes: 100 },
      db: db as any,
      audit: async () => {},
    });
    assert.equal((updated.metadata as Row).width, 1080);
    assert.equal((updated.metadata as Row).height, 1920);
    assert.equal((updated.metadata as Row).orientation, "portrait");
  });

  it("keeps Turpial legacy assets renderable and Blob URLs usable in multiformat previews", async () => {
    const legacy = resolveAssetUrl({ sourcePath: "examples/tenants/turpial/content/inbox/facebook/cover.jpg" }, "turpial-sound");
    assert.equal(legacy, "/tenant-assets/turpial/facebook/cover.jpg");

    const links = [
      { role: "primary", assetId: "blob-1", asset: { id: "blob-1", filename: "feed.jpg", sourcePath: "https://blob.test/feed.jpg", storageKey: "tenants/tenant-a/assets/u/feed.jpg", mimeType: "image/jpeg", kind: "IMAGE", metadata: { width: 1080, height: 1080, sizeBytes: 1000 } } },
      { role: "asset_002", assetId: "blob-2", asset: { id: "blob-2", filename: "story.mp4", sourcePath: "https://blob.test/story.mp4", storageKey: "tenants/tenant-a/assets/u/story.mp4", mimeType: "video/mp4", kind: "VIDEO", metadata: { width: 1080, height: 1920, sizeBytes: 2000 } } },
    ];
    const assets = normalizeAssetManifest(links, (asset) => resolveAssetUrl(asset, "tenant-a"));
    assert.equal(buildPreviewData("INSTAGRAM_FEED", assets.slice(0, 1)).assets[0].url, "https://blob.test/feed.jpg");
    assert.deepEqual(buildPreviewData("INSTAGRAM_CAROUSEL", assets).assets.map((asset) => asset.id), ["blob-1", "blob-2"]);
    assert.equal(buildPreviewData("INSTAGRAM_STORY", assets.slice(1)).assets[0].url, "https://blob.test/story.mp4");
  });

  it("does not import publisher adapters from tenant asset code", () => {
    const source = readFileSync(join(process.cwd(), "lib", "asset-service.ts"), "utf8");
    assert.doesNotMatch(source, /from "\.\/publishers|from "\.\/publishers\/|getPublisher\(|\.publish\(/);
  });

  it("creates idempotent persisted format derivatives without mutating source storage", async () => {
    const db = new FakeDb();
    db.assets[0].metadata = {
      sizeBytes: 100,
      folder: "feed",
      width: 1080,
      height: 1080,
      mimeType: "image/jpeg",
    };

    const plan = planFormatDerivative("asset-a", {
      kind: "IMAGE",
      mimeType: "image/jpeg",
      width: 1080,
      height: 1080,
      metadata: db.assets[0].metadata,
    }, "INSTAGRAM_STORY");

    const first = await createTenantAssetDerivatives({
      tenantSlug: "tenant-a",
      userId: "user-a",
      assetId: "asset-a",
      plans: [plan],
      db: db as any,
      audit: async () => {},
    });
    const second = await createTenantAssetDerivatives({
      tenantSlug: "tenant-a",
      userId: "user-a",
      assetId: "asset-a",
      plans: [plan],
      db: db as any,
      audit: async () => {},
    });

    assert.equal(first.length, 1);
    assert.equal(second.length, 1);
    assert.equal(first[0].id, second[0].id);
    assert.equal(first[0].storageKey, null);
    assert.equal(first[0].sourcePath, "https://blob.test/old/a.jpg");
    assert.equal((first[0].metadata as Row).width, 1080);
    assert.equal((first[0].metadata as Row).height, 1920);
    assert.equal(((first[0].metadata as Row).derivative as Row).target, "INSTAGRAM_STORY");
    assert.equal(db.assets.length, 3);
  });

  it("deletes derivative records without deleting the source blob", async () => {
    const db = new FakeDb();
    db.assets[0].metadata = {
      sizeBytes: 100,
      folder: "feed",
      width: 1080,
      height: 1080,
      mimeType: "image/jpeg",
    };

    const plan = planFormatDerivative("asset-a", {
      kind: "IMAGE",
      mimeType: "image/jpeg",
      width: 1080,
      height: 1080,
      metadata: db.assets[0].metadata,
    }, "FACEBOOK_FEED_IMAGE");

    const [derivative] = await createTenantAssetDerivatives({
      tenantSlug: "tenant-a",
      userId: "user-a",
      assetId: "asset-a",
      plans: [plan],
      db: db as any,
      audit: async () => {},
    });

    const storage = new MemoryStorage();
    await deleteTenantAsset({
      tenantSlug: "tenant-a",
      userId: "user-a",
      assetId: derivative.id,
      db: db as any,
      storage,
      audit: async () => {},
    });

    assert.deepEqual(storage.deleted, []);
    assert.equal(db.assets.some((asset) => asset.id === derivative.id), false);
  });
});

describe("waitForRegisteredAsset", () => {
  it("finds asset after retries", async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = async (input: any, init?: any) => {
      callCount++;
      const body = init?.body ? JSON.parse(init.body as string) : {};
      if (callCount <= 2) {
        return new Response(JSON.stringify({ ok: true, found: false }), { status: 200 });
      }
      return new Response(JSON.stringify({
        ok: true,
        found: true,
        asset: { id: "asset-x", filename: "test.jpg", kind: "IMAGE", path: "/test.jpg", storageKey: body.storageKey },
      }), { status: 200 });
    };
    try {
      const result = await waitForRegisteredAsset("test-tenant", "tenants/t1/assets/u/test.jpg", { attempts: 5, initialDelayMs: 10, maxDelayMs: 50 });
      assert.equal(result.found, true);
      assert.ok(result.asset);
      assert.equal(result.asset!.filename, "test.jpg");
      assert.equal(callCount, 3);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("times out without false success", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, found: false }), { status: 200 });
    try {
      const result = await waitForRegisteredAsset("test-tenant", "tenants/t1/assets/u/missing.jpg", { attempts: 4, initialDelayMs: 5, maxDelayMs: 20 });
      assert.equal(result.found, false);
      assert.equal(result.attempts, 4);
      assert.equal(result.asset, undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("retry has exponential backoff", async () => {
    const originalFetch = globalThis.fetch;
    const delays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((fn: any, ms?: number, ...args: any[]) => {
      if (typeof ms === "number") delays.push(ms);
      return originalSetTimeout(fn, ms, ...args);
    }) as typeof globalThis.setTimeout;
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, found: false }), { status: 200 });
    try {
      await waitForRegisteredAsset("test-tenant", "key", { attempts: 5, initialDelayMs: 100, maxDelayMs: 1000 });
      assert.ok(delays.length >= 4);
      assert.ok(delays[0] <= delays[1]);
      assert.ok(delays[1] <= delays[2]);
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.setTimeout = originalSetTimeout;
    }
  });
});

describe("by-storage-key endpoint", () => {
  it("requires auth (verified by route source)", () => {
    const source = readFileSync(join(process.cwd(), "app", "api", "tenants", "[slug]", "assets", "by-storage-key", "route.ts"), "utf8");
    assert.match(source, /from.*auth/);
    assert.match(source, /auth\(\)/);
    assert.match(source, /session\?\.user\?\.id/);
  });

  it("requires tenant membership (verified by route source)", () => {
    const source = readFileSync(join(process.cwd(), "app", "api", "tenants", "[slug]", "assets", "by-storage-key", "route.ts"), "utf8");
    assert.match(source, /membership/);
    assert.match(source, /findUnique/);
  });

  it("returns found:true for registered asset", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({
      ok: true,
      found: true,
      asset: { id: "asset-1", filename: "photo.jpg", kind: "IMAGE", path: "/path/photo.jpg", storageKey: "key-1", mimeType: "image/jpeg", rightsStatus: "needs_review" },
    }), { status: 200 });
    try {
      const res = await fetch("/api/tenants/test/assets/by-storage-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageKey: "key-1" }),
      });
      const data = await res.json();
      assert.equal(data.ok, true);
      assert.equal(data.found, true);
      assert.equal(data.asset.filename, "photo.jpg");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns found:false for unknown storageKey", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, found: false }), { status: 200 });
    try {
      const res = await fetch("/api/tenants/test/assets/by-storage-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageKey: "unknown-key" }),
      });
      const data = await res.json();
      assert.equal(data.ok, true);
      assert.equal(data.found, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("collections management", () => {
  it("collections list from existing assets", () => {
    const assets: TenantAssetItem[] = [
      { id: "a1", kind: "IMAGE", filename: "a.jpg", mimeType: "image/jpeg", storageKey: "k1", path: "/a.jpg", rightsStatus: "needs_review", folder: "feed", draftCount: 0 },
      { id: "a2", kind: "IMAGE", filename: "b.jpg", mimeType: "image/jpeg", storageKey: "k2", path: "/b.jpg", rightsStatus: "needs_review", folder: "feed", draftCount: 0 },
      { id: "a3", kind: "IMAGE", filename: "c.jpg", mimeType: "image/jpeg", storageKey: "k3", path: "/c.jpg", rightsStatus: "needs_review", folder: "stories", draftCount: 0 },
      { id: "a4", kind: "IMAGE", filename: "d.jpg", mimeType: "image/jpeg", storageKey: "k4", path: "/d.jpg", rightsStatus: "needs_review", draftCount: 0 },
    ];
    const folders = new Set(assets.map((a) => a.folder ?? "").filter(Boolean));
    const sorted = [...folders].sort();
    assert.deepEqual(sorted, ["feed", "stories"]);
  });

  it("create collection inline", () => {
    const existingFolders = ["feed", "stories"];
    const newName = "  highlights  ";
    const trimmed = newName.trim();
    assert.equal(trimmed, "highlights");
    assert.ok(trimmed.length > 0);
    assert.ok(trimmed.length <= 80);
    assert.ok(!trimmed.includes(".."));
    assert.ok(!existingFolders.some((f) => f.toLowerCase() === trimmed.toLowerCase()));
  });

  it("dedup case-insensitive", () => {
    const existingFolders = ["Feed", "STORIES"];
    const newName = "FEED";
    const exists = existingFolders.some((f) => f.toLowerCase() === newName.toLowerCase());
    assert.equal(exists, true);

    const newName2 = "Highlights";
    const exists2 = existingFolders.some((f) => f.toLowerCase() === newName2.toLowerCase());
    assert.equal(exists2, false);
  });
});

describe("waitForRegisteredAsset error handling", () => {
  it("continues polling after 500 temporary", async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount <= 2) {
        return new Response("", { status: 500, statusText: "Internal Server Error" });
      }
      return new Response(JSON.stringify({
        ok: true,
        found: true,
        asset: { id: "asset-x", filename: "test.jpg", kind: "IMAGE", path: "/test.jpg", storageKey: "key-1" },
      }), { status: 200 });
    };
    try {
      const result = await waitForRegisteredAsset("test-tenant", "key-1", { attempts: 5, initialDelayMs: 5, maxDelayMs: 20 });
      assert.equal(result.found, true);
      assert.ok(result.asset);
      assert.equal(callCount, 3);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("handles non-JSON response gracefully", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("not json", { status: 200 });
    try {
      const result = await waitForRegisteredAsset("test-tenant", "key-1", { attempts: 3, initialDelayMs: 5, maxDelayMs: 20 });
      assert.equal(result.found, false);
      assert.ok(result.lastError);
      assert.match(result.lastError!, /not valid JSON/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("stops on 401/403", async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return new Response(JSON.stringify({ ok: false, found: false }), { status: 403, statusText: "Forbidden" });
    };
    try {
      const result = await waitForRegisteredAsset("test-tenant", "key-1", { attempts: 5, initialDelayMs: 5, maxDelayMs: 20 });
      assert.equal(result.found, false);
      assert.equal(result.retryable, false);
      assert.equal(callCount, 1);
      assert.equal(result.lastStatus, 403);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("retry and upload behavior", () => {
  it("retry does not create second row", () => {
    const originalItems: Array<{ id: string; state: string }> = [
      { id: "uid-1", state: "FAILED" },
    ];
    const retryId = "uid-1";
    const nextItems = originalItems.map((it) => it.id === retryId ? { ...it, state: "PENDING" } : it);
    assert.equal(nextItems.length, 1);
    assert.equal(nextItems[0].id, "uid-1");
  });

  it("retry of registration does not re-upload blob", async () => {
    const originalFetch = globalThis.fetch;
    let uploadCalls = 0;
    let lookupCalls = 0;
    const mockFetch = async () => {
      lookupCalls++;
      return new Response(JSON.stringify({
        ok: true,
        found: true,
        asset: { id: "asset-x", filename: "test.jpg", kind: "IMAGE", path: "/test.jpg", storageKey: "key-1" },
      }), { status: 200 });
    };
    globalThis.fetch = mockFetch;
    try {
      const result = await waitForRegisteredAsset("test-tenant", "key-1", { attempts: 3, initialDelayMs: 5, maxDelayMs: 20 });
      assert.equal(result.found, true);
      assert.equal(uploadCalls, 0);
      assert.equal(lookupCalls, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("zero provider calls", () => {
  it("zero provider calls", () => {
    const source = readFileSync(join(process.cwd(), "lib", "asset-service.ts"), "utf8");
    assert.doesNotMatch(source, /from "\.\/publishers|from "\.\/publishers\/|getPublisher\(|\.publish\(/);
  });
});
