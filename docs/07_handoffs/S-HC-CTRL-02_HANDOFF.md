---
type: handoff
project: "HeptaCore"
sprint: "S-HC-CTRL-02"
operator: "Manuel"
last_updated: "2026-06-09"
tags:
  - "#handoff"
  - "#control-bus"
  - "#allocation"
---

# S-HC-CTRL-02 Handoff

## Correction Made

The Control Bus now states that Oreshnik assigns workload. `S-HC-PUB-01` is no longer documented as a manual first task for Jean.

## What Changed

- Added `METODOLOGIA/ORESHNIK_CONTROL_BUS.md`.
- Added `METODOLOGIA/PREFLIGHT_PROTOCOL.md`.
- Added `METODOLOGIA/TASK_ALLOCATION_PROTOCOL.md`.
- Corrected Jean onboarding.
- Reframed `JEAN_FIRST_TASK.md` as `Oreshnik Assignment Candidate: S-HC-PUB-01`.
- Updated central dashboard and sprint plan.
- Added dry-run assignment script `scripts/oreshnik/preflight-assignment.mjs`.

## Current Candidate Tasks

| Candidate | Owner | Status | Notes |
|---|---|---|---|
| `S-HC-PUB-01` | Pending Oreshnik | Candidate | Turpial Sound discovery + dry-run only |

## What Oreshnik Should Assign Next

Oreshnik should assign `S-HC-PUB-01` to Jean only if preflight confirms:

- working tree has no blockers;
- `docs/Heptacore/` starter vault remains unrelated/uncommitted;
- Jean branch can be created from current base;
- publishing code is inspection-safe;
- no overlapping Manuel sprint owns the same files;
- dry-run only;
- real publish blocked.

## Hard Stop

No publishing until:

1. Oreshnik issues an assignment packet;
2. Jean completes discovery + dry-run;
3. Jean returns a one-post command without executing it;
4. Manuel explicitly approves a later real-publish gate.

No token changes, DB changes, OAuth changes or Meta settings changes were made.
