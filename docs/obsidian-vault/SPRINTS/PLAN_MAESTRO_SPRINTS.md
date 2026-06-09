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
