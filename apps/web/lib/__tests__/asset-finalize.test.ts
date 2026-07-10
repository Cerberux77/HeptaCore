import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AssetFinalizeError,
  resolveUploadedAssetAfterUpload,
} from "../asset-upload";
import { upsertTenantAssetList } from "../asset-presentation";
import {
  AssetServiceError,
  finalizeTenantAssetFromBlob,
} from "../asset-service";
import type { AssetStorageAdapter } from "../asset-storage";

type Row = Record<string, any>;

class MemoryStorage implements AssetStorageAdapter {
  blobs = new Map<string, { url: string; size: number }>();

  async upload(input: { pathname: string; contentType: string; sizeBytes?: number }): Promise<any> {
    const url = `https://blob.test/${input.pathname}`;
    this.blobs.set(input.pathname, { url, size: input.sizeBytes ?? 0 });
    return { pathname: input.pathname, url, etag: "etag-1" };
  }

  async delete(pathname: string): Promise<void> {
    this.blobs.delete(pathname);
  }

  async head(pathname: string): Promise<any> {
    const blob = this.blobs.get(pathname);
    if (!blob) return { exists: false };
    return { exists: true, pathname, url: blob.url, size: blob.size };
  }

  async exists(pathname: string): Promise<boolean> {
    return this.blobs.has(pathname);
  }

  setBlob(pathname: string, size: number) {
    this.blobs.set(pathname, { url: `https://blob.test/${pathname}`, size });
  }
}

class FakeDb {
  tenants: Row[] = [
    { id: "tenant-a", slug: "tenant-a" },
    { id: "tenant-b", slug: "tenant-b" },
  ];
  memberships: Row[] = [
    { tenantId: "tenant-a", userId: "user-a", role: "PUBLISHER" },
    { tenantId: "tenant-b", userId: "user-b", role: "PUBLISHER" },
  ];
  assets: Row[] = [];
  drafts: Row[] = [];
  transactionQueue = Promise.resolve();
  executeRawCalls = 0;

  tenant = {
    findUnique: async ({ where }: any) => this.tenants.find((tenant) => tenant.slug === where.slug || tenant.id === where.id) ?? null,
  };

  membership = {
    findUnique: async ({ where }: any) => this.memberships.find((membership) => membership.tenantId === where.tenantId_userId.tenantId && membership.userId === where.tenantId_userId.userId) ?? null,
    findMany: async ({ where }: any) => this.memberships.filter((m) => m.userId === where.userId),
  };

  user = {
    findUnique: async ({ where }: any) => {
      const id = where?.id;
      return { id };
    },
  };

  asset = {
    findFirst: async ({ where }: any) => {
      const asset = this.assets.find((row) => {
        if (where.id && row.id !== where.id) return false;
        if (where.tenantId && row.tenantId !== where.tenantId) return false;
        if (where.storageKey && row.storageKey !== where.storageKey) return false;
        return true;
      });
      return asset ? this.withCount(asset) : null;
    },
    findMany: async ({ where }: any) => this.assets.filter((asset) => asset.tenantId === where.tenantId).map((asset) => this.withCount(asset)),
    create: async ({ data, include }: any) => {
      const row = { id: `asset-${this.assets.length + 1}`, createdAt: new Date(), ...data };
      this.assets.push(row);
      return include ? this.withCount(row) : row;
    },
  };

  contentDraft = {
    updateMany: async () => ({ count: 0 }),
  };

  async $queryRaw() {
    throw new Error("$queryRaw should not be used for advisory finalize locks");
  }

  async $executeRaw() {
    this.executeRawCalls += 1;
    return 1;
  }

  async $transaction(fn: any) {
    const previous = this.transactionQueue;
    let release!: () => void;
    this.transactionQueue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await fn(this);
    } finally {
      release();
    }
  }

  private withCount(asset: Row) {
    return { ...asset, _count: { drafts: this.drafts.filter((draft) => draft.assetId === asset.id).length } };
  }
}

function finalizeParams(overrides: Partial<Parameters<typeof finalizeTenantAssetFromBlob>[0]> = {}) {
  return {
    tenantSlug: "tenant-a",
    userId: "user-a",
    originalFilename: "cover.jpg",
    contentType: "image/jpeg",
    sizeBytes: 1024,
    pathname: "tenants/tenant-a/assets/u1/cover.jpg",
    url: "https://blob.test/tenants/tenant-a/assets/u1/cover.jpg",
    folder: "feed",
    technicalMetadata: { width: 1080, height: 1080, mimeType: "image/jpeg", sizeBytes: 1024 },
    ...overrides,
  };
}

