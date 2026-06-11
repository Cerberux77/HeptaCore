---
type: collaborator-status
project: "HeptaCore"
operator: "Manuel"
last_updated: "2026-06-11T03:01:04.414Z"
generated_by: "Oreshnik canonical-check"
source: "var/oreshnik/task-board.json"
---

# Estado Manuel

> Documento derivado. La fuente operativa es `var/oreshnik/task-board.json`.

## Ready

| Sprint | Scope | Depende de |
|---|---|---|
| Ninguno | - | - |

## Pending

| Sprint | Scope | Depende de |
|---|---|---|
| S-HC-PROD-06 | Oreshnik operator dashboard and canonical task board | S-HC-PROD-02, S-HC-PROD-03, S-HC-PROD-04, S-HC-PROD-05, S-HC-PROD-07, S-HC-PROD-08, S-HC-PROD-09, S-HC-PROD-10, S-HC-PROD-11 |
| S-HC-PROD-10 | Paid ads management UI and tenant billing surface | S-HC-PROD-05, S-HC-PROD-09 |
| S-HC-RELEASE-01 | End-to-end Turpial Sound production proof | S-HC-PROD-02, S-HC-PROD-03, S-HC-PROD-04, S-HC-PROD-05, S-HC-PROD-06, S-HC-PROD-07, S-HC-PROD-08, S-HC-PROD-09, S-HC-PROD-10, S-HC-PROD-11 |

## Detalle de Aceptacion

### S-HC-PROD-06 - Oreshnik operator dashboard and canonical task board

Estado: `pending`

- Task board reflects PROD reality
- Operator dashboard/report shows current branch, mother, events and owners
- No stale Jean/Manuel sprint ambiguity remains
- Closeout process produces one canonical release handoff

Zonas: `scripts/oreshnik`, `var/oreshnik`, `var/sprint-events`, `docs`

### S-HC-PROD-10 - Paid ads management UI and tenant billing surface

Estado: `pending`

- Tenant can view campaign proposals, platform spend, 35 percent overhead and total charge
- Operator can approve/reject paid campaign proposal without triggering real spend
- Admin can see paid-growth status per tenant
- AuditLog records paid campaign approval decisions
- UI labels real spend as blocked until explicit production unlock

Zonas: `apps/web/components`, `apps/web/app/api`, `apps/web/lib/dashboard.ts`, `docs`

### S-HC-RELEASE-01 - End-to-end Turpial Sound production proof

Estado: `pending`

- Login works
- Sales landing and onboarding entry work
- Turpial tenant loads strategy and assets
- Draft can be edited before approval
- Draft approval works
- Dry-run publish proof works
- Paid ads proposal shows 35 percent overhead without real spend
- Paid scraper/discovery remains gated and documented
- AuditLog/report proves the action
- typecheck, build and worker:validate pass
- Real RRSS publish remains blocked unless explicitly unlocked

Zonas: `docs`, `apps/web`, `apps/worker`, `packages/integrations`

