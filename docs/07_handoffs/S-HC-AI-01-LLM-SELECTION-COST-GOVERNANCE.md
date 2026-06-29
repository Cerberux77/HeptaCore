# S-HC-AI-01: LLM Provider Selection, Cost Estimation and Governance Policy

## Status: DELIVERED

## Acceptance Criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Provider-agnostic LLM broker interface | DONE |
| 2 | Model selection per task (strategy, generation, analysis) | DONE |
| 3 | Cost estimation before executing expensive tasks | DONE |
| 4 | Admin policy: authorized providers, models, max spend | DONE |
| 5 | Usage tracking and billing integration | DONE |

## Deliverables

### packages/core/src/llm-governance.ts
- `LLMTaskType`: "strategy" | "generation" | "analysis"
- `LLMGovernancePolicy`: authorized providers, task→model mapping, max spend, billing period
- `LLMConfig`: typed tenant LLM configuration (provider, model, apiKey)
- `SpendConfig`: extends CostConfig with max spend and billing cycle
- `LLMUsageLogEntry`: full usage tracking DTO
- `enforceGovernance()`: composite governance gate (provider allowlist, spend limit, cost estimate)
- `resolveModelForTask()`: task type → model from policy/config
- `estimateTaskCost()`: pre-flight cost estimation
- `checkSpendLimit()`: accumulated spend vs max
- `summarizeUsage()`: aggregate usage report

### packages/core/src/__tests__/llm-governance.test.ts
- 23 unit tests covering all governance functions
- All tests pass

### packages/agents/src/llm-adapter.ts
- `generateStrategyGoverned()`: governed strategy generation with:
  - Pre-flight governance check (provider allowlist, spend limit)
  - Cost calculation with real provider usage
  - Usage log entry creation
  - Deterministic fallback on governance block

### apps/web/app/api/admin/llm-governance/route.ts
- `GET /api/admin/llm-governance?tenantSlug=...` — read governance policy
- `PUT /api/admin/llm-governance` — update providers, task models, max spend, overhead

### apps/web/app/api/admin/llm-usage/route.ts
- `GET /api/admin/llm-usage?tenantSlug=...&period=current|all` — usage report with aggregation

## Validation

| Gate | Result |
|---|---|
| typecheck | PASS (7 workspaces) |
| build | PASS (Next.js compiled) |
| worker:validate | PASS (29/29) |
| tests | 693 pass / 0 fail |

## Notes

- Governance policy stored in existing `Tenant.llmConfig` and `Tenant.costConfig` JSONB columns
- Usage tracked via existing `AuditLog` with `action: "strategy_generated"` and cost metadata
- All providers (OpenAI, Anthropic, Gemini, DeepSeek) remain raw fetch-based (no SDKs)
- Deterministic provider always bypasses governance (zero cost)
- Defaults: max $10/30d, overhead 2x, gpt-4o-mini preferred
