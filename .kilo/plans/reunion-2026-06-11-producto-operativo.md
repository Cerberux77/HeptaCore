# Plan Maestro — Reunión 11 Jun 2026

> **Operador:** Manuel  
> **Rama activa:** `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09`  
> **Objetivo:** Producto funcional, listo para publicación real, con todas las capacidades del diseño original restauradas.  
> **Metodología:** Oreshnik preflight + sprints paralelos Pareto 80/20 + closure al final.

---

## Resumen Ejecutivo

Tras auditar el código fuente y contrastar con las notas de la reunión del 11 jun 2026, se identificó que **la mayoría de las capacidades SÍ existen en el código** pero están bloqueadas por variables de entorno (`PUBLISHING_HARD_STOP=true`, `PUBLISHING_REAL_ENABLED=false`) o inacabadas en la capa de UI. No hubo pérdida de código — hubo bloqueos de seguridad que impidieron la publicación real y features que quedaron a medio implementar en la UI.

### Lo que SÍ existe (ya codeado)
- Landing page con secciones, CTA a login (`apps/web/app/page.tsx`)
- Login con NextAuth credentials + JWT + RBAC multi-rol (`apps/web/lib/auth.ts`, `apps/web/lib/rbac.ts`)
- Dashboard con 8 vistas: operaciones, estrategia, cola, assets, calendario, checklist, reportes, readiness (`apps/web/components/dashboard-console.tsx`)
- Cards clickeables que navegan entre vistas
- Edición inline de drafts (título, caption, hashtags) con API PUT (`apps/web/app/api/drafts/[id]/route.ts`)
- Aprobación/rechazo con API calls reales (`apps/web/app/api/drafts/[id]/approve/route.ts`)
- LLM provider adapter: OpenAI, Anthropic, Gemini, DeepSeek, Deterministic (`packages/agents/src/llm-adapter.ts`)
- API de estrategia generativa (`apps/web/app/api/strategy/generate/route.ts`)
- API de publicación con dry-run/rollback/audit log (`apps/web/app/api/publishing/publish/route.ts`)
- Prisma schema completo: User, Membership, Invitation, Tenant, roles, etc. (`packages/db/prisma/schema.prisma`)
- Middleware de autenticación global (`apps/web/middleware.ts`)
- Admin console global (`apps/web/app/admin/page.tsx`)
- Enums de AutomationMode: `DRAFT_ONLY`, `APPROVAL_REQUIRED`, `AUTOPILOT_LIMITED`, `AUTOPILOT_FULL`

### Lo que FALTA (Pendientes de la reunión)

| # | Pendiente reunión | Estado real | Impacto | Sprint |
|---|-------------------|-------------|---------|--------|
| 1 | Eliminar hard stops | Variables de env bloquean. Código de publicación real ya existe. | **Crítico** | S-HC-PROD-HS |
| 2 | Toggle publicación automática/manual por tenant | El enum AutomationMode ya existe en Prisma, falta UI de toggle y worker que lo respete | **Crítico** | S-HC-PROD-HS |
| 3 | Landing con registro/login/roles | Login existe pero sin registro ni recovery. Invitación modelada en Prisma pero sin API/UI | **Alto** | S-HC-PROD-AUTH |
| 4 | Configuración de LLM específicos desde UI | Solo configurable por env vars. Admin necesita UI por tenant | **Alto** | S-HC-PROD-LLM |
| 5 | Hora específica en cronograma | Solo fecha (YYYY-MM-DD), sin componente de hora | **Alto** | S-HC-PROD-CAL |
| 6 | Edición interactiva de estrategia | Vista de solo lectura. No se pueden modificar pilares/canales | **Medio** | S-HC-PROD-STRAT |
| 7 | Vista de calendario día/semana/mes | Solo lista plana | **Medio** | S-HC-PROD-CAL |
| 8 | Reordenamiento de drafts en cola | Sin drag-and-drop ni reorden | **Medio** | S-HC-PROD-QUEUE |
| 9 | Panel de assets con especificaciones | Lista de assets pero sin guía de formatos/dimensiones requeridos | **Medio** | S-HC-PROD-ASSETS |
| 10 | Preview con frame de red social | Turpial-console lo tiene. Dashboard-console no. | **Bajo** | S-HC-PROD-PREVIEW |
| 11 | Asset links rotos | Rutas desactualizadas en DB | **Bajo** | S-HC-PROD-ASSETS |
| 12 | Interactividad de tableros | YA IMPLEMENTADO: cards son clickeables y navegan | ✅ | — |

---

## Estrategia de Ejecución (Pareto 80/20)

### Wave 1 — Paralelo: Desbloqueo crítico (Manuel)
Estos dos sprints desbloquean el 80% del valor. Sin dependencias entre sí.

| Sprint | Owner | Scope | Zonas afectadas |
|--------|-------|-------|-----------------|
| **S-HC-PROD-HS** | Manuel | Eliminar hard stops + toggle autopilot por tenant | `apps/web/app/api/publishing/`, `apps/web/components/dashboard-console.tsx`, `apps/web/lib/dashboard.ts`, `.env.example` |
| **S-HC-PROD-AUTH** | Manuel | Registro por invitación + password recovery + UI gestión miembros | `apps/web/app/login/`, `apps/web/app/api/auth/`, `apps/web/lib/auth.ts`, `packages/db/prisma/schema.prisma` (solo lectura) |

