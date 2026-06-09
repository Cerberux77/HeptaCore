---
type: oreshnik-control-bus
project: "HeptaCore"
last_updated: "2026-06-09"
tags:
  - "#oreshnik"
  - "#control-bus"
  - "#allocation"
---

# Oreshnik Control Bus

## Purpose

Oreshnik is the operating control bus for HeptaCore. It reviews repo state, docs state, sprint metadata, zone ownership and validation state before distributing work to Manuel, Jean or an agent.

This model is inherited from the functional Turpial Sound Oreshnik implementation, especially its dynamic mother branch, child branch, preflight, sync-from-mother, close-sprint, merge-docs-union and sprint-event ledger flow.

## Task Allocation Authority

Oreshnik is the allocator.

- Developers do not self-select tasks.
- Manuel does not manually assign coding tasks unless acting as emergency override.
- Jean does not choose scope manually.
- Agents do not expand scope beyond the assignment packet.
- Manuel keeps review and approval authority for dangerous gates such as real publishing, secrets, DB/auth/security and Meta settings.

The correct flow is:

```txt
Manuel triggers Oreshnik preflight
Oreshnik reviews available work
Oreshnik assigns the next safe task
Developer executes only the Oreshnik-assigned task
Agent works only inside the assignment packet
Handoff records result and next candidate
```

## What Oreshnik Must Inspect

- Current branch.
- Dirty working tree and untracked files.
- Active sprint.
- Recent commits.
- Sprint events in `var/sprint-events`.
- Task board in `var/oreshnik/task-board.json`.
- Zone ownership in `docs/07_handoffs/zone-map.json`.
- Central docs and docs index.
- Tenant state.
- Validation state.
- Publish safety state.

## What Oreshnik Decides

For each assignment packet Oreshnik decides:

- task id;
- developer owner;
- agent owner;
- branch name;
- allowed files;
- inspect-only files;
- prohibited files;
- validation gates;
- stop criteria;
- handoff docs.

## Publishing Rule

Publishing work is never a free-form task. Any publishing assignment must include:

- discovery;
- dry-run;
- Manuel approval gate;
- one-post limit;
- postmortem/handoff;
- explicit `publishAllowed: false` until approval.

`S-HC-PUB-01` is a candidate only until Oreshnik preflight assignment confirms it.

## Turpial Sound Comparison

| Turpial Sound feature | File/script | HeptaCore equivalent | Status | Action |
|---|---|---|---|---|
| Mother branch concept | `scripts/oreshnik/runs/.mother-version.json`, `00_CENTRAL_TURPIAL.md` | `var/oreshnik/.mother-version.json`, `00_CENTRAL_HEPTACORE.md` | Adapted | Keep dynamic `MADRE/vN-*` docs branches |
| Child branch concept | `Manuel/*`, `Jean/*` from preflight | `Manuel/*`, `Jean/*` | Present | Documented in branch protocol |
| Collaborative docs update model | `merge-docs-union.mjs`, close sprint | `merge-docs-union.mjs`, close sprint | Present, improved docs | Add mother/child and collaborative docs protocols |
| Preflight command | `node scripts/oreshnik/preflight.mjs` | `npm run oreshnik:preflight` | Present | Added dry-run packet output |
| Resume command | `sync-from-mother.mjs` | `npm run oreshnik:resume` | Added | Sync docs then emit assignment packet |
| Close command | `close-sprint.mjs` | `npm run oreshnik:close` | Present | Keep HeptaCore paths |
| Assignment allocator | preflight assignment log + bus rules | `preflight-assignment.mjs`, task board | Improved | Oreshnik emits packet |
| Sprint event ledger | `var/sprint-events/*` | `var/sprint-events/*` | Present | Continue append-only events |
| Handoff protocol | `docs/07_handoffs/*` | `docs/07_handoffs/*` | Present | No overwrites |
| Zone map / file ownership | `docs/07_handoffs/zone-map.json` | same | Present | HeptaCore SaaS zones |
| Obsidian vault index | `00_INDICE_MAESTRO.md` | same | Present | Updated canonical links |
| Collision prevention | `zone-check.ps1`, preflight | `zone-check.mjs`, preflight | Present | Keep JS implementation |
| Blocked/stale/reassignment | `.sprint-assignments.json`, bus docs | task board, assignment packet, resilience docs | Partial | Added docs and task-board candidate |
| Agent handoff rules | AGENTS + handoffs | AGENTS + `AGENT_HANDOFF_PROTOCOL.md` | Present | Clarified assignment packet requirement |
| Validation gates | tsc/build/diff/env/preview | typecheck/build/worker validate | Present | HeptaCore-specific gates |
| Publish hard stop | RRSS dry-run/docs | `PUBLISHING_SAFETY_PROTOCOL.md` | Present | Real publish blocked |

## Product Allocation Rule

For the Turpial Sound proof, Oreshnik must not assign `S-HC-PUB-01` as a console-only publishing task while required product surfaces are missing. The allocator must first route work into product sprints that create the operator path:

```txt
login -> Oreshnik dashboard -> tenant console -> discovery UI -> dry-run UI -> controlled publish gate -> event/handoff recording -> first proof
```

`S-HC-PUB-01` remains a candidate, but it depends on `S-HC-PROD-01` through `S-HC-PROD-06`.

Assignment approval is not required. Discovery approval is not required. Dry-run approval is not required. Real public publishing approval is required and must be implemented in the product flow.
