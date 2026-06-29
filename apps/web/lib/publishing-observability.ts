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

export interface ReconciliationReportEntry {
  jobId: string;
  draftId: string;
  case: "CASE_A_AUTO" | "CASE_B_ALERT" | "CASE_C_BLOCK";
  reason: string;
  committed: boolean;
  requiresHumanReview: boolean;
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

export interface PublishingCorrelationId {
  runId: string;
  sequence: number;
}

export function generateCorrelationId(runId: string, suffix?: string): string {
  const base = runId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
  return suffix ? `${base}_${suffix}` : base;
}

export function generateRunId(): string {
  const ts = new Date().toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `run-${ts}-${rand}`;
}

export interface AlertThresholds {
  providerFailureRate: number;
  reconciliationRequiredRate: number;
  timeBudgetExhaustedCount: number;
  consecutiveTerminalFailures: number;
  maxLatencyMs: number;
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  providerFailureRate: 0.3,
  reconciliationRequiredRate: 0.5,
  timeBudgetExhaustedCount: 3,
  consecutiveTerminalFailures: 5,
  maxLatencyMs: 55000,
};

export interface AlertEvaluation {
  triggered: boolean;
  alerts: AlertEntry[];
}

export interface AlertEntry {
  type: "PROVIDER_FAILURE_RATE" | "RECONCILIATION_RATE" | "TIME_BUDGET_EXHAUSTED" | "CONSECUTIVE_TERMINAL" | "LATENCY_EXCEEDED";
  threshold: number;
  actual: number;
  message: string;
}

export function evaluateAlerts(summary: CronRunSummary, thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS): AlertEvaluation {
  const alerts: AlertEntry[] = [];
  const totalAttempts = summary.published + summary.retryableFailures + summary.terminalFailures;
  const totalOutcomes = summary.published + summary.reconciliationRequired + summary.retryableFailures + summary.terminalFailures;

  if (totalAttempts > 0) {
    const failureRate = summary.retryableFailures / totalAttempts;
    if (failureRate > thresholds.providerFailureRate) {
      alerts.push({
        type: "PROVIDER_FAILURE_RATE",
        threshold: thresholds.providerFailureRate,
        actual: failureRate,
        message: `Provider failure rate ${(failureRate * 100).toFixed(1)}% exceeds threshold ${(thresholds.providerFailureRate * 100).toFixed(1)}%`,
      });
    }
  }

  if (totalOutcomes > 0) {
    const reconciliationRate = summary.reconciliationRequired / totalOutcomes;
    if (reconciliationRate > thresholds.reconciliationRequiredRate) {
      alerts.push({
        type: "RECONCILIATION_RATE",
        threshold: thresholds.reconciliationRequiredRate,
        actual: reconciliationRate,
        message: `Reconciliation rate ${(reconciliationRate * 100).toFixed(1)}% exceeds threshold`,
      });
    }
  }

  if (summary.timeBudgetExhausted) {
    alerts.push({
      type: "TIME_BUDGET_EXHAUSTED",
      threshold: 0,
      actual: 1,
      message: "Cron run time budget exhausted. Backlog may accumulate.",
    });
  }

  if (summary.durationMs > thresholds.maxLatencyMs) {
    alerts.push({
      type: "LATENCY_EXCEEDED",
      threshold: thresholds.maxLatencyMs,
      actual: summary.durationMs,
      message: `Cron run latency ${summary.durationMs}ms exceeds threshold ${thresholds.maxLatencyMs}ms`,
    });
  }

  return {
    triggered: alerts.length > 0,
    alerts,
  };
}

export interface DailyDigest {
  date: string;
  totalRuns: number;
  totalPublished: number;
  totalReconciliation: number;
  totalFailures: number;
  alertRuns: number;
  averageLatencyMs: number;
  correlationIds: string[];
}

export function computeDailyDigest(runs: CronRunSummary[], date: string): DailyDigest {
  const filtered = runs.filter((r) => r.startedAt.startsWith(date));
  if (filtered.length === 0) {
    return {
      date,
      totalRuns: 0,
      totalPublished: 0,
      totalReconciliation: 0,
      totalFailures: 0,
      alertRuns: 0,
      averageLatencyMs: 0,
      correlationIds: [],
    };
  }

  const totalPublished = filtered.reduce((s, r) => s + r.published, 0);
  const totalReconciliation = filtered.reduce((s, r) => s + r.reconciliationRequired, 0);
  const totalFailures = filtered.reduce((s, r) => s + r.retryableFailures + r.terminalFailures, 0);
  const alertRuns = filtered.filter((r) => evaluateAlerts(r).triggered).length;
  const avgLatency = Math.round(filtered.reduce((s, r) => s + r.durationMs, 0) / filtered.length);

  return {
    date,
    totalRuns: filtered.length,
    totalPublished,
    totalReconciliation,
    totalFailures,
    alertRuns,
    averageLatencyMs: avgLatency,
    correlationIds: filtered.map((r) => r.runId),
  };
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

export interface StructuredLogEntry {
  timestamp: string;
  correlationId: string;
  level: "INFO" | "WARN" | "ERROR";
  category: "CRON" | "PUBLISH" | "RECONCILE" | "PROVIDER" | "ALERT";
  message: string;
  metadata?: Record<string, unknown>;
}

export interface StructuredLogger {
  log(entry: StructuredLogEntry): void;
  getLogs(filter?: { correlationId?: string; category?: string; level?: string }): StructuredLogEntry[];
  flush(): StructuredLogEntry[];
}

export function createStructuredLogger(): StructuredLogger {
  const entries: StructuredLogEntry[] = [];

  return {
    log(entry: StructuredLogEntry) {
      entries.push(entry);
    },
    getLogs(filter?: { correlationId?: string; category?: string; level?: string }) {
      let result = entries;
      if (filter?.correlationId) result = result.filter((e) => e.correlationId === filter.correlationId);
      if (filter?.category) result = result.filter((e) => e.category === filter.category);
      if (filter?.level) result = result.filter((e) => e.level === filter.level);
      return result;
    },
    flush() {
      const snapshot = [...entries];
      entries.length = 0;
      return snapshot;
    },
  };
}
