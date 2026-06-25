import { prisma } from "./prisma.js";
import type { PublishDraftJob, ValidateAssetsJob, TestModeJob, QueueJobResult } from "./types.js";
import { MockMetaAdapter, MockFacebookAdapter, type SocialNetworkAdapter, type PublishDraft } from "@heptacore/integrations";
import type { SocialNetwork } from "@heptacore/core";

const adapters: Record<string, SocialNetworkAdapter> = {
  INSTAGRAM: new MockMetaAdapter("dry-run"),
  FACEBOOK: new MockFacebookAdapter("dry-run"),
};

function toApprovalStatus(s: string) {
  const map: Record<string, string> = {
    DRAFT: "draft",
    NEEDS_REVIEW: "needs_review",
    APPROVED: "approved",
    REJECTED: "rejected",
    SCHEDULED: "scheduled",
    PUBLISHED: "published",
    FAILED: "failed",
  };
  return map[s] ?? "draft";
}

export async function processPublishDraft(
  job: PublishDraftJob,
): Promise<QueueJobResult> {
  const { tenantId, draftId, mode } = job;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true },
  });
  if (!tenant || tenant.status !== "ACTIVE") {
    return { ok: false, draftId, tenantId, error: `Tenant is not ACTIVE (${tenant?.status ?? "not found"})` };
  }

  const draft = await prisma.contentDraft.findFirst({
    where: { id: draftId, tenantId },
    include: { assets: { include: { asset: true } }, socialAccount: true },
  });

  if (!draft) {
    return { ok: false, draftId, tenantId, error: "Draft not found" };
  }

  const adapter = adapters[draft.network];
  if (!adapter) {
    return { ok: false, draftId, tenantId, error: `No adapter for network ${draft.network}` };
  }

  // Build PublishDraft input
  const publishDraft: PublishDraft = {
    tenantId: draft.tenantId,
    network: draft.network.toLowerCase() as SocialNetwork,
    externalAccountId: draft.socialAccount?.externalAccountId ?? "mock_account",
    caption: draft.caption,
    mediaAssetIds: draft.assets.map((a) => a.assetId),
    approvalStatus: toApprovalStatus(draft.status) as any,
    scheduledFor: draft.scheduledFor?.toISOString(),
  };

  const result = await adapter.publish(publishDraft);

  if (result.ok) {
    await prisma.contentDraft.update({
      where: { id: draftId },
      data: {
        status: "SCHEDULED",
        externalPostId: result.externalPostId ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "publish_succeeded",
        target: `draft:${draftId}`,
        metadata: {
          title: draft.title,
          network: draft.network,
          externalPostId: result.externalPostId,
          mode,
        } as any,
      },
    });

    return {
      ok: true,
      draftId,
      tenantId,
      action: `${draft.network}_${draft.format}`,
      dryRun: result.dryRun,
    };
  }

  // Publish failed — log and return error
  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "publish_failed",
      target: `draft:${draftId}`,
      metadata: {
        title: draft.title,
        network: draft.network,
        error: result.error,
        mode,
      } as any,
    },
  });

  return {
    ok: false,
    draftId,
    tenantId,
    error: result.error ?? "Unknown error",
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
