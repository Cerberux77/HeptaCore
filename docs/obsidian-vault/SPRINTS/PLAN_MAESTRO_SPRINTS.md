---
type: sprint-plan
project: "HeptaCore"
last_updated: "2026-06-09T20:02:39.755Z"
mother_branch: "MADRE/v7-s-hc-05-approval-queue-human-gates-2026-06-09"
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
