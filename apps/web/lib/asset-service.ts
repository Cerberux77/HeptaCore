import type { AssetKind, UserRole } from "@prisma/client";
import { auditLog } from "./audit";
import { normalizeLogicalFolder, sanitizeFilename, validateAssetFile } from "./asset-config";
import { normalizeTechnicalAssetMetadata } from "./asset-metadata";
import { getAssetStorage, type AssetStorageAdapter } from "./asset-storage";
import { prisma } from "./prisma";

const READ_ROLES: UserRole[] = [
  "OWNER",
  "ADMIN",
  "STRATEGIST",
  "EDITOR",
  "ANALYST",
  "APPROVER",
  "VIEWER",
  "PUBLISHER",
  "SUPER_ADMIN",
  "TENANT_ADMIN",
];

const MUTATION_ROLES: UserRole[] = [
  "OWNER",
  "ADMIN",
  "EDITOR",
  "STRATEGIST",
  "PUBLISHER",
  "SUPER_ADMIN",
  "TENANT_ADMIN",
];

type JsonObject = Record<string, unknown>;

type AssetMetadata = JsonObject & {
  provider?: string;
  sizeBytes?: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  orientation?: string | null;
  aspectRatio?: unknown;
  folder?: string;
  originalFilename?: string;
  uploadedBy?: string;
  etag?: string | null;
};

type AuditFn = typeof auditLog;

export class AssetServiceError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as JsonObject) } : {};
}

function buildStorageKey(tenantId: string, filename: string): string {
  return `tenants/${tenantId}/assets/${crypto.randomUUID()}/${filename}`;
}

function buildAssetMetadata(params: {
  existing?: unknown;
  technicalMetadata?: unknown;
  provider: string;
  sizeBytes: number;
  mimeType: string;
  originalFilename: string;
  folder?: string | null;
  uploadedBy: string;
  etag?: string | null;
}): AssetMetadata {
  const existing = asObject(params.existing);
  const normalized = normalizeTechnicalAssetMetadata(params.technicalMetadata, {
    sizeBytes: params.sizeBytes,
    mimeType: params.mimeType,
    originalFilename: params.originalFilename,
    folder: normalizeLogicalFolder(params.folder ?? String(existing.folder ?? "")),
  });
  return {
    ...existing,
    ...normalized,
    provider: params.provider,
    sizeBytes: normalized.sizeBytes ?? params.sizeBytes,
    mimeType: normalized.mimeType ?? params.mimeType,
    folder: normalized.folder ?? normalizeLogicalFolder(params.folder),
    originalFilename: params.originalFilename,
    uploadedBy: params.uploadedBy,
    etag: params.etag ?? null,
  };
}

async function requireTenantAccess(
  db: typeof prisma,
  params: { tenantSlug: string; userId: string; mutation?: boolean },
) {
  const tenant = await db.tenant.findUnique({ where: { slug: params.tenantSlug }, select: { id: true, slug: true } });
  if (!tenant) throw new AssetServiceError("TENANT_NOT_FOUND", "Tenant not found.", 404);

  const membership = await db.membership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: params.userId } },
    select: { role: true },
  });
  const allowed = params.mutation ? MUTATION_ROLES : READ_ROLES;
  if (!membership || !allowed.includes(membership.role)) {
    throw new AssetServiceError("FORBIDDEN", "Forbidden.", 403);
  }
  return { tenant, membership };
}

async function getTenantAssetOrThrow(
  db: typeof prisma,
  params: { tenantId: string; assetId: string },
) {
  const asset = await db.asset.findFirst({
    where: { id: params.assetId, tenantId: params.tenantId },
    include: { _count: { select: { drafts: true } } },
  });
  if (!asset) throw new AssetServiceError("ASSET_NOT_FOUND", "Asset not found.", 404);
  return asset;
}

export async function listTenantAssets(params: {
  tenantSlug: string;
  userId: string;
  db?: typeof prisma;
}) {
  const db = params.db ?? prisma;
  const { tenant } = await requireTenantAccess(db, params);
  const assets = await db.asset.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ kind: "asc" }, { filename: "asc" }],
    include: { _count: { select: { drafts: true } } },
  });
  return assets;
}

