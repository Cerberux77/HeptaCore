import type { DraftQueueItem } from "./dashboard";

export type DraftQueuePatch = Partial<DraftQueueItem> & { id: string };
export type PublishMode = "dry_run" | "scheduled" | "immediate";

export function mergeDraftQueueItem(queue: DraftQueueItem[], patch: DraftQueuePatch): DraftQueueItem[] {
  return queue.map((draft) => (draft.id === patch.id ? { ...draft, ...patch } : draft));
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
