<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-PUB-04-HOURLY-BATCH-CRON"
sprint: "S-HC-PUB-04-HOURLY-BATCH-CRON"
status: "ready_for_integration"
owner: "Manuel"
last_updated: "2026-06-28T18:47:05.091Z"
source: "var/oreshnik/tasks/S-HC-PUB-04-HOURLY-BATCH-CRON.json"
---

# Task S-HC-PUB-04-HOURLY-BATCH-CRON

## Scope

Hourly batch cron publishing with timezone-aware scheduling

## Runtime

- estado: `ready_for_integration`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `1`
- handoff: var/goal-runner/goals/GR-20260626T064941Z-a09b3d58-finalize-pub-04-production-correctness/final-report.md

## Dependencias

- S-HC-PUB-02-MULTIFORMAT-PREVIEW
- S-HC-PUB-03-MULTITENANT-ASSETS

## Zonas

### Compat

- `apps/web/app/api/cron`
- `apps/worker`
- `packages/core`

### Read

- Ninguna

### Write

- Ninguna

## Aceptacion

- Batch cron procesa multiples posts programados por hora
- Timezone-aware scheduling per tenant
- Rate limiting per platform
- Failure isolation (un post falla, los demas continuan)
- Cron idempotency preservada

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Manuel-S-HC-PUB-04-HOURLY-BATCH-CRON-2026-06-26T08-52-44-815Z-2487f474 | Manuel | manual | ready_for_integration | released | Manuel/s-hc-pub-04-hourly-batch-goal |

## Integracion

- run: `Manuel-S-HC-PUB-04-HOURLY-BATCH-CRON-2026-06-26T08-52-44-815Z-2487f474`
- estado: `queued`
- madre: `MADRE/v48-s-hc-pub-04-hourly-batch-cron-hourly-batch-publishing-cron-and-pub-04-producti-2026-06-28`
- source: `Manuel/s-hc-pub-04-hourly-batch-goal`

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->