<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-STRAT-03-INTAKE-TO-ACTIVE-STRATEGY"
sprint: "strategy"
status: "ready"
owner: "Manuel"
last_updated: "2026-07-11T19:09:07.244Z"
source: "var/oreshnik/tasks/S-HC-STRAT-03-INTAKE-TO-ACTIVE-STRATEGY.json"
---

# Task S-HC-STRAT-03-INTAKE-TO-ACTIVE-STRATEGY

## Scope

End-to-end intake, generated strategy persistence, approval and calendar materialization

## Runtime

- estado: `ready`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `0`
- handoff: docs/07_handoffs/S-HC-STRAT-03-INTAKE-TO-ACTIVE-STRATEGY.md

## Dependencias

- Ninguna

## Zonas

### Compat

- `apps/web/components/dashboard-console.tsx`
- `apps/web/app/api/strategy/**`
- `apps/web/lib/**strategy**`
- `apps/web/lib/dashboard.ts`
- `packages/agents/src/**`
- `packages/core/src/**strategy**`
- `docs/oreshnik/**`
- `docs/07_handoffs/**`
- `apps/web/lib/__tests__/**`
- `packages/agents/src/**/*.test.*`

### Read

- `packages/db/prisma/schema.prisma`
- `apps/web/lib/auth*`
- `apps/web/app/api/auth/**`
- `publishing provider adapters`

### Write

- `apps/web/components/dashboard-console.tsx`
- `apps/web/app/api/strategy/**`
- `apps/web/lib/**strategy**`
- `apps/web/lib/dashboard.ts`
- `packages/agents/src/**`
- `packages/core/src/**strategy**`
- `docs/oreshnik/**`
- `docs/07_handoffs/**`
- `apps/web/lib/__tests__/**`
- `packages/agents/src/**/*.test.*`

## Aceptacion

- A tenant can enter a structured intake without pasting a completed strategy
- Generation uses the exact current form values, networks, timezone and start date
- A strict four-week platform-specific strategy includes exact times, copy, scripts, assets, KPI and hypotheses
- Draft strategy persists across reload and successive generations create identifiable versions
- Human review, approval and activation lifecycle exists
- Activation transactionally materializes pillars, calendar-ready drafts and asset requirements
- Repeated activation creates no duplicate pillars or drafts
- Deterministic fallback is visibly distinct from real LLM generation
- No live social publication or campaign spend occurs
- Prisma, authentication and authorization remain unchanged unless an Oreshnik double lock is acquired
- Focused tests, full gates, evidence and canonical handoff pass
- Terminal state is READY_FOR_MANUAL_QA pending Manuel validation in Preview

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->