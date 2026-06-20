import type { PrismaClient } from "@prisma/client";
import type { OAuthProvider } from "@prisma/client";

export interface FinalizeParams {
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
  jobId: string;
  draftId: string;
  tenantId: string;
  network: string;
  externalPostId: string;
  providerResponse: unknown;
}

export interface FinalizeResult {
  committed: boolean;
  reconciliationRequired: boolean;
  externalPostId: string;
  code?: string;
}

export async function finalizeConfirmedPublication(params: FinalizeParams): Promise<FinalizeResult> {
  const { tx, jobId, draftId, tenantId, network, externalPostId, providerResponse } = params;

  if (!externalPostId) {
    return { committed: false, reconciliationRequired: true, externalPostId: "", code: "LIVE_RECONCILIATION_REQUIRED" };
  }

  try {
    const resultId = `pr_${jobId}`;

    // 1. Persist PublishingResult (monotonic — never degrade ok:true)
    const existingResult = await tx.publishingResult.findUnique({
      where: { id: resultId },
      select: { ok: true, externalPostId: true },
    });

    if (existingResult?.ok === true && existingResult?.externalPostId && existingResult.externalPostId !== externalPostId) {
      throw new Error(`CONFLICT: result has different externalPostId (${existingResult.externalPostId} vs ${externalPostId})`);
    }

    if (!existingResult || existingResult.ok !== true) {
      await tx.publishingResult.upsert({
        where: { id: resultId },
        create: { id: resultId, jobId, provider: network as OAuthProvider, externalPostId, ok: true, response: providerResponse as any },
        update: { externalPostId, ok: true, response: providerResponse as any },
      });
    }

    // 2. Persist ContentDraft
    const draft = await tx.contentDraft.findUnique({
      where: { id: draftId },
      select: { externalPostId: true },
    });

    if (draft?.externalPostId && draft.externalPostId !== externalPostId) {
      throw new Error(`CONFLICT: draft has different externalPostId (${draft.externalPostId} vs ${externalPostId})`);
    }

    const updatedDraft = await tx.contentDraft.update({
      where: { id: draftId, tenantId },
      data: { status: "PUBLISHED", publishedAt: new Date(), externalPostId },
      select: { status: true, externalPostId: true },
    });

    if (updatedDraft.status !== "PUBLISHED" || updatedDraft.externalPostId !== externalPostId) {
      throw new Error("Draft update verification failed");
    }

    // 3. Persist PublishingJob — last write in transaction
    const updatedJob = await tx.publishingJob.update({
      where: { id: jobId },
      data: { status: "PUBLISHED", scheduledFor: null, updatedAt: new Date() },
      select: { status: true },
    });

    if (updatedJob.status !== "PUBLISHED") {
      throw new Error("Job update verification failed");
    }

    // All writes confirmed — release savepoint
    return { committed: true, reconciliationRequired: false, externalPostId };
  } catch {
    // Transaction rolled back — job stays IN_REVIEW
    return {
      committed: false,
      reconciliationRequired: true,
      externalPostId,
      code: "LIVE_RECONCILIATION_REQUIRED",
    };
  }
}

export interface RecordFailureParams {
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
  jobId: string;
  draftId: string;
  tenantId: string;
  network: string;
  errorMsg: string;
  isMaxAttempts: boolean;
}

export async function recordUnconfirmedProviderFailure(params: RecordFailureParams): Promise<void> {
  const { tx, jobId, draftId, tenantId, network, errorMsg, isMaxAttempts } = params;

  const existingResult = await tx.publishingResult.findUnique({
    where: { id: `pr_${jobId}` },
    select: { ok: true, externalPostId: true },
  });

  const draft = await tx.contentDraft.findUnique({
    where: { id: draftId },
    select: { externalPostId: true },
  });

  if (existingResult?.ok === true && existingResult.externalPostId) {
    return;
  }
  if (draft?.externalPostId) {
    return;
  }

  await tx.publishingResult.upsert({
    where: { id: `pr_${jobId}` },
    create: { id: `pr_${jobId}`, jobId, provider: network as OAuthProvider, ok: false, response: { error: errorMsg } },
    update: { ok: false, response: { error: errorMsg } },
  });

  await tx.contentDraft.updateMany({
    where: { id: draftId, tenantId, status: "SCHEDULED" },
    data: { status: "APPROVED" },
  });

  const nextStatus = isMaxAttempts ? "FAILED" : "SCHEDULED";
  await tx.publishingJob.updateMany({
    where: { id: jobId },
    data: { status: nextStatus as any, lastError: errorMsg.slice(0, 500) },
  });
}
