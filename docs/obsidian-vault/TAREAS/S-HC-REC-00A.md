<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-REC-00A"
sprint: "recovery"
status: "done"
owner: "Manuel"
last_updated: "2026-06-29T16:10:34.987Z"
source: "var/oreshnik/tasks/S-HC-REC-00A.json"
---

# Task S-HC-REC-00A

## Scope

UI Publishing Baseline Recovery — production publishing stabilized

## Runtime

- estado: `done`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `0`
- handoff: docs/07_handoffs/HC-REC-00A-codex-blockers.md

## Dependencias

- Ninguna

## Zonas

### Compat

- `apps/web`
- `docs/07_handoffs`
- `docs/obsidian-vault`

### Read

- Ninguna

### Write

- Ninguna

## Aceptacion

- Facebook e Instagram publican realmente desde la UI con durabilidad transaccional
- Errores ambiguos bloqueados sin retry automatico
- 156 tests (155 publish-flow + 1 calendar-state)
- Produccion estable en SHA 2fd9e249

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->