---
type: mother-child-branch-model
project: "HeptaCore"
last_updated: "2026-06-09"
source_model: "Turpial Sound Oreshnik v4.0"
tags:
  - "#oreshnik"
  - "#branches"
  - "#mother-branch"
---

# Mother / Child Branch Model

## Source Model

Inherited from Turpial Sound:

- source repo inspected: `D:\PROYECTOS\PROYECTOS VISUAL STUDIO\Turpialsound\turpialsound`;
- source scripts: `scripts/oreshnik/preflight.mjs`, `sync-from-mother.mjs`, `close-sprint.mjs`, `merge-docs-union.mjs`;
- source docs: `docs/obsidian-vault/METODOLOGIA/METODOLOGIA_ORESHNIK.md`, `BUS_CONTROL.md`, `00_CENTRAL_TURPIAL.md`;
- source metadata: `scripts/oreshnik/runs/.mother-version.json`, `var/sprint-events/*`.

## HeptaCore Adaptation

```txt
mother branch = canonical docs / latest truth / Obsidian source
child branches = developer sprint execution branches
preflight/resume = sync child branch with latest mother docs and sprint state
handoff/close = push updates back into docs/control bus without overwriting others
```

HeptaCore stores mother metadata in:

```txt
var/oreshnik/.mother-version.json
```

HeptaCore stores sprint events in:

```txt
var/sprint-events/
```

## Branch Conventions

| Branch type | Pattern | Purpose |
|---|---|---|
| Mother docs | `MADRE/vN-sprint-desc-date` | Canonical documentation/control layer |
| Manuel child | `Manuel/s-hc-...` | Manuel execution branch |
| Jean child | `Jean/s-hc-...` | Jean execution branch |

## Required Flow

Before work:

```txt
preflight -> sync latest mother documentation/control state -> assign lane
```

After work:

```txt
close/handoff -> update docs/events -> prepare integration back to mother docs
```

## Non-Negotiables

- Child branches never replace mother docs with "last writer wins".
- Docs merge must use union/semantic merge behavior when possible.
- Product code remains in child branches until reviewed.
- Mother branch carries canonical docs/control state.
- If mother branch is missing locally/remotely, preflight reports warning and records metadata; it does not invent content.
