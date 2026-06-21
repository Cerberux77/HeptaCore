---
type: sprint-plan
project: "HeptaCore"
last_updated: "2026-06-21T04:30:00.000Z"
mother_branch: "MADRE/v44-s-hc-maint-align-01-qa-review-fixes-de-11-tareas-jean-sistema-de-pub-2026-06-14"
tags:
  - "#sprints"
  - "#manuel"
  - "#heptacore"
  - "#production-stable"
---

# Plan Maestro de Sprints HeptaCore

## Foundation

| Sprint | Owner | Scope | Estado |
|---|---|---|---|
| S-HC-00 | Manuel | Monorepo, landing, worker, Prisma, Turpial seed, vault, Oreshnik | En curso |

## MVP Recomendado

| Sprint | Owner sugerido | Scope | Criterio de cierre |
|---|---|---|---|
| S-HC-01 | Manuel | Console shell: tenant dashboard, onboarding, checklist, draft queue UI | Build PASS + UI navegable |
| S-HC-02 | Jean | Prisma seed/importer Turpial + DB service layer | Seed local documentado + typecheck PASS |
| S-HC-03 | Manuel | Agent strategy runner: intake -> network priority -> checklist -> drafts | Outputs persistibles |
| S-HC-04 | Jean | Auth + tenant permissions + audit log baseline | Login/roles funcionales |
| S-HC-05 | Manuel | Approval queue + human gates | Draft approve/reject funcional |
| S-HC-06 | Jean | Worker queue BullMQ/Redis + dry-run jobs | Jobs trazables |
| S-HC-07 | Manuel | Reports dashboard + daily summary | Reporte demo Turpial |
| S-HC-08 | Ambos | Meta adapter sandbox design | No credenciales reales |
| S-HC-09 | Manuel | First tenant publish readiness gate | Dry-run + approvals + rollback plan |

## Paralelizacion

Ver [[PLAN_PARALELO_MANUEL_JEAN]] para distribucion de carga, backups y reasignacion.

## Backlog

| Item | Owner | Prioridad |
|---|---|---|
| Definir proveedor auth | Ambos | P0 |
| Definir DB local/hospedada | Ambos | P0 |
| Definir LLM provider adapter | Ambos | P0 |
| Completar brand assets | Manuel | P1 |
| Diseñar pricing/billing | Manuel | P1 |
| Observability | Jean | P1 |
| WhatsApp reports | Jean | P2 |
| Paid scraper compliance | Ambos | P2 |


## Cierre S-HC-04 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Jean/s-hc-00-onboarding-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v2-s-hc-04-auth-rbac-audit-2026-06-09` |
| Descripcion | auth-rbac-audit |


## Cierre S-HC-04 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Jean/s-hc-00-onboarding-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v3-s-hc-04-auth-rbac-audit-2026-06-09` |
| Descripcion | auth-rbac-audit |


## Cierre S-HC-04 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Jean/s-hc-00-onboarding-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v4-s-hc-04-auth-rbac-audit-2026-06-09` |
| Descripcion | auth-rbac-audit |


## Cierre S-HC-06 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Jean/s-hc-00-onboarding-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v5-s-hc-06-worker-queue-bullmq-redis-2026-06-09` |
| Descripcion | worker-queue-bullmq-redis |


## Cierre S-HC-01 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Jean/s-hc-00-onboarding-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v6-s-hc-01-console-dashboard-checklist-2026-06-09` |
| Descripcion | console-dashboard-checklist |


## Cierre S-HC-05 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Jean/s-hc-00-onboarding-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v7-s-hc-05-approval-queue-human-gates-2026-06-09` |
| Descripcion | approval-queue-human-gates |


## Cierre S-HC-08 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Jean/s-hc-00-onboarding-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v8-s-hc-08-meta-adapter-sandbox-mock-2026-06-09` |
| Descripcion | meta-adapter-sandbox-mock |


## Cierre S-HC-03 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Jean/s-hc-00-onboarding-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v9-s-hc-03-strategy-runner-2026-06-09` |
| Descripcion | strategy-runner |


