import { Prisma, type AssetKind } from "@prisma/client";
import { auditLog } from "./audit";
import { normalizeLogicalFolder, sanitizeFilename, validateAssetFile } from "./asset-config";
import { type AssetFormatDerivativePlan } from "./asset-format-derivatives";
import { normalizeTechnicalAssetMetadata } from "./asset-metadata";
import { getAssetStorage, type AssetStorageAdapter } from "./asset-storage";
import { prisma } from "./prisma";
import { resolveTenantAccess, resolveTenantAccessWithLifecycle, TenantAccessError } from "./tenant-access";
import { Permission } from "./permissions";

type JsonObject = Record<string, unknown>;

type AssetMetadata = JsonObject & {
  provider?: string;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  orientation?: string | null;
  aspectRatio?: unknown;
  folder?: string | null;
  originalFilename?: string | null;
  uploadedBy?: string | null;
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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberFrom(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
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

function normalizeBlobPathname(pathname: string): string {
  return pathname.replace(/\\/g, "/");
}

function withDraftCount<T extends { _count?: { drafts?: number } | null }>(asset: T) {
  return {
    ...asset,
    _count: { drafts: asset._count?.drafts ?? 0 },
  };
}

function derivativeFilename(sourceFilename: string, target: string, version: number): string {
  const extIndex = sourceFilename.lastIndexOf(".");
  const stem = extIndex > 0 ? sourceFilename.slice(0, extIndex) : sourceFilename;
  const ext = extIndex > 0 ? sourceFilename.slice(extIndex) : "";
  const targetSlug = target.toLowerCase().replace(/_/g, "-");
  return sanitizeFilename(`${stem}--${targetSlug}-v${version}${ext}`);
}

function derivativeMetadataSignature(metadata: unknown): {
  sourceAssetId: string;
  target: string;
  version: number;
} | null {
  const record = asObject(asObject(metadata).derivative);
  const sourceAssetId = typeof record.sourceAssetId === "string"
    ? record.sourceAssetId
    : typeof record.derivativeOf === "string"
      ? record.derivativeOf
      : null;
  const target = typeof record.target === "string" ? record.target : null;
  const version = numberFrom(record.version);
  if (!sourceAssetId || !target || !version) return null;
  return { sourceAssetId, target, version };
}

function derivativeMetadataFor(params: {
  sourceAsset: Awaited<ReturnType<typeof getTenantAssetOrThrow>>;
  plan: AssetFormatDerivativePlan;
  filename: string;
  userId: string;
}): AssetMetadata {
  const sourceMetadata = asObject(params.sourceAsset.metadata);
  const folder = typeof sourceMetadata.folder === "string" ? sourceMetadata.folder : "";
  const sizeBytes = numberFrom(sourceMetadata.sizeBytes) ?? undefined;
  const technical = normalizeTechnicalAssetMetadata({
    ...sourceMetadata,
    width: params.plan.targetFrame.width,
    height: params.plan.targetFrame.height,
    mimeType: params.sourceAsset.mimeType,
    sizeBytes,
    originalFilename: params.filename,
    folder,
  }, {
    sizeBytes,
    mimeType: params.sourceAsset.mimeType ?? undefined,
    originalFilename: params.filename,
    folder,
  });

  return {
    ...sourceMetadata,
    ...technical,
    derivative: {
      id: params.plan.derivativeId,
      derivativeOf: params.plan.sourceAssetId,
      sourceAssetId: params.plan.sourceAssetId,
      target: params.plan.target,
      version: params.plan.version,
      fitMode: params.plan.fitMode,
      crop: params.plan.crop,
      targetFrame: params.plan.targetFrame,
      safeZones: params.plan.safeZones,
      immutableSource: true,
      status: params.plan.status,
      source: params.plan.source,
      compatibilityStatus: params.plan.compatibilityStatus,
      operations: params.plan.operations,
      warnings: params.plan.warnings,
      createdBy: params.userId,
    },
    derivativeVirtual: true,
    derivativeSourceFilename: params.sourceAsset.filename,
    derivativeSourcePath: params.sourceAsset.sourcePath ?? null,
  };
}

async function findTenantAssetByStorageKey(
  db: typeof prisma,
  params: { tenantId: string; storageKey: string },
) {
  return db.asset.findFirst({
    where: { tenantId: params.tenantId, storageKey: params.storageKey },
    include: { _count: { select: { drafts: true } } },
  });
}

async function lockTenantAssetFinalizeKey(
  db: typeof prisma,
  params: { tenantId: string; storageKey: string },
) {
  const executeRaw = (db as typeof prisma & { $executeRaw?: (query: Prisma.Sql) => Promise<unknown> }).$executeRaw;
  if (typeof executeRaw !== "function") return;
  await executeRaw.call(
    db,
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${params.tenantId}), hashtext(${params.storageKey}))`,
  );
}

async function requireTenantAccess(
  db: typeof prisma,
  params: { tenantSlug: string; userId: string; mutation?: boolean },
) {
  const tenant = await db.tenant.findUnique({ where: { slug: params.tenantSlug }, select: { id: true, slug: true, status: true } });
  if (!tenant) throw new AssetServiceError("TENANT_NOT_FOUND", "Tenant not found.", 404);

  try {
    if (params.mutation) {
      const result = await resolveTenantAccessWithLifecycle(params.userId, tenant.id, Permission.CONTENT_WRITE, "NORMAL_OPERATION", db as any);
      return { tenant: { id: tenant.id, slug: tenant.slug, status: tenant.status }, membership: { role: result.role } };
    } else {
      const result = await resolveTenantAccess(params.userId, tenant.id, Permission.TENANT_READ, db as any);
      return { tenant: { id: tenant.id, slug: tenant.slug, status: tenant.status }, membership: { role: result.role } };
    }
  } catch (e) {
    if (e instanceof TenantAccessError) {
      throw new AssetServiceError(e.code, e.message, e.status);
    }
    throw e;
  }
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
  storage?: AssetStorageAdapter;
  audit?: AuditFn;
  db?: typeof prisma;
}) {
  return finalizeTenantAssetFromBlob({
    tenantSlug: params.tenantSlug,
    userId: params.userId,
    originalFilename: params.originalFilename,
    contentType: params.mimeType,
    sizeBytes: params.sizeBytes,
    pathname: params.storageKey,
    url: params.sourcePath,
    projectId: params.projectId,
    folder: params.folder,
    technicalMetadata: {
      ...(asObject(params.technicalMetadata)),
      width: asObject(params.technicalMetadata).width ?? params.width ?? null,
      height: asObject(params.technicalMetadata).height ?? params.height ?? null,
      durationSeconds: asObject(params.technicalMetadata).durationSeconds ?? params.durationSeconds ?? null,
    },
    etag: params.etag ?? null,
    storage: params.storage,
    audit: params.audit,
    db: params.db,
  });
}

export async function finalizeTenantAssetFromBlob(params: {
  tenantSlug: string;
  userId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  pathname: string;
  url?: string | null;
  projectId?: string | null;
  folder?: string | null;
  technicalMetadata?: unknown;
  etag?: string | null;
  storage?: AssetStorageAdapter;
  audit?: AuditFn;
  db?: typeof prisma;
}) {
  const db = params.db ?? prisma;
  const storage = params.storage ?? getAssetStorage();
  const { tenant } = await requireTenantAccess(db, { ...params, mutation: true });
  const validation = validateAssetFile({
    filename: params.originalFilename,
    mimeType: params.contentType,
    sizeBytes: params.sizeBytes,
  });
  if (!validation.ok) throw new AssetServiceError(validation.code, validation.error, 400);

  const pathname = normalizeBlobPathname(params.pathname);
  const expectedPrefix = `tenants/${tenant.id}/assets/`;
  if (pathname.includes("..") || pathname !== params.pathname.replace(/\\/g, "/") || !pathname.startsWith(expectedPrefix)) {
    throw new AssetServiceError("ASSET_STORAGE_SCOPE", "Storage key does not match tenant scope.", 400);
  }

  const blob = await storage.head(pathname);
  if (!blob.exists) throw new AssetServiceError("ASSET_BLOB_NOT_FOUND", "Blob does not exist.", 404);
  if (!blob.url) throw new AssetServiceError("ASSET_BLOB_URL_MISSING", "Blob URL is not available.", 400);
  if (params.url && params.url !== blob.url) {
    throw new AssetServiceError("ASSET_BLOB_URL_MISMATCH", "Blob URL does not match uploaded blob.", 400);
  }
  if (blob.size != null && blob.size !== params.sizeBytes) {
    throw new AssetServiceError("ASSET_BLOB_SIZE_MISMATCH", "Blob size does not match uploaded metadata.", 400);
  }

  const metadata: AssetMetadata = buildAssetMetadata({
    technicalMetadata: params.technicalMetadata,
    provider: "vercel_blob",
    sizeBytes: params.sizeBytes,
    mimeType: validation.mimeType,
    originalFilename: params.originalFilename,
    folder: params.folder,
    uploadedBy: params.userId,
    etag: params.etag ?? null,
  });

  const existing = await findTenantAssetByStorageKey(db, { tenantId: tenant.id, storageKey: pathname });
  if (existing) return existing;

  return db.$transaction(async (tx) => {
    await lockTenantAssetFinalizeKey(tx as any, { tenantId: tenant.id, storageKey: pathname });

    const lockedExisting = await findTenantAssetByStorageKey(tx as any, { tenantId: tenant.id, storageKey: pathname });
    if (lockedExisting) return lockedExisting;

    try {
      const asset = await tx.asset.create({
        data: {
          tenantId: tenant.id,
          projectId: params.projectId ?? null,
          kind: validation.kind,
          filename: validation.filename,
          mimeType: validation.mimeType,
          storageKey: pathname,
          sourcePath: blob.url,
          metadata: metadata as any,
          rightsStatus: "needs_review",
        },
        include: { _count: { select: { drafts: true } } },
      });

      await (params.audit ?? auditLog)({
        tenantId: tenant.id,
        actorId: params.userId,
        action: "asset_uploaded",
        target: `asset:${asset.id}`,
        metadata: { assetId: asset.id, storageKey: pathname, filename: asset.filename, metadata },
      });

      return asset;
    } catch (error) {
      const conflicted = await findTenantAssetByStorageKey(tx as any, { tenantId: tenant.id, storageKey: pathname });
      if (conflicted) return conflicted;
      throw error;
    }
  });
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
      storage,
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

export async function createTenantAssetDerivatives(params: {
  tenantSlug: string;
  userId: string;
  assetId: string;
  plans: AssetFormatDerivativePlan[];
  audit?: AuditFn;
  db?: typeof prisma;
}) {
  const db = params.db ?? prisma;
  const { tenant } = await requireTenantAccess(db, { ...params, mutation: true });
  const sourceAsset = await getTenantAssetOrThrow(db, { tenantId: tenant.id, assetId: params.assetId });

  if (sourceAsset.kind !== "IMAGE") {
    throw new AssetServiceError("ASSET_DERIVATIVE_UNSUPPORTED", "Format derivatives are only supported for image assets.", 400);
  }

  const uniquePlans = Array.from(
    new Map(
      asArray(params.plans)
        .map((plan) => plan as AssetFormatDerivativePlan)
        .map((plan) => [`${plan.target}:${plan.version}`, plan] as const),
    ).values(),
  );

  if (uniquePlans.length === 0) {
    throw new AssetServiceError("ASSET_DERIVATIVE_REQUIRED", "At least one derivative plan is required.", 400);
  }

  for (const plan of uniquePlans) {
    if (plan.sourceAssetId !== sourceAsset.id) {
      throw new AssetServiceError("ASSET_DERIVATIVE_SOURCE_MISMATCH", "Derivative plan does not match the selected source asset.", 409);
    }
    if (plan.status === "BLOCKED" || plan.status === "VIDEO_DEFERRED") {
      throw new AssetServiceError("ASSET_DERIVATIVE_NOT_READY", `Derivative ${plan.target} is not ready to persist.`, 400);
    }
  }

  const tenantAssets = await db.asset.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { drafts: true } } },
  });
  const existingBySignature = new Map<string, any>();
  for (const asset of tenantAssets) {
    const signature = derivativeMetadataSignature(asset.metadata);
    if (signature) {
      existingBySignature.set(`${signature.sourceAssetId}:${signature.target}:${signature.version}`, withDraftCount(asset));
    }
  }

  const persisted: Array<any> = [];
  for (const plan of uniquePlans) {
    const signatureKey = `${plan.sourceAssetId}:${plan.target}:${plan.version}`;
    const existing = existingBySignature.get(signatureKey);
    if (existing) {
      persisted.push(existing);
      continue;
    }

    const filename = derivativeFilename(sourceAsset.filename, plan.target, plan.version);
    const created = await db.asset.create({
      data: {
        tenantId: tenant.id,
        projectId: sourceAsset.projectId ?? null,
        kind: sourceAsset.kind as AssetKind,
        filename,
        mimeType: sourceAsset.mimeType,
        sourcePath: sourceAsset.sourcePath ?? null,
        storageKey: null,
        metadata: derivativeMetadataFor({
          sourceAsset,
          plan,
          filename,
          userId: params.userId,
        }) as any,
        rightsStatus: sourceAsset.rightsStatus,
      },
      include: { _count: { select: { drafts: true } } },
    });
    const createdWithCount = withDraftCount(created);
    existingBySignature.set(signatureKey, createdWithCount);
    persisted.push(createdWithCount);
  }

  await (params.audit ?? auditLog)({
    tenantId: tenant.id,
    actorId: params.userId,
    action: "asset_derivatives_created",
    target: `asset:${sourceAsset.id}`,
    metadata: {
      sourceAssetId: sourceAsset.id,
      derivativeIds: persisted.map((asset) => asset.id),
      plans: uniquePlans.map((plan) => ({
        target: plan.target,
        version: plan.version,
        derivativeId: plan.derivativeId,
      })),
    },
  });

  return persisted;
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
