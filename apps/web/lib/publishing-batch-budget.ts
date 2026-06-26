export interface BatchBudgetConfig {
  maxJobs: number;
  minJobs: number;
  defaultJobs: number;
  maxDurationMs: number;
  safetyMarginMs: number;
}

const DEFAULT_CONFIG: BatchBudgetConfig = {
  maxJobs: 50,
  minJobs: 1,
  defaultJobs: 20,
  maxDurationMs: 60000,
  safetyMarginMs: 10000,
};

export function resolveBatchLimit(envValue?: string): number {
  if (envValue != null) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed)) {
      return Math.max(DEFAULT_CONFIG.minJobs, Math.min(DEFAULT_CONFIG.maxJobs, parsed));
    }
  }
  return DEFAULT_CONFIG.defaultJobs;
}

export function getTimeBudget(config: BatchBudgetConfig = DEFAULT_CONFIG): number {
  return config.maxDurationMs - config.safetyMarginMs;
}

export function isTimeBudgetExhausted(startedAt: Date, now: Date, budgetMs?: number): boolean {
  const budget = budgetMs ?? getTimeBudget();
  return now.getTime() - startedAt.getTime() >= budget;
}

export function getBatchBudgetConfig(envLimit?: string): BatchBudgetConfig & { limit: number; timeBudgetMs: number } {
  const limit = resolveBatchLimit(envLimit);
  return {
    ...DEFAULT_CONFIG,
    limit,
    timeBudgetMs: getTimeBudget(),
  };
}
