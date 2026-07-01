<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-PUB-07-YOUTUBE-PUBLISHING"
sprint: "publishing"
status: "ready"
owner: "Manuel"
last_updated: "2026-07-01T20:31:05.696Z"
source: "var/oreshnik/tasks/S-HC-PUB-07-YOUTUBE-PUBLISHING.json"
---

# Task S-HC-PUB-07-YOUTUBE-PUBLISHING

## Scope

Real publishing for YouTube: Video 16:9 and YouTube Shorts

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

- YouTube Video 16:9 publishing real con titulo, descripcion, thumbnail y metadata
- YouTube Shorts publishing real con metadata requerida
- Programacion y publicacion real
- Preview/dry-run para cada formato
- Provider-specific tests con evidencia real para cada formato
- Reutilizacion de transactional finalization y IN_REVIEW state machine
- Cero declaracion de soporte hasta validacion real

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->