# Prompt Maestro — Auditoría Holística HeptaCore

> **Objetivo:** Revisar el estado actual del proyecto HeptaCore, identificar todas las deudas técnicas y gaps funcionales, y producir un plan de acción concreto para alcanzar un proyecto funcional según el diseño original.

---

## 1. Contexto de punto de partida

### 1.1 Lo construido (código en `master`)

| Capa | Entregable | Sprint | Autor |
|---|---|---|---|
| Monorepo + landing + Vercel | `apps/web/`, `vercel.json` | S-HC-00 | Manuel |
| Prisma schema 20+ modelos | `packages/db/prisma/schema.prisma` | S-HC-00 | Manuel |
| 2 migraciones SQL | `packages/db/prisma/migrations/` | S-HC-00, S-HC-01 | Manuel |
| Instagram OAuth login + callback | `apps/web/app/api/oauth/instagram/` | S-HC-01 | Manuel |
| Token vault AES-256-GCM | `apps/web/lib/token-vault.ts` | S-HC-01 | Manuel |
| TurpialConsole UI original | `apps/web/components/turpial-console.tsx` | S-HC-01 | Manuel |
| 29 posts + 46 assets Turpial | `apps/web/lib/data/`, `apps/web/public/assets/` | S-HC-00 | Manuel |
| Auth/RBAC/Login (NextAuth + bcryptjs) | `apps/web/lib/auth.ts`, `apps/web/app/login/`, `apps/web/app/api/auth/` | S-HC-04 | Jean |
| Dashboard SaaS 5 vistas | `apps/web/components/dashboard-console.tsx`, `apps/web/lib/dashboard.ts` | S-HC-01 | Jean |
| RBAC guards | `apps/web/lib/rbac.ts` | S-HC-04 | Jean |
| AuditLog writer | `apps/web/lib/audit.ts` | S-HC-04 | Jean |
| Approval queue API | `apps/web/app/api/drafts/[id]/approve/`, `reject/` | S-HC-05 | Jean |
| BullMQ worker queue | `apps/worker/src/queue/` (client, processor, worker, types) | S-HC-06 | Jean |
| Worker publisher | `apps/worker/src/publisher.mjs` | S-HC-06 | Jean |
| Worker scheduler | `apps/worker/src/scheduler.mjs` | S-HC-06 | Jean |
| Meta adapter sandbox (mock) | `packages/integrations/src/mock-meta-adapter.ts` | S-HC-08 | Jean |
| Strategy runner | `packages/agents/src/strategy-runner.ts` | S-HC-03 | Jean |
| Reports dashboard data layer | `apps/web/lib/dashboard.ts` (getReportData) | S-HC-07 | Jean |
| Publish readiness report | `apps/web/lib/dashboard.ts` (getReadinessReport) | S-HC-09 | Jean |
| Admin seed script | `scripts/seed-admin.mjs` | — | Jean |
| Turpial seed script | `scripts/seed-turpial.mjs` | — | Jean |
| Oreshnik auto-discovery | `scripts/oreshnik/lib.mjs` (`discoverLatestMother`) | — | Manuel |
| Oreshnik close-sprint con código | `scripts/oreshnik/close-sprint.mjs` | — | Manuel |
| Zone-check dinámico (task-board) | `scripts/oreshnik/zone-check.mjs` | — | Manuel |
| Lazy PrismaClient (build fix) | `apps/web/lib/prisma.ts` | — | Manuel |

### 1.2 Infraestructura Oreshnik

| Componente | Estado |
|---|---|
| `preflight.mjs` (8 pasos, auto-sync MADRE) | Operativo |
| `close-sprint.mjs` (crea MADRE con código+docs) | Operativo |
| `merge-docs-union.mjs` (Google Docs union merge) | Operativo |
| `zone-check.mjs` (asignación dinámica vía task-board.json) | Operativo |
| `assign` (paquete de asignación) | Operativo |
| `sync-from-mother.mjs` (auto-detecta última MADRE) | Operativo |
| `discoverLatestMother()` | Operativo |
| MADRE branches | v2→v14 en origin (v14 es integración con código) |
| `task-board.json` | 21 sprints registrados con owners |

