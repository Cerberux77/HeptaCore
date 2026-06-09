---
type: product-requirements
project: "HeptaCore"
last_updated: "2026-06-09"
tags:
  - "#operator-console"
  - "#requirements"
---

# Operator Console Requirements

## Required Operator Flow

The product must support Manuel and Jean as equal operators. Oreshnik assigns workload; neither operator self-selects work from the UI.

Required screens:

- login/session entry;
- operator dashboard;
- assigned Oreshnik lane/task packet;
- tenant console for `turpial-sound`;
- social connection status;
- strategy/assets/content queue;
- discovery action;
- dry-run action;
- one-post publish action with hard approval gate;
- audit/log/handoff status.

## Required Assignment Packet Fields

The UI must display:

- task id;
- developer owner;
- agent owner;
- branch name;
- allowed files/surfaces;
- prohibited files/surfaces;
- validation gates;
- stop criteria;
- publish safety state.

## Publishing Safety

Discovery and dry-run do not require Manuel approval.

Real public publishing requires a product-level approval gate. The gate must enforce:

- one platform only;
- one post only;
- explicit Manuel approval state or phrase;
- no hidden bulk queue execution;
- audit event before and after the attempt;
- immediate stop after first result.

## Event Recording

Product actions must record events without replacing another operator's handoff. Preferred order:

1. Write structured application audit record.
2. Emit Oreshnik/sprint event.
3. Append or prepare handoff entry.
4. Update Obsidian docs only through Oreshnik-compatible close/handoff rules.