### Wave 2 — Paralelo: Features core (Manuel)
Dependen de Wave 1 completada. Sin dependencias entre sí.

| Sprint | Owner | Scope | Zonas afectadas |
|--------|-------|-------|-----------------|
| **S-HC-PROD-LLM** | Manuel | Configuración LLM por tenant desde admin UI | `apps/web/app/admin/`, `apps/web/components/admin-console.tsx`, `apps/web/app/api/strategy/`, `packages/agents/src/` (solo lectura) |
| **S-HC-PROD-CAL** | Manuel | Hora en cronograma + vistas día/semana/mes | `apps/web/components/dashboard-console.tsx`, `apps/web/lib/dashboard.ts`, `apps/web/app/api/drafts/` |

### Wave 3 — Paralelo: Polish y assets (Manuel)
Dependen de Wave 2 completada.

| Sprint | Owner | Scope | Zonas afectadas |
|--------|-------|-------|-----------------|
| **S-HC-PROD-STRAT** | Manuel | Edición interactiva de estrategia (pilares, canales, voz) | `apps/web/components/dashboard-console.tsx`, `apps/web/app/api/strategy/` |
| **S-HC-PROD-QUEUE** | Manuel | Reordenamiento de drafts en cola | `apps/web/components/dashboard-console.tsx`, `apps/web/app/api/drafts/` |
| **S-HC-PROD-ASSETS** | Manuel | Panel de specs de assets + fix links rotos | `apps/web/components/dashboard-console.tsx`, `apps/web/lib/dashboard.ts` |

### Wave 4 — Final: Release gate
| Sprint | Owner | Scope |
|--------|-------|-------|
| **S-HC-RELEASE-02** | Manuel | End-to-end test: registro → estrategia → drafts → publish real controlado |

---

## Mapa de Zonas (zone-map.json)

Para esta ejecución, Manuel opera en zona exclusiva sobre:

```
apps/web/**           → manuel_exclusive
packages/agents/**    → manuel_exclusive
apps/web/app/api/oauth/** → manuel_exclusive
apps/web/lib/token-vault.ts → manuel_exclusive
scripts/oreshnik/**   → manuel_exclusive
var/oreshnik/**       → manuel_exclusive
```

Jean mantiene exclusividad sobre `apps/worker/**`. Coordinación requerida solo si hay cambios en `packages/db/**` (double lock Jean+Manuel), lo cual no está previsto en este plan.

---

## Detalle de Sprints

### S-HC-PROD-HS — Desbloqueo de publicación

**Objetivo:** El producto publica en redes reales, con toggle por tenant (manual/automático).

**Cambios:**
1. `.env.example`: documentar `PUBLISHING_HARD_STOP=false`, `PUBLISHING_REAL_ENABLED=true`
2. `apps/web/app/api/publishing/publish/route.ts`: respetar el `automationMode` del tenant (si es `AUTOPILOT_LIMITED` o `AUTOPILOT_FULL`, no exigir `manualApproval`)
3. `apps/web/components/dashboard-console.tsx`: 
   - Agregar toggle de modo de publicación en vista "Publicacion" (manual vs automático)
   - Eliminar mensajes de "dry-run activo" cuando el tenant esté en modo autopilot
   - Mostrar estado real del modo de publicación
4. `apps/web/lib/dashboard.ts`: exponer `automationMode` en las queries del dashboard
5. Vercel env vars: set `PUBLISHING_REAL_ENABLED=true`, `PUBLISHING_HARD_STOP=false` en producción

**Criterio de cierre:** Publish API acepta `mode=live` cuando tenant tiene automationMode adecuado + env vars configurados. El dry-run sigue funcionando como fallback.

---

### S-HC-PROD-AUTH — Registro por invitación + Recovery

**Objetivo:** Flujo completo de registro: admin invita → usuario recibe link → registra credenciales → accede.

**Cambios:**
1. `apps/web/app/login/page.tsx`: agregar pestañas/links "Registrarse" y "Olvidé mi contraseña"
2. `apps/web/app/register/page.tsx` (nuevo): página de registro que acepta token de invitación
3. `apps/web/app/api/auth/register/route.ts` (nuevo): endpoint que valida token de invitación y crea User + Membership
4. `apps/web/app/api/auth/recover/route.ts` (nuevo): endpoint de recuperación (envía email con link de reset)
5. `apps/web/app/api/auth/reset-password/route.ts` (nuevo): endpoint que acepta token y nueva contraseña
6. `apps/web/app/api/invitations/route.ts` (nuevo): CRUD de invitaciones (solo admin/owner)
7. UI de gestión de miembros en admin console (lista, invitar, cambiar rol, remover)

**Criterio de cierre:** Flujo completo: admin invita → invitado recibe link → registra → inicia sesión → ve su tenant.

---

### S-HC-PROD-LLM — Configuración de LLM por tenant