export async function createTenantAssetFromBlob(params: {
  tenantSlug: string;
  userId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sourcePath: string;
  storageKey: string;
  projectId?: string | null;
  folder?: string | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  technicalMetadata?: unknown;
  etag?: string | null;
  audit?: AuditFn;
  db?: typeof prisma;
}) {
  const db = params.db ?? prisma;
  const { tenant } = await requireTenantAccess(db, { ...params, mutation: true });
  const validation = validateAssetFile({
    filename: params.originalFilename,
    mimeType: params.mimeType,
    sizeBytes: params.sizeBytes,
  });
  if (!validation.ok) throw new AssetServiceError(validation.code, validation.error, 400);
  if (!params.storageKey.startsWith(`tenants/${tenant.id}/assets/`)) {
    throw new AssetServiceError("ASSET_STORAGE_SCOPE", "Storage key does not match tenant scope.", 400);
  }

  const metadata: AssetMetadata = buildAssetMetadata({
    technicalMetadata: {
      ...(asObject(params.technicalMetadata)),
      width: asObject(params.technicalMetadata).width ?? params.width ?? null,
      height: asObject(params.technicalMetadata).height ?? params.height ?? null,
      durationSeconds: asObject(params.technicalMetadata).durationSeconds ?? params.durationSeconds ?? null,
    },
    provider: "vercel_blob",
    sizeBytes: params.sizeBytes,
    mimeType: validation.mimeType,
    originalFilename: params.originalFilename,
    folder: params.folder,
    uploadedBy: params.userId,
    etag: params.etag ?? null,
  });

  const asset = await db.asset.create({
    data: {
      tenantId: tenant.id,
      projectId: params.projectId ?? null,
      kind: validation.kind,
      filename: validation.filename,
      mimeType: validation.mimeType,
      storageKey: params.storageKey,
      sourcePath: params.sourcePath,
      metadata: metadata as any,
      rightsStatus: "needs_review",
    },
  });

  await (params.audit ?? auditLog)({
    tenantId: tenant.id,
    actorId: params.userId,
    action: "asset_uploaded",
    target: `asset:${asset.id}`,
    metadata: { assetId: asset.id, storageKey: params.storageKey, filename: asset.filename, metadata },
  });

  return asset;
}

export async function uploadTenantAsset(params: {
  tenantSlug: string;
  userId: string;
  file: File;
  folder?: string | null;
  projectId?: string | null;
  technicalMetadata?: unknown;
  storage?: AssetStorageAdapter;
  audit?: AuditFn;
  db?: typeof prisma;
}) {
  const db = params.db ?? prisma;
  const storage = params.storage ?? getAssetStorage();
  const { tenant } = await requireTenantAccess(db, { ...params, mutation: true });
  const validation = validateAssetFile({
    filename: params.file.name,
    mimeType: params.file.type,
    sizeBytes: params.file.size,
  });
  if (!validation.ok) throw new AssetServiceError(validation.code, validation.error, 400);

  const storageKey = buildStorageKey(tenant.id, validation.filename);
  const uploaded = await storage.upload({
    pathname: storageKey,
    body: params.file,
    contentType: validation.mimeType,
    sizeBytes: params.file.size,
  });

  try {
    return await createTenantAssetFromBlob({
      tenantSlug: params.tenantSlug,
      userId: params.userId,
      originalFilename: params.file.name,
      mimeType: validation.mimeType,
      sizeBytes: params.file.size,
      sourcePath: uploaded.url,
      storageKey: uploaded.pathname,
      projectId: params.projectId,
      folder: params.folder,
      technicalMetadata: params.technicalMetadata,
      etag: uploaded.etag ?? null,
      audit: params.audit,
      db,
    });
  } catch (error) {
    await storage.delete(uploaded.pathname).catch(() => undefined);
    throw error;
  }
}

