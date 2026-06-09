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
