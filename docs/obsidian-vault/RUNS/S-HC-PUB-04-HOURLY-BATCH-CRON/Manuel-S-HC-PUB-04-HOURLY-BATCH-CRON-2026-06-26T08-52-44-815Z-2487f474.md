<!-- ORESHNIK:GENERATED:START -->
---
type: run-runtime
project: "HeptaCore"
task_id: "S-HC-PUB-04-HOURLY-BATCH-CRON"
run_id: "Manuel-S-HC-PUB-04-HOURLY-BATCH-CRON-2026-06-26T08-52-44-815Z-2487f474"
sprint: "S-HC-PUB-04-HOURLY-BATCH-CRON"
status: "integrated"
claim_status: "released"
operator: "Manuel"
last_updated: "2026-06-28T23:59:59.945Z"
source: "var/oreshnik/runs/S-HC-PUB-04-HOURLY-BATCH-CRON/Manuel-S-HC-PUB-04-HOURLY-BATCH-CRON-2026-06-26T08-52-44-815Z-2487f474.json"
---

# Run Manuel-S-HC-PUB-04-HOURLY-BATCH-CRON-2026-06-26T08-52-44-815Z-2487f474

## Task

- task: `S-HC-PUB-04-HOURLY-BATCH-CRON`
- sprint: `S-HC-PUB-04-HOURLY-BATCH-CRON`
- scope: Hourly batch cron publishing with timezone-aware scheduling

## Runtime

- operator: `Manuel`
- worker: `manuel-pub04-closeout`
- mode: `manual`
- task status: `integrated`
- claim status: `released`
- branch: `Manuel/s-hc-pub-04-hourly-batch-goal`
- worktree: `D:\PROYECTOS\WORKTREES\HeptaCore_PUB04_GOAL`
- claimed at: `2026-06-26T08:52:44.815Z`
- expires at: `2026-06-26T09:52:44.815Z`
- released at: `2026-06-26T08:55:47.509Z`

## Boundaries

- zones: `apps/web/app/api/cron`, `apps/worker`, `packages/core`
- resources: -

## Integration Train

- attempt: `train-Manuel-S-HC-PUB-04-HOURLY-BATCH-CRON-2026-06-26T-1782691034146`
- source: `Manuel/s-hc-pub-04-hourly-batch-goal`
- target: `MADRE/v48-s-hc-pub-04-hourly-batch-cron-hourly-batch-publishing-cron-and-pub-04-producti-2026-06-28`
- integration branch: `integration-train/S-HC-PUB-04-HOURLY-BATCH/S-HC-PUB-04-HOURLY-BATCH/r-c08e3c5d3afc/a-f62c2c114d4d`
- status: `succeeded`
- advance: `runtime_projection_confirmed`
- reason: Already contained on MADRE/v48-s-hc-pub-04-hourly-batch-cron-hourly-batch-publishing-cron-and-pub-04-producti-2026-06-28; runtime reconciled without merge

<!-- ORESHNIK:GENERATED:END -->