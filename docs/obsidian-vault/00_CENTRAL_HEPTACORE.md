---
type: master-dashboard
project: "HeptaCore"
status: mvp-technical-preproduction
phase: "MVP tecnico pre-produccion: web console, auth, approvals, reports, readiness, worker dry-run and Turpial tenant seed"
last_updated: "2026-06-09"
mother_branch: "MADRE/v14-integration-all-code-2026-06-09"
production_branch: "master"
production_commit_detected: "000ce31"
production_url: "https://heptacore.vercel.app"
tags:
  - "#central"
  - "#status/live-source"
  - "#manuel"
  - "#jean"
  - "#heptacore"
---

# HeptaCore - Dashboard Canonico

> Documento canonico. Si hay conflicto entre documentos, este manda hasta que se cierre un sprint con Oreshnik.

## Estado Actual

HeptaCore ya no se considera foundation pura. El repositorio esta en MVP tecnico pre-produccion.

| Area | Estado |
|---|---|
| Base productiva/pre-productiva | `master` / `origin/master` |
| Commit productivo detectado | `000ce31` |
| URL Vercel | `https://heptacore.vercel.app` |
| Tenant piloto | `turpial-sound` |
| Web console | Implementada con login, dashboard, queue, checklist, reportes y readiness |
| Auth/RBAC/Audit | Implementado como baseline con Auth.js credentials, memberships y audit log |
| Prisma schema | Implementado y validado |
| Worker RRSS | Codigo BullMQ/Redis + dry-run existente |
| Meta adapters | Solo mock/sandbox |
| Publicacion RRSS real | Bloqueada por diseno |
| Campanas pagas | Bloqueadas por diseno |
| Scraping real | Bloqueado por diseno |

## Rama Madre y Ramas Hijas

| Tipo | Convencion | Uso |
|---|---|---|
| Base productiva/pre-productiva | `master` | Rama desplegable actual |
| Madre docs/integracion | `MADRE/vN-sprint-desc-fecha` | Documentacion y/o integracion generada por Oreshnik |
| Madre vigente detectada | `MADRE/v14-integration-all-code-2026-06-09` | Integracion de codigo + docs |
| Hija Manuel | `Manuel/sprint-desc-fecha` | Trabajo de Manuel |
| Hija Jean | `Jean/sprint-desc-fecha` | Trabajo de Jean |

## Sprints Cerrados

| Sprint | Estado | Scope |
|---|---|---|
| S-HC-00 | Cerrado | Foundation baseline |
| S-HC-01 | Cerrado | Console dashboard, onboarding/checklist, draft queue |
| S-HC-02 | Cerrado | Turpial importer and Prisma seed |
| S-HC-03 | Cerrado | Strategy runner |
| S-HC-04 | Cerrado | Auth, RBAC, tenant guards, audit baseline |
| S-HC-05 | Cerrado | Approval queue and human gates |
| S-HC-06 | Cerrado | Worker queue BullMQ/Redis + dry-run jobs |
| S-HC-07 | Cerrado | Reports dashboard |
| S-HC-08 | Cerrado | Meta adapter sandbox/mock |
| S-HC-09 | Cerrado | Publish readiness gate |

## Pendientes y Bloqueos

| Prioridad | Item | Estado | Nota |
|---|---|---|---|
| P0 | Configurar env productivo/pre-productivo | Pendiente | DB, Auth.js, URL canonica y encryption fuera de git |
| P0 | Migraciones + seed en DB productiva | Pendiente | Admin y tenant `turpial-sound` deben existir en la DB real |
| P0 | Worker hosting persistente | Pendiente | BullMQ necesita Redis y proceso fuera de Vercel serverless |
| P0 | S-HC-PUB-01 dry-run desde UI | Pendiente | Un draft aprobado, sin publicar real |
| P0 | Publicacion RRSS real | Bloqueada | Requiere aprobacion explicita, adapters reales, credenciales oficiales y rollback |
| P1 | Migrar `middleware.ts` a `proxy` | Pendiente | Next 16 lo recomienda; build actual pasa |
| P1 | Observability worker/web | Pendiente | Logs operativos y alertas |
| P2 | WhatsApp reports | Pendiente | Solo despues de estabilizar pre-produccion |

## Reglas Activas

- No publicar en redes reales desde HeptaCore sin aprobacion explicita.
- No conectar adapters reales de Meta en tareas de alineacion documental.
- No pedir, mostrar ni commitear credenciales reales.
- No ejecutar scraping real.
- No gastar en campanas.
- No trabajar directo en ramas madre salvo flujos Oreshnik de cierre/sync.
- No cerrar sprint sin actualizar vault, task board y validaciones.
- No usar Vercel serverless como worker persistente BullMQ.

## Validaciones Base

| Check | Comando | Estado esperado |
|---|---|---|
| TypeScript | `npm run typecheck` | PASS |
| Build | `npm run build` | PASS |
| Worker Turpial | `npm run worker:validate` | PASS, 29/29 drafts y 46/46 assets |
| Prisma validate | `npx prisma validate --schema packages/db/prisma/schema.prisma` | PASS |
| Diff hygiene | `git diff --check` | PASS |

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
- [[PRODUCT/STATUS_BOARD]]
- [[PRODUCT/AUDITORIA_HOLISTICA_2026-06-09]]
- [[PRODUCT/POSTMORTEM_2026-06-09_VERCEL_BUILD]]

---

Ultima actualizacion: 2026-06-09 | Operador: Jean | Sprint: canonical alignment | Rama: `Jean/s-hc-canonical-alignment-2026-06-09`
