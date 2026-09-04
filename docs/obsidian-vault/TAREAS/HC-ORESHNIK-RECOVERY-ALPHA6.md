<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "HC-ORESHNIK-RECOVERY-ALPHA6"
sprint: "recovery"
status: "ready"
owner: "Manuel"
last_updated: "2026-09-04T13:53:56.549Z"
source: "var/oreshnik/tasks/HC-ORESHNIK-RECOVERY-ALPHA6.json"
---

# Task HC-ORESHNIK-RECOVERY-ALPHA6

## Scope

Upgrade HeptaCore governance to Oreshnik 0.3.0-alpha.6 and reconcile control plane

## Runtime

- estado: `ready`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `0`
- handoff: docs/07_handoffs/HC-ORESHNIK-RECOVERY-ALPHA6.md

## Dependencias

- Ninguna

## Zonas

### Compat

- `package.json`
- `package-lock.json`
- `vendor/oreshnik/**`
- `scripts/oreshnik/**`
- `.kilo/commands/**`
- `.kilo/command/**`
- `docs/oreshnik/**`
- `docs/operations/oreshnik-command-catalog.json`
- `docs/07_handoffs/**`

### Read

- `.oreshnik.json`
- `var/oreshnik/**`
- `docs/07_handoffs/zone-map.json`
- `.github/workflows/oreshnik-digital-twin.yml`

### Write

- `package.json`
- `package-lock.json`
- `vendor/oreshnik/**`
- `scripts/oreshnik/**`
- `.kilo/commands/**`
- `.kilo/command/**`
- `docs/oreshnik/**`
- `docs/operations/oreshnik-command-catalog.json`
- `docs/07_handoffs/**`

## Aceptacion

- Vendored alpha6 release asset matches SHA-256 66E0E6683CDF9587A873B27F20DD8C8538199EB511068E9C40B682CEADB176E8
- package.json and package-lock.json resolve the exact vendored alpha6 package
- node node_modules/oreshnik-cli/dist/cli.js --version returns 0.3.0-alpha.6
- npm run oreshnik:ready passes with the alpha6 contract
- Remote oreshnik/control has no stale active ownership blocking operator manuel
- Oreshnik command catalog is regenerated from alpha6
- npm run typecheck, npm run build, npm run test and npm run worker:validate pass
- Rollback to the retained alpha16 vendored package is documented and verified
- Canonical evidence and handoff freeze the new HeptaCore governance baseline
- No product feature or production mutation is mixed into this Run

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->