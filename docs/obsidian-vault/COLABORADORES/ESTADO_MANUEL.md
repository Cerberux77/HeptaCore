---
type: collaborator-status
project: "HeptaCore"
operator: "Manuel"
last_updated: "2026-06-11T01:16:33.712Z"
generated_by: "Oreshnik canonical-check"
source: "var/oreshnik/task-board.json"
---

# Estado Manuel

> Documento derivado. La fuente operativa es `var/oreshnik/task-board.json`.

## Ready

| Sprint | Scope | Depende de |
|---|---|---|
| S-HC-PROD-03 | LLM provider adapter plus Turpial tenant functional QA and UX polish | S-HC-PROD-ALIGN |

## Pending

| Sprint | Scope | Depende de |
|---|---|---|
| S-HC-PROD-05 | Publishing gate UI, AuditLog and rollback proof | S-HC-PROD-03 |
| S-HC-PROD-06 | Oreshnik operator dashboard and canonical task board | S-HC-PROD-02, S-HC-PROD-03, S-HC-PROD-04, S-HC-PROD-05, S-HC-PROD-07, S-HC-PROD-08, S-HC-PROD-09, S-HC-PROD-10, S-HC-PROD-11 |
| S-HC-PROD-07 | Sales landing, client onboarding and login entry | S-HC-PROD-03 |
| S-HC-PROD-08 | Draft editor and post modification workflow | S-HC-PROD-03 |
| S-HC-PROD-10 | Paid ads management UI and tenant billing surface | S-HC-PROD-05, S-HC-PROD-09 |
| S-HC-RELEASE-01 | End-to-end Turpial Sound production proof | S-HC-PROD-02, S-HC-PROD-03, S-HC-PROD-04, S-HC-PROD-05, S-HC-PROD-06, S-HC-PROD-07, S-HC-PROD-08, S-HC-PROD-09, S-HC-PROD-10, S-HC-PROD-11 |

## Detalle de Aceptacion

### S-HC-PROD-03 - LLM provider adapter plus Turpial tenant functional QA and UX polish

Estado: `ready`

- LLM provider adapter interface exists with deterministic fallback for offline/dev
- Initial provider is selected by environment variable without committing secrets
- Tenant-specific strategy generation can consume Turpial intake/assets/context
- Generated strategy output is structured and auditable before drafts are approved
- Tenant console renders strategy, assets, queue, calendar, reports and readiness
- Approve/reject flow works in UI
- No overlap with Jean DB/Auth/env work
- Manual user path documented for Turpial Sound

Zonas: `packages/agents`, `apps/web/components/dashboard-console.tsx`, `apps/web/components/admin-console.tsx`, `apps/web/lib/dashboard.ts`, `docs`

### S-HC-PROD-05 - Publishing gate UI, AuditLog and rollback proof

Estado: `pending`

- Dry-run gate is clear and cannot publish real RRSS
- Approved draft can move to SCHEDULED through UI
- AuditLog entry is visible in reports/admin activity
- Rollback procedure is documented and tested

Zonas: `apps/web/app/api/publishing`, `apps/web/components/dashboard-console.tsx`, `apps/web/lib/dashboard.ts`, `docs`

### S-HC-PROD-06 - Oreshnik operator dashboard and canonical task board

Estado: `pending`

- Task board reflects PROD reality
- Operator dashboard/report shows current branch, mother, events and owners
- No stale Jean/Manuel sprint ambiguity remains
- Closeout process produces one canonical release handoff

Zonas: `scripts/oreshnik`, `var/oreshnik`, `var/sprint-events`, `docs`

### S-HC-PROD-07 - Sales landing, client onboarding and login entry

Estado: `pending`

- Public landing explains HeptaCore value, tenant operating model, approvals and paid-growth guardrails
- Landing has clear CTA to login/onboarding without exposing tenant console publicly
- Client onboarding path captures business, offer, audience, networks, assets and approval preferences
- Login remains protected and usable after landing replaces root redirect
- No marketing claim promises guaranteed sales or unsupervised automation

Zonas: `apps/web/app/page.tsx`, `apps/web/app/login`, `apps/web/app/globals.css`, `apps/web/components`, `docs`

### S-HC-PROD-08 - Draft editor and post modification workflow

Estado: `pending`

- Operator can edit draft title, caption, CTA, hashtags, risk/review flag and scheduled date before approval
- Edits are tenant-scoped and RBAC-protected
- Edited draft returns to review state when content changes after approval
- AuditLog records before/after metadata for post modification
- UI makes edit, approve, reject and dry-run states distinct

Zonas: `apps/web/app/api/drafts`, `apps/web/components/dashboard-console.tsx`, `apps/web/lib/dashboard.ts`, `docs`

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

