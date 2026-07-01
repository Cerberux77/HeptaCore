<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT"
sprint: "operations"
status: "blocked"
owner: "Manuel"
last_updated: "2026-07-01T01:00:48.254Z"
source: "var/oreshnik/tasks/S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT.json"
---

# Task S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT

## Scope

Campaign review and deployment: batch approval, schedule, publish

## Runtime

- estado: `blocked`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `0`
- handoff: -

## Dependencias

- S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT
- S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST
- S-HC-PUB-04-HOURLY-BATCH-CRON

## Zonas

### Compat

- `apps/web/app/api/publishing`
- `apps/web/components`
- `packages/core`

### Read

- Ninguna

### Write

- Ninguna

## Aceptacion

- Batch review of campaign drafts
- Approve/reject per draft or bulk
- Schedule deployment with cron integration
- Publishing queue with visibility (approved, scheduled, published, blocked)
- Rollback capability for scheduled posts

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->