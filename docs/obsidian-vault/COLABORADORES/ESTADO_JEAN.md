---
type: collaborator-status
project: "HeptaCore"
operator: "Jean"
last_updated: "2026-06-29T02:59:31.141Z"
generated_by: "Oreshnik canonical-check"
source: "var/oreshnik/task-board.json"
---

# Estado Jean

> Documento derivado. `var/oreshnik/task-board.json` es la proyeccion compatible que debe mantenerse alineada con los artefactos durables de runtime.

## Ready

| Sprint | Scope | Depende de |
|---|---|---|
| Ninguno | - | - |

## Pending

| Sprint | Scope | Depende de |
|---|---|---|
| S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION | Transactional email foundation: domain sender, DNS, reputation, provider integration | - |

## Detalle de Aceptacion

### S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION - Transactional email foundation: domain sender, DNS, reputation, provider integration

Estado: `pending`

- Dominio final de HeptaCore configurado como remitente autorizado
- DNS (SPF, DKIM, DMARC) verificado
- Proveedor de correo transaccional integrado (Resend, SendGrid o equivalente)
- Webhooks de eventos (delivered, bounced, complained) configurados
- Enlaces comerciales y de marca consistentes con el dominio final

Zonas: `apps/web/app/api/email`, `packages/core`, `docs`

