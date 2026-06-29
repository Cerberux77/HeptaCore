export type ReconciliationCase =
  | "CASE_A_AUTO"
  | "CASE_B_ALERT"
  | "CASE_C_BLOCK";

export interface ReconciliationClassification {
  case: ReconciliationCase;
  shouldAutoReconcile: boolean;
  shouldCallProvider: boolean;
  reason: string;
  auditAction: "RECONCILE_AUTO" | "ALERT_HUMAN" | "BLOCK_NOTIFY";
}

export interface ReconciliationEvidence {
  resultOk?: boolean;
  resultExternalPostId?: string | null;
  draftExternalPostId?: string | null;
  draftStatus?: string;
  jobStatus?: string;
}

export function classifyReconciliation(evidence: ReconciliationEvidence): ReconciliationClassification {
  const { resultOk, resultExternalPostId, draftExternalPostId, draftStatus, jobStatus } = evidence;

  const hasDurableResult = resultOk === true && !!resultExternalPostId;
  const hasDraftPostId = !!draftExternalPostId;
  const isIncomplete = draftStatus !== "PUBLISHED" || !draftExternalPostId || (jobStatus && jobStatus !== "PUBLISHED");

  if (hasDurableResult && isIncomplete) {
    return {
      case: "CASE_A_AUTO",
      shouldAutoReconcile: true,
      shouldCallProvider: false,
      reason: "Resultado exitoso persistido con externalPostId. Draft incompleto. Reconcilia automaticamente sin llamar al proveedor.",
      auditAction: "RECONCILE_AUTO",
    };
  }

  if (hasDraftPostId && !resultExternalPostId && !resultOk) {
    return {
      case: "CASE_B_ALERT",
      shouldAutoReconcile: false,
      shouldCallProvider: false,
      reason: "Draft tiene externalPostId pero no existe PublishingResult. Requiere revision humana.",
      auditAction: "ALERT_HUMAN",
    };
  }

  return {
    case: "CASE_C_BLOCK",
    shouldAutoReconcile: false,
    shouldCallProvider: false,
    reason: "Sin evidencia suficiente de publicacion. Bloquear flujo y notificar operacionalmente.",
    auditAction: "BLOCK_NOTIFY",
  };
}
