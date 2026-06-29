<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-PUB-06-REELS-STORIES-PUBLISHERS"
sprint: "publishing"
status: "ready"
owner: "Manuel"
last_updated: "2026-06-29T16:10:34.987Z"
source: "var/oreshnik/tasks/S-HC-PUB-06-REELS-STORIES-PUBLISHERS.json"
---

# Task S-HC-PUB-06-REELS-STORIES-PUBLISHERS

## Scope

Real publishing for Meta Reels and Stories: Instagram + Facebook

## Runtime

- estado: `ready`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `0`
- handoff: -

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
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->