### 1.3 Rama de integración actual

- **MADRE/v14-integration-all-code-2026-06-09** en `origin`
- Contiene todo el código de Jean (9 sprints) + docs + infraestructura Oreshnik
- `master` sincronizado con v14 → desplegado en Vercel (`https://heptacore.vercel.app`)

---

## 2. Deudas técnicas conocidas

### 2.1 Build y deploy

| Issue | Gravedad | Archivo | Fix |
|---|---|---|---|
| ~~PrismaClient ansioso rompe build Vercel~~ | ~~Crítico~~ | ~~`apps/web/lib/prisma.ts`~~ | ✅ Lazy Proxy (commit `aaedc0e`) |

### 2.2 Entorno de producción (Vercel)

| Issue | Gravedad | Detalle |
|---|---|---|
| `DATABASE_URL` no configurado | Crítico | Prisma no conecta en producción. Login, dashboard, todo roto. |
| `DIRECT_URL` no configurado | Crítico | `prisma.config.ts` lo requiere. |
| `NEXTAUTH_SECRET` no configurado | Crítico | JWT sessions no funcionan sin secret. |
| `NEXTAUTH_URL` no configurado | Alto | Callback URLs de NextAuth incorrectas sin esto. |
| `ENCRYPTION_KEY` no configurado | Alto | Token vault AES-256-GCM no puede cifrar/descifrar sin key. |
| Admin user no sembrado en producción | Crítico | `scripts/seed-admin.mjs` no ejecutado. Nadie puede hacer login. |
| Tenant `turpial-sound` no sembrado | Crítico | `scripts/seed-turpial.mjs` no ejecutado. Sin tenant no hay dashboard. |
| Migraciones de Prisma no aplicadas en producción | Crítico | `npx prisma migrate deploy` no ejecutado. Tablas no existen. |

### 2.3 Worker / Publicación

| Issue | Gravedad | Detalle |
|---|---|---|
| Worker no deployable en Vercel | Alto | Vercel es serverless. BullMQ requiere Redis y proceso persistente. Necesita hosting separado (Railway, Fly.io, VPS). |
| Redis no provisionado | Alto | BullMQ requiere Redis. Sin Redis, el worker no procesa jobs. |
| Publicación real bloqueada por hard stop | Diseño | `BOT_DRY_RUN=true` es intencional. Requiere aprobación explícita de Manuel. |
| S-HC-PUB-01 no ejecutado | Pendiente | Primera prueba de publicación controlada desde la web. Asignado a Jean, no completado. |
| Meta adapters son mock | Medio | `mock-meta-adapter.ts` simula Instagram/Facebook. Para publicación real se necesita el adapter real. |

### 2.4 Documentación desactualizada

| Archivo | Issue |
|---|---|
| `00_CENTRAL_HEPTACORE.md` | Dice "CERO ramas/commits/cierres de Jean". Jean completó 9 sprints. |
| `ESTADO_JEAN.md` | No refleja los 9 sprints completados. |
| `ESTADO_MANUEL.md` | Lista sprints como pendientes cuando Jean ya los hizo. |
| `PLAN_MAESTRO_SPRINTS.md` | Tabla de asignación desactualizada. |
| `STATUS_BOARD.md` | Creado durante diagnóstico, necesita actualización post-cierre. |
| Sprint events locales | Solo 6 eventos de Manuel en `var/sprint-events/`. Faltan los 9 de Jean. |

### 2.5 Integraciones externas

| Issue | Gravedad | Detalle |
|---|---|---|
| Instagram OAuth tokens | Alto | Vault cifrado existe localmente. En producción, `DATABASE_URL` requerido para verificar. |
| Facebook OAuth tokens | Alto | Misma situación. |
| `.env.rrss` ausente en producción | Alto | Variables de Meta/Instagram app no configuradas en Vercel. |

---

## 3. Gaps vs diseño original

### 3.1 Plan Maestro de Sprints

