<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-PUB-08-PLATFORM-FORMAT-PARITY"
sprint: "publishing"
status: "blocked"
owner: "Manuel"
last_updated: "2026-06-29T02:50:23.982Z"
source: "var/oreshnik/tasks/S-HC-PUB-08-PLATFORM-FORMAT-PARITY.json"
---

# Task S-HC-PUB-08-PLATFORM-FORMAT-PARITY

## Scope

Platform-format parity: manifest, preview, dry-run, scheduling and publishing for every supported format

## Runtime

- estado: `blocked`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `0`
- handoff: -

## Dependencias

- S-HC-PUB-06-REELS-STORIES-PUBLISHERS
- S-HC-PUB-07-YOUTUBE-PUBLISHING

## Zonas

### Compat

- `apps/web/lib/publishers`
- `apps/web/lib/publishing-formats.ts`
- `apps/web/components`
- `packages/integrations`

### Read

- Ninguna

### Write

- Ninguna

## Aceptacion

- Paridad de capacidades (preview, dry-run, publicacion, metricas) para cada formato soportado
- Auditoria de la matriz de capacidad red/formato: sin combinaciones sin responsable asignado
- Manifiesto de activos cubre todos los formatos con reglas validadas
- Preview especifico de plataforma para cada formato
- Tests provider-specific para todos los formatos publicables
- Documentacion del estado de cada combinacion en PRODUCT_VISION_END_TO_END

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->