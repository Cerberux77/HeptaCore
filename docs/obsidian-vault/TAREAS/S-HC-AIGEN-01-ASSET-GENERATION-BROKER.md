<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-AIGEN-01-ASSET-GENERATION-BROKER"
sprint: "ai-generation"
status: "blocked"
owner: "Manuel"
last_updated: "2026-07-01T01:00:48.254Z"
source: "var/oreshnik/tasks/S-HC-AIGEN-01-ASSET-GENERATION-BROKER.json"
---

# Task S-HC-AIGEN-01-ASSET-GENERATION-BROKER

## Scope

AI asset generation broker: provider-agnostic, metered and billed

## Runtime

- estado: `blocked`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `0`
- handoff: -

## Dependencias

- S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST
- S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE
- S-HC-COMM-02-BILLING-ACTIVATION

## Zonas

### Compat

- `packages/agents`
- `apps/web/app/api`
- `packages/core`

### Read

- Ninguna

### Write

- Ninguna

## Aceptacion

- Provider-agnostic generation broker (not hardcoded to single provider)
- Metered consumption with cost preview before generation
- Billed per request with usage tracking
- Optional: client may supply assets without using generation
- Generation respects brand guidelines from strategy

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->