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

  if (jobStatus === "SCHEDULED") {
    return { blocked: true, reason: "El draft tiene un job activo. Verifica si ya esta programado o en ejecucion.", code: "LIVE_BLOCKED_JOB_ACTIVE" };
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

export interface ReconciliationResponse {
  ok: false;
  providerConfirmed: true;
  code: string;
  status: string;
  draftId: string;
  externalPostId: string;
  error: string;
  action: string;
}