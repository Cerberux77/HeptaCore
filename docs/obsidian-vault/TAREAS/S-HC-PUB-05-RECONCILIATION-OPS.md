<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-PUB-05-RECONCILIATION-OPS"
sprint: "publishing"
status: "ready"
owner: "Manuel"
last_updated: "2026-06-28T18:47:05.091Z"
source: "var/oreshnik/tasks/S-HC-PUB-05-RECONCILIATION-OPS.json"
---

# Task S-HC-PUB-05-RECONCILIATION-OPS

## Scope

Operational reconciliation automation for ambiguous provider outcomes

## Runtime

- estado: `ready`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `0`
- handoff: -

## Dependencias

- S-HC-PUB-04-HOURLY-BATCH-CRON

## Zonas

### Compat

- `apps/web/lib/publishing-finalization.ts`
- `apps/web/lib/draft-operational-state.ts`
- `packages/core`

### Read

- Ninguna

### Write

- Ninguna

## Aceptacion

- Automatic reconciliation for Case A (Result ok + externalPostId + incomplete Draft)
- Alert-only for Case B (Draft.externalPostId present + Result absent)
- Block and notify for Case C (no evidence)
- Never auto-retry provider calls

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->