## Cierre S-HC-07 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Jean/s-hc-00-onboarding-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v10-s-hc-07-reports-dashboard-2026-06-09` |
| Descripcion | reports-dashboard |


## Cierre S-HC-09 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Jean/s-hc-00-onboarding-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v11-s-hc-09-publish-readiness-gate-2026-06-09` |
| Descripcion | publish-readiness-gate |
---
type: sprint-plan
project: "HeptaCore"
last_updated: "2026-06-09T18:20:36.168Z"
mother_branch: "MADRE/v8-s-hc-prod-00-product-audit-and-sprint-allocation-for-turpial--2026-06-09"
tags:
  - "#sprints"
  - "#manuel"
  - "#jean"
---

# Plan Maestro de Sprints HeptaCore

## Foundation

| Sprint | Owner | Scope | Estado |
|---|---|---|---|
| S-HC-00 | Manuel | Monorepo, landing, worker, Prisma, Turpial seed, vault, Oreshnik | En curso |

## MVP Recomendado

| Sprint | Owner sugerido | Scope | Criterio de cierre |
|---|---|---|---|
| S-HC-CTRL-01 | Manuel | Validar Control Bus/Oreshnik, onboarding Jean y preparar S-HC-PUB-01 | Docs control + onboarding + handoff + validaciones |
| S-HC-PUB-01 | Pendiente Oreshnik | Turpial Sound first controlled publishing test: discovery + dry-run + comando preparado | No publish; Oreshnik assignment packet + candidate + command + handoff |
| S-HC-01 | Manuel | Console shell: tenant dashboard, cards clickeables, draft queue, assets y calendario MVP | Build PASS + UI navegable |
| S-HC-02 | Jean | Prisma seed/importer Turpial + DB service layer | Seed local documentado + typecheck PASS |
| S-HC-02A | Jean | Meta OAuth readiness local + secret handling operativo | `npm run worker:meta:readiness` PASS sin tokens en git |
| S-HC-03 | Manuel | Agent strategy runner: intake -> network priority -> checklist -> drafts | Outputs persistibles |
| S-HC-04 | Jean | Auth + tenant permissions + audit log baseline | Login/roles funcionales |
| S-HC-05 | Manuel | Approval queue + human gates | Draft approve/reject funcional |
| S-HC-06 | Jean | Worker queue BullMQ/Redis + dry-run jobs | Jobs trazables |
| S-HC-07 | Manuel | Reports dashboard + daily summary | Reporte demo Turpial |
| S-HC-08 | Ambos | Meta adapter sandbox design | Credenciales solo en `.env.rrss` local/secret manager; no git |
| S-HC-09 | Manuel | First tenant publish readiness gate | Dry-run + approvals + rollback plan |

## Ruta Critica Hoy — 2026-06-21

| Gate | Estado | Owner | Cierre |
|---|---|---|---|
| Cola y assets | PASS | Manuel | `npm run worker:validate` |
| UI operativa | PASS | Manuel | Cards navegables, publicacion, assets, calendario, dashboard |
| Facebook Page | PRODUCTION | Manuel | Token permanente, publicacion real desde UI, durabilidad transaccional |
| Instagram | PRODUCTION | Manuel | Publicacion real desde UI, media container readiness, durabilidad transaccional |
| OAuth readiness | PASS | Manuel | Facebook y Instagram OAuth con token vault AES-256-GCM |
| Publicacion real | OPERATIVA | Manuel | Facebook e Instagram publican desde la UI. 156 tests. IN_REVIEW → PUBLISHED con rollback. |
| Errores ambiguos | BLOQUEADOS SIN RETRY | Manuel | Reconciliacion manual requerida. Job queda IN_REVIEW. |

## Control Bus 2026-06-09 — COMPLETADO HISTORICO

| Sprint | Owner | Estado | Resultado esperado |
|---|---|---|---|
| S-HC-CTRL-01 | Manuel | CERRADO | Control Bus formalizado |
| S-HC-CTRL-02 | Manuel | CERRADO | Oreshnik asigna workload |
| S-HC-PUB-01 | Manuel | CERRADO | Primer post real publicado en Facebook e Instagram |

