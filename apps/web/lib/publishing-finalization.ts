import type { OAuthProvider } from "@prisma/client";

export interface TxClient {
  publishingResult: {
    findUnique(args: { where: { id: string }; select: { ok: boolean; externalPostId: boolean } }): Promise<{ ok: boolean; externalPostId: string | null } | null>;
    upsert(args: { where: { id: string }; create: Record<string, unknown>; update: Record<string, unknown>; select: { ok: boolean; externalPostId: boolean } }): Promise<{ ok: boolean; externalPostId: string | null }>;
  };
  contentDraft: {
    findUnique(args: { where: { id: string }; select: { externalPostId: boolean } }): Promise<{ externalPostId: string | null } | null>;
    update(args: { where: { id: string; tenantId: string }; data: Record<string, unknown>; select: { status: boolean; externalPostId: boolean } }): Promise<{ status: string; externalPostId: string | null }>;
    updateMany(args: { where: { id: string; tenantId?: string; status?: string }; data: Record<string, unknown> }): Promise<{ count: number }>;
  };
  publishingJob: {
    findUnique(args: { where: { id: string }; select: { status: boolean } }): Promise<{ status: string } | null>;
    updateMany(args: { where: { id: string; status?: string }; data: Record<string, unknown> }): Promise<{ count: number }>;
  };
}

export interface FinalizeTxParams {
  tx: TxClient;
  jobId: string;
  draftId: string;
  tenantId: string;
  network: string;
  externalPostId: string;
  providerResponse: unknown;
}

export interface FinalizeTxResult {
  committed: true;
  externalPostId: string;
}

export async function finalizeConfirmedPublicationTx(params: FinalizeTxParams): Promise<FinalizeTxResult> {
  const { tx, jobId, draftId, tenantId, network, externalPostId, providerResponse } = params;

  if (!externalPostId) {
    throw new Error("FINALIZE_INVALID: externalPostId is empty");
  }

  const resultId = `pr_${jobId}`;

  // 1. PublishingResult — monotonic, never degrade ok:true
  const existingResult = await tx.publishingResult.findUnique({ where: { id: resultId }, select: { ok: true, externalPostId: true } });

  if (existingResult?.ok === true && existingResult?.externalPostId && existingResult.externalPostId !== externalPostId) {
    throw new Error(`CONFLICT: result has different externalPostId (${existingResult.externalPostId} vs ${externalPostId})`);
  }

  const upsertedResult = await tx.publishingResult.upsert({
    where: { id: resultId },
    create: { id: resultId, jobId, provider: network as OAuthProvider, externalPostId, ok: true, response: providerResponse as any },
    update: { externalPostId, ok: true, response: providerResponse as any },
    select: { ok: true, externalPostId: true },
  });

  if (!upsertedResult.ok || upsertedResult.externalPostId !== externalPostId) {
    throw new Error("FINALIZE_RESULT_VERIFY: result not committed with expected values");
  }

  // 2. ContentDraft — verify no conflicting externalPostId
  const existingDraft = await tx.contentDraft.findUnique({ where: { id: draftId }, select: { externalPostId: true } });

  if (existingDraft?.externalPostId && existingDraft.externalPostId !== externalPostId) {
    throw new Error(`CONFLICT: draft has different externalPostId (${existingDraft.externalPostId} vs ${externalPostId})`);
  }

  const updatedDraft = await tx.contentDraft.update({
    where: { id: draftId, tenantId },
    data: { status: "PUBLISHED", publishedAt: new Date(), externalPostId },
    select: { status: true, externalPostId: true },
  });

  if (updatedDraft.status !== "PUBLISHED" || updatedDraft.externalPostId !== externalPostId) {
    throw new Error("FINALIZE_DRAFT_VERIFY: draft not committed with expected values");
  }

  // 3. PublishingJob — last write, must be IN_REVIEW
  const jobCommit = await tx.publishingJob.updateMany({
    where: { id: jobId, status: "IN_REVIEW" },
    data: { status: "PUBLISHED", scheduledFor: null, updatedAt: new Date() },
  });

  if (jobCommit.count !== 1) {
    throw new Error(`FINALIZE_JOB_PRECONDITION: job not IN_REVIEW (count=${jobCommit.count})`);
  }

  return { committed: true, externalPostId };
}

export interface CommitResult {
  committed: boolean;
  reconciliationRequired: boolean;
  externalPostId: string;
  code?: string;
}

export async function commitConfirmedPublication(
  prisma: { $transaction(fn: (tx: any) => Promise<FinalizeTxResult>): Promise<FinalizeTxResult> },
  params: Omit<FinalizeTxParams, "tx">
): Promise<CommitResult> {
  try {
    const result = await prisma.$transaction((tx) =>
      finalizeConfirmedPublicationTx({ tx, ...params })
    );

    return { committed: true, reconciliationRequired: false, externalPostId: result.externalPostId };
  } catch {
    return {
      committed: false,
      reconciliationRequired: true,
      externalPostId: params.externalPostId,
      code: "LIVE_RECONCILIATION_REQUIRED",
    };
  }
}

