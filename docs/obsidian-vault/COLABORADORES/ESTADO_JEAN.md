---
type: collaborator-status
project: "HeptaCore"
operator: "Jean"
last_updated: "2026-06-11T01:43:55.676Z"
generated_by: "Oreshnik canonical-check"
source: "var/oreshnik/task-board.json"
---

# Estado Jean

> Documento derivado. La fuente operativa es `var/oreshnik/task-board.json`.

## Ready

| Sprint | Scope | Depende de |
|---|---|---|
| S-HC-PROD-02 | Production DB/Auth/env and Turpial seed smoke | S-HC-PROD-ALIGN |

## Pending

| Sprint | Scope | Depende de |
|---|---|---|
| S-HC-PROD-04 | Worker, Redis and persistent dry-run processing | S-HC-PROD-02 |
| S-HC-PROD-09 | Paid ads campaign engine with 35 percent overhead gate | S-HC-PROD-04 |
| S-HC-PROD-11 | Paid scraper compliance and controlled discovery adapter | S-HC-PROD-04 |
| S-HC-RELEASE-01 | End-to-end Turpial Sound production proof | S-HC-PROD-02, S-HC-PROD-03, S-HC-PROD-04, S-HC-PROD-05, S-HC-PROD-06, S-HC-PROD-07, S-HC-PROD-08, S-HC-PROD-09, S-HC-PROD-10, S-HC-PROD-11 |

## Detalle de Aceptacion

### S-HC-PROD-02 - Production DB/Auth/env and Turpial seed smoke

Estado: `ready`

- Production env checklist completed without committing secrets
- Prisma migrations validated/applied to hosted DB
- Admin and Turpial seed verified
- Login smoke passes against hosted DB
- 29 drafts and 46 assets verified for turpial-sound

Zonas: `docs`, `scripts`, `packages/db`, `vercel-env`

### S-HC-PROD-04 - Worker, Redis and persistent dry-run processing

Estado: `pending`

- Redis/worker hosting plan and configuration documented
- Worker validates with Turpial queue
- Dry-run job path emits logs without real RRSS publish
- No Vercel serverless long-running worker assumption remains

Zonas: `apps/worker`, `packages/integrations`, `scripts`, `docs`

### S-HC-PROD-09 - Paid ads campaign engine with 35 percent overhead gate

Estado: `pending`

- Campaign spend remains blocked unless explicitly approved
- Campaign plan includes platform budget, 35 percent overhead, total client charge and approval state
- No real campaign spend can execute from default env
- Worker/integration contract supports dry-run campaign creation
- Compliance notes explain platform spend, HeptaCore overhead and rollback/no-spend proof

Zonas: `apps/worker`, `packages/integrations`, `packages/core`, `docs`

### S-HC-PROD-11 - Paid scraper compliance and controlled discovery adapter

Estado: `pending`

- No real scraping is enabled by default
- Discovery adapter supports mock/dry-run and documents paid provider requirements
- Sensitive action gate covers paid scraping with explicit approval
- Compliance matrix documents allowed sources, forbidden scraping and tenant consent
- Output can feed strategy context without violating hard stops

Zonas: `packages/integrations`, `apps/worker`, `packages/core`, `docs`

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