## Actualizacion REC-00A — 2026-06-21

| Sprint | Estado | Resultado |
|---|---|---|
| S-HC-REC-00A | CERRADO | Baseline de publicacion recuperado y estabilizado en `2fd9e249`. Facebook e Instagram operativos. |
| S-HC-REC-00B | CANCELADO | Duplicado en Facebook eliminado manualmente por Manuel. |
| S-HC-REC-00C | EN CURSO | Integracion canonica. |

Bloqueos resueltos:
- Tokens OAuth almacenados con `ENCRYPTION_KEY` y token vault (AES-256-GCM).
- Publicacion RRSS real operativa desde la UI con aprobacion y durabilidad transaccional.
- Migracion aplicada en produccion.

## Asignacion Activa — 2026-06-21 04:30 UTC

### Sprints con CLOSURE (push + MADRE + sprint-event)

| Sprint | Owner | Rama | Madre | Estado |
|---|---|---|---|---|
| S-HC-REC-00A | Manuel | `manuel/s-hc-rec-00a-ui-publishing-baseline` | — | CERRADO |
| S-HC-REC-00B | Manuel | — | — | CANCELADO |

### Sprints EN CURSO

| Sprint | Owner | Rama | Requiere |
|---|---|---|---|
| S-HC-REC-00C | Manuel | `manuel/s-hc-rec-00c-canonical-integration` | typecheck + test + build + worker:validate |

### Proximos sprints

| Sprint | Owner | Depende de | Estado |
|---|---|---|---|
| S-HC-PUB-02-MULTIFORMAT | Manuel | S-HC-REC-00C | pending |
| S-HC-PROD-06 | Manuel | S-HC-PUB-02 | pending |

### Jean — Fuera de Ruta Critica

Jean queda fuera de la ruta critica. Sus responsabilidades pendientes se reasignan temporalmente a Manuel y al agente principal hasta nuevo aviso de Oreshnik o decision del Arquitecto. Zonas transferidas:
- `apps/worker/**` → Manuel (lectura/escritura)
- `packages/integrations/**` → Manuel + agente principal (doble lock)
- `packages/db/**` → Manuel + agente principal (doble lock)
- `apps/web/app/login/**` → Manuel
- `apps/web/lib/tenant-auth.ts` → Manuel
- Scripts OAuth (`scripts/verify-turpial-*.mjs`) → Manuel

## Paralelizacion

Ver [[PLAN_PARALELO_MANUEL_JEAN]] para distribucion de carga, backups y reasignacion.

## Backlog

| Item | Owner | Prioridad |
|---|---|---|
| Definir proveedor auth | Ambos | P0 |
| Definir DB local/hospedada | Ambos | P0 |
| Definir LLM provider adapter | Ambos | P0 |
| Completar brand assets | Manuel | P1 |
| Diseñar pricing/billing | Manuel | P1 |
| Observability | Jean | P1 |
| WhatsApp reports | Jean | P2 |
| Paid scraper compliance | Ambos | P2 |


## Cierre S-HC-XX - 2026-06-01

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01` |
| Estado | CERRADO |
| Madre docs | `MADRE/v2-s-hc-xx-plan-holistico-turpial-jean-oauth-readiness-2026-06-01` |
| Descripcion | plan holistico Turpial Jean OAuth readiness |


## Cierre S-HC-01 - 2026-06-08

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01` |
| Estado | CERRADO |
| Madre docs | `MADRE/v3-s-hc-01-closure-and-saas-oauth-foundation-2026-06-08` |
| Descripcion | closure and saas oauth foundation |


## Cierre S-HC-01 - 2026-06-08

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01` |
| Estado | CERRADO |
| Madre docs | `MADRE/v4-s-hc-01-closure-and-saas-oauth-foundation-2026-06-08` |
| Descripcion | closure and saas oauth foundation |


## Cierre S-HC-CTRL-01 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01` |
| Estado | CERRADO |
| Madre docs | `MADRE/v5-s-hc-ctrl-01-validate-oreshnik-control-bus-onboard-jean-and-p-2026-06-09` |
| Descripcion | Validate Oreshnik Control Bus, onboard Jean, and prepare first controlled publishing sprint |


