---
type: handoff
sprint: "S-HC-PROD-00"
operator: "Manuel"
status: "CERRADO"
date: "2026-06-09"
tags:
  - "#handoff"
  - "#product"
  - "#turpial-proof"
---

# S-HC-PROD-00 Handoff

## Objective

Convert the HeptaCore concept into an executable product roadmap and sprint allocation for the first real Turpial Sound tenant proof-of-concept.

No public publishing was performed.

## Product Reality Check

| Capability | Exists? | Current file/route | Missing work | Risk | Sprint |
|---|---:|---|---|---|---|
| Login / auth | Partial | `apps/web/app/login/page.tsx`, `apps/web/lib/tenant-auth.ts`, `packages/db/prisma/schema.prisma` | Session issuer, production-safe cookies, Manuel/Jean bootstrap | High | `S-HC-PROD-01` |
| Operator roles | Partial | `UserRole`, `TenantMember` | Product role guards and operator mapping | High | `S-HC-PROD-01` |
| Oreshnik dashboard | Missing | CLI scripts only | Product dashboard for assignment packets | Medium | `S-HC-PROD-02` |
| Assigned task view | Missing | `scripts/oreshnik/preflight-assignment.mjs` | UI lane/task packet | Medium | `S-HC-PROD-02` |
| Tenant console | Partial | `/`, `TurpialConsole`, `getTurpialConsoleData()` | Tenant route, auth guard, product data wiring | Medium | `S-HC-PROD-03` |
| Strategy/assets queue | Partial | `apps/web/lib/data/publication-queue.json` | Fresh tenant source and status UX | Medium | `S-HC-PROD-03` |
| Social connection status | Missing in UI | Vault scripts and DB models | Secret-safe status panel/API | High | `S-HC-PROD-03` |
| Discovery from UI | Missing | Worker validation exists | UI/API action and event record | Medium | `S-HC-PROD-04` |
| Dry-run from UI | Missing | Worker dry-run exists | UI/API dry-run action and output record | Medium | `S-HC-PROD-04` |
| Controlled publish from UI | Missing | Worker env hard stop exists | One-post, one-platform product gate | High | `S-HC-PROD-05` |
| Audit log / handoff | Partial | `AuditLog`, `var/sprint-events`, handoffs | Product event writer and append-only handoff | High | `S-HC-PROD-06` |
| Obsidian/docs update path | Partial | Oreshnik close/sync | Product-compatible event-to-handoff flow | Medium | `S-HC-PROD-06` |
| Production deployment | Partial | `https://heptacore.vercel.app` | Deploy product sprints safely | Medium | `S-HC-PROD-01` through `S-HC-PROD-06` |

## Files Updated

- `docs/obsidian-vault/PRODUCT/HEPTACORE_PRODUCT_ROADMAP.md`
- `docs/obsidian-vault/PRODUCT/TURPIAL_SOUND_PROOF_OF_CONCEPT.md`
- `docs/obsidian-vault/PRODUCT/OPERATOR_CONSOLE_REQUIREMENTS.md`
- `docs/obsidian-vault/PRODUCT/SPRINT_ALLOCATION_BOARD.md`
- `docs/obsidian-vault/00_CENTRAL_HEPTACORE.md`
- `docs/obsidian-vault/00_INDICE_MAESTRO.md`
- `docs/obsidian-vault/METODOLOGIA/ORESHNIK_CONTROL_BUS.md`
- `docs/obsidian-vault/METODOLOGIA/TASK_ALLOCATION_PROTOCOL.md`
- `docs/obsidian-vault/TENANTS/TURPIAL_SOUND/FIRST_PUBLISHING_TEST_PLAN.md`
- `docs/obsidian-vault/COLABORADORES/JEAN_ONBOARDING.md`
- `var/oreshnik/task-board.json`
- `scripts/oreshnik/preflight-assignment.mjs`
- `scripts/oreshnik/task-board.mjs`

## Oreshnik Allocation

`S-HC-PUB-01` remains registered but is now `depends_on` the product sprints required to run the proof from HeptaCore production UI.

Next Oreshnik allocations after this sprint closes:

| Operator | Sprint | Branch |
|---|---|---|
| Manuel | `S-HC-PROD-01` | `Manuel/s-hc-prod-01-login-users-roles-2026-06-09` |
| Jean | `S-HC-PROD-03` | `Jean/s-hc-prod-03-turpial-tenant-console-2026-06-09` |

## Stop State

- No real RRSS publishing.
- No token rotation.
- No OAuth changes.
- No DB schema changes.
- No production env var changes.
- No Meta settings changes.

## Next Exact Actions

Manuel:

```bash
npm run oreshnik:preflight -- --sprint S-HC-PROD-01 --operator Manuel --desc "login users roles for Manuel and Jean"
```

Jean:

```bash
npm run oreshnik:preflight -- --sprint S-HC-PROD-03 --operator Jean --desc "turpial sound tenant console"
```
