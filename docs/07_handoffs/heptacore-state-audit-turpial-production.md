---
type: state-audit
project: "HeptaCore"
tenant: "turpial"
created_at: "2026-06-01T15:45:00.000Z"
operator: "Manuel"
branch: "Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01"
tags:
  - "#handoff"
  - "#turpial"
  - "#rrss"
  - "#oauth"
  - "#jean"
---

# HeptaCore State Audit + Turpial Production Path

## 1. Resumen ejecutivo

HeptaCore ya tiene una consola operativa para Turpial, una cola de 29 publicaciones, 28 drafts, 9 piezas que requieren criterio humano, 46/46 assets presentes y un primer hito el 2026-06-02.

La pantalla actual no es todavia el admin global multi-cliente. Es un workspace de operador/tenant para Turpial alimentado por JSON local en `examples/tenants/turpial`.

La ruta correcta para hoy es:

1. Validar `.env.rrss` local con `npm run worker:meta:readiness`.
2. Aprobar manualmente primeros 7 posts en la consola.
3. Ejecutar dry-run de worker contra cola validada.
4. Publicar manualmente en Meta Business Suite o preparar publicacion API con gate humano.
5. No activar publicacion real automatica hasta levantar explicitamente el hard stop de RRSS reales y cerrar doble lock de OAuth/seguridad.

## 2. Que construyo Codex y por que

Codex construyo primero el workspace Turpial porque era el caso piloto mas urgente. La interpretacion fue:

- HeptaCore es la plataforma multi-cliente.
- Turpial es el primer tenant operativo.
- El operador necesita ver estrategia, cola, drafts, assets, riesgos y bloqueos antes de publicar.
- La publicacion real debe estar bloqueada hasta tener OAuth real, aprobaciones humanas y trazabilidad.

Esto es coherente con la idea original, pero faltaba explicar que la UI actual entra directo al tenant Turpial y no al panel maestro.

## 3. Mapa de flujo actual

```text
Repo docs/source Turpial
  -> examples/tenants/turpial/source-docs
  -> examples/tenants/turpial/content/inbox
  -> examples/tenants/turpial/content/queue/publication-queue.json
  -> apps/web/lib/turpial.ts
  -> apps/web/components/turpial-console.tsx
  -> operador revisa/aprueba en UI local
  -> apps/worker valida cola/assets
  -> apps/worker puede dry-run
  -> publicacion real queda bloqueada por gates
```

## 4. Mock vs funcional

| Area | Funcional | Mock / local | Archivo/Ruta | Que falta |
|---|---:|---:|---|---|
| Tenants/clientes | Parcial | Si | `packages/db/prisma/schema.prisma`, `examples/tenants/turpial` | Seed DB real y servicio multi-tenant |
| Selector de cliente | No | Si | `apps/web/components/turpial-console.tsx` | Admin global + tenant switcher |
| Cola de publicaciones | Si | Local JSON | `examples/tenants/turpial/content/queue/publication-queue.json` | Persistencia DB y acciones servidor |
| Drafts | Parcial | UI local | `apps/web/components/turpial-console.tsx` | Guardar approve/reject en DB |
| Pendientes | Parcial | Derivado en UI | `requiresHumanReview`, `riskLevel` | Panel con criterios editables |
| Assets | Parcial | Local file inventory | `examples/tenants/turpial/content/inbox` | Asset manager DB, uploader, specs, IA |
| Estrategia | Parcial | Hardcoded desde seed | `apps/web/lib/turpial.ts` | Strategy runner persistente |
| Parametros | Visual | Si | `apps/web/components/turpial-console.tsx` | Guardado real por tenant |
| Dry-run | Si en worker | No conectado a UI | `apps/worker/src/validate.mjs`, `publisher.mjs` | Boton UI -> API/job dry-run |
| Aprobar cola | Visual | Si | `turpial-console.tsx` | Server action/DB audit log |
| Publicacion real | Parcial tecnico | Bloqueado | `apps/worker/src/publisher.mjs` | OAuth validado, aprobaciones, hard stop levantado |
| Credenciales/OAuth | Readiness local | No DB vault | `.env.rrss`, `meta-readiness.mjs` | Secret manager/vault y OAuth callback |
| Reportes | Parcial | Local | `apps/worker/src/report.mjs` | Dashboard y delivery |
| Agente de respuestas | Conceptual | Si | `response-rules.json`, UI bot | Integracion comentarios/DM |
| Landing publica | Existe | Calidad pendiente | `apps/web/app/page.tsx` | Redisenar fuera de ruta critica Turpial |

## 5. Cards del dashboard

Se implemento quick win para que los cards sean navegables dentro de la consola:

| Card | Destino MVP | Estado |
|---|---|---|
| Publicaciones 29 / cola importada | Cola completa | Clickeable |
| Pendientes 9 / requieren criterio | Vista de pendientes | Clickeable |
| Drafts 28 / listos para revision | Vista de drafts | Clickeable |
| Assets 46/46 / sin faltantes | Vista de assets vinculados | Clickeable |
| Proximo 06-02 / primer hito | Calendario agrupado | Clickeable |

## 6. Asset manager

Estado actual: inventario local presente y validado. La consola ahora muestra assets usados por la cola, dependencias por publicacion y bloqueo por faltantes.

MVP pendiente:

- Uploader real.
- Tabla `Asset` poblada desde seed.
- Clasificacion critico/opcional.
- Specs por formato: feed, reel, story, carousel.
- Prompt IA por asset faltante.
- Boton futuro para generar asset con IA y registrarlo en inventario.
- Historial de versiones y derechos.