## Cierre S-HC-CTRL-02 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01` |
| Estado | CERRADO |
| Madre docs | `MADRE/v6-s-hc-ctrl-02-make-oreshnik-responsible-for-task-allocation-2026-06-09` |
| Descripcion | Make Oreshnik responsible for task allocation |


## Cierre S-HC-CTRL-03 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01` |
| Estado | CERRADO |
| Madre docs | `MADRE/v7-s-hc-ctrl-03-replicate-turpial-sound-oreshnik-allocation-mode-2026-06-09` |
| Descripcion | Replicate Turpial Sound Oreshnik allocation model |


## Cierre S-HC-PROD-00 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01` |
| Estado | CERRADO |
| Madre docs | `MADRE/v8-s-hc-prod-00-product-audit-and-sprint-allocation-for-turpial--2026-06-09` |
| Descripcion | Product audit and sprint allocation for Turpial proof |


## Cierre S-HC-PROD-01 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v15-s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Descripcion | producto operativo tenant admin produccion |


## Cierre S-HC-PROD-01 - 2026-06-09

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v16-s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Descripcion | producto operativo tenant admin produccion |


## Cierre S-HC-PROD-ALIGN - 2026-06-10

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v17-s-hc-prod-align-alineacion-oreshnik-middleware-manual-usuario-2026-06-10` |
| Descripcion | alineacion oreshnik middleware manual usuario |


## Cierre S-HC-MAINT-ALIGN-01 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v18-s-hc-maint-align-01-alineacion-definitiva-task-board-docs-derivados-2026-06-11` |
| Descripcion | alineacion definitiva task board docs derivados |


## Cierre S-HC-MAINT-PUSH-01 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v19-s-hc-maint-push-01-closure-push-obligatorio-2026-06-11` |
| Descripcion | closure push obligatorio |


## Cierre S-HC-MAINT-SYNC-01 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v20-s-hc-maint-sync-01-preflight-remote-sync-obligatorio-2026-06-11` |
| Descripcion | preflight remote sync obligatorio |


## Cierre S-HC-PROD-02 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Jean/s-hc-canonical-alignment-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v21-s-hc-prod-02-production-db-auth-env-turpial-seed-smoke-2026-06-11` |
| Descripcion | production-db-auth-env-turpial-seed-smoke |


## Cierre S-HC-PROD-04 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Jean/s-hc-canonical-alignment-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v22-s-hc-prod-04-worker-redis-persistent-dryrun-processing-2026-06-11` |
| Descripcion | worker-redis-persistent-dryrun-processing |


## Cierre S-HC-PROD-09 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Jean/s-hc-canonical-alignment-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v23-s-hc-prod-09-paid-ads-campaign-engine-35pct-overhead-gate-2026-06-11` |
| Descripcion | paid-ads-campaign-engine-35pct-overhead-gate |


## Cierre S-HC-PROD-11 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Jean/s-hc-canonical-alignment-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v24-s-hc-prod-11-paid-scraper-compliance-controlled-discovery-ada-2026-06-11` |
| Descripcion | paid-scraper-compliance-controlled-discovery-adapter |


## Cierre S-HC-MAINT-CLOSE-GATE-01 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v25-s-hc-maint-close-gate-01-cierre-automatico-con-validaciones-2026-06-11` |
| Descripcion | cierre automatico con validaciones |


## Cierre S-HC-MAINT-MOTHER-SYNC-01 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v26-s-hc-maint-mother-sync-01-sync-automatico-de-madres-canonicas-2026-06-11` |
| Descripcion | sync automatico de madres canonicas |


## Cierre S-HC-MAINT-CLOSE-SPAWN-01 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v27-s-hc-maint-close-spawn-01-limpiar-warning-cierre-spawn-2026-06-11` |
| Descripcion | limpiar warning cierre spawn |


## Cierre S-HC-PROD-03 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v28-s-hc-prod-03-llm-provider-adapter-plus-turpial-tenant-qa-ux-p-2026-06-11` |
| Descripcion | LLM provider adapter plus Turpial tenant QA UX polish |


