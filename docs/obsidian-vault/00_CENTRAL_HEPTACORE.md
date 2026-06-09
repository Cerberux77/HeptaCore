---
type: master-dashboard
project: "HeptaCore"
status: active-foundation
phase: "Foundation: monorepo, agent core, landing, Prisma, worker and Turpial tenant seed"
last_updated: "09/06/26 16:17"
mother_branch: "MADRE/v10-s-hc-07-reports-dashboard-2026-06-09"
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

> **Ultima actualizacion:** 09/06/26 16:17 VET | **Estado:** S-HC-07 CERRADO | **Operador:** Jean

## Cierre S-HC-04 - 2026-06-09

- Operador: Jean
- Rama hija: `Jean/s-hc-00-onboarding-2026-06-09`
- Rama madre docs: `MADRE/v2-s-hc-04-auth-rbac-audit-2026-06-09`
- Descripcion: auth-rbac-audit

## Cierre S-HC-06 - 2026-06-09

- Operador: Jean
- Rama hija: `Jean/s-hc-00-onboarding-2026-06-09`
- Rama madre docs: `MADRE/v5-s-hc-06-worker-queue-bullmq-redis-2026-06-09`
- Descripcion: worker-queue-bullmq-redis

## Cierre S-HC-01 - 2026-06-09

- Operador: Jean
- Rama hija: `Jean/s-hc-00-onboarding-2026-06-09`
- Rama madre docs: `MADRE/v6-s-hc-01-console-dashboard-checklist-2026-06-09`
- Descripcion: console-dashboard-checklist

## Cierre S-HC-05 - 2026-06-09

- Operador: Jean
- Rama hija: `Jean/s-hc-00-onboarding-2026-06-09`
- Rama madre docs: `MADRE/v7-s-hc-05-approval-queue-human-gates-2026-06-09`
- Descripcion: approval-queue-human-gates

## Cierre S-HC-08 - 2026-06-09

- Operador: Jean
- Rama hija: `Jean/s-hc-00-onboarding-2026-06-09`
- Rama madre docs: `MADRE/v8-s-hc-08-meta-adapter-sandbox-mock-2026-06-09`
- Descripcion: meta-adapter-sandbox-mock

## Cierre S-HC-03 - 2026-06-09

- Operador: Jean
- Rama hija: `Jean/s-hc-00-onboarding-2026-06-09`
- Rama madre docs: `MADRE/v9-s-hc-03-strategy-runner-2026-06-09`
- Descripcion: strategy-runner

## Cierre S-HC-07 - 2026-06-09

- Operador: Jean
- Rama hija: `Jean/s-hc-00-onboarding-2026-06-09`
- Rama madre docs: `MADRE/v10-s-hc-07-reports-dashboard-2026-06-09`
- Descripcion: reports-dashboard
