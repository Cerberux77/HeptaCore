import { MODEL_PRICING, DEFAULT_PRICING, DEFAULT_OVERHEAD_FACTOR, calculateApiCost, calculateTenantCost } from "./pricing";
import type { ModelPricing, CostConfig } from "./pricing";

export type LLMTaskType = "strategy" | "generation" | "analysis";

export type LLMProviderId = "openai" | "anthropic" | "gemini" | "deepseek" | "deterministic";

export interface LLMConfig {
  provider: LLMProviderId;
  model?: string;
  apiKey?: string;
}

export interface TaskModelMap {
  strategy: string;
  generation: string;
  analysis: string;
}

export interface LLMGovernancePolicy {
  enabledProviders: LLMProviderId[];
  taskModels: TaskModelMap;
  maxSpendPerPeriodUsd: number;
  billingPeriodDays: number;
  requirePreflightEstimate: boolean;
  blockOnSpendExceeded: boolean;
}

export interface SpendConfig extends CostConfig {
  maxSpendPerPeriodUsd: number;
  billingPeriodDays: number;
}

export interface LLMUsageLogEntry {
  provider: LLMProviderId;
  model: string;
  taskType: LLMTaskType;
  promptTokens: number;
  completionTokens: number;
  apiCost: number;
  tenantCost: number;
  heptaCoreProfit: number;
  at: string;
}

export interface LLMUsageSummary {
  totalApiCost: number;
  totalTenantCost: number;
  totalHeptaCoreProfit: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  callCount: number;
  periodStart: string;
  periodEnd: string;
  entries: LLMUsageLogEntry[];
}

export interface GovernanceCheckResult {
  allowed: boolean;
  reason?: string;
  model: string;
  provider: LLMProviderId;
  estimatedCost?: {
    inputTokens: number;
    outputTokens: number;
    inputCost: number;
    outputCost: number;
    totalApiCost: number;
    tenantCost: number;
    heptaCoreProfit: number;
    modelPricing: ModelPricing;
  };
  spendStatus?: {
    currentSpend: number;
    maxSpend: number;
    remaining: number;
  };
}

export const DEFAULT_GOVERNANCE_POLICY: LLMGovernancePolicy = {
  enabledProviders: ["openai", "anthropic", "gemini", "deepseek"],
  taskModels: {
    strategy: "gpt-4o-mini",
    generation: "gpt-4o-mini",
    analysis: "gpt-4o-mini",
  },
  maxSpendPerPeriodUsd: 10.00,
  billingPeriodDays: 30,
  requirePreflightEstimate: true,
  blockOnSpendExceeded: true,
};

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: "deterministic",
};

export const DEFAULT_SPEND_CONFIG: SpendConfig = {
  overheadFactor: DEFAULT_OVERHEAD_FACTOR,
  maxSpendPerPeriodUsd: 10.00,
  billingPeriodDays: 30,
};

export const TASK_MODEL_DEFAULTS: TaskModelMap = {
  strategy: "gpt-4o-mini",
  generation: "gpt-4o-mini",
  analysis: "gpt-4o-mini",
};

export function isLLMProviderId(value: string): value is LLMProviderId {
  return ["openai", "anthropic", "gemini", "deepseek", "deterministic"].includes(value);
}

export function getModelPricingEntry(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? DEFAULT_PRICING;
}

export function estimateInputTokens(taskType: LLMTaskType): number {
  switch (taskType) {
    case "strategy":
      return 1500;
    case "generation":
      return 800;
    case "analysis":
      return 2000;
  }
}

export function estimateOutputTokens(taskType: LLMTaskType): number {
  switch (taskType) {
    case "strategy":
      return 600;
    case "generation":
      return 400;
    case "analysis":
      return 800;
  }
}

export function resolveModelForTask(
  policy: LLMGovernancePolicy,
  config: LLMConfig,
  taskType: LLMTaskType,
): { model: string; provider: LLMProviderId } {
  const provider = config.provider;
  if (provider === "deterministic") {
    return { model: "deterministic/v1", provider: "deterministic" };
  }

  const model = config.model || policy.taskModels[taskType] || TASK_MODEL_DEFAULTS[taskType];
  return { model, provider };
}

export function estimateTaskCost(
  model: string,
  taskType: LLMTaskType,
  overheadFactor: number = DEFAULT_OVERHEAD_FACTOR,
): ReturnType<typeof calculateApiCost> & ReturnType<typeof calculateTenantCost> & { inputTokens: number; outputTokens: number } {
  const inputTokens = estimateInputTokens(taskType);
  const outputTokens = estimateOutputTokens(taskType);
  const apiCostResult = calculateApiCost(model, inputTokens, outputTokens);
  const tenantCostResult = calculateTenantCost(apiCostResult.totalApiCost, overheadFactor);

  return {
    inputTokens,
    outputTokens,
    ...apiCostResult,
    ...tenantCostResult,
  };
}

export function checkSpendLimit(
  currentSpendUsd: number,
  maxSpendUsd: number,
): { allowed: boolean; currentSpend: number; maxSpend: number; remaining: number } {
  const remaining = Math.max(0, maxSpendUsd - currentSpendUsd);
  return {
    allowed: currentSpendUsd < maxSpendUsd,
    currentSpend: currentSpendUsd,
    maxSpend: maxSpendUsd,
    remaining,
  };
}

export function enforceGovernance(
  policy: LLMGovernancePolicy,
  config: LLMConfig,
  taskType: LLMTaskType,
  currentSpendUsd: number,
): GovernanceCheckResult {
  if (config.provider === "deterministic") {
    return {
      allowed: true,
      model: "deterministic/v1",
      provider: "deterministic",
    };
  }

  if (!policy.enabledProviders.includes(config.provider)) {
    return {
      allowed: false,
      reason: `Provider "${config.provider}" is not authorized in the governance policy`,
      model: config.model ?? "",
      provider: config.provider,
    };
  }

  const { model, provider } = resolveModelForTask(policy, config, taskType);

  const spendLimit = checkSpendLimit(currentSpendUsd, policy.maxSpendPerPeriodUsd);
  if (!spendLimit.allowed && policy.blockOnSpendExceeded) {
    return {
      allowed: false,
      reason: `Spend limit exceeded: $${spendLimit.currentSpend.toFixed(4)} / $${spendLimit.maxSpend.toFixed(2)}`,
      model,
      provider,
      spendStatus: spendLimit,
    };
  }

  const overheadFactor = DEFAULT_OVERHEAD_FACTOR;
  const estimatedCost = policy.requirePreflightEstimate
    ? estimateTaskCost(model, taskType, overheadFactor)
    : undefined;

  return {
    allowed: true,
    model,
    provider,
    estimatedCost,
    spendStatus: spendLimit,
  };
}

export function summarizeUsage(
  entries: LLMUsageLogEntry[],
  periodStart: string,
  periodEnd: string,
): LLMUsageSummary {
  let totalApiCost = 0;
  let totalTenantCost = 0;
  let totalHeptaCoreProfit = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (const e of entries) {
    totalApiCost += e.apiCost;
    totalTenantCost += e.tenantCost;
    totalHeptaCoreProfit += e.heptaCoreProfit;
    totalPromptTokens += e.promptTokens;
    totalCompletionTokens += e.completionTokens;
  }

  return {
    totalApiCost,
    totalTenantCost,
    totalHeptaCoreProfit,
    totalPromptTokens,
    totalCompletionTokens,
    callCount: entries.length,
    periodStart,
    periodEnd,
    entries,
  };
}