## Cierre S-HC-PROD-05 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v29-s-hc-prod-05-publishing-gate-ui-auditlog-and-rollback-proof-2026-06-11` |
| Descripcion | Publishing gate UI AuditLog and rollback proof |


## Cierre S-HC-PROD-07 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v30-s-hc-prod-07-sales-landing-client-onboarding-and-login-entry-2026-06-11` |
| Descripcion | Sales landing client onboarding and login entry |


## Cierre S-HC-PROD-08 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v31-s-hc-prod-08-draft-editor-and-post-modification-workflow-2026-06-11` |
| Descripcion | Draft editor and post modification workflow |


## Cierre S-HC-PROD-10 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v32-s-hc-prod-10-paid-ads-management-ui-and-tenant-billing-surfac-2026-06-11` |
| Descripcion | Paid ads management UI and tenant billing surface |


## Cierre S-HC-PROD-06 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v33-s-hc-prod-06-oreshnik-operator-dashboard-and-canonical-task-b-2026-06-11` |
| Descripcion | Oreshnik operator dashboard and canonical task board |


## Cierre S-HC-RELEASE-01 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v34-s-hc-release-01-e2e-turpial-sound-production-proof-2026-06-11` |
| Descripcion | E2E Turpial Sound production proof |


## Cierre S-HC-RELEASE-02 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v35-s-hc-release-02-producto-operativo-completo-2026-06-11` |
| Descripcion | producto-operativo-completo |


## Cierre S-HC-RELEASE-02 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v36-s-hc-release-02-preview-redes-reemplazo-assets-2026-06-11` |
| Descripcion | preview-redes-reemplazo-assets |


## Cierre S-HC-RELEASE-02 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v37-s-hc-release-02-pricing-overhead-cost-tracking-2026-06-11` |
| Descripcion | pricing-overhead-cost-tracking |


