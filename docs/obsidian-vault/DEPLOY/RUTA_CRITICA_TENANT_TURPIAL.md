---
type: critical-path
project: "HeptaCore"
tenant: "turpial"
last_updated: "2026-06-01T15:45:00.000Z"
tags:
  - "#deploy"
  - "#turpial"
  - "#critical-path"
---

# Ruta Critica - Primer Tenant Publicando

## Objetivo

Llegar a Turpial como primer tenant operable con publicacion controlada, empezando en dry-run y pasando a real solo con aprobacion humana y credenciales oficiales.

## Gate 1 - Producto Operable

- Console shell.
- Tenant Turpial visible.
- Assets y drafts importados.
- Checklist de bloqueos.
- Approval queue.

## Gate 2 - Seguridad

- Tenant guard.
- Roles minimos.
- Audit log.
- Sin secretos en git.
- OAuth/token storage definido.
- `.env.rrss` local validado con `npm run worker:meta:readiness`.

## Gate 3 - Worker Dry-Run

- Queue tenant-aware.
- Mock/Meta adapter dry-run.
- Reporte de publicaciones programadas.
- Trazabilidad por draft.

## Gate 4 - Readiness Humano

- Lista de posts aprobados.
- Assets con derechos revisados.
- Cuentas oficiales conectadas por OAuth.
- Rollback/desactivar autopublish.
- `BOT_DRY_RUN=false` solo tras aprobacion.

## Gate 5 - Primera Publicacion

- Publicar 1 post de bajo riesgo.
- Capturar externalPostId.
- Registrar audit log.
- Capturar metrica inicial.
- Reporte diario enviado.

## Ruta Rapida OAuth 2026-06-01

1. Crear `.env.rrss` local en raiz desde `examples/tenants/turpial/content/queue/.env.rrss.example`.
2. Completar tokens fuera de chat y fuera de git.
3. Ejecutar `npm run worker:meta:readiness`.
4. Si falla, resolver permisos, Page ID o Instagram Business Account ID.
5. Si pasa, ejecutar solo dry-run hasta que exista aprobacion humana documentada.
6. Publicacion real requiere:
   - hard stop levantado explicitamente,
   - posts aprobados,
   - rollback/pausa listo,
   - `BOT_DRY_RUN=false`,
   - `HEPTACORE_ALLOW_REAL_PUBLISH=I_UNDERSTAND_REAL_RRSS_PUBLICATION`.

## No Entra Antes del Primer Publish

- Autopilot full.
- Scraping pagado.
- Campanas pagas.
- DM masivo.
- Multi-tenant enterprise DB.
