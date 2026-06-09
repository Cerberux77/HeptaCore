---
type: product-roadmap
project: "HeptaCore"
sprint: "S-HC-PROD-00"
last_updated: "2026-06-09"
tags:
  - "#product"
  - "#roadmap"
  - "#turpial-proof"
---

# HeptaCore Product Roadmap

## Business Objective

Deploy and validate the Turpial Sound strategy/publication workflow as the first real tenant proof-of-concept through the HeptaCore product, not as a console-only script exercise.

Target product flow:

```txt
tenant loaded -> strategy loaded -> assets loaded -> social accounts connected -> Oreshnik assigns work -> operator logs into production -> operator sees assigned lane/task -> operator runs discovery/dry-run from UI -> operator publishes one controlled post -> system records logs/handoff/docs
```

No public publishing is allowed in `S-HC-PROD-00`.

## Product Gap Matrix

| Capability | Exists? | Current file/route | Missing work | Risk | Sprint |
|---|---:|---|---|---|---|
| Login / auth | Partial | `apps/web/app/login/page.tsx`, `apps/web/lib/tenant-auth.ts`, `packages/db/prisma/schema.prisma` | Session issuance, password or provider flow, production-safe cookies, Manuel/Jean bootstrap | High | `S-HC-PROD-01` |
| Operator roles | Partial | `UserRole`, `TenantMember` in `packages/db/prisma/schema.prisma` | Role mapping in web app, route guards, operator bootstrap | High | `S-HC-PROD-01` |
| Oreshnik dashboard | Missing | `scripts/oreshnik/*`, `var/oreshnik/task-board.json` | Product route/component to show assignment packets, branch, validations, stop criteria | Medium | `S-HC-PROD-02` |
| Assigned task view | Missing | `scripts/oreshnik/preflight-assignment.mjs` | UI view for current operator lane and exact assigned packet | Medium | `S-HC-PROD-02` |
| Tenant console | Partial | `apps/web/app/page.tsx`, `apps/web/components/turpial-console.tsx`, `apps/web/lib/turpial.ts` | Tenant route, auth guard, production data source, social state panel | Medium | `S-HC-PROD-03` |
| Strategy/assets queue | Partial | `apps/web/lib/data/publication-queue.json`, `TurpialConsole` | DB/tenant wiring or documented read model, current strategy/asset status, queue freshness | Medium | `S-HC-PROD-03` |
| Social connection status | Missing in UI | OAuth/vault scripts and DB models exist | Safe UI status endpoint/panel showing connected state without secrets | High | `S-HC-PROD-03` |
| Discovery from UI | Missing | Worker validation exists in `apps/worker/src/validate.mjs` | UI/API action to run discovery safely and record result | Medium | `S-HC-PROD-04` |
| Dry-run from UI | Missing | `apps/worker/src/index.mjs`, `publisher.mjs` dry-run guard | UI/API action that invokes dry-run only and records output | Medium | `S-HC-PROD-04` |
| Controlled publish from UI | Missing | Worker has confirmation env hard stop | One-post, one-platform product action behind approval gate | High | `S-HC-PROD-05` |
| Audit log / handoff | Partial | `AuditLog` model, `var/sprint-events/*`, `docs/07_handoffs/*` | UI/API event writer and append-only handoff policy from product actions | High | `S-HC-PROD-06` |
| Obsidian/docs update path | Partial | Oreshnik close/sync scripts, docs vault | Product-safe event-to-handoff workflow, no overwrite rules | Medium | `S-HC-PROD-06` |
| Production deployment | Partial | `https://heptacore.vercel.app`, static Turpial console | Deploy routes/APIs/env safely after product sprints | Medium | `S-HC-PROD-01` through `S-HC-PROD-06` |

## Reality Check

Jean cannot execute the Turpial proof from production UI today. The current product can display a Turpial queue from local JSON and has DB models for users/roles/content, but it does not yet have production login, Oreshnik assignment UI, discovery/dry-run UI actions, controlled publish UI, or event/handoff recording from UI actions.

Therefore `S-HC-PUB-01` remains blocked behind product prerequisites. It is not deleted; Oreshnik now treats it as a dependent proof sprint.

## Sprint Sequence

| Sprint | Objective | Owner | Agent | Status | Branch |
|---|---|---|---|---|---|
| `S-HC-PROD-00` | Product audit and sprint allocation | Manuel | Codex | assigned | `Manuel/s-hc-prod-00-product-audit-roadmap-2026-06-09` |
| `S-HC-PROD-01` | Login/users/roles for Manuel and Jean | Manuel | Codex | ready | `Manuel/s-hc-prod-01-login-users-roles-2026-06-09` |
| `S-HC-PROD-02` | Oreshnik operator dashboard | Manuel | Codex | depends_on `S-HC-PROD-01` | `Manuel/s-hc-prod-02-oreshnik-dashboard-2026-06-09` |
| `S-HC-PROD-03` | Turpial Sound tenant console | Jean | Codex | ready | `Jean/s-hc-prod-03-turpial-tenant-console-2026-06-09` |
| `S-HC-PROD-04` | Discovery + dry-run from UI | Jean | Codex | depends_on `S-HC-PROD-02`, `S-HC-PROD-03` | `Jean/s-hc-prod-04-discovery-dry-run-ui-2026-06-09` |
| `S-HC-PROD-05` | Controlled one-post publishing from UI | Jean | Codex | depends_on `S-HC-PROD-04`, `S-HC-PROD-06` | `Jean/s-hc-prod-05-controlled-one-post-publish-ui-2026-06-09` |
| `S-HC-PROD-06` | Logs/handoff/Obsidian event recording | Manuel | Codex | depends_on `S-HC-PROD-02` | `Manuel/s-hc-prod-06-logs-handoff-obsidian-events-2026-06-09` |
| `S-HC-PUB-01` | First real Turpial Sound publishing proof | Jean | Codex | depends_on product sprints | `Jean/s-hc-pub-01-turpial-controlled-publishing-2026-06-09` |

## Approval Model

Assignment approval is not required. Oreshnik assigns workload.

Discovery approval is not required. Dry-run approval is not required.

Real public publishing approval is required and must be implemented in the product flow before `S-HC-PUB-01`.

## Product Proof Gate

`S-HC-PUB-01` can start only after:

- Manuel and Jean can log in or use a production-safe operator session flow.
- The assigned Oreshnik lane is visible to the operator.
- Turpial Sound tenant console shows strategy, queue, assets and social connection status.
- Discovery and dry-run can be run from UI.
- One-post, one-platform publish action exists and is blocked behind Manuel approval.
- Product actions record audit/handoff events without overwriting docs.