## 7. Admin global multi-cliente

No existe todavia. Debe ser sprint de Jean porque toca arquitectura, auth, RBAC y tenant isolation.

MVP admin:

| Cliente | Estado | Assets | Drafts | Pendientes | OAuth | Accion |
|---|---|---:|---:|---:|---|---|
| Turpial | Readiness | 46/46 | 28 | 9 | Pendiente env/OAuth | Abrir |
| Cliente B | Mock | - | - | - | Desconectado | Crear seed |

Requisito: cada cliente ve solo su tenant; Manuel/admin puede cambiar tenant desde arriba.

## 8. Dry-run

El dry-run correcto no publica. Debe validar:

- Estrategia.
- Assets.
- Calendario.
- Captions.
- Riesgos.
- Credenciales disponibles.
- Ruta de publicacion.
- Bloqueos.

Estado actual:

- `npm run worker:validate` valida assets y cola.
- `publisher.mjs` puede simular por fecha en modo dry-run.
- UI muestra boton, pero todavia no dispara job real.

## 9. Publicacion real y OAuth hoy

Se agrego un readiness local:

```bash
npm run worker:meta:readiness
```

Ese comando:

- Lee `.env.rrss`.
- No imprime tokens.
- Consulta Meta Graph en modo lectura.
- Valida Page ID, Page Access Token e Instagram Business Account ID.
- Falla si faltan credenciales.

Para usarlo hoy:

1. Crear `.env.rrss` en la raiz del repo usando `examples/tenants/turpial/content/queue/.env.rrss.example`.
2. Completar:
   - `FACEBOOK_PAGE_ID`
   - `FACEBOOK_PAGE_ACCESS_TOKEN`
   - `INSTAGRAM_BUSINESS_ACCOUNT_ID`
   - opcional `FACEBOOK_APP_ID` y `FACEBOOK_APP_SECRET`
3. Ejecutar `npm run worker:meta:readiness`.
4. Si pasa, ejecutar worker dry-run.
5. Publicacion real solo tras aprobacion humana y levantamiento explicito del hard stop.

Gate tecnico agregado:

```bash
HEPTACORE_ALLOW_REAL_PUBLISH=I_UNDERSTAND_REAL_RRSS_PUBLICATION
BOT_DRY_RUN=false
```

Sin ese gate, el worker bloquea publicacion real aunque existan tokens.

## 10. Turpial hoy

Ruta segura:

1. Manuel revisa y aprueba primeros 7 posts.
2. Jean valida OAuth/readiness si ya tiene acceso a tokens o al Business Manager.
3. Codex conecta boton UI -> job dry-run, si se autoriza.
4. Si readiness de Meta no pasa, se publica manual/semi-manual en Meta Business Suite con la cola aprobada.
5. Si readiness pasa, se hace una unica publicacion de bajo riesgo solo despues de documentar aprobacion, rollback y hard stop levantado.

Estado actual de datos:

- Total cola: 29.
- Drafts: 28.
- Ready: 1.
- Pendientes criterio: 9.
- Instagram: 19.
- Facebook: 10.
- Formatos: 14 feed, 4 reel, 6 carousel, 5 story.
- Siguiente hito: 2026-06-02.

## 11. Separacion Manuel / Jean

### Manuel

- Validar oferta, CTA y voz de Turpial.
- Aprobar primeros 7 posts.
- Revisar assets visualmente.
- Decidir posts de bajo riesgo para primera publicacion.
- Confirmar si se levanta el hard stop de publicacion real.
- Priorizar que landing no bloquee Turpial.

### Jean

- Admin global multi-tenant.
- DB seed/import Turpial.
- Auth/RBAC/tenant guards.
- OAuth architecture y secret storage.
- Audit log.
- Worker queue con jobs trazables.
- Meta adapter sandbox y readiness.

### Codex

- Implementar quick wins de consola.
- Mantener docs actualizados.
- Conectar dry-run UI -> worker/API cuando este autorizado.
- No tocar tokens ni publicar real sin gate documentado.

## 12. Riesgos criticos

- Publicar desde plataforma sin OAuth validado puede romper cuentas o fallar silenciosamente.
- Tokens en chat o git son incidente de seguridad.
- UI approval actual no persiste en DB.
- Instagram publishing con `file://` no sirve para produccion; Graph API necesita media accesible por URL publica o flujo de subida compatible.
- Stories/Reels tienen restricciones adicionales de Meta.
- No hay audit log real todavia.
- Hard stop activo: "No real RRSS publishing".

## 13. Archivos tocados

- `apps/web/components/turpial-console.tsx`
- `apps/web/app/globals.css`
- `apps/worker/src/config.mjs`
- `apps/worker/src/publisher.mjs`
- `apps/worker/src/meta-readiness.mjs`
- `apps/worker/package.json`
- `package.json`
- `examples/tenants/turpial/content/queue/.env.rrss.example`
- `docs/07_handoffs/heptacore-state-audit-turpial-production.md`

## 14. Validaciones

| Comando | Resultado |
|---|---|
| `npm run oreshnik:preflight -- --sprint S-HC-XX --operator Manuel --desc "actualizacion plan holistico HeptaCore Turpial Jean"` | PASS, 0 blockers |
| `npm run typecheck` | PASS |
| `npm run worker:validate` | PASS, 29/29 cola valida, 46/46 assets |
| `npm run worker:meta:readiness` | FAIL esperado: falta `.env.rrss` local |

