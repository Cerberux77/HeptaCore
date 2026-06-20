export type DraftOperationalState =
  | "DRAFT"
  | "REVIEW_REQUIRED"
  | "READY_TO_PUBLISH"
  | "RECONCILIATION_REQUIRED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "FAILED"
  | "REJECTED";

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
  id: string;
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
): { operationalState: DraftOperationalState; blockedReason?: string; duplicateIncident: boolean; externalPostId?: string | null } {
  const activeJobs = jobs.filter((j) => j.status === "IN_REVIEW" || j.status === "PUBLISHED" || j.status === "SCHEDULED");
  const publishedJob = activeJobs.find((j) => j.status === "PUBLISHED");
  const inReviewJob = activeJobs.find((j) => j.status === "IN_REVIEW");
  const scheduledJob = activeJobs.find((j) => j.status === "SCHEDULED");

  const resultOk = activeJobs.some((j) => j.PublishingResult?.ok === true);
  const resultExternalPostId = activeJobs.find((j) => j.PublishingResult?.externalPostId)?.PublishingResult?.externalPostId;
  const draftExternalPostId = draft.externalPostId;

  const hasDurableSuccess = !!draftExternalPostId || (resultOk && !!resultExternalPostId) || (publishedJob && (draftExternalPostId || !!resultExternalPostId));
  const canonicalExternalPostId = draftExternalPostId ?? resultExternalPostId ?? null;
  const multipleJobs = jobs.filter((j) => j.status === "PUBLISHED" || (j.PublishingResult?.ok === true)).length > 1;

  // Published
  if (draft.status === "PUBLISHED" || hasDurableSuccess) {
    return {
      operationalState: "PUBLISHED",
      duplicateIncident: multipleJobs,
      externalPostId: canonicalExternalPostId,
    };
  }

  // Reconciliation required
  if (inReviewJob) {
    return {
      operationalState: "RECONCILIATION_REQUIRED",
      blockedReason: "Existe un intento de publicacion con resultado incierto.",
      duplicateIncident: false,
      externalPostId: canonicalExternalPostId,
    };
  }

  const incompleteDurable = (draft.status === "PUBLISHED" && !hasDurableSuccess)
    || (resultExternalPostId && !hasDurableSuccess);

  if (incompleteDurable) {
    return {
      operationalState: "RECONCILIATION_REQUIRED",
      blockedReason: "Evidencia de publicacion incompleta.",
      duplicateIncident: false,
      externalPostId: canonicalExternalPostId,
    };
  }

  // Scheduled
  if (draft.status === "SCHEDULED" && scheduledJob) {
    return {
      operationalState: "SCHEDULED",
      duplicateIncident: false,
      externalPostId: null,
    };
  }

  // Ready to publish
  if (draft.status === "APPROVED" && !draftExternalPostId && !resultOk && !inReviewJob && !publishedJob) {
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
