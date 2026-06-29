export type CronOutcomeCode =
  | "PUBLISHED"
  | "RECONCILIATION_REQUIRED"
  | "RETRYABLE_FAILURE"
  | "TERMINAL_FAILURE"
  | "SKIPPED_ALREADY_CLAIMED"
  | "SKIPPED_TIME_BUDGET";

export interface CronJobOutcome {
  jobId: string;
  code: CronOutcomeCode;
  reason?: string;
}

export interface CronRunSummary {
  runId: string;
  startedAt: string;
  finishedAt: string;
  windowStart: string;
  windowEnd: string;
  currentWindowDue: number;
  backlogDue: number;
  selected: number;
  claimed: number;
  published: number;
  reconciliationRequired: number;
  retryableFailures: number;
  terminalFailures: number;
  skipped: number;
  remainingDue: number;
  timeBudgetExhausted: boolean;
  durationMs: number;
  dryRun: boolean;
  reconciliationAlerts: ReconciliationReportEntry[];
}

export interface ReconciliationReportEntry {
  jobId: string;
  draftId: string;
  case: "CASE_A_AUTO" | "CASE_B_ALERT" | "CASE_C_BLOCK";
  reason: string;
  committed: boolean;
  requiresHumanReview: boolean;
}

export function createEmptySummary(runId: string, startedAt: Date, windowStart: string, windowEnd: string, dryRun: boolean): CronRunSummary {
  return {
    runId,
    startedAt: startedAt.toISOString(),
    finishedAt: "",
    windowStart,
    windowEnd,
    currentWindowDue: 0,
    backlogDue: 0,
    selected: 0,
    claimed: 0,
    published: 0,
    reconciliationRequired: 0,
    retryableFailures: 0,
    terminalFailures: 0,
    skipped: 0,
    remainingDue: 0,
    timeBudgetExhausted: false,
    durationMs: 0,
    dryRun,
    reconciliationAlerts: [],
  };
}