describe("finalizeTenantAssetFromBlob", () => {
  it("creates an Asset from an existing blob", async () => {
    const db = new FakeDb();
    const storage = new MemoryStorage();
    storage.setBlob("tenants/tenant-a/assets/u1/cover.jpg", 1024);

    const asset = await finalizeTenantAssetFromBlob({
      ...finalizeParams(),
      db: db as any,
      storage,
      audit: async () => {},
    });

    assert.equal(asset.tenantId, "tenant-a");
    assert.equal(asset.storageKey, "tenants/tenant-a/assets/u1/cover.jpg");
    assert.equal(asset.sourcePath, "https://blob.test/tenants/tenant-a/assets/u1/cover.jpg");
    assert.equal((asset.metadata as Row).folder, "feed");
    assert.equal(db.executeRawCalls, 1);
  });

  it("returns the existing Asset idempotently", async () => {
    const db = new FakeDb();
    const storage = new MemoryStorage();
    storage.setBlob("tenants/tenant-a/assets/u1/cover.jpg", 1024);

    const first = await finalizeTenantAssetFromBlob({
      ...finalizeParams(),
      db: db as any,
      storage,
      audit: async () => {},
    });
    const second = await finalizeTenantAssetFromBlob({
      ...finalizeParams(),
      db: db as any,
      storage,
      audit: async () => {},
    });

    assert.equal(first.id, second.id);
    assert.equal(db.assets.length, 1);
  });

  it("does not duplicate when finalize and callback race", async () => {
    const db = new FakeDb();
    const storage = new MemoryStorage();
    storage.setBlob("tenants/tenant-a/assets/u1/cover.jpg", 1024);

    const [first, second] = await Promise.all([
      finalizeTenantAssetFromBlob({ ...finalizeParams(), db: db as any, storage, audit: async () => {} }),
      finalizeTenantAssetFromBlob({ ...finalizeParams(), db: db as any, storage, audit: async () => {} }),
    ]);

    assert.equal(first.id, second.id);
    assert.equal(db.assets.length, 1);
  });

  it("rejects pathname from another tenant", async () => {
    const db = new FakeDb();
    const storage = new MemoryStorage();
    storage.setBlob("tenants/tenant-b/assets/u1/cover.jpg", 1024);

    await assert.rejects(
      () => finalizeTenantAssetFromBlob({
        ...finalizeParams({
          pathname: "tenants/tenant-b/assets/u1/cover.jpg",
          url: "https://blob.test/tenants/tenant-b/assets/u1/cover.jpg",
        }),
        db: db as any,
        storage,
        audit: async () => {},
      }),
      (error: any) => error instanceof AssetServiceError && error.code === "ASSET_STORAGE_SCOPE",
    );
  });

  it("rejects missing blobs", async () => {
    const db = new FakeDb();

    await assert.rejects(
      () => finalizeTenantAssetFromBlob({
        ...finalizeParams(),
        db: db as any,
        storage: new MemoryStorage(),
        audit: async () => {},
      }),
      (error: any) => error instanceof AssetServiceError && error.code === "ASSET_BLOB_NOT_FOUND",
    );
  });
});

