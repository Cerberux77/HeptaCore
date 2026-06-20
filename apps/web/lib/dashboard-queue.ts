import type { DraftQueueItem } from "./dashboard";

export type DraftQueuePatch = Partial<DraftQueueItem> & { id: string };
export type PublishMode = "dry_run" | "scheduled" | "immediate";

export function mergeDraftQueueItem(queue: DraftQueueItem[], patch: DraftQueuePatch): DraftQueueItem[] {
  return queue.map((draft) => (draft.id === patch.id ? { ...draft, ...patch } : draft));
}

export function selectedDraftFromQueue(queue: DraftQueueItem[], selectedId: string): DraftQueueItem | undefined {
  return queue.find((draft) => draft.id === selectedId) ?? queue[0];
}

export function resolvePublishTargetFromQueue(
  queue: DraftQueueItem[],
  selectedId: string,
  mode: PublishMode,
): DraftQueueItem | null {
  const selected = selectedDraftFromQueue(queue, selectedId);
  if (!selected) return null;
  if (selected.status === "PUBLISHED") return null;
  if (mode === "immediate" && selected.status !== "APPROVED") return null;
  if (mode === "scheduled" && selected.status !== "APPROVED") return null;
  return selected;
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
