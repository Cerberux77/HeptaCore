---
type: sprint-allocation-board
project: "HeptaCore"
last_updated: "2026-06-09"
tags:
  - "#oreshnik"
  - "#allocation"
  - "#product"
---

# Sprint Allocation Board

Canonical machine-readable board: `var/oreshnik/task-board.json`.

## Current Allocation

| Sprint | Status | Owner | Branch | Dependencies |
|---|---|---|---|---|
| `S-HC-PROD-00` | done | Manuel | `Manuel/s-hc-prod-00-product-audit-roadmap-2026-06-09` | `S-HC-CTRL-03` |
| `S-HC-PROD-01` | ready | Manuel | `Manuel/s-hc-prod-01-login-users-roles-2026-06-09` | `S-HC-PROD-00` |
| `S-HC-PROD-02` | depends_on | Manuel | `Manuel/s-hc-prod-02-oreshnik-dashboard-2026-06-09` | `S-HC-PROD-01` |
| `S-HC-PROD-03` | ready | Jean | `Jean/s-hc-prod-03-turpial-tenant-console-2026-06-09` | `S-HC-PROD-00` |
| `S-HC-PROD-04` | depends_on | Jean | `Jean/s-hc-prod-04-discovery-dry-run-ui-2026-06-09` | `S-HC-PROD-02`, `S-HC-PROD-03` |
| `S-HC-PROD-05` | depends_on | Jean | `Jean/s-hc-prod-05-controlled-one-post-publish-ui-2026-06-09` | `S-HC-PROD-04`, `S-HC-PROD-06` |
| `S-HC-PROD-06` | depends_on | Manuel | `Manuel/s-hc-prod-06-logs-handoff-obsidian-events-2026-06-09` | `S-HC-PROD-02` |
| `S-HC-PUB-01` | depends_on | Jean | `Jean/s-hc-pub-01-turpial-controlled-publishing-2026-06-09` | `S-HC-PROD-01` through `S-HC-PROD-06` |

## Collision Prevention

- Manuel owns auth/operator/Oreshnik shell work first.
- Jean owns Turpial tenant console and publishing workflow UI work first.
- Shared docs are append/update only through Oreshnik handoff rules.
- Prisma/schema/auth/security require double lock before implementation.
- OAuth routes, token vault and Meta settings are prohibited unless a future sprint explicitly authorizes them.

## Next Allocation

After `S-HC-PROD-00` closes, Oreshnik may assign:

- Manuel: `S-HC-PROD-01`.
- Jean: `S-HC-PROD-03`.

Those can run in parallel because the assigned zones do not overlap materially.
