<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-INFRA-BASELINE-GATES-RECOVERY"
sprint: "S-HC-INFRA-BASELINE-GATES-RECOVERY"
status: "ready_for_integration"
owner: "Manuel"
last_updated: "2026-07-01T20:31:05.696Z"
source: "var/oreshnik/tasks/S-HC-INFRA-BASELINE-GATES-RECOVERY.json"
---

# Task S-HC-INFRA-BASELINE-GATES-RECOVERY

## Scope

Baseline gates recovery: Oreshnik alpha.9, identity v2, Prisma, typecheck, build and canonical suite

## Runtime

- estado: `ready_for_integration`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `1`
- handoff: var/goal-runner/goals/GR-20260630T221806Z-cc73f500-baseline-gates-recovery/run-a-gates-evidence.md

## Dependencias

- Ninguna

## Zonas

### Compat

- `package.json`
- `package-lock.json`
- `prisma.config.ts`
- `packages/db/**`
- `apps/worker/**`
- `scripts/oreshnik/**`
- `scripts/goal-runner/**`
- `var/oreshnik/**`

### Read

- Ninguna

### Write

- Ninguna

## Aceptacion

- npm ci PASS
- Prisma generate PASS
- Prisma validate PASS
- npm run oreshnik:ready PASS
- npm run typecheck PASS
- npm run build PASS
- npm run worker:validate PASS
- canonical suite PASS
- resume of the same Run is verified
- claims, locks, reservations and dispatcher worktrees are clean after close

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| manuel-S-HC-INFRA-BASELINE-GATES-RECOVERY-2026-06-30T22-17-21-382Z-571d1347 | manuel | codex | ready_for_integration | released | codex/p-hc-or-operability-01-20260630-150409 |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->