<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-TEN-02A-CANONICAL-ROLE-MODEL-PLATFORMROLE"
sprint: "tenant-platform"
status: "in_progress"
owner: "Manuel"
last_updated: "2026-07-09T00:00:00.000Z"
source: "var/oreshnik/tasks/S-HC-TEN-02A-CANONICAL-ROLE-MODEL-PLATFORMROLE.json"
---

# Task S-HC-TEN-02A-CANONICAL-ROLE-MODEL-PLATFORMROLE

## Scope

Repair the platform and tenant role model so `SUPER_ADMIN` lives only on `User.platformRole` and tenant memberships keep only `TENANT_ADMIN` and `PUBLISHER`.

## Runtime

- estado: `in_progress`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `0`
- handoff: `docs/oreshnik/S-HC-TEN-02A-CANONICAL-ROLE-MODEL-PLATFORMROLE.md`

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

- `SUPER_ADMIN` se almacena solo en `User.platformRole`
- `Membership.role` queda restringido a `TENANT_ADMIN` y `PUBLISHER`
- `activeTenantId` no concede autorizacion
- primer password y recovery quedan endurecidos
- la reparacion heredada aborta si encuentra roles ambiguos

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->
