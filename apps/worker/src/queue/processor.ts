import { prisma } from "./prisma.js";
import type { PublishDraftJob, ValidateAssetsJob, TestModeJob, QueueJobResult } from "./types.js";

export async function processPublishDraft(
  job: PublishDraftJob,
): Promise<QueueJobResult> {
  const { tenantId, draftId, mode } = job;

  const draft = await prisma.contentDraft.findFirst({
    where: { id: draftId, tenantId },
    include: { assets: { include: { asset: true } }, socialAccount: true },
  });

  if (!draft) {
    return { ok: false, draftId, tenantId, error: "Draft not found" };
  }

  if (mode === "dry-run" || mode === "draft") {
    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "publish_dry_run",
        target: `draft:${draftId}`,
        metadata: {
          title: draft.title,
          network: draft.network,
          format: draft.format,
          mode,
        } as any,
      },
    });

    await prisma.contentDraft.update({
      where: { id: draftId },
      data: { status: "SCHEDULED" },
    });

    return {
      ok: true,
      draftId,
      tenantId,
      action: `${draft.network}_${draft.format}`,
      dryRun: true,
    };
  }

  return {
    ok: false,
    draftId,
    tenantId,
    error: "Live publishing not implemented yet (S-HC-08 required)",
  };
}

export async function processValidateAssets(
  job: ValidateAssetsJob,
): Promise<QueueJobResult> {
  const { tenantId, draftId } = job;

  const draft = await prisma.contentDraft.findFirst({
    where: { id: draftId, tenantId },
    include: { assets: { include: { asset: true } } },
  });

  if (!draft) {
    return { ok: false, draftId, tenantId, error: "Draft not found" };
  }

  const missing = draft.assets.filter((a) => !a.asset.storageKey && !a.asset.sourcePath);
  if (missing.length > 0) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "validate_assets_failed",
        target: `draft:${draftId}`,
        metadata: { missingCount: missing.length } as any,
      },
    });
    return {
      ok: false,
      draftId,
      tenantId,
      error: `${missing.length} asset(s) missing storage`,
    };
  }

  return { ok: true, draftId, tenantId, action: "validate_assets" };
}

export async function processTestMode(
  job: TestModeJob,
): Promise<QueueJobResult> {
  const { tenantId, draftId } = job;

  const where = draftId
    ? { id: draftId, tenantId }
    : { tenantId, status: "DRAFT" as const };

  const count = await prisma.contentDraft.count({ where });
  const ready = await prisma.contentDraft.count({
    where: { ...where, status: "APPROVED" as const },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "test_mode_scan",
      target: draftId ? `draft:${draftId}` : `tenant:${tenantId}`,
      metadata: { totalDrafts: count, readyDrafts: ready } as any,
    },
  });

  return {
    ok: true,
    tenantId,
    draftId,
    action: "test_mode_scan",
    dryRun: true,
  };
}