export async function updateTenantAssetMetadata(params: {
  tenantSlug: string;
  userId: string;
  assetId: string;
  filename?: string;
  folder?: string | null;
  technicalMetadata?: unknown;
  audit?: AuditFn;
  db?: typeof prisma;
}) {
  const db = params.db ?? prisma;
  const { tenant } = await requireTenantAccess(db, { ...params, mutation: true });
  const asset = await getTenantAssetOrThrow(db, { tenantId: tenant.id, assetId: params.assetId });
  const metadata = asObject(asset.metadata);
  const before = { filename: asset.filename, folder: metadata.folder ?? "" };
  const data: { filename?: string; metadata?: any } = {};

  if (params.filename !== undefined) data.filename = sanitizeFilename(params.filename);
  if (params.folder !== undefined) {
    metadata.folder = normalizeLogicalFolder(params.folder);
    data.metadata = metadata;
  }
  if (params.technicalMetadata !== undefined) {
    const technical = normalizeTechnicalAssetMetadata(params.technicalMetadata, {
      sizeBytes: Number(metadata.sizeBytes ?? 0) || undefined,
      mimeType: typeof metadata.mimeType === "string" ? metadata.mimeType : asset.mimeType,
      originalFilename: typeof metadata.originalFilename === "string" ? metadata.originalFilename : asset.filename,
      folder: typeof metadata.folder === "string" ? metadata.folder : "",
    });
    data.metadata = {
      ...metadata,
      ...technical,
      folder: technical.folder ?? metadata.folder ?? "",
    };
  }
  if (!data.filename && data.metadata === undefined) {
    throw new AssetServiceError("NO_ASSET_CHANGES", "No valid asset fields to update.", 400);
  }

  const updated = await db.asset.update({ where: { id: asset.id }, data });
  await (params.audit ?? auditLog)({
    tenantId: tenant.id,
    actorId: params.userId,
    action: "asset_metadata_updated",
    target: `asset:${asset.id}`,
    metadata: { before, after: { filename: updated.filename, folder: asObject(updated.metadata).folder ?? "" } },
  });
  return updated;
}

export async function replaceTenantAssetContent(params: {
  tenantSlug: string;
  userId: string;
  assetId: string;
  file: File;
  expectedStorageKey?: string | null;
  technicalMetadata?: unknown;
  storage?: AssetStorageAdapter;
  audit?: AuditFn;
  db?: typeof prisma;
}) {
  const db = params.db ?? prisma;
  const storage = params.storage ?? getAssetStorage();
  const { tenant } = await requireTenantAccess(db, { ...params, mutation: true });
  const asset = await getTenantAssetOrThrow(db, { tenantId: tenant.id, assetId: params.assetId });
  if (params.expectedStorageKey && params.expectedStorageKey !== asset.storageKey) {
    throw new AssetServiceError("ASSET_CONFLICT", "Asset changed before replacement.", 409);
  }

  const validation = validateAssetFile({
    filename: params.file.name,
    mimeType: params.file.type,
    sizeBytes: params.file.size,
  });
  if (!validation.ok) throw new AssetServiceError(validation.code, validation.error, 400);

  const oldStorageKey = asset.storageKey;
  const oldMetadata = asObject(asset.metadata);
  const newStorageKey = buildStorageKey(tenant.id, validation.filename);
  const uploaded = await storage.upload({
    pathname: newStorageKey,
    body: params.file,
    contentType: validation.mimeType,
    sizeBytes: params.file.size,
  });

  let updated;
  try {
    updated = await db.$transaction(async (tx) => {
      const result = await tx.asset.update({
        where: { id: asset.id },
        data: {
          kind: validation.kind as AssetKind,
          filename: validation.filename,
          mimeType: validation.mimeType,
          sourcePath: uploaded.url,
          storageKey: uploaded.pathname,
          metadata: buildAssetMetadata({
            existing: oldMetadata,
            provider: "vercel_blob",
            sizeBytes: params.file.size,
            mimeType: validation.mimeType,
            technicalMetadata: params.technicalMetadata,
            originalFilename: params.file.name,
            uploadedBy: params.userId,
            etag: uploaded.etag ?? null,
          }) as any,
        },
      });

      await tx.contentDraft.updateMany({
        where: { tenantId: tenant.id, status: "APPROVED", assets: { some: { assetId: asset.id } } },
        data: { status: "NEEDS_REVIEW", requiresReview: true },
      });
      return result;
    });
  } catch (error) {
    await storage.delete(uploaded.pathname).catch(() => undefined);
    throw error;
  }

  let cleanupPending = false;
  if (oldStorageKey) {
    await storage.delete(oldStorageKey).catch(async () => {
      cleanupPending = true;
      await (params.audit ?? auditLog)({
        tenantId: tenant.id,
        actorId: params.userId,
        action: "asset_blob_cleanup_pending",
        target: `asset:${asset.id}`,
        metadata: { oldStorageKey },
      });
    });
  }

  await (params.audit ?? auditLog)({
    tenantId: tenant.id,
    actorId: params.userId,
    action: "asset_content_replaced",
    target: `asset:${asset.id}`,
    metadata: {
      oldStorageKey,
      newStorageKey: uploaded.pathname,
      oldFilename: asset.filename,
      newFilename: updated.filename,
      oldMetadata,
      newMetadata: updated.metadata,
      cleanupPending,
    },
  });
  return updated;
}