| Sprint | Owner original | Estado real |
|---|---|---|
| S-HC-00 | Manuel | ✅ Completado por Manuel |
| S-HC-01 | Manuel | ✅ Completado por Jean (reassign) |
| S-HC-02 | Jean | ✅ Completado por Jean |
| S-HC-02A | Jean | ❓ Meta OAuth readiness — tokens en vault pero `.env.rrss` ausente |
| S-HC-03 | Manuel | ✅ Completado por Jean (reassign) |
| S-HC-04 | Jean | ✅ Completado por Jean |
| S-HC-05 | Manuel | ✅ Completado por Jean (reassign) |
| S-HC-06 | Jean | ✅ Completado por Jean |
| S-HC-07 | Manuel | ✅ Completado por Jean (reassign) |
| S-HC-08 | Jean | ✅ Completado por Jean (mock) |
| S-HC-09 | Manuel | ✅ Completado por Jean (reassign) |
| S-HC-PUB-01 | Jean | ❌ Pendiente — primera publicación controlada desde web |
| S-HC-CTRL-01/02/03 | Manuel | ✅ Completados por Manuel |
| S-HC-PROD-00 | Manuel | ✅ Product audit completado |

### 3.2 Capacidades de producto (Product Reality Check)

| Capacidad | Objetivo | Realidad |
|---|---|---|
| Login operativo | ✅ | Funcional en build, requiere DB en producción |
| Roles operador | ✅ | OWNER/EDITOR/VIEWER en código |
| Oreshnik dashboard | ✅ | Dashboard con 5 vistas (overview, queue, checklist, reports, readiness) |
| Tenant console turpial-sound | ✅ | Dashboard muestra datos por tenant |
| Social connection status UI | ✅ | Readiness report muestra estado de conexiones |
| Strategy/assets/content queue UI | ✅ | Queue view en dashboard |
| Discovery/dry-run from UI | ❓ | Readiness report existe, ¿discovery endpoint? |
| One-post publish from UI | ❌ | Falta publish endpoint en web (`/api/publishing/publish`) |
| Product publish hard gate | ❌ | `BOT_DRY_RUN` existe pero sin UI de confirmación de Manuel |
| Logs/handoff/event ledger | ✅ | AuditLog + sprint events |
| Obsidian/docs sync | ⚠️ | Merge-docs-union funciona pero docs canónicos desactualizados |

---

## 4. Plan de acción priorizado

### Fase A — Producción mínima funcional (login + dashboard)

**Dueño: Manuel (infraestructura)**

| # | Acción | Comando/Archivo |
|---|---|---|
| A1 | Configurar `DATABASE_URL` en Vercel | Panel de Vercel → Environment Variables |
| A2 | Configurar `DIRECT_URL` en Vercel | Ídem |
| A3 | Configurar `NEXTAUTH_SECRET` en Vercel | `openssl rand -base64 32` |
| A4 | Configurar `NEXTAUTH_URL=https://heptacore.vercel.app` | Panel de Vercel |
| A5 | Configurar `ENCRYPTION_KEY` en Vercel | Misma key usada localmente |
| A6 | Ejecutar migraciones Prisma en producción | `npx prisma migrate deploy` |
| A7 | Ejecutar seed de admin en producción | `node scripts/seed-admin.mjs` |
| A8 | Ejecutar seed de Turpial en producción | `node scripts/seed-turpial.mjs` |
| A9 | Verificar deploy Vercel exitoso | `npm run build` local → push master |
| A10 | Probar login: `jean@heptacore.dev` / `admin123` | Navegador → `https://heptacore.vercel.app/login` |

### Fase B — Publicación controlada (S-HC-PUB-01)

**Dueño: Jean**

| # | Acción | Archivo |
|---|---|---|
| B1 | Agregar `apps/web/app/api/publishing/publish/route.ts` | Endpoint POST que dispara el worker publisher |
| B2 | Agregar acción "Publicar" en `dashboard-console.tsx` | Botón en vista readiness que llama al endpoint |
| B3 | Mantener `BOT_DRY_RUN=true` | Sin publicación real |
| B4 | Agregar gate visual de aprobación Manuel | Checkbox "Manuel aprueba esta publicación" |
| B5 | Ejecutar discovery + dry-run desde la web | Prueba funcional real |
| B6 | Cerrar S-HC-PUB-01 con `oreshnik:close --push` | Genera MADRE/v15 |

