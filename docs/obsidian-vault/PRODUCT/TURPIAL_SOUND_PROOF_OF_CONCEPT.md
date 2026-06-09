---
type: tenant-proof
project: "HeptaCore"
tenant: "turpial-sound"
last_updated: "2026-06-09"
tags:
  - "#turpial-sound"
  - "#proof-of-concept"
---

# Turpial Sound Proof Of Concept

## Objective

Validate Turpial Sound as the first real HeptaCore tenant through the production product flow.

The proof is not a console-only worker exercise. The target state is a production operator journey:

1. Operator logs into HeptaCore.
2. Oreshnik assignment is visible in the product.
3. Operator opens `turpial-sound`.
4. Operator sees strategy, assets, queue and social connection state.
5. Operator runs discovery from UI.
6. Operator runs dry-run from UI.
7. Operator prepares one-post publish.
8. Manuel approval gate unlocks the real publish action.
9. System records audit, handoff and postmortem.

## Current Tenant State

| Area | State |
|---|---|
| Tenant slug | `turpial-sound` |
| Production URL | `https://heptacore.vercel.app` |
| Instagram | Connected in encrypted vault, providerUserId `28189853417270950` |
| Facebook | Connected in encrypted vault, pageId/providerUserId `1129437930248909` |
| Worker validation | PASS, 29/29 queue entries and 46/46 assets |
| Real publishing | Blocked until product gate and Manuel explicit approval |

## Product Prerequisites

`S-HC-PUB-01` depends on:

- `S-HC-PROD-01`: login/users/roles;
- `S-HC-PROD-02`: Oreshnik operator dashboard;
- `S-HC-PROD-03`: Turpial tenant console;
- `S-HC-PROD-04`: discovery + dry-run from UI;
- `S-HC-PROD-05`: controlled one-post publish action from UI;
- `S-HC-PROD-06`: logs/handoff/Obsidian event recording.

## Hard Stop

No public publishing in `S-HC-PROD-00`.

No token changes, OAuth changes, DB destructive changes, Meta settings changes, campaign spend or real scraping.
