---
type: master-dashboard
project: "HeptaCore"
status: active-foundation
phase: "Foundation: monorepo, agent core, landing, Prisma, worker and Turpial tenant seed"
last_updated: "08/06/26 18:20"
mother_branch: "MADRE/v3-s-hc-01-closure-and-saas-oauth-foundation-2026-06-08"
production_branch: "none"
tags:
  - "#central"
  - "#status/live-source"
  - "#manuel"
  - "#jean"
  - "#heptacore"
---

# HeptaCore - Dashboard Activo

> **Documento canonico.** Si hay conflicto entre documentos, este manda hasta que se cierre un sprint con Oreshnik.

## Estado Actual

HeptaCore ya tiene base monorepo:

| Area | Estado |
|---|---|
| Landing Next.js | Implementada |
| Worker RRSS | Migrado a `apps/worker` |
| Agent core | Inicial en `packages/agents` |
| Prisma schema | Inicial en `packages/db/prisma/schema.prisma` |
| Turpial tenant seed | Importado en `examples/tenants/turpial` |
| Vault Obsidian | Inicializado |
| Oreshnik HeptaCore | Scripts base instalados |

## Rama Madre y Ramas Hijas

| Tipo | Convencion | Uso |
|---|---|---|
| Madre docs | `MADRE/vN-sprint-desc-fecha` | Documentacion integrada Manuel + Jean |
| Madre inicial | `master` | Base actual antes de primera madre versionada |
| Hija Manuel | `Manuel/sprint-desc-fecha` | Trabajo de Manuel |
| Hija Jean | `Jean/sprint-desc-fecha` | Trabajo de Jean |

## Trabajo Actual Manuel

| Sprint | Estado | Scope |
|---|---|---|
| S-HC-00 | En curso | Foundation repo, monorepo, docs, vault, Oreshnik |

## Trabajo Actual Jean

| Sprint | Estado | Scope |
|---|---|---|
| Por asignar | Pendiente | Revisar arquitectura, DB/Auth/worker o frontend segun acuerdo |

## Pendientes Inmediatos

| Prioridad | Pendiente | Owner sugerido |
|---|---|---|
| P0 | Hacer primer commit base del monorepo | Manuel |
| P0 | Definir primera rama madre versionada | Manuel + Jean |
| P0 | Crear sprint S-HC-01: consola onboarding + draft queue | Manuel |
| P0 | Crear sprint S-HC-02: DB seed/import Turpial + Prisma seed | Jean o Manuel |
| P0 | Ejecutar plan paralelo Manuel/Jean | Ambos |
| P1 | Definir auth provider | Ambos |
| P1 | Definir deployment target | Ambos |
| P1 | Definir proveedor LLM y adapter inicial | Ambos |

## Reglas Activas

- No publicar en redes reales desde HeptaCore.
- No pedir ni commitear credenciales reales.
- No ejecutar scraping real.
- No gastar en campanas.
- No cerrar sprint sin actualizar este vault.
- No pisar trabajo del otro operador: usar preflight y zone check.

## Validaciones Base

| Check | Comando | Estado |
|---|---|---|
| TypeScript | `npm run typecheck` | PASS |
| Build | `npm run build` | PASS |
| Worker Turpial | `npm run worker:validate` | PASS con 2 assets opcionales faltantes |
| Prisma validate | `npx prisma validate` | PASS |

## Actualizacion 2026-06-01 15:45 VET

Se documento la auditoria de estado y ruta Turpial en `docs/07_handoffs/heptacore-state-audit-turpial-production.md`.

Estado operativo actualizado:

| Area | Estado |
|---|---|
| Cola Turpial | 29/29 valida |
| Assets Turpial | 46/46 presentes |
| Cards dashboard | Clickeables hacia cola, pendientes, drafts, assets y calendario |
| OAuth Meta | Readiness local agregado; pendiente `.env.rrss` real |
| Publicacion real | Bloqueada por hard stop hasta aprobacion humana y doble lock |

## Actualizacion 2026-06-08 18:15 VET

S-HC-01 queda preparado para cierre con HeptaCore en Vercel Production y foundation SaaS/OAuth documentada.

| Area | Estado |
|---|---|
| Production URL | `https://heptacore.vercel.app` |
| Callback Instagram temporal | `https://heptacore.vercel.app/api/oauth/instagram/callback` |
| Dominio final pendiente | `https://app.heptacore.com` |
| DB SaaS foundation | Prisma extendido de forma aditiva para tenants, auth, OAuth, onboarding, contenido y publishing jobs |
| Auth | Scaffold de `User.passwordHash`, guard de tenant y `/dashboard` protegido |
| OAuth Instagram | Login URL + callback con code exchange seguro, sin retornar ni guardar token |
| Token storage | Bloqueado hasta `ENCRYPTION_KEY` + vault adapter |
| Turpial Sound | Seed script sin secretos: `node scripts/seed-turpial-foundation.mjs` |

Handoff canonico de esta etapa: `docs/07_handoffs/S-HC-01_CLOSURE_S-HC-02_S-HC-06_FOUNDATION_2026-06-08.md`.

## Navegacion

- [[METODOLOGIA/METODOLOGIA_ORESHNIK_HEPTACORE]]
- [[METODOLOGIA/INSTRUCCION_APERTURA_SESION]]
- [[SPRINTS/PLAN_MAESTRO_SPRINTS]]
- [[SPRINTS/PLAN_PARALELO_MANUEL_JEAN]]
- [[METODOLOGIA/RESILIENCIA_REASIGNACION]]
- [[DEPLOY/RUTA_CRITICA_TENANT_TURPIAL]]
- [[COLABORADORES/ESTADO_MANUEL]]
- [[COLABORADORES/ESTADO_JEAN]]
- [[ARQUITECTURA/HEPTACORE_SYSTEM_MAP]]

---

> **Ultima actualizacion:** 08/06/26 18:20 VET | **Estado:** S-HC-01 CERRADO | **Operador:** Manuel

## Cierre S-HC-XX - 2026-06-01

- Operador: Manuel
- Rama hija: `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01`
- Rama madre docs: `MADRE/v2-s-hc-xx-plan-holistico-turpial-jean-oauth-readiness-2026-06-01`
- Descripcion: plan holistico Turpial Jean OAuth readiness

## Cierre S-HC-01 - 2026-06-08

- Operador: Manuel
- Rama hija: `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01`
- Rama madre docs: `MADRE/v3-s-hc-01-closure-and-saas-oauth-foundation-2026-06-08`
- Descripcion: closure and saas oauth foundation
