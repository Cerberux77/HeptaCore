export type DraftOperationalState =
  | "DRAFT"
  | "REVIEW_REQUIRED"
  | "READY_TO_PUBLISH"
  | "RECONCILIATION_REQUIRED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "FAILED"
  | "REJECTED";

export type ReconciliationCase =
  | "CASE_A_AUTO"
  | "CASE_B_ALERT"
  | "CASE_C_BLOCK";

export interface ReconciliationAlert {
  case: ReconciliationCase;
  reason: string;
  draftId: string;
  jobId?: string;
  externalPostId?: string | null;
  requiresHumanReview: boolean;
  shouldNotCallProvider: true;
}

export interface DraftOperationalSnapshot {
  id: string;
  title: string;
  caption: string;
  network: string;
  format: string;
  status: string;
  operationalState: DraftOperationalState;
  publishBlockedReason?: string;
  duplicateIncident: boolean;
  externalPostId?: string | null;
  scheduledFor: string | null;
  requiresReview: boolean;
  riskLevel: string;
  updatedAt?: Date;
  asset: { filename: string; path: string | null; kind: string } | null;
  reconciliationCase?: ReconciliationCase;
  reconciliationReason?: string;
}

export interface DraftProjectionInput {
  id: string;
  status: string;
  externalPostId?: string | null;
  network: string;
  requiresReview?: boolean;
  riskLevel?: string;
  scheduledFor?: Date | string | null;
}

export interface JobProjectionInput {
  id?: string;
  status: string;
  provider?: string;
  scheduledFor?: Date | string | null;
  attempts?: number;
  lastError?: string | null;
  PublishingResult?: { ok: boolean; externalPostId?: string | null } | null;
}

export function projectDraftOperationalState(
  draft: DraftProjectionInput,
  jobs: JobProjectionInput[],
  now: Date,
): { operationalState: DraftOperationalState; blockedReason?: string; duplicateIncident: boolean; externalPostId?: string | null; reconciliationCase?: ReconciliationCase; reconciliationReason?: string } {
  const activeJobs = jobs.filter((j) => j.status === "IN_REVIEW" || j.status === "PUBLISHED" || j.status === "SCHEDULED" || j.status === "FAILED");
  const inReviewJob = activeJobs.find((j) => j.status === "IN_REVIEW");
  const scheduledJob = activeJobs.find((j) => j.status === "SCHEDULED");

  const resultOk = activeJobs.some((j) => j.PublishingResult?.ok === true);
  const resultExternalPostId = activeJobs.find((j) => j.PublishingResult?.externalPostId)?.PublishingResult?.externalPostId;
  const draftExternalPostId = draft.externalPostId;

  const hasDurableSuccess = !!draftExternalPostId || (resultOk && !!resultExternalPostId);
  const canonicalExternalPostId = draftExternalPostId ?? resultExternalPostId ?? null;
  const jobsWithSuccess = jobs.filter((j) => (j.status === "PUBLISHED" && j.PublishingResult?.externalPostId) || j.PublishingResult?.ok === true).length;
  const duplicateIncident = jobsWithSuccess > 1;

  // Published — only with durable evidence
  if (hasDurableSuccess) {
    return {
      operationalState: "PUBLISHED",
      duplicateIncident,
      externalPostId: canonicalExternalPostId,
    };
  }

  // Reconciliation required — IN_REVIEW, incomplete durable, or raw PUBLISHED without evidence
  const incompleteDurable = (draft.status === "PUBLISHED" && !hasDurableSuccess)
    || (!!resultExternalPostId && !hasDurableSuccess);

  if (inReviewJob || incompleteDurable || (draft.status === "PUBLISHED" && !hasDurableSuccess)) {
    const rec = computeReconciliationCase({ resultOk, resultExternalPostId, draftExternalPostId, draftStatus: draft.status, jobStatus: inReviewJob?.status });
    return {
      operationalState: "RECONCILIATION_REQUIRED",
      blockedReason: "El estado de publicacion requiere verificacion.",
      duplicateIncident: false,
      externalPostId: canonicalExternalPostId,
      reconciliationCase: rec.case,
      reconciliationReason: rec.reason,
    };
  }

  // Scheduled
  if (draft.status === "SCHEDULED" && scheduledJob && scheduledJob.scheduledFor) {
    return {
      operationalState: "SCHEDULED",
      duplicateIncident: false,
      externalPostId: null,
    };
  }

  // Ready to publish
  if (draft.status === "APPROVED" && !draftExternalPostId && !resultOk && !inReviewJob) {
    return {
      operationalState: "READY_TO_PUBLISH",
      duplicateIncident: false,
      externalPostId: null,
    };
  }

  // Needs review
  if (draft.requiresReview || draft.riskLevel !== "low" || draft.status === "NEEDS_REVIEW") {
    if (draft.status !== "PUBLISHED" && draft.status !== "REJECTED" && draft.status !== "FAILED") {
      return {
        operationalState: "REVIEW_REQUIRED",
        duplicateIncident: false,
        externalPostId: null,
      };
    }
  }

  // Direct mapping
  if (draft.status === "DRAFT") return { operationalState: "DRAFT", duplicateIncident: false, externalPostId: null };
  if (draft.status === "REJECTED") return { operationalState: "REJECTED", duplicateIncident: false, externalPostId: null };
  if (draft.status === "FAILED") return { operationalState: "FAILED", duplicateIncident: false, externalPostId: null };

  return { operationalState: "DRAFT", duplicateIncident: false, externalPostId: null };
}

export function buildReconciliationAlert(params: {
  case: ReconciliationCase;
  reason: string;
  draftId: string;
  jobId?: string;
  externalPostId?: string | null;
}): ReconciliationAlert {
  const { case: c, reason, draftId, jobId, externalPostId } = params;
  return {
    case: c,
    reason,
    draftId,
    jobId,
    externalPostId,
    requiresHumanReview: c === "CASE_B_ALERT",
    shouldNotCallProvider: true,
  };
}

function computeReconciliationCase(evidence: {
  resultOk: boolean;
  resultExternalPostId?: string | null;
  draftExternalPostId?: string | null;
  draftStatus: string;
  jobStatus?: string;
}): { case: ReconciliationCase; reason: string } {
  const { resultOk, resultExternalPostId, draftExternalPostId, draftStatus, jobStatus } = evidence;

  const hasDurableResult = resultOk && !!resultExternalPostId;
  const hasDraftPostId = !!draftExternalPostId;
  const isIncomplete = draftStatus !== "PUBLISHED" || !draftExternalPostId || (jobStatus && jobStatus !== "PUBLISHED");

  if (hasDurableResult && isIncomplete) {
    return {
      case: "CASE_A_AUTO",
      reason: "Resultado exitoso persistido con externalPostId. Draft incompleto. Reconcilia automaticamente sin llamar al proveedor.",
    };
  }

  if (hasDraftPostId && !resultExternalPostId && !resultOk) {
    return {
      case: "CASE_B_ALERT",
      reason: "Draft tiene externalPostId pero no existe PublishingResult. Requiere revision humana.",
    };
  }

  return {
    case: "CASE_C_BLOCK",
    reason: "Sin evidencia suficiente de publicacion. Bloquear flujo y notificar operacionalmente.",
  };
}
