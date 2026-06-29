# Plan: LLM Provider Selection, Cost Estimation and Governance Policy

## Objective
Implement a provider-agnostic LLM governance system with task-based model selection, pre-flight cost estimation, admin-enforceable policy, and usage tracking with billing integration.

## Steps

### Step 1 — Governance types in @heptacore/core
- Create `LLMTaskType` union: `"strategy"`, `"generation"`, `"analysis"`
- Create `LLMGovernancePolicy` interface: authorized providers, models per task, max spend, defaults
- Create `LLMConfig` and `CostConfig` typed interfaces (replace JSONB untyped usage)
- Create `LLMUsageRecord` for persistence (provider, model, taskType, tokens, cost, tenant, at)
- Export all from `packages/core/src/index.ts`

### Step 2 — Governance engine in @heptacore/core
- `resolveModelForTask()`: task type → model based on policy + provider config
- `estimateTaskCost()`: pre-flight cost estimation from input token estimate + model pricing
- `checkSpendLimit()`: compare accumulated usage vs max spend for period
- `enforceGovernance()`: composite gate → model resolution, cost estimate, spend check, policy validation
- Export from `packages/core/src/index.ts`

### Step 3 — Provider/market-pricing alignment
- Ensure `MODEL_PRICING` in `pricing.ts` covers all supported provider models
- Add `getModelPricingEntry()` helper
- Add `estimateInputTokens()` heuristic per task type

### Step 4 — Broker integration in @heptacore/agents
- Extend `generateStrategyWithLLM()` with governance gate before execution
- Add pre-flight cost estimation call
- Add usage recording after successful generation
- Add task type parameter to dispatch
- Ensure deterministic fallback respects governance (no spend when deterministic)

### Step 5 — Admin governance API
- `GET /api/admin/llm-governance?tenantSlug=...` — read governance policy
- `PUT /api/admin/llm-governance` — update authorized providers, models, max spend
- `GET /api/admin/llm-usage?tenantSlug=...&period=current|all` — usage report
- Existing `admin/llm-config` already handles provider/model/key per tenant

### Step 6 — Admin UI components
- `LlmGovernancePanel` component: policy editor (authorized providers checkboxes, model selectors per task, max spend input)
- `LlmUsageReport` component: usage table with accumulated costs
- Integrate into `admin-console.tsx` tenant modal
- Cost estimation display improvements

### Step 7 — Tests
- Unit tests for governance engine (`resolveModelForTask`, `estimateTaskCost`, `checkSpendLimit`)
- Unit tests for pricing functions
- Integration test for broker with governance gate

### Step 8 — Validate
- `npm run typecheck`
- `npm run build`
- `npm run worker:validate`
- Full test suite
