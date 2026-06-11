---
type: sprint-plan
project: "HeptaCore"
last_updated: "2026-06-11T03:19:41.362Z"
mother_branch: "MADRE/v34-s-hc-release-01-e2e-turpial-sound-production-proof-2026-06-11"
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

## Ruta Critica Hoy - Turpial

| Gate | Estado | Owner | Cierre |
|---|---|---|---|
| Cola y assets | PASS | Manuel | `npm run worker:validate` muestra 29/29 y 46/46 |
| UI operativa | Parcial | Manuel | Cards llevan a cola, pendientes, drafts, assets y calendario |
| OAuth readiness | Pendiente `.env.rrss` | Jean | `npm run worker:meta:readiness` PASS |
| DB persistente | Pendiente | Jean | Seed Turpial en Prisma + service layer |
| Approval persistente | Pendiente | Manuel + Jean | Acciones guardan en DB + audit log |
| Publicacion real | Bloqueada por hard stop | Manuel + Jean | Aprobacion explicita, rollback y primer post bajo riesgo |

## Control Bus 2026-06-09

| Sprint | Owner | Estado | Resultado esperado |
|---|---|---|---|
| S-HC-CTRL-01 | Manuel | En curso | Control Bus formalizado y Jean listo para discovery/dry-run |
| S-HC-CTRL-02 | Manuel | En curso | Corregir autoridad: Oreshnik asigna workload |
| S-HC-PUB-01 | Pendiente Oreshnik | Candidato | Validar conexiones, assets y dry-run sin publicar si Oreshnik asigna |

## Actualizacion S-HC-01 / S-HC-02 / S-HC-06 - 2026-06-08

| Sprint | Estado | Resultado |
|---|---|---|
| S-HC-01 | Listo para cierre | Production URL y callback temporal documentados; build/typecheck/worker validate PASS |
| S-HC-02 | Foundation iniciado | Prisma SaaS extendido para `Tenant`, `User`, `TenantMember`, `Invitation`, OAuth, brand/strategy/content/publishing |
| S-HC-06 | Foundation iniciado | Instagram login URL y callback con code exchange seguro; storage bloqueado hasta encryption/vault |

Bloqueos activos:

- No guardar tokens OAuth hasta implementar `ENCRYPTION_KEY` y vault adapter.
- No crear primer admin hasta completar password hashing y sesiones.
- No publicar RRSS reales hasta Meta readiness, aprobacion humana y levantamiento explicito del hard stop.
- No aplicar migracion en Production sin review de `20260608221500_init_saas_tenants_auth_oauth_content`.

## Asignacion Activa — 2026-06-09 15:25 VET

### Sprints con CLOSURE (push + MADRE + sprint-event)

| Sprint | Owner | Rama | Madre | Estado |
|---|---|---|---|---|
| S-HC-XX | Manuel | `Manuel/s-hc-xx...` | MADRE/v2 | CERRADO |
| S-HC-01 | Manuel | `Manuel/s-hc-xx...` | MADRE/v3, v4 | CERRADO |
| S-HC-CTRL-01 | Manuel | `Manuel/s-hc-xx...` | MADRE/v5 | CERRADO |
| S-HC-CTRL-02 | Manuel | `Manuel/s-hc-xx...` | MADRE/v6 | CERRADO |
| S-HC-CTRL-03 | Manuel | `Manuel/s-hc-xx...` | MADRE/v7 | CERRADO |
| S-HC-PROD-00 | Manuel | `Manuel/s-hc-xx...` | MADRE/v8 | CERRADO |

### Sprints SIN closure (trabajo local de Jean, invisible en repo)

| Sprint | Owner reportado | Rama en repo | Commits en repo | Requiere |
|---|---|---|---|---|
| S-HC-02 | Jean | **NO EXISTE** | **CERO** | `oreshnik:close --push` |
| S-HC-04 | Jean | **NO EXISTE** | **CERO** | `oreshnik:preflight` → commit → `oreshnik:close --push` |

**Causa**: Jean trabaja localmente sin ejecutar el script de cierre que el modelo TurpialSound exige. Sin closure: sin MADRE, sin visibilidad, sin avance documentado.

### Proximos sprints (dependen de S-HC-04)

| Sprint | Owner | Depende de | Estado |
|---|---|---|---|
| S-HC-PROD-02 | Manuel | S-HC-04 (Jean) | depends_on |
| S-HC-PROD-03 | Jean | S-HC-PROD-00 | assigned |
| S-HC-PROD-04 | Jean | S-HC-PROD-02 + S-HC-PROD-03 | depends_on |
| S-HC-PROD-05 | Jean | S-HC-PROD-04 + S-HC-PROD-06 | depends_on |
| S-HC-PROD-06 | Manuel | S-HC-PROD-02 | depends_on |
| S-HC-PUB-01 | Jean | PROD-01 al 06 | depends_on |

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
