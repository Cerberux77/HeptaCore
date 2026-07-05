export type Pub04JobStatus = "SCHEDULED" | "IN_REVIEW" | "PUBLISHED" | "FAILED";
export type Pub04DraftStatus = "APPROVED" | "SCHEDULED" | "PUBLISHED" | "FAILED";

export interface Pub04Job {
  id: string;
  tenantId: string;
  postId: string;
  provider: string;
  status: Pub04JobStatus;
  scheduledFor: Date;
  attempts: number;
  claimedAt: Date | null;
  claimToken: string | null;
  providerAttemptStartedAt: Date | null;
}

export interface Pub04Tenant {
  id: string;
  status: string;
  automationMode: string;
}

export interface Pub04Asset {
  kind: "IMAGE" | "VIDEO";
  publicUrl: string | null;
}

export interface Pub04Draft {
  id: string;
  tenantId: string;
  status: Pub04DraftStatus;
  network: string;
  format: string;
  caption: string;
  title: string;
  externalPostId: string | null;
  socialAccountId: string | null;
  assets: Pub04Asset[];
}

export interface Pub04SocialAccount {
  id: string;
  tenantId: string;
  network: string;
  status: string;
  scopes: string[];
  externalAccountId: string | null;
  updatedAt: Date;
}

export interface Pub04DurableResult {
  ok: boolean;
  externalPostId: string | null;
}

export interface Pub04Context {
  job: Pub04Job;
  tenant: Pub04Tenant | null;
  draft: Pub04Draft | null;
  socialAccounts: Pub04SocialAccount[];
  durableResult: Pub04DurableResult | null;
  publishedCountOnNetwork: number;
  trialLimit: number;
}

export interface Pub04Publisher {
  textOnly: boolean;
  supportedFormats: readonly string[];
  requiredScopes: readonly string[];
  publish(input: {
    targetId: string;
    accessToken: string;
    caption: string;
    mediaUrl?: string;
    mediaType?: "IMAGE" | "VIDEO";
    format?: string;
  }): Promise<
    | { kind: "success"; externalPostId: string; providerResponse: unknown }
    | { kind: "retryable_failure"; error: string }
    | { kind: "terminal_failure"; error: string }
    | { kind: "ambiguous"; error: string }
  >;
}

export interface Pub04Repository {
  listCandidates(input: {
    now: Date;
    limit: number;
    leaseTtlMs: number;
  }): Promise<Pub04Job[]>;

  countDue(input: { now: Date }): Promise<number>;

  loadContext(jobId: string): Promise<Pub04Context | null>;

  claimScheduled(input: {
    jobId: string;
    claimToken: string;
    now: Date;
  }): Promise<boolean>;

  reclaimExpiredPreProvider(input: {
    jobId: string;
    claimToken: string;
    now: Date;
    leaseTtlMs: number;
  }): Promise<boolean>;

  markProviderAttemptStarted(input: {
    jobId: string;
    claimToken: string;
    now: Date;
  }): Promise<boolean>;

  recordPreProviderBlock(input: {
    jobId: string;
    claimToken: string;
    code: string;
    terminal: boolean;
    now: Date;
  }): Promise<void>;

  recordProviderFailure(input: {
    jobId: string;
    claimToken: string;
    error: string;
    retryable: boolean;
    maxAttempts: number;
    now: Date;
  }): Promise<void>;

  markReconciliation(input: {
    jobId: string;
    claimToken: string | null;
    code: string;
    now: Date;
  }): Promise<void>;

  finalizeSuccess(input: {
    jobId: string;
    claimToken: string;
    externalPostId: string;
    providerResponse: unknown;
    now: Date;
  }): Promise<"committed" | "reconciliation_required">;

  reconcileDurableSuccess(input: {
    jobId: string;
    externalPostId: string;
    now: Date;
  }): Promise<"committed" | "conflict">;
}

export interface Pub04CronDeps {
  repo: Pub04Repository;
  getPublisher(network: string): Pub04Publisher | null;
  resolveCredential(input: {
    tenantId: string;
    provider: string;
    socialAccountId: string;
  }): Promise<
    | { ok: true; accessToken: string; targetId: string }
    | { ok: false; code: string }
  >;
  now(): Date;
  newClaimToken(): string;
}

export interface Pub04CronInput {
  dryRun: boolean;
  batchLimit: number;
  timeBudgetMs: number;
  leaseTtlMs: number;
  maxAttempts: number;
}

export type Pub04OutcomeCode =
  | "DRY_RUN_ELIGIBLE"
  | "DRY_RUN_BLOCKED"
  | "PUBLISHED"
  | "RECONCILIATION_REQUIRED"
  | "RETRYABLE_FAILURE"
  | "TERMINAL_FAILURE"
  | "PRE_PROVIDER_BLOCKED"
  | "SKIPPED_ACTIVE_CLAIM"
  | "SKIPPED_CLAIM_LOST"
  | "SKIPPED_MAX_ATTEMPTS"
  | "SKIPPED_TIME_BUDGET";

export interface Pub04JobOutcome {
  jobId: string;
  code: Pub04OutcomeCode;
  reason?: string;
}

export interface Pub04ReconciliationAlert {
  jobId: string;
  draftId: string;
  case: "CASE_A_AUTO" | "CASE_B_ALERT" | "CASE_C_BLOCK";
  reason: string;
  committed: boolean;
  requiresHumanReview: boolean;
}

export interface Pub04CronSummary {
  totalDue: number;
  selected: number;
  claimed: number;
  published: number;
  reconciliationRequired: number;
  retryableFailures: number;
  terminalFailures: number;
  skipped: number;
  remainingDue: number;
  timeBudgetExhausted: boolean;
  reconciliationAlerts: Pub04ReconciliationAlert[];
}

export interface Pub04CronResult {
  summary: Pub04CronSummary;
  outcomes: Pub04JobOutcome[];
}

export interface Pub04ScheduleInput {
  tenantId: string;
  draftId: string;
  network: string;
  scheduledFor: Date;
}

export interface Pub04ScheduleResult {
  jobId: string;
  status: "created" | "existing";
  scheduledFor: string;
}

export interface Pub04ScheduleRepository {
  scheduleAtomic(input: {
    jobId: string;
    tenantId: string;
    draftId: string;
    network: string;
    scheduledFor: Date;
  }): Promise<{ jobId: string; status: "created" | "existing" }>;
}