## Cierre S-HC-RELEASE-02 - 2026-06-11

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v38-s-hc-release-02-trial-payment-cta-qa-bot-cost-table-2026-06-11` |
| Descripcion | trial-payment-cta-qa-bot-cost-table |

---

# S-HC-RELEASE-02 — Desglose por Sprints (80/20 Pareto)

> Auditado 2026-06-11 19:25. Rama `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09`.
> Merge a master: `afb9b66`. Deploy Vercel: `JEiQXu0r2sPnC0X8f2TT`.

## Sprint 1/11: S-HC-PROD-HS — Hard stops + Autopilot
| Campo | Valor |
|---|---|
| Operador | **Manuel** |
| Pareto | 80% valor |
| Archivos | `publish/route.ts`, `dashboard-console.tsx`, `admin-console.tsx`, `.env.example`, Vercel env |
| QA Manual | Vista Publicacion → verificar toggle dry-run/live → publicar 1 post real → status PUBLISHED |

## Sprint 2/11: S-HC-PROD-AUTH — Registro + Recovery
| Campo | Valor |
|---|---|
| Operador | **Manuel** |
| Pareto | 80% valor |
| Archivos | `register/page.tsx`, `recover/page.tsx`, `reset-password/page.tsx`, `api/auth/register`, `api/auth/recover`, `api/auth/reset-password`, `api/invitations`, `login/page.tsx`, `middleware.ts` |
| QA Manual | Admin crea invitacion → usuario se registra con token → login → recover password → reset → login |

## Sprint 3/11: S-HC-PROD-LLM — LLM Config + Pricing
| Campo | Valor |
|---|---|
| Operador | **Manuel** |
| Pareto | 60% valor |
| Archivos | `schema.prisma` (llmConfig+costConfig), `api/admin/llm-config`, `api/strategy/generate`, `api/strategy/update`, `admin-console.tsx`, `dashboard-console.tsx`, `llm-adapter.ts`, `pricing.ts`, `core/src/index.ts` |
| QA Manual | Admin setea provider+modelo+overhead → Dashboard genera estrategia → verifica costo y JSON |

## Sprint 4/11: S-HC-PROD-CAL — Calendario + Hora
| Campo | Valor |
|---|---|
| Operador | **Manuel** |
| Pareto | 40% valor |
| Archivos | `dashboard-console.tsx` (vistas lista/semana/mes), `lib/dashboard.ts` (datetime) |
| QA Manual | Vista Cronograma → toggle Semana/Mes → verificar hora y posts en cada dia |

## Sprint 5/11: S-HC-PROD-STRAT — Estrategia editable + Generacion IA
| Campo | Valor |
|---|---|
| Operador | **Manuel** |
| Pareto | 60% valor |
| Archivos | `dashboard-console.tsx`, `api/strategy/update` |
| QA Manual | Vista Estrategia → editar nombre/oferta/voz → guardar → recargar → verificar persistencia |

## Sprint 6/11: S-HC-PROD-QUEUE — Reorden + Edicion visible
| Campo | Valor |
|---|---|
| Operador | **Manuel** |
| Pareto | 40% valor |
| Archivos | `dashboard-console.tsx` (EDITAR+▲▼), `api/drafts/reorder`, `schema.prisma` (sortOrder) |
| QA Manual | Vista Cola → click EDITAR → modificar titulo → guardar → click ▲▼ → verificar reorden |

## Sprint 7/11: S-HC-PROD-ASSETS — Assets specs + Reemplazo
| Campo | Valor |
|---|---|
| Operador | **Manuel** |
| Pareto | 40% valor |
| Archivos | `dashboard-console.tsx` (specs+reemplazar), `api/drafts/[id]/asset`, `scripts/fix-asset-links.mjs` |
| QA Manual | Vista Activos → ver specs → seleccionar draft → Reemplazar asset → verificar cambio de preview y status |

## Sprint 8/11: S-HC-PROD-PREVIEW — Preview red social
| Campo | Valor |
|---|---|
| Operador | **Manuel** |
| Pareto | 20% valor |
| Archivos | `dashboard-console.tsx` (platform-preview, getPlatformFrameClass) |
| QA Manual | Vista Overview → ver frame IG/FB con imagen + caption. Vista Cola → selec draft → misma verificacion |

## Sprint 9/11: S-HC-PROD-TRIAL — Trial gate + Pago CTA + QA Bot
| Campo | Valor |
|---|---|
| Operador | **Manuel** |
| Pareto | 60% valor |
| Archivos | `lib/trial.ts`, `publish/route.ts` (trial gate), `tenant/[slug]/page.tsx`, `dashboard-console.tsx` (banner+modal), `assistant-fab.tsx`, `global-assistant.tsx`, `layout.tsx`, `api/assistant`, `docs/qa/heptacore-knowledge.md` |
| QA Manual | Publicar 2 posts en IG → ver banner rojo → Activar plan → ver modal pago → WhatsApp → asistente FAB responde preguntas |

## Sprint 10/11: S-HC-JEAN-ALIGN — Oreshnik + Worker (Jean)
| Campo | Valor |
|---|---|
| Operador | **Jean** |
| Pareto | Crítico — infraestructura |
| Archivos | `scripts/oreshnik/obsidian-guard.mjs`, `preflight.mjs`, `close-sprint.mjs`, `zone-check.mjs`, `zone-map.json`, `package.json` |
| QA Manual (Jean) | `npm run oreshnik:obsidian-guard -- --force` → PASS. `npm run worker:validate` → 29/29, 46/46. `npm run typecheck` → todos PASS |

## Sprint 11/11: S-HC-PROD-LANDING — Landing page
| Campo | Valor |
|---|---|
| Operador | **Manuel** |
| Pareto | 20% valor |
| Archivos | `app/page.tsx`, `app/globals.css` (landing CSS block) |
| QA Manual | Abrir `/` sin sesion → hero full-screen + stats + features + steps + pricing + contacto + footer + asistente FAB |

---

## Comando de alineacion para Jean

```bash
git fetch origin
git checkout Jean/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09
git pull origin Jean/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09
git merge origin/MADRE/v38-s-hc-release-02-trial-payment-cta-qa-bot-cost-table-2026-06-11 -m "align: S-HC-RELEASE-02 desde MADRE/v38"
npm run typecheck
npm run worker:validate
npm run oreshnik:obsidian-guard -- --force
npm run oreshnik:preflight -- --sprint S-HC-JEAN-ALIGN --operator Jean --desc "alineacion-sprint-10-oreshnik-worker"
```


## Cierre S-HC-JEAN-ALIGN - 2026-06-12

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Jean/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v39-s-hc-jean-align-oreshnik-worker-alignment-2026-06-12` |
| Descripcion | oreshnik-worker-alignment |


