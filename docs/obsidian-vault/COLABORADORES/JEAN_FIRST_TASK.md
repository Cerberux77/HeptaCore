---
type: assignment-candidate
project: "HeptaCore"
operator: "Jean"
sprint: "S-HC-PUB-01"
last_updated: "2026-06-09"
tags:
  - "#jean"
  - "#publishing"
  - "#dry-run"
  - "#assignment-candidate"
---

# Oreshnik Assignment Candidate: S-HC-PUB-01

## Status

This is the current recommended candidate, pending Oreshnik preflight assignment.

Jean may execute it only after Oreshnik assigns it with an assignment packet. This document is not a manual task assignment from Manuel.

## Candidate Packet Command

```bash
npm run oreshnik:preflight -- --sprint S-HC-PUB-01 --operator Jean --desc "turpial controlled publishing discovery dry-run"
npm run oreshnik:resume -- --operator Jean --dry-run
npm run oreshnik:assign -- --candidate S-HC-PUB-01 --owner Jean --dry-run
```

Expected packet must include:

- `ok: true`;
- `recommendedOwner: "Jean"`;
- `agent: "Codex"`;
- branch;
- allowed files;
- prohibited files;
- validation gates;
- `publishAllowed: false`;
- `approvalRequired: true`.

If Oreshnik does not issue the packet, Jean stops.

## Candidate Objective

Run Turpial Sound first controlled publishing discovery and dry-run. Do not publish anything publicly.

## Candidate Branch

Only if assigned by Oreshnik:

```txt
Jean/s-hc-pub-01-turpial-controlled-publishing-2026-06-09
```

## Candidate Scope

Discovery:

- inspect publishing code and config in `apps/worker`;
- inspect Turpial queue and drafts/assets under `examples/tenants/turpial/content`;
- validate Facebook and Instagram connections through existing encrypted vault verification scripts;
- list available drafts/assets and identify missing or risky references;
- recommend safest first candidate for one-post publish.

Dry-run:

- keep `BOT_DRY_RUN=true`;
- keep `BOT_MODE=draft`;
- do not set `HEPTACORE_ALLOW_REAL_PUBLISH` for dry-run;
- do not execute public publishing.

Output:

- candidate post and rationale;
- exact one-post publish command Manuel could run later after explicit approval;
- do not execute that command;
- update `docs/07_handoffs/S-HC-PUB-01_HANDOFF.md`.

## Hard Stops

- No real RRSS publishing.
- No campaign spend.
- No scraping.
- No credentials in git or chat.
- No Prisma/schema/auth/security changes without double lock.
- No Meta Developer setting changes.
