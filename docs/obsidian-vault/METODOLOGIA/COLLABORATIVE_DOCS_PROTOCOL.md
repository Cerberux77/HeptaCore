---
type: collaborative-docs-protocol
project: "HeptaCore"
last_updated: "2026-06-09"
source_model: "Turpial Sound Oreshnik v4.0"
tags:
  - "#docs"
  - "#obsidian"
  - "#control-bus"
---

# Collaborative Docs Protocol

## Principle

The docs model follows the proven Turpial Sound "Google Docs logic" at repo level:

- latest canonical docs live in the mother branch/control layer;
- child branches read latest docs before work;
- child branches append/update structured handoffs;
- no operator overwrites another operator's handoff;
- conflicts are resolved through append-only events or explicit merge rules;
- the Obsidian central index points to latest state.

## Canonical HeptaCore Docs

- [[../00_CENTRAL_HEPTACORE]]
- [[../00_INDICE_MAESTRO]]
- [[ORESHNIK_CONTROL_BUS]]
- [[MOTHER_CHILD_BRANCH_MODEL]]
- [[PREFLIGHT_PROTOCOL]]
- [[TASK_ALLOCATION_PROTOCOL]]
- `docs/07_handoffs/zone-map.json`

## Append-Only Areas

These should prefer append/update-by-section over replacement:

- `docs/07_handoffs/*.md`
- `var/sprint-events/*.json`
- sprint closure sections in central docs;
- collaborator status sections.

## Merge Rules

1. Markdown/text docs use union-style merge where possible.
2. JSON docs use semantic object/array merge where possible.
3. Same-section conflicts block closure instead of silently choosing one operator.
4. Obsidian workspace/config churn is not canonical docs content.
5. `docs/Heptacore/` starter vault is not canonical and remains untracked unless intentionally migrated.

## Reassignment Resilience

If an operator is blocked, disconnected or stale:

- Oreshnik detects stale/blocked state from sprint events, task board and preflight;
- Oreshnik emits a reassignment candidate;
- files with unmerged changes are protected;
- an emergency handoff is required if no normal handoff exists;
- new owner is assigned only if zone-map and locks allow it.
