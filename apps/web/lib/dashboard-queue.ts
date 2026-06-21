import type { DraftQueueItem } from "./dashboard";

export type DraftQueuePatch = Partial<DraftQueueItem> & { id: string };
export type PublishMode = "dry_run" | "scheduled" | "immediate";
export type ApprovalResponseResult =
  | { ok: true; draft: DraftQueuePatch }
  | { ok: false; error: string };

export function mergeDraftQueueItem(queue: DraftQueueItem[], patch: DraftQueuePatch): DraftQueueItem[] {
  return queue.map((draft) => (draft.id === patch.id ? { ...draft, ...patch } : draft));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function readApprovalResponse(res: Response, draftId: string): Promise<ApprovalResponseResult> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  const error = isRecord(data) && typeof data.error === "string" ? data.error : "No se pudo aprobar el draft.";
  if (!res.ok) {
    return { ok: false, error };
  }

  if (!isRecord(data) || data.ok !== true || !isRecord(data.draft)) {
    return { ok: false, error: "Respuesta de aprobacion invalida." };
  }

  const returnedDraft = data.draft;
  const status = typeof returnedDraft.status === "string" ? returnedDraft.status : "";
  if (status !== "APPROVED") {
    return { ok: false, error: "La aprobacion no devolvio estado APPROVED." };
  }

  const id = typeof returnedDraft.id === "string" ? returnedDraft.id : draftId;
  return {
    ok: true,
    draft: {
      ...(returnedDraft as DraftQueuePatch),
      id,
      status,
      requiresReview: false,
      operationalState: typeof returnedDraft.operationalState === "string"
        ? returnedDraft.operationalState as DraftQueueItem["operationalState"]
        : "READY_TO_PUBLISH",
    },
  };
}

export function selectedDraftFromQueue(queue: DraftQueueItem[], selectedId: string): DraftQueueItem | undefined {
  const match = queue.find((draft) => draft.id === selectedId);
  if (match) return match;
  return queue.find((draft) => draft.status === "APPROVED");
}

export function resolvePublishTargetFromQueue(
  queue: DraftQueueItem[],
  selectedId: string,
  _mode: PublishMode,
): DraftQueueItem | null {
  const selected = queue.find((draft) => draft.id === selectedId);
  if (selected && selected.status === "APPROVED") return selected;
  if (selected?.status === "PUBLISHED") return null;
  return queue.find((draft) => draft.status === "APPROVED") ?? null;
}

export function buildPublishPayload(
  tenantSlug: string,
  draftId: string,
  mode: PublishMode,
  manualApproval: boolean,
) {
  return {
    tenantSlug,
    draftId,
    manualApproval,
    mode,
  };
}

export function approvedCount(queue: DraftQueueItem[]): number {
  return queue.filter((draft) => draft.status === "APPROVED").length;
}
