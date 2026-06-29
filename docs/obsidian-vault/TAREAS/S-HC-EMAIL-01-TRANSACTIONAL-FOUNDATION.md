<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION"
sprint: "email-infra"
status: "pending"
owner: "Jean"
last_updated: "2026-06-29T02:20:46.799Z"
source: "var/oreshnik/tasks/S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION.json"
---

# Task S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION

## Scope

Transactional email foundation: domain sender, DNS, reputation, provider integration

## Runtime

- estado: `pending`
- owner: `Jean`
- backup: `Manuel`
- intentos: `0`
- handoff: -

## Dependencias

- Ninguna

## Zonas

### Compat

- `apps/web/app/api/email`
- `packages/core`
- `docs`

### Read

- Ninguna

### Write

- Ninguna

## Aceptacion

- Dominio final de HeptaCore configurado como remitente autorizado
- DNS (SPF, DKIM, DMARC) verificado
- Proveedor de correo transaccional integrado (Resend, SendGrid o equivalente)
- Webhooks de eventos (delivered, bounced, complained) configurados
- Enlaces comerciales y de marca consistentes con el dominio final

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->