<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-ASSET-02-FORMAT-DERIVATIVES"
sprint: "assets"
status: "ready_for_integration"
owner: "Manuel"
last_updated: "2026-07-01T20:31:05.696Z"
source: "var/oreshnik/tasks/S-HC-ASSET-02-FORMAT-DERIVATIVES.json"
---

# Task S-HC-ASSET-02-FORMAT-DERIVATIVES

## Scope

Format derivatives: badge interaction, format preview, intelligent crop, safe zones, asset variants

## Runtime

- estado: `ready_for_integration`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `1`
- handoff: docs/07_handoffs/S-HC-ASSET-02-FORMAT-DERIVATIVES.md

## Dependencias

- S-HC-PUB-03-MULTITENANT-ASSETS

## Zonas

### Compat

- `apps/web/components`
- `packages/core`
- `apps/web/lib`

### Read

- Ninguna

### Write

- Ninguna

## Aceptacion

- Badge de compatibilidad clickeable que abre detalle de formato
- Preview especifico de formato con crop y safe zones visuales
- Crop manual interactivo por formato (recorte, reposicion)
- Crop inteligente automatico con deteccion de sujeto/centro
- Fit con fondo (blur, color, gradiente) cuando el asset no llena el frame
- Safe zones indicadas visualmente (titulo, UI de plataforma, texto)
- Aceptar/deshacer cambios por formato
- Asset original inmutable; derivados como registros separados con relacion sourceAsset
- Versionado de derivados
- Generacion por lote de variantes para todos los formatos requeridos
- Imagenes primero; video fuera de este sprint o como fase separada

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| run-manuel-S-HC-ASSET-02-FORMAT-DERIVATIVES-20260701070057-4b417034 | manuel | codex | ready_for_integration | released | dispatch/manuel/manuel-codex2/assets/S-HC-ASSET-02-FORMAT-DERIVATIVES/396dfc38dd |

## Integracion

- run: `run-manuel-S-HC-ASSET-02-FORMAT-DERIVATIVES-20260701070057-4b417034`
- estado: `queued`
- madre: `MADRE/v54-assets-asset-02-validated-partial-delivery-2026-07-01`
- source: `dispatch/manuel/manuel-codex2/assets/S-HC-ASSET-02-FORMAT-DERIVATIVES/396dfc38dd`

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->