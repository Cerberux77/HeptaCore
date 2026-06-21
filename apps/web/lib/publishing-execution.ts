export function buildImmediateJobId(draftId: string, network: string): string {
  return `pj_immediate_${draftId}_${network}`;
}

export function buildScheduledJobId(draftId: string, network: string, scheduledFor: Date): string {
  const ts = scheduledFor.getTime().toString(36);
  return `pj_scheduled_${draftId}_${network}_${ts}`;
}

export interface ExistingJobCheck {
  blocked: boolean;
  reason?: string;
  code?: string;
}

export function checkExistingJobForRetry(params: {
  jobStatus?: string;
  resultOk?: boolean;
  externalPostId?: string | null;
  draftExternalPostId?: string | null;
}): ExistingJobCheck {
  const { jobStatus, resultOk, externalPostId, draftExternalPostId } = params;

  if (draftExternalPostId) {
    return { blocked: true, reason: "El draft ya tiene un externalPostId. No puede volver a publicarse.", code: "LIVE_BLOCKED_EXISTING_POST_ID" };
  }

  if (jobStatus === "PUBLISHED") {
    return { blocked: true, reason: "Ya existe un job PUBLISHED para este draft. No puede volver a publicarse.", code: "LIVE_BLOCKED_JOB_PUBLISHED" };
  }

  if (resultOk === true && externalPostId) {
    return { blocked: true, reason: "Ya existe un resultado exitoso con externalPostId. Requiere reconciliacion.", code: "LIVE_BLOCKED_RESULT_EXISTS" };
  }

  if (jobStatus === "IN_REVIEW") {
    return { blocked: true, reason: "El draft tiene un job en ejecucion o pendiente de reconciliacion.", code: "LIVE_BLOCKED_JOB_IN_FLIGHT" };
  }

  if (jobStatus === "SCHEDULED") {
    return { blocked: true, reason: "El draft tiene un job activo programado.", code: "LIVE_BLOCKED_JOB_ACTIVE" };
  }

  return { blocked: false };
}

export interface RollbackParams {
  draftId: string;
  tenantId: string;
  expectedStatus: string;
}

export interface ProviderSuccessParams {
  draftId: string;
  jobId: string;
  network: string;
  externalPostId: string;
  providerResponse: unknown;
  now: Date;
}

export function isPublicationDurablyCommitted(params: {
  resultPersisted: boolean;
  draftPersisted: boolean;
  externalPostId?: string;
}): boolean {
  const { resultPersisted, draftPersisted, externalPostId } = params;
  return resultPersisted && draftPersisted && !!externalPostId;
}

export function hasDurableProviderSuccess(params: {
  resultOk?: boolean;
  resultExternalPostId?: string | null;
  draftExternalPostId?: string | null;
}): boolean {
  const { resultOk, resultExternalPostId, draftExternalPostId } = params;
  return (resultOk === true && !!resultExternalPostId) || !!draftExternalPostId;
}

export function reconcileDurableProviderSuccess(params: {
  resultOk: boolean;
  resultExternalPostId: string;
  draftExternalPostId?: string | null;
  jobStatus: string;
}): { shouldReconcile: boolean; shouldCallProvider: boolean; reason?: string } {
  const { resultOk, resultExternalPostId, draftExternalPostId, jobStatus } = params;

  if (!resultOk || !resultExternalPostId) {
    return { shouldReconcile: false, shouldCallProvider: false, reason: "No durable provider success evidence." };
  }

  if (draftExternalPostId === resultExternalPostId && jobStatus === "PUBLISHED") {
    return { shouldReconcile: false, shouldCallProvider: false, reason: "Already fully persisted." };
  }

  return { shouldReconcile: true, shouldCallProvider: false, reason: "Provider confirmed. Reconcile locally without re-publishing." };
}

export type PublishEligibility = "READY" | "RECONCILIATION_REQUIRED" | "PUBLISHED" | "NOT_APPROVED";

export interface PublishEligibilityCheck {
  eligibility: PublishEligibility;
  blockedReason?: string;
}

export function isDraftActuallyPublishable(params: {
  draftStatus: string;
  draftExternalPostId?: string | null;
  hasPublishedResult?: boolean;
  hasInReviewJob?: boolean;
  hasResultExternalPostId?: boolean;
  hasPublishedJob?: boolean;
}): PublishEligibilityCheck {
  const { draftStatus, draftExternalPostId, hasPublishedResult, hasInReviewJob, hasResultExternalPostId, hasPublishedJob } = params;

  if (draftExternalPostId || hasPublishedResult || hasPublishedJob) {
    return { eligibility: "PUBLISHED" };
  }

  if (draftStatus !== "APPROVED") {
    return { eligibility: "NOT_APPROVED" };
  }

  if (hasInReviewJob || hasResultExternalPostId) {
    return { eligibility: "RECONCILIATION_REQUIRED", blockedReason: "Existe un intento de publicacion activo con resultado incierto." };
  }

  return { eligibility: "READY" };
}

export function checkLegacyJobId(draftId: string, network: string): string {
  return `pj_${draftId}_${network}`;
}

export function getAllPossibleJobIds(draftId: string, network: string): string[] {
  return [
    checkLegacyJobId(draftId, network),
    buildImmediateJobId(draftId, network),
  ];
}

export interface CronJobEligibility {
  eligible: boolean;
  reason?: string;
}

export function checkCronJobEligibility(params: {
  jobStatus: string;
  scheduledFor: Date | null;
  attempts: number;
  maxAttempts: number;
  draftExists: boolean;
  draftStatus?: string;
  draftNetwork?: string;
  jobProvider: string;
  draftExternalPostId?: string | null;
  resultOk?: boolean;
  resultExternalPostId?: string | null;
  isImmediatePreAttempt: boolean;
}): CronJobEligibility {
  const { jobStatus, scheduledFor, attempts, maxAttempts, draftExists, draftStatus, draftNetwork, jobProvider, draftExternalPostId, resultOk, resultExternalPostId, isImmediatePreAttempt } = params;

  if (jobStatus !== "SCHEDULED" && jobStatus !== "IN_REVIEW") {
    return { eligible: false, reason: `Job status ${jobStatus}, expected SCHEDULED or IN_REVIEW.` };
  }

  if (isImmediatePreAttempt) {
    return { eligible: false, reason: "Immediate pre-attempt job, not for cron." };
  }

  if (!scheduledFor) {
    return { eligible: false, reason: "scheduledFor is null (likely immediate pre-attempt)." };
  }

  if (attempts >= maxAttempts) {
    return { eligible: false, reason: "Max attempts reached." };
  }

  if (!draftExists) {
    return { eligible: false, reason: "Draft not found." };
  }

  if (draftStatus !== "SCHEDULED") {
    return { eligible: false, reason: `Draft status ${draftStatus}, expected SCHEDULED.` };
  }

  if (draftNetwork !== jobProvider) {
    return { eligible: false, reason: `Network mismatch: draft=${draftNetwork}, job=${jobProvider}.` };
  }

  if (draftExternalPostId) {
    return { eligible: false, reason: "Draft already has externalPostId." };
  }

  if (resultOk && resultExternalPostId) {
    return { eligible: false, reason: "Successful PublishingResult already exists." };
  }

  return { eligible: true };
}