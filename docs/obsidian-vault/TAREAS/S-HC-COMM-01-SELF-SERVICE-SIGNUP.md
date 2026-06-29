<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-COMM-01-SELF-SERVICE-SIGNUP"
sprint: "commercial"
status: "blocked"
owner: "Manuel"
last_updated: "2026-06-29T00:37:30.040Z"
source: "var/oreshnik/tasks/S-HC-COMM-01-SELF-SERVICE-SIGNUP.json"
---

# Task S-HC-COMM-01-SELF-SERVICE-SIGNUP

## Scope

Self-service tenant signup with trial gate and onboarding flow

## Runtime

- estado: `blocked`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `0`
- handoff: -

## Dependencias

- S-HC-TEN-01-GLOBAL-TENANT-ADMIN
- S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION

## Zonas

### Compat

- `apps/web/app/register`
- `apps/web/app/api/auth`
- `packages/db`
- `apps/web/components`

### Read

- Ninguna

### Write

- Ninguna

## Aceptacion

- Self-service registration with email verification
- Trial tenant creation with default config
- Guided onboarding wizard (brand, networks, first draft)
- Trial gate enforcement before publishing

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->