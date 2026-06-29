import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isLLMProviderId,
  getModelPricingEntry,
  estimateInputTokens,
  estimateOutputTokens,
  resolveModelForTask,
  estimateTaskCost,
  checkSpendLimit,
  enforceGovernance,
  summarizeUsage,
  DEFAULT_GOVERNANCE_POLICY,
  DEFAULT_LLM_CONFIG,
  DEFAULT_SPEND_CONFIG,
  TASK_MODEL_DEFAULTS,
} from "../llm-governance";

import type { LLMGovernancePolicy, LLMConfig, LLMUsageLogEntry } from "../llm-governance";

describe("isLLMProviderId", () => {
  it("recognizes valid provider IDs", () => {
    assert.equal(isLLMProviderId("openai"), true);
    assert.equal(isLLMProviderId("anthropic"), true);
    assert.equal(isLLMProviderId("gemini"), true);
    assert.equal(isLLMProviderId("deepseek"), true);
    assert.equal(isLLMProviderId("deterministic"), true);
  });

  it("rejects invalid provider IDs", () => {
    assert.equal(isLLMProviderId("azure"), false);
    assert.equal(isLLMProviderId(""), false);
    assert.equal(isLLMProviderId("random"), false);
  });
});

describe("getModelPricingEntry", () => {
  it("returns pricing for known models", () => {
    const entry = getModelPricingEntry("gpt-4o-mini");
    assert.equal(entry.inputCostPer1M, 0.15);
    assert.equal(entry.outputCostPer1M, 0.60);
    assert.equal(entry.label, "GPT-4o Mini");
  });

  it("returns default pricing for unknown models", () => {
    const entry = getModelPricingEntry("unknown-model");
    assert.equal(entry.inputCostPer1M, 1.00);
    assert.equal(entry.outputCostPer1M, 4.00);
    assert.equal(entry.label, "Desconocido");
  });
});

describe("estimateInputTokens", () => {
  it("returns token estimates per task type", () => {
    assert.equal(estimateInputTokens("strategy"), 1500);
    assert.equal(estimateInputTokens("generation"), 800);
    assert.equal(estimateInputTokens("analysis"), 2000);
  });
});

describe("estimateOutputTokens", () => {
  it("returns token estimates per task type", () => {
    assert.equal(estimateOutputTokens("strategy"), 600);
    assert.equal(estimateOutputTokens("generation"), 400);
    assert.equal(estimateOutputTokens("analysis"), 800);
  });
});

describe("resolveModelForTask", () => {
  const policy: LLMGovernancePolicy = {
    ...DEFAULT_GOVERNANCE_POLICY,
    taskModels: {
      strategy: "gpt-4o",
      generation: "gpt-4o-mini",
      analysis: "claude-3-5-sonnet-latest",
    },
  };

  it("resolves model for strategy with policy override", () => {
    const config: LLMConfig = { provider: "openai" };
    const result = resolveModelForTask(policy, config, "strategy");
    assert.equal(result.model, "gpt-4o");
    assert.equal(result.provider, "openai");
  });

  it("uses config.model when explicitly set", () => {
    const config: LLMConfig = { provider: "openai", model: "gpt-4.1-nano" };
    const result = resolveModelForTask(policy, config, "strategy");
    assert.equal(result.model, "gpt-4.1-nano");
  });

  it("returns deterministic for deterministic provider", () => {
    const config: LLMConfig = { provider: "deterministic" };
    const result = resolveModelForTask(policy, config, "analysis");
    assert.equal(result.model, "deterministic/v1");
    assert.equal(result.provider, "deterministic");
  });

  it("falls back to task defaults if policy has no mapping", () => {
    const emptyPolicy: LLMGovernancePolicy = {
      ...DEFAULT_GOVERNANCE_POLICY,
      taskModels: { strategy: "", generation: "", analysis: "" },
    };
    const config: LLMConfig = { provider: "deepseek" };
    const result = resolveModelForTask(emptyPolicy, config, "analysis");
    assert.equal(result.model, TASK_MODEL_DEFAULTS.analysis);
  });
});

describe("estimateTaskCost", () => {
  it("calculates cost for strategy with gpt-4o-mini", () => {
    const result = estimateTaskCost("gpt-4o-mini", "strategy", 2.0);
    assert.ok(result.inputTokens > 0);
    assert.ok(result.outputTokens > 0);
    assert.ok(result.totalApiCost > 0);
    assert.ok(result.tenantCost > result.totalApiCost);
  });

  it("heptaCoreProfit with overheadFactor=2.0 equals apiCost", () => {
    const result = estimateTaskCost("gpt-4o-mini", "strategy", 2.0);
    assert.ok(Math.abs(result.heptaCoreProfit - result.totalApiCost) < 0.001);
  });
});