export interface ReconcileTxParams {
  tx: TxClient;
  jobId: string;
  draftId: string;
  tenantId: string;
  externalPostId: string;
  now: Date;
}

export interface ReconcileCommitResult {
  committed: boolean;
  case: "CASE_A_AUTO" | "CASE_B_ALERT" | "CASE_C_BLOCK";
  reason?: string;
}

export async function reconcileDraftFromResultTx(params: ReconcileTxParams): Promise<ReconcileCommitResult> {
  const { tx, jobId, draftId, tenantId, externalPostId, now } = params;

  if (!externalPostId) {
    throw new Error("RECONCILE_INVALID: externalPostId is empty");
  }

  const resultId = `pr_${jobId}`;

  const existingResult = await tx.publishingResult.findUnique({
    where: { id: resultId },
    select: { ok: true, externalPostId: true },
  });

  if (!existingResult?.ok || !existingResult.externalPostId) {
    return {
      committed: false,
      case: "CASE_C_BLOCK",
      reason: "No existe PublishingResult exitoso para reconciliar.",
    };
  }

  if (existingResult.externalPostId !== externalPostId) {
    return {
      committed: false,
      case: "CASE_B_ALERT",
      reason: `Conflicto: externalPostId del Result (${existingResult.externalPostId}) no coincide con el esperado (${externalPostId}).`,
    };
  }

  const existingDraft = await tx.contentDraft.findUnique({
    where: { id: draftId },
    select: { externalPostId: true },
  });

  if (existingDraft?.externalPostId && existingDraft.externalPostId !== externalPostId) {
    return {
      committed: false,
      case: "CASE_B_ALERT",
      reason: `Conflicto: Draft ya tiene externalPostId distinto (${existingDraft.externalPostId}).`,
    };
  }

  if (existingDraft?.externalPostId === externalPostId) {
    const job = await tx.publishingJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    });

    if (job?.status === "PUBLISHED") {
      return { committed: true, case: "CASE_A_AUTO", reason: "Draft y job ya reconciliados." };
    }
  }

  const updatedDraft = await tx.contentDraft.update({
    where: { id: draftId, tenantId },
    data: { status: "PUBLISHED", publishedAt: now, externalPostId },
    select: { status: true, externalPostId: true },
  });

  if (updatedDraft.status !== "PUBLISHED" || updatedDraft.externalPostId !== externalPostId) {
    return {
      committed: false,
      case: "CASE_C_BLOCK",
      reason: "Fallo al actualizar el Draft durante reconciliacion.",
    };
  }

  const jobCommit = await tx.publishingJob.updateMany({
    where: { id: jobId },
    data: { status: "PUBLISHED", scheduledFor: null, updatedAt: now },
  });

  if (jobCommit.count < 1) {
    throw new Error("RECONCILE_JOB_PRECONDITION: job not updated during reconciliation");
  }

  return { committed: true, case: "CASE_A_AUTO" };
}

export async function reconcilePublication(
  prisma: { $transaction(fn: (tx: any) => Promise<any>): Promise<any> },
  params: Omit<ReconcileTxParams, "tx">
): Promise<ReconcileCommitResult> {
  try {
    return await prisma.$transaction((tx: TxClient) =>
      reconcileDraftFromResultTx({ tx, ...params })
    );
  } catch {
    return {
      committed: false,
      case: "CASE_C_BLOCK",
      reason: "Transaccion de reconciliacion fallo.",
    };
  }
}

export interface RecordFailureParams {
  tx: any;
  jobId: string;
  draftId: string;
  tenantId: string;
  network: string;
  errorMsg: string;
  isMaxAttempts: boolean;
}

export async function recordUnconfirmedProviderFailure(params: RecordFailureParams): Promise<{ degraded: boolean }> {
  const { tx, jobId, draftId, tenantId, network, errorMsg, isMaxAttempts } = params;

  const existingResult = await tx.publishingResult.findUnique({
    where: { id: `pr_${jobId}` },
    select: { ok: true, externalPostId: true },
  }) as { ok: boolean; externalPostId: string | null } | null;

  if (existingResult?.ok === true && existingResult.externalPostId) {
    return { degraded: false };
  }

  const draft = await tx.contentDraft.findUnique({
    where: { id: draftId },
    select: { externalPostId: true },
  }) as { externalPostId: string | null } | null;

  if (draft?.externalPostId) {
    return { degraded: false };
  }

  const job = await tx.publishingJob.findUnique({
    where: { id: jobId },
    select: { status: true },
  }) as { status: string } | null;

  if (job?.status === "PUBLISHED") {
    return { degraded: false };
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

  return { degraded: true };
}
