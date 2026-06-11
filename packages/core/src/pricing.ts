/**
 * HeptaCore — LLM Pricing Model
 *
 * Modelo de negocio:
 *   - El tenant paga: costo_real_API × overheadFactor
 *   - HeptaCore gana: costo_real_API × (overheadFactor - 1)
 *   - Con overheadFactor=2.0, la utilidad de HeptaCore es 100%
 *
 * Precios por 1M tokens (input / output) en USD.
 * Fuentes: pricing oficial de cada provider (jun 2026).
 */

export interface ModelPricing {
  /** Cost per 1M input tokens in USD */
  inputCostPer1M: number;
  /** Cost per 1M output tokens in USD */
  outputCostPer1M: number;
  /** Whether the model supports reasoning/thinking tokens */
  reasoning: boolean;
  /** Human-readable label */
  label: string;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  "gpt-4o": {
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
    reasoning: false,
    label: "GPT-4o",
  },
  "gpt-4o-mini": {
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    reasoning: false,
    label: "GPT-4o Mini",
  },
  "gpt-4.1": {
    inputCostPer1M: 2.00,
    outputCostPer1M: 8.00,
    reasoning: false,
    label: "GPT-4.1",
  },
  "gpt-4.1-mini": {
    inputCostPer1M: 0.40,
    outputCostPer1M: 1.60,
    reasoning: false,
    label: "GPT-4.1 Mini",
  },
  "gpt-4.1-nano": {
    inputCostPer1M: 0.10,
    outputCostPer1M: 0.40,
    reasoning: false,
    label: "GPT-4.1 Nano",
  },
  "o3-mini": {
    inputCostPer1M: 1.10,
    outputCostPer1M: 4.40,
    reasoning: true,
    label: "o3 Mini (razonador)",
  },

  // Anthropic
  "claude-3-5-haiku-latest": {
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.00,
    reasoning: false,
    label: "Claude 3.5 Haiku",
  },
  "claude-3-5-sonnet-latest": {
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    reasoning: false,
    label: "Claude 3.5 Sonnet",
  },
  "claude-3-opus-latest": {
    inputCostPer1M: 15.00,
    outputCostPer1M: 75.00,
    reasoning: false,
    label: "Claude 3 Opus",
  },
  "claude-3-7-sonnet-latest": {
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    reasoning: true,
    label: "Claude 3.7 Sonnet (razonador)",
  },

  // Gemini
  "gemini-2.0-flash": {
    inputCostPer1M: 0.10,
    outputCostPer1M: 0.40,
    reasoning: false,
    label: "Gemini 2.0 Flash",
  },
  "gemini-2.0-flash-lite": {
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
    reasoning: false,
    label: "Gemini 2.0 Flash Lite",
  },
  "gemini-2.5-pro": {
    inputCostPer1M: 1.25,
    outputCostPer1M: 10.00,
    reasoning: true,
    label: "Gemini 2.5 Pro (razonador)",
  },

  // DeepSeek
  "deepseek-chat": {
    inputCostPer1M: 0.14,
    outputCostPer1M: 0.28,
    reasoning: false,
    label: "DeepSeek Chat",
  },
  "deepseek-reasoner": {
    inputCostPer1M: 0.55,
    outputCostPer1M: 2.19,
    reasoning: true,
    label: "DeepSeek Reasoner (razonador)",
  },
};

/** Default pricing when model is unknown */
export const DEFAULT_PRICING: ModelPricing = {
  inputCostPer1M: 1.00,
  outputCostPer1M: 4.00,
  reasoning: false,
  label: "Desconocido",
};

/**
 * Calculate the API cost for a strategy generation run.
 * Returns cost in USD (fractional dollars).
 */
export function calculateApiCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): { inputCost: number; outputCost: number; totalApiCost: number; modelPricing: ModelPricing } {
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;

  const inputCost = (promptTokens / 1_000_000) * pricing.inputCostPer1M;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputCostPer1M;
  const totalApiCost = inputCost + outputCost;

  return { inputCost, outputCost, totalApiCost, modelPricing: pricing };
}

/**
 * Calculate what the tenant pays = API cost × overhead factor.
 */
export function calculateTenantCost(
  apiCost: number,
  overheadFactor: number,
): { tenantCost: number; heptaCoreProfit: number } {
  const tenantCost = apiCost * overheadFactor;
  const heptaCoreProfit = apiCost * (overheadFactor - 1);
  return { tenantCost, heptaCoreProfit };
}

/** Default overhead factor = 2x (100% profit) */
export const DEFAULT_OVERHEAD_FACTOR = 2.0;

export interface CostConfig {
  overheadFactor: number;
}

export interface UsageRecord {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  apiCost: number;
  overheadFactor: number;
  tenantCost: number;
  heptaCoreProfit: number;
  at: string;
}