describe("checkSpendLimit", () => {
  it("allows when under limit", () => {
    const result = checkSpendLimit(5.0, 10.0);
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 5.0);
  });

  it("blocks when at or over limit", () => {
    const result = checkSpendLimit(10.0, 10.0);
    assert.equal(result.allowed, false);
    assert.equal(result.remaining, 0);
  });

  it("blocks when over limit", () => {
    const result = checkSpendLimit(15.0, 10.0);
    assert.equal(result.allowed, false);
    assert.equal(result.remaining, 0);
  });

  it("handles zero max spend", () => {
    const result = checkSpendLimit(0, 0);
    assert.equal(result.allowed, false);
    assert.equal(result.remaining, 0);
  });
});

describe("enforceGovernance", () => {
  const basePolicy: LLMGovernancePolicy = {
    ...DEFAULT_GOVERNANCE_POLICY,
    enabledProviders: ["openai", "anthropic"],
    maxSpendPerPeriodUsd: 10.0,
    blockOnSpendExceeded: true,
    requirePreflightEstimate: true,
  };

  it("allows authorized provider under spend limit", () => {
    const config: LLMConfig = { provider: "openai", model: "gpt-4o-mini" };
    const result = enforceGovernance(basePolicy, config, "strategy", 2.0);
    assert.equal(result.allowed, true);
    assert.equal(result.provider, "openai");
    assert.ok(result.estimatedCost);
  });

  it("allows deterministic bypassing governance", () => {
    const config: LLMConfig = { provider: "deterministic" };
    const result = enforceGovernance(basePolicy, config, "strategy", 100);
    assert.equal(result.allowed, true);
    assert.equal(result.provider, "deterministic");
  });

  it("blocks unauthorized provider", () => {
    const config: LLMConfig = { provider: "deepseek" };
    const result = enforceGovernance(basePolicy, config, "strategy", 0);
    assert.equal(result.allowed, false);
    assert.ok(result.reason?.includes("not authorized"));
  });

  it("blocks when spend limit exceeded", () => {
    const config: LLMConfig = { provider: "openai" };
    const result = enforceGovernance(basePolicy, config, "strategy", 15.0);
    assert.equal(result.allowed, false);
    assert.ok(result.reason?.includes("exceeded"));
  });

  it("skips preflight estimate when disabled", () => {
    const policy: LLMGovernancePolicy = { ...basePolicy, requirePreflightEstimate: false };
    const config: LLMConfig = { provider: "openai" };
    const result = enforceGovernance(policy, config, "strategy", 2.0);
    assert.equal(result.allowed, true);
    assert.equal(result.estimatedCost, undefined);
  });
});

describe("summarizeUsage", () => {
  const entries: LLMUsageLogEntry[] = [
    {
      provider: "openai",
      model: "gpt-4o-mini",
      taskType: "strategy",
      promptTokens: 1500,
      completionTokens: 600,
      apiCost: 0.0005,
      tenantCost: 0.001,
      heptaCoreProfit: 0.0005,
      at: "2026-06-29T00:00:00Z",
    },
    {
      provider: "anthropic",
      model: "claude-3-5-haiku-latest",
      taskType: "analysis",
      promptTokens: 2000,
      completionTokens: 800,
      apiCost: 0.004,
      tenantCost: 0.008,
      heptaCoreProfit: 0.004,
      at: "2026-06-29T01:00:00Z",
    },
  ];

  it("aggregates usage across entries", () => {
    const summary = summarizeUsage(entries, "2026-06-01T00:00:00Z", "2026-06-30T23:59:59Z");
    assert.equal(summary.callCount, 2);
    assert.equal(summary.totalPromptTokens, 3500);
    assert.equal(summary.totalCompletionTokens, 1400);
    assert.ok(Math.abs(summary.totalApiCost - 0.0045) < 0.0001);
    assert.ok(Math.abs(summary.totalTenantCost - 0.009) < 0.0001);
    assert.ok(Math.abs(summary.totalHeptaCoreProfit - 0.0045) < 0.0001);
  });

  it("handles empty entries", () => {
    const summary = summarizeUsage([], "2026-06-01T00:00:00Z", "2026-06-30T23:59:59Z");
    assert.equal(summary.callCount, 0);
    assert.equal(summary.totalApiCost, 0);
    assert.equal(summary.totalPromptTokens, 0);
  });
});