**Objetivo:** El admin del tenant puede seleccionar qué LLM provider y modelo usar para generar estrategias.

**Cambios:**
1. `packages/db/prisma/schema.prisma`: agregar campos `llmProvider`, `llmModel`, `llmApiKey` a Tenant (o tabla separada)
2. `apps/web/app/admin/page.tsx`: sección de configuración LLM por tenant
3. `apps/web/components/admin-console.tsx`: UI para seleccionar provider (OpenAI/Anthropic/Gemini/DeepSeek/Deterministic), modelo, y API key
4. `apps/web/app/api/strategy/generate/route.ts`: leer preferencia del tenant en vez de solo env vars (fallback a env vars si tenant no tiene config)
5. `apps/web/app/api/admin/llm-config/route.ts` (nuevo): API para guardar/leer configuración LLM por tenant

**Criterio de cierre:** Admin puede elegir "Gemini 2.0 Flash" para Turpial y "GPT-4o" para otro tenant. La estrategia se genera con el provider seleccionado.

---

### S-HC-PROD-CAL — Hora en cronograma + Vistas de calendario

**Objetivo:** El usuario puede programar publicaciones con hora específica y ver el calendario en modo día/semana/mes.

**Cambios:**
1. `apps/web/components/dashboard-console.tsx`: 
   - Agregar time picker junto al date picker (o reemplazar scheduledFor date-only por datetime-local)
   - Implementar vistas de calendario: día (horas), semana (columnas), mes (grid)
2. `apps/web/app/api/drafts/[id]/route.ts`: aceptar y persistir hora en `scheduledFor`
3. `apps/web/lib/dashboard.ts`: tipar `scheduledFor` como datetime completo

**Criterio de cierre:** Draft guardado con "2026-06-15 14:30" y el calendario muestra vista semanal con los drafts en sus horas correspondientes.

---

### S-HC-PROD-STRAT — Edición interactiva de estrategia

**Objetivo:** El usuario puede modificar pilares de contenido, canales, cadencia y voz desde la UI.

**Cambios:**
1. `apps/web/components/dashboard-console.tsx` (vista "strategy"): reemplazar vista estática por formulario editable
2. `apps/web/app/api/strategy/update/route.ts` (nuevo): PUT para guardar cambios en estrategia (StrategyBrief en DB)
3. Persistir estrategia editada en `StrategyBrief` (tabla ya existe en Prisma)

**Criterio de cierre:** Usuario cambia "3-5 posts/semana" a "5-7 posts/semana" en Instagram y se persiste.

---

### S-HC-PROD-QUEUE — Reordenamiento de drafts

**Objetivo:** El usuario puede reordenar drafts en la cola (drag & drop o botones up/down).

**Cambios:**
1. `apps/web/components/dashboard-console.tsx` (vista "queue"): implementar drag & drop con `dnd-kit` o similar, o botones de mover arriba/abajo
2. `apps/web/app/api/drafts/reorder/route.ts` (nuevo): endpoint que recibe array de IDs en nuevo orden y actualiza `scheduledFor` o un campo `sortOrder`
3. `packages/db/prisma/schema.prisma`: agregar campo `sortOrder Int?` a ContentDraft

**Criterio de cierre:** Usuario arrastra un draft de la posición 5 a la 2 y el orden se persiste.

---

### S-HC-PROD-ASSETS — Panel de specs + Fix links

**Objetivo:** El usuario ve qué assets necesita (formatos, dimensiones) y los links rotos se reparan.

**Cambios:**
1. `apps/web/components/dashboard-console.tsx` (vista "assets"): agregar panel de "Assets requeridos" con specs por plataforma (ej: "Instagram feed: 1080x1080 JPG/PNG", "Reel: 1080x1920 MP4")
2. `apps/web/lib/dashboard.ts`: agregar función `getAssetSpecs(tenantSlug)` que devuelve lista de assets pendientes con specs
3. Script de reparación de asset links en DB (`scripts/fix-asset-links.mjs`)

**Criterio de cierre:** Panel muestra "Te faltan 3 assets: 2 reels y 1 carousel. Formatos requeridos: ...". Links rotos reparados.

---

## Preflight Oreshnik

Antes de iniciar implementación:

```bash
npm run oreshnik:preflight -- --sprint S-HC-PROD-HS --operator Manuel --desc "desbloqueo-hard-stops-y-toggle-autopilot"
```

## Cierre

Al completar todos los sprints:

```bash
npm run typecheck
npm run build
npm run worker:validate
npm run oreshnik:close -- --sprint S-HC-RELEASE-02 --operator Manuel --desc "producto-operativo-publicacion-real"
```

---

## Notas

- El código de publicación real, LLM adapter, RBAC, approval queue y dashboard YA EXISTE. No se perdió. El problema fue que los hard stops de seguridad (correctos para desarrollo) nunca se levantaron para producción.
- El dashboard YA tiene cards clickeables. No es un pendiente real.
- La causa raíz de la percepción de "cosas perdidas" fue la combinación de: (a) hard stops activos, (b) features en backend sin UI completa, (c) falta de registro/recovery.
