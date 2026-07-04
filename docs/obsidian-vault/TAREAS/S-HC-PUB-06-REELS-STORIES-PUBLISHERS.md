<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-PUB-06-REELS-STORIES-PUBLISHERS"
sprint: "publishing"
status: "ready_for_integration"
owner: "Manuel"
last_updated: "2026-07-04T05:39:30.129Z"
source: "var/oreshnik/tasks/S-HC-PUB-06-REELS-STORIES-PUBLISHERS.json"
---

# Task S-HC-PUB-06-REELS-STORIES-PUBLISHERS

## Scope

Real publishing for Meta Reels and Stories: Instagram + Facebook

## Runtime

- estado: `ready_for_integration`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `1`
- handoff: docs/07_handoffs/S-HC-PUB-06-REELS-STORIES-PUBLISHERS.md

## Dependencias

- S-HC-PUB-03-MULTITENANT-ASSETS
- S-HC-PUB-04-HOURLY-BATCH-CRON

## Zonas

### Compat

- `apps/web/lib/publishers`
- `apps/web/app/api/publishing`
- `packages/integrations`

### Read

- Ninguna

### Write

- Ninguna

## Aceptacion

- Instagram Reel publishing real con durabilidad transaccional
- Instagram Story imagen publishing real
- Instagram Story video publishing real
- Facebook Story imagen publishing real
- Facebook Story video publishing real
- Facebook Reel publishing real
- Preview/dry-run para cada combinacion antes de publicacion real
- Provider-specific tests con evidencia real para cada formato
- Reutilizacion de transactional finalization y IN_REVIEW state machine
- Cero declaracion de soporte hasta que la combinacion concreta haya sido validada

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| run-manuel-S-HC-PUB-06-REELS-STORIES-PUBLISHERS-20260704050056-dbcefd7d | manuel | codex | ready_for_integration | released | dispatch/manuel/manuel-codex3/publishing/S-HC-PUB-06-REELS-STORIES-PUBLISHERS/57a46a194e |

## Integracion

- run: `run-manuel-S-HC-PUB-06-REELS-STORIES-PUBLISHERS-20260704050056-dbcefd7d`
- estado: `queued`
- madre: `MADRE/v55-publishing-meta-reels-stories-publishers-2026-07-04`
- source: `dispatch/manuel/manuel-codex3/publishing/S-HC-PUB-06-REELS-STORIES-PUBLISHERS/57a46a194e`

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->