### Fase C — Worker hosting

**Dueño: Manuel (infra)**

| # | Acción |
|---|---|
| C1 | Provisionar Redis (Railway/Upstash) |
| C2 | Deploy `apps/worker/` en plataforma con procesos persistentes (Railway/Fly.io) |
| C3 | Configurar `REDIS_URL` en worker |
| C4 | Conectar worker al mismo `DATABASE_URL` |
| C5 | Verificar worker procesa jobs del dashboard |

### Fase D — Documentación y cierre

**Dueño: Manuel**

| # | Acción |
|---|---|
| D1 | Actualizar `00_CENTRAL_HEPTACORE.md` con estado real |
| D2 | Actualizar `ESTADO_JEAN.md` y `ESTADO_MANUEL.md` |
| D3 | Actualizar `PLAN_MAESTRO_SPRINTS.md` con cierres reales |
| D4 | Actualizar `PRODUCT/STATUS_BOARD.md` |
| D5 | Sincronizar `var/sprint-events/` con eventos de Jean |
| D6 | Ejecutar `oreshnik:close` general para generar MADRE final |
| D7 | Ejecutar `npm run typecheck && npm run build && npm run worker:validate` |

### Fase E — Hardening

| # | Acción |
|---|---|
| E1 | Reemplazar `mock-meta-adapter.ts` con adapters reales de Instagram/Facebook |
| E2 | Configurar `.env.rrss` en producción |
| E3 | Prueba de publicación real con 1 post, 1 plataforma, aprobación explícita |
| E4 | Configurar `HEPTACORE_ALLOW_REAL_PUBLISH=I_UNDERSTAND_REAL_RRSS_PUBLICATION` |
| E5 | Postmortem de primera publicación real |

---

## 5. Reglas de prevención de recurrencia

1. **Nunca instanciar clientes de BD a nivel de módulo.** Usar lazy initialization (Proxy, getter, `globalThis` cache). El build de Next.js en Vercel NO tiene `DATABASE_URL`.
2. **Todo módulo nuevo que toque BD debe pasar `npm run build` sin `DATABASE_URL` definida.**
3. **Toda page/API route que use Prisma debe tener `export const dynamic = "force-dynamic"`.**
4. **Post-sprint, ejecutar `oreshnik:close --push`.** Esto actualiza docs canónicos, genera MADRE, y sincroniza al otro operador.
5. **Antes de merge a master, verificar build local:** `npm run typecheck && npm run build`.
6. **Variables de entorno de producción se configuran UNA vez en Vercel y no se tocan desde código.**
7. **El task-board.json (`var/oreshnik/task-board.json`) es la fuente única de verdad de asignaciones.** Si un operador completa un sprint del otro, registrar la reassignación explícitamente.

---

## 6. Estado de la automatización Oreshnik

| Funcionalidad | Estado |
|---|---|
| Preflight auto-detecta última MADRE | ✅ `discoverLatestMother()` |
| Preflight auto-sync docs desde MADRE | ✅ Paso 1/8 |
| Preflight auto-crea rama hija | ✅ Paso 4/8 |
| Zone-check con asignación dinámica (task-board) | ✅ |
| Close-sprint crea MADRE con código + docs | ✅ |
| Close-sprint union-merge docs sin pisar | ✅ |
| Close-sprint escribe sprint-event y actualiza mother-version | ✅ |
| Push automático con `--push` | ✅ |

---

## 7. Resultado esperado al completar este plan

- `https://heptacore.vercel.app` funcional con login, dashboard SaaS, approval queue, publishing readiness
- Jean puede hacer login, ver dashboard, ejecutar discovery + dry-run desde la UI
- Worker funcional en hosting separado, conectado a Redis y misma BD
- Primera publicación controlada (dry-run) completada y documentada
- Documentación canónica actualizada y sincronizada vía Oreshnik
- Proyecto listo para publicación real con gate de aprobación Manuel
