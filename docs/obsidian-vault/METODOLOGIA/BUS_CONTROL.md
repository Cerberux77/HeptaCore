---
type: bus-control
project: "HeptaCore"
last_updated: "2026-06-01T00:00:00.000Z"
tags:
  - "#bus-control"
  - "#locks"
---

# Bus de Control HeptaCore

## Reglas

| Regla | Detalle |
|---|---|
| Rama hija por sprint | `Manuel/*` o `Jean/*` |
| Madre docs versionada | `MADRE/vN-sprint-desc-fecha` |
| DB lock doble | Prisma schema, migrations y auth/security |
| No secretos | `.env`, tokens, claves, OAuth codes |
| Acciones reales bloqueadas | Publicar, gastar, scraping, DM masivo |
| Docs al cierre | `00_CENTRAL_HEPTACORE` y `PLAN_MAESTRO_SPRINTS` siempre actualizados |
| QA minimo | typecheck, build, worker validate |

## Zonas

El mapa activo vive en:

`docs/07_handoffs/zone-map.json`

## Validacion

```bash
npm run oreshnik:zone -- --sprint S-HC-01
```