describe("resolveUploadedAssetAfterUpload", () => {
  it("returns the Asset from finalize without polling and can be added locally", async () => {
    let waitCalls = 0;
    const asset = {
      id: "asset-1",
      filename: "cover.jpg",
      kind: "IMAGE",
      path: "https://blob.test/cover.jpg",
      sourcePath: "https://blob.test/cover.jpg",
      storageKey: "tenants/tenant-a/assets/u1/cover.jpg",
      mimeType: "image/jpeg",
      rightsStatus: "needs_review",
      draftCount: 0,
      folder: "feed",
    };

    const result = await resolveUploadedAssetAfterUpload("tenant-a", {
      pathname: asset.storageKey!,
      url: asset.path!,
      contentType: asset.mimeType!,
      size: 1024,
      filename: asset.filename,
      folder: "feed",
    }, {
      deps: {
        finalizeUploadedAsset: async () => asset,
        waitForRegisteredAsset: async () => {
          waitCalls++;
          return { found: false, attempts: 1, retryable: false };
        },
      },
    });

    assert.equal(result.outcome, "ready");
    if (result.outcome === "ready") {
      assert.equal(result.source, "finalize");
      assert.equal(waitCalls, 0);
      const next = upsertTenantAssetList([], result.asset);
      assert.equal(next.length, 1);
      assert.equal(next[0].id, "asset-1");
    }
  });

  it("uses storageKey fallback after finalize timeout", async () => {
    let finalizeCalls = 0;
    let waitCalls = 0;
    const asset = {
      id: "asset-1",
      filename: "cover.jpg",
      kind: "IMAGE",
      path: "https://blob.test/cover.jpg",
      sourcePath: "https://blob.test/cover.jpg",
      storageKey: "tenants/tenant-a/assets/u1/cover.jpg",
      mimeType: "image/jpeg",
      rightsStatus: "needs_review",
      draftCount: 0,
    };

    const result = await resolveUploadedAssetAfterUpload("tenant-a", {
      pathname: asset.storageKey!,
      url: asset.path!,
      contentType: asset.mimeType!,
      size: 1024,
      filename: asset.filename,
    }, {
      deps: {
        finalizeUploadedAsset: async () => {
          finalizeCalls++;
          throw new AssetFinalizeError("timeout", "ASSET_FINALIZE_TIMEOUT", 504, true);
        },
        waitForRegisteredAsset: async () => {
          waitCalls++;
          return { found: true, asset, attempts: 3, lastStatus: 200, retryable: false };
        },
      },
    });

    assert.equal(result.outcome, "ready");
    if (result.outcome === "ready") {
      assert.equal(result.source, "fallback");
      assert.equal(result.attempts, 3);
      assert.equal(finalizeCalls, 2);
      assert.equal(waitCalls, 1);
    }
  });

  it("retry with existing blob finalizes without re-upload", async () => {
    let uploadCalls = 0;
    const asset = {
      id: "asset-2",
      filename: "retry.jpg",
      kind: "IMAGE",
      path: "https://blob.test/retry.jpg",
      sourcePath: "https://blob.test/retry.jpg",
      storageKey: "tenants/tenant-a/assets/u2/retry.jpg",
      mimeType: "image/jpeg",
      rightsStatus: "needs_review",
      draftCount: 0,
    };

    const result = await resolveUploadedAssetAfterUpload("tenant-a", {
      pathname: asset.storageKey!,
      url: asset.path!,
      contentType: asset.mimeType!,
      size: 1024,
      filename: asset.filename,
    }, {
      deps: {
        finalizeUploadedAsset: async () => asset,
        waitForRegisteredAsset: async () => {
          uploadCalls++;
          return { found: false, attempts: 1, retryable: false };
        },
      },
    });

    assert.equal(result.outcome, "ready");
    if (result.outcome === "ready") {
      assert.equal(result.source, "finalize");
      assert.equal(uploadCalls, 0);
    }
  });

  it("retries finalize once before polling fallback", async () => {
    let finalizeCalls = 0;
    let waitCalls = 0;
    const asset = {
      id: "asset-3",
      filename: "retry-finalize.jpg",
      kind: "IMAGE",
      path: "https://blob.test/retry-finalize.jpg",
      sourcePath: "https://blob.test/retry-finalize.jpg",
      storageKey: "tenants/tenant-a/assets/u3/retry-finalize.jpg",
      mimeType: "image/jpeg",
      rightsStatus: "needs_review",
      draftCount: 0,
    };

    const result = await resolveUploadedAssetAfterUpload("tenant-a", {
      pathname: asset.storageKey!,
      url: asset.path!,
      contentType: asset.mimeType!,
      size: 1024,
      filename: asset.filename,
    }, {
      deps: {
        finalizeUploadedAsset: async () => {
          finalizeCalls++;
          if (finalizeCalls === 1) {
            throw new AssetFinalizeError("timeout", "ASSET_FINALIZE_TIMEOUT", 504, true);
          }
          return asset;
        },
        waitForRegisteredAsset: async () => {
          waitCalls++;
          return { found: false, attempts: 1, retryable: false };
        },
      },
    });

    assert.equal(result.outcome, "ready");
    if (result.outcome === "ready") {
      assert.equal(result.source, "finalize");
      assert.equal(finalizeCalls, 2);
      assert.equal(waitCalls, 0);
    }
  });
});
