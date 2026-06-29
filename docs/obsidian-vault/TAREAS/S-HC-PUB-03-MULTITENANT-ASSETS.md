<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-PUB-03-MULTITENANT-ASSETS"
sprint: "publishing"
status: "done"
owner: "Manuel"
last_updated: "2026-06-29T02:50:23.982Z"
source: "var/oreshnik/tasks/S-HC-PUB-03-MULTITENANT-ASSETS.json"
---

# Task S-HC-PUB-03-MULTITENANT-ASSETS

## Scope

Multi-tenant asset management: upload, replace, metadata extraction, compatibility classification

## Runtime

- estado: `done`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `0`
- handoff: -

## Dependencias

- S-HC-PUB-02-MULTIFORMAT-PREVIEW

## Zonas

### Compat

- `apps/web/app/api/tenants/[slug]/assets/**`
- `apps/web/app/api/tenant-assets/**`
- `apps/web/app/api/drafts/**`
- `apps/web/components/**`
- `apps/web/lib/asset-*.ts`
- `apps/web/lib/publishing-formats.ts`
- `packages/core/**`

### Read

- Ninguna

### Write

- Ninguna

## Aceptacion

- Upload persistente en Vercel Blob (heptacore-assets, publico, tenant-scoped)
- Asset replacement preserva audit log
- Asset reorganization (move, rename, delete)
- Extraccion automatica de metadata al subir o reemplazar: width, height, sizeBytes, MIME, durationSeconds para video, orientacion, aspect ratio
- Persistencia de metadata en Asset.metadata
- Recalculo de metadata despues de reemplazar contenido
- Clasificacion central por formato: IDEAL, USABLE, INCOMPATIBLE, UNKNOWN. UNKNOWN se usa cuando faltan datos tecnicos suficientes; no equivale a compatible; no autoriza publicacion; aplica especialmente a assets legacy todavia no analizados; la compatibilidad se calcula desde metadata; el resultado no se persiste como verdad permanente.
- Compatibilidad por plataforma: Instagram Feed, Instagram Carousel, Instagram Story, Instagram Reel, Facebook Feed imagen, Facebook Feed video, Facebook Story/Reel, YouTube Short, YouTube Video 16:9
- Badges visibles en la biblioteca de activos por formato
- Filtros por red, formato, orientacion y compatibilidad
- Reutilizacion de publishing-formats.ts sin reglas paralelas
- Assets legacy continuan funcionando
- Cero llamadas a proveedores sociales
- Preview antes de publish
- BLOB_READ_WRITE_TOKEN documentado como requerido (sin exponer valor)
- Codigo base en commit c78d71d20451cc73e446d2c6053421029cd29d42
- PUB-03 clasifica compatibilidad de activos; no elimina ni reduce el objetivo final de publicacion. Los formatos sin publisher real quedan documentados como pendientes de implementacion en PUB-06, PUB-07 o PUB-08.

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->