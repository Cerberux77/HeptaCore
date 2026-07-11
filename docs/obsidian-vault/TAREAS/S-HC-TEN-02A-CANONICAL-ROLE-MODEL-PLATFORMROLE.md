<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-TEN-02A-CANONICAL-ROLE-MODEL-PLATFORMROLE"
sprint: "tenant-platform"
status: "integrated"
owner: "Manuel"
last_updated: "2026-07-11T19:09:07.244Z"
source: "var/oreshnik/tasks/S-HC-TEN-02A-CANONICAL-ROLE-MODEL-PLATFORMROLE.json"
---

# Task S-HC-TEN-02A-CANONICAL-ROLE-MODEL-PLATFORMROLE

## Scope

Canonical platform and tenant role model repair

## Runtime

- estado: `integrated`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `0`
- handoff: docs/oreshnik/S-HC-TEN-02A-CANONICAL-ROLE-MODEL-PLATFORMROLE.md

## Dependencias

- S-HC-TEN-01-GLOBAL-TENANT-ADMIN

## Zonas

### Compat

- `packages/db/**`
- `apps/web/lib/**`
- `apps/web/app/**`
- `scripts/**`
- `docs/**`
- `var/oreshnik/**`

### Read

- Ninguna

### Write

- Ninguna

## Aceptacion

- SUPER_ADMIN is stored only on User.platformRole
- Membership.role keeps only TENANT_ADMIN and PUBLISHER as functional roles
- First-password and recovery flows are hardened
- Legacy repair is idempotent and aborts on ambiguous roles
- PR #7 and alpha.15 adoption remain untouched

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->