export async function replaceTenantAssetWithBlob(params: {
  tenantSlug: string;
  userId: string;
  assetId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sourcePath: string;
  storageKey: string;
  expectedStorageKey?: string | null;
  technicalMetadata?: unknown;
  etag?: string | null;
  storage?: AssetStorageAdapter;
  audit?: AuditFn;
  db?: typeof prisma;
}) {
  const db = params.db ?? prisma;
  const storage = params.storage ?? getAssetStorage();
  const { tenant } = await requireTenantAccess(db, { ...params, mutation: true });
  const asset = await getTenantAssetOrThrow(db, { tenantId: tenant.id, assetId: params.assetId });
  if (params.expectedStorageKey && params.expectedStorageKey !== asset.storageKey) {
    throw new AssetServiceError("ASSET_CONFLICT", "Asset changed before replacement.", 409);
  }

  const validation = validateAssetFile({
    filename: params.originalFilename,
    mimeType: params.mimeType,
    sizeBytes: params.sizeBytes,
  });
  if (!validation.ok) throw new AssetServiceError(validation.code, validation.error, 400);
  if (!params.storageKey.startsWith(`tenants/${tenant.id}/assets/`)) {
    throw new AssetServiceError("ASSET_STORAGE_SCOPE", "Storage key does not match tenant scope.", 400);
  }

  const oldStorageKey = asset.storageKey;
  const oldMetadata = asObject(asset.metadata);
  let updated;
  try {
    updated = await db.$transaction(async (tx) => {
      const result = await tx.asset.update({
        where: { id: asset.id },
        data: {
          kind: validation.kind as AssetKind,
          filename: validation.filename,
          mimeType: validation.mimeType,
          sourcePath: params.sourcePath,
          storageKey: params.storageKey,
          metadata: buildAssetMetadata({
            existing: oldMetadata,
            provider: "vercel_blob",
            sizeBytes: params.sizeBytes,
            mimeType: validation.mimeType,
            technicalMetadata: params.technicalMetadata,
            originalFilename: params.originalFilename,
            uploadedBy: params.userId,
            etag: params.etag ?? null,
          }) as any,
        },
      });
      await tx.contentDraft.updateMany({
        where: { tenantId: tenant.id, status: "APPROVED", assets: { some: { assetId: asset.id } } },
        data: { status: "NEEDS_REVIEW", requiresReview: true },
      });
      return result;
    });
  } catch (error) {
    await storage.delete(params.storageKey).catch(() => undefined);
    throw error;
  }

  let cleanupPending = false;
  if (oldStorageKey) {
    await storage.delete(oldStorageKey).catch(async () => {
      cleanupPending = true;
      await (params.audit ?? auditLog)({
        tenantId: tenant.id,
        actorId: params.userId,
        action: "asset_blob_cleanup_pending",
        target: `asset:${asset.id}`,
        metadata: { oldStorageKey },
      });
    });
  }

  await (params.audit ?? auditLog)({
    tenantId: tenant.id,
    actorId: params.userId,
    action: "asset_content_replaced",
    target: `asset:${asset.id}`,
    metadata: {
      oldStorageKey,
      newStorageKey: params.storageKey,
      oldFilename: asset.filename,
      newFilename: updated.filename,
      oldMetadata,
      newMetadata: updated.metadata,
      cleanupPending,
    },
  });
  return updated;
}

export async function deleteTenantAsset(params: {
  tenantSlug: string;
  userId: string;
  assetId: string;
  storage?: AssetStorageAdapter;
  audit?: AuditFn;
  db?: typeof prisma;
}) {
  const db = params.db ?? prisma;
  const storage = params.storage ?? getAssetStorage();
  const { tenant } = await requireTenantAccess(db, { ...params, mutation: true });
  const asset = await getTenantAssetOrThrow(db, { tenantId: tenant.id, assetId: params.assetId });
  if (asset._count.drafts > 0) {
    throw new AssetServiceError("ASSET_IN_USE", "Asset is linked to one or more drafts.", 409);
  }

  await db.asset.delete({ where: { id: asset.id } });
  if (asset.storageKey) await storage.delete(asset.storageKey);
  await (params.audit ?? auditLog)({
    tenantId: tenant.id,
    actorId: params.userId,
    action: "asset_deleted",
    target: `asset:${asset.id}`,
    metadata: { filename: asset.filename, storageKey: asset.storageKey },
  });
  return { ok: true };
}
