export type QueueMode = "draft" | "dry-run" | "live";

export interface PublishDraftJob {
  tenantId: string;
  draftId: string;
  mode: QueueMode;
}

export interface ValidateAssetsJob {
  tenantId: string;
  draftId: string;
  mode: QueueMode;
}

export interface TestModeJob {
  tenantId: string;
  draftId?: string;
  mode: QueueMode;
}

export type QueueJobName = "publish-draft" | "validate-assets" | "test-mode";

export interface QueueJobResult {
  ok: boolean;
  draftId?: string;
  tenantId?: string;
  action?: string;
  error?: string;
  retryCount?: number;
  dryRun?: boolean;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}
