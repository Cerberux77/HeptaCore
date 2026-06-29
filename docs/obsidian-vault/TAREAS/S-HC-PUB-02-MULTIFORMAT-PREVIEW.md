<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-PUB-02-MULTIFORMAT-PREVIEW"
sprint: "publishing"
status: "done"
owner: "Manuel"
last_updated: "2026-06-29T00:37:30.040Z"
source: "var/oreshnik/tasks/S-HC-PUB-02-MULTIFORMAT-PREVIEW.json"
---

# Task S-HC-PUB-02-MULTIFORMAT-PREVIEW

## Scope

Multiformat preview and dry-run: format model, asset manifest, platform previews, validations

## Runtime

- estado: `done`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `0`
- handoff: -

## Dependencias

- S-HC-REC-00C

## Zonas

### Compat

- `apps/web`
- `apps/web/lib/publishers`
- `packages/integrations`

### Read

- Ninguna

### Write

- Ninguna

## Aceptacion

- Modelo de formatos (Carousel, Story, Feed) con reglas de validacion por plataforma
- Asset manifest requerido por formato (count, aspect ratio, resolution, duration)
- Instagram Feed preview visual con caption, orden y safe area
- Instagram Carousel preview navegable con transiciones
- Instagram Story preview vertical con crop simulado
- Facebook preview con caption, link preview y formato nativo
- Validaciones de assets pre-dry-run (formato, peso, dimensiones)
- Dry-run completo sin llamadas al proveedor
- Cero publicacion real de Carousel ni Stories en este sprint

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->