---
type: handoff
project: "HeptaCore"
sprint: "S-HC-CTRL-03"
operator: "Manuel"
last_updated: "2026-06-09"
tags:
  - "#handoff"
  - "#oreshnik"
  - "#turpial-inheritance"
---

# S-HC-CTRL-03 Handoff

## Objective

Replicate the functional Turpial Sound Oreshnik model into HeptaCore with minimal divergence and HeptaCore SaaS adaptation.

## Turpial Sound Repo Inspected

```txt
D:\PROYECTOS\PROYECTOS VISUAL STUDIO\Turpialsound\turpialsound
```

Repo state at inspection: dirty; files were read only. No Turpial commands were executed.

## Exact Turpial Sources Used

| Source | Purpose inherited |
|---|---|
| `AGENTS.md` | mandatory preflight, branch management, context health |
| `scripts/oreshnik/preflight.mjs` | dynamic mother, docs sync, branch lane, zone check, resilience |
| `scripts/oreshnik/sync-from-mother.mjs` | resume/sync docs from mother |
| `scripts/oreshnik/close-sprint.mjs` | close flow, mother version, sprint events |
| `scripts/oreshnik/merge-docs-union.mjs` | union/semantic docs merge |
| `docs/obsidian-vault/METODOLOGIA/METODOLOGIA_ORESHNIK.md` | mother/child collaborative docs model |
| `docs/obsidian-vault/METODOLOGIA/BUS_CONTROL.md` | locks, anti-collision, reassignment resilience |
| `docs/07_handoffs/zone-map.json` | zone ownership |
| `var/sprint-events/*` | append-only sprint ledger |

## Comparison

| Turpial Sound feature | File/script | HeptaCore equivalent | Status | Action |
|---|---|---|---|---|
| Mother branch concept | `scripts/oreshnik/runs/.mother-version.json` | `var/oreshnik/.mother-version.json` | Present | Keep dynamic `MADRE/vN-*` |
| Child branch concept | `Manuel/*`, `Jean/*` | same | Present | Documented |
| Collaborative docs update model | `merge-docs-union.mjs` | same | Present | Added explicit protocol |
| Preflight command | `preflight.mjs` | `npm run oreshnik:preflight` | Present | Added `--dry-run` packet output |
| Resume command | `sync-from-mother.mjs` | `npm run oreshnik:resume` | Added | Sync + assignment packet |
| Close command | `close-sprint.mjs` | `npm run oreshnik:close` | Present | Keep Hepta paths |
| Assignment allocator | preflight assignment log | `preflight-assignment.mjs` + task board | Improved | Explicit JSON packet |
| Sprint event ledger | `var/sprint-events/*` | same | Present | Append-only |
| Handoff protocol | `docs/07_handoffs/*` | same | Present | No overwrites |
| Zone map / ownership | `zone-map.json` | same | Present | Hepta SaaS zones |
| Obsidian vault index | `00_INDICE_MAESTRO.md` | same | Present | Updated links |
| Collision prevention | zone-check + preflight | `zone-check.mjs` + preflight | Present | Keep JS |
| Blocked/stale/reassignment | bus docs + assignment log | task board + packet + docs | Partial | Added candidate and protocols |
| Agent handoff rules | AGENTS + handoffs | AGENTS + protocol docs | Present | Clarified packet requirement |
| Validation gates | tsc/build/diff/env | typecheck/build/worker validate | Present | Hepta-specific |
| Publish hard stop | RRSS dry-run model | publishing safety protocol | Present | Real publish blocked |

## HeptaCore Adaptation

- Tenant: `turpial-sound`.
- Production: `https://heptacore.vercel.app`.
- Providers connected: Instagram + Facebook via encrypted vault.
- Candidate: `S-HC-PUB-01`.
- Real publishing: blocked until Oreshnik assignment + Jean dry-run + Manuel explicit approval.
- Jean: child-branch developer only after Oreshnik packet.
- Manuel: operator/reviewer/approval gate, not normal task distributor.

## Current Candidate

`S-HC-PUB-01` is now in `var/oreshnik/task-board.json` as a ready candidate. It is not a manual assignment.

Expected assignment packet:

```json
{
  "ok": true,
  "sprint": "S-HC-PUB-01",
  "recommendedOwner": "Jean",
  "agent": "Codex",
  "branch": "Jean/s-hc-pub-01-turpial-controlled-publishing-2026-06-09",
  "publishAllowed": false,
  "approvalRequired": true
}
```

## Hard Stops

- No publishing.
- No token changes.
- No DB changes.
- No OAuth changes.
- No Meta settings changes.
