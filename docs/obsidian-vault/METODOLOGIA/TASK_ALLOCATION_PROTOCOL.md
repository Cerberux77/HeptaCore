---
type: task-allocation-protocol
project: "HeptaCore"
last_updated: "2026-06-09"
tags:
  - "#allocation"
  - "#oreshnik"
  - "#tasks"
---

# Task Allocation Protocol

## Rule

Oreshnik assigns workload. Developers and agents execute assignments; they do not select scope.

## Allocation Inputs

Oreshnik reads:

- preflight result;
- branch and dirty tree;
- recent commits;
- `var/oreshnik/task-board.json`;
- `var/sprint-events/*`;
- `docs/07_handoffs/zone-map.json`;
- central docs and methodology docs;
- tenant state;
- validation status.

This mirrors Turpial Sound's assignment log / bus-control model, adapted so HeptaCore emits an explicit JSON assignment packet.

## Assignment Packet

Each packet must contain:

```json
{
  "ok": true,
  "sprint": "S-HC-PUB-01",
  "recommendedOwner": "Jean",
  "agent": "Codex",
  "branch": "Jean/s-hc-pub-01-turpial-controlled-publishing-2026-06-09",
  "risk": "medium",
  "publishAllowed": false,
  "approvalRequired": true,
  "allowedFiles": [],
  "inspectOnlyFiles": [],
  "prohibitedFiles": [],
  "validations": [],
  "stopCriteria": []
}
```

## Decisions

Oreshnik decides:

- developer owner;
- agent owner;
- branch;
- files allowed for edit;
- files allowed for inspection only;
- files prohibited;
- handoff docs;
- validation gates;
- stop condition.

## Emergency Override

Manuel may override allocation only to stop risk, unblock a critical production issue, or reassign absent ownership. Overrides must be documented in the handoff with reason, risk and files affected.

## Jean Execution Rule

Jean executes only an Oreshnik-issued packet. If Jean receives a prompt without a packet, he must run preflight/assignment or ask for the packet. He must not choose a task from backlog manually.