## Cierre S-HC-PROD-01 - 2026-06-12

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v40-s-hc-prod-01-proxy-next-js-16-middleware-landing-premium-hc-d-2026-06-12` |
| Descripcion | proxy Next.js 16 middleware, landing premium hc-dark, brand asset package regen |


## Cierre S-HC-00 - 2026-06-12

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v41-s-hc-00-foundation-baseline-commit-2026-06-12` |
| Descripcion | foundation baseline commit |


## Cierre S-HC-02 - 2026-06-12

| Campo | Valor |
|---|---|
| Operador | Jean |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v42-s-hc-02-turpial-importer-and-prisma-seed-2026-06-12` |
| Descripcion | turpial importer and prisma seed |


## Cierre S-HC-PROD-01 - 2026-06-12

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09` |
| Estado | CERRADO |
| Madre docs | `MADRE/v43-s-hc-prod-01-drift-system-2026-06-12` |
| Descripcion | drift system |


## Cierre S-HC-MAINT-ALIGN-01 - 2026-06-14

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Architect/jean-pendientes-2026-06-14-jean-tiene-11-tareas-ready-para-revision-2026-06-14` |
| Estado | CERRADO |
| Madre docs | `MADRE/v44-s-hc-maint-align-01-qa-review-fixes-de-11-tareas-jean-sistema-de-pub-2026-06-14` |
| Descripcion | QA review + fixes de 11 tareas Jean, sistema de publicacion 3 modos, 24 crons Vercel Hobby compatibles, cron publisher idempotente |


## Cierre S-HC-REC-00A — 2026-06-21

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `manuel/s-hc-rec-00a-ui-publishing-baseline` |
| Estado | CERRADO |
| SHA produccion | `2fd9e24929ffe1022cf9521ed0f13888f30accbd` |
| Deployment | `heptacore.vercel.app` |
| Descripcion | Baseline de publicacion recuperado y estabilizado. Facebook e Instagram publican realmente desde la UI. Errores ambiguos bloqueados sin retry automatico. 156 tests. Estado transaccional IN_REVIEW → PUBLISHED validado. |

## Cancelacion S-HC-REC-00B — 2026-06-21

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Estado | CANCELADO |
| Motivo | Manuel elimino manualmente el duplicado en Facebook. No requiere sprint de codigo. |

## En Curso S-HC-REC-00C — 2026-06-21

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Rama | `Manuel/s-hc-rec-00c-canonical-integration` |
| Estado | EN CURSO |
| Scope | Integracion canonica del baseline productivo en rama revisable. Actualizacion de documentacion del repositorio. |
| Depende de | S-HC-REC-00A |

## Siguiente Fase: Publicacion Multiformato

**S-HC-PUB-02-MULTIFORMAT-PREVIEW**

| Campo | Valor |
|---|---|
| Operador | Manuel |
| Estado | PENDIENTE |
| Scope | Instagram Carousel, Instagram Stories, asset manifest, validacion de assets, preview visual por plataforma, Facebook preview, reutilizacion de idempotencia y durabilidad |
| Depende de | S-HC-REC-00C |

## Reasignacion Temporal Jean

Jean queda fuera de la ruta critica. Responsabilidades pendientes reasignadas temporalmente a Manuel y al agente principal:
- `apps/worker/**` → Manuel (lectura/escritura)
- `packages/integrations/**` → Manuel + agente principal (doble lock)
- `packages/db/**` → Manuel + agente principal (doble lock)
- `apps/web/app/login/**` → Manuel
- `apps/web/lib/tenant-auth.ts` → Manuel
- Scripts de verificacion OAuth (`scripts/verify-turpial-*.mjs`) → Manuel
