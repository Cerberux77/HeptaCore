---
type: master-dashboard
project: "HeptaCore"
status: active-production
phase: "Canonical Oreshnik task board governs current assignments"
last_updated: "2026-06-21T19:09:31.241Z"
mother_branch: "MADRE/v46-s-hc-pub-02-multiformat-preview-multiformat-previews-deterministic-auth-approval-2026-06-21"
tags:
  - "#central"
  - "#status/live-source"
  - "#manuel"
  - "#jean"
  - "#heptacore"
---

# HeptaCore - Dashboard Canonico

> Fuente operativa: `var/oreshnik/task-board.json`. Los documentos de colaborador y status son derivados y deben ser regenerados si cambian las asignaciones.

## Estado Actual

| Campo | Valor |
|---|---|
| Task board actualizado | 2026-06-21T19:08:48.084Z |
| Rama madre | MADRE/v46-s-hc-pub-02-multiformat-preview-multiformat-previews-deterministic-auth-approval-2026-06-21 |
| Publicacion RRSS real | Bloqueada hasta aprobacion explicita |
| Campaign spend | Bloqueado |
| Real scraping | Bloqueado |

## Orden de Ejecucion

- Fase completada: S-HC-REC-00A — baseline de publicacion recuperado y estabilizado (SHA 2fd9e249). Facebook e Instagram publican realmente desde la UI con durabilidad transaccional.
- Fase completada: S-HC-REC-00C — integracion canonica en master (SHA e1fef06). Documentacion y Oreshnik alineados.
- Fase completada: oreshnik-cli@0.2.0-alpha.0 publicado. reconcile --check/--write operacional.
- Fase activa (un sprint por vez): S-HC-PUB-02-MULTIFORMAT-PREVIEW.
- S-HC-COMM-01-SELF-SERVICE-SIGNUP permanece pendiente. S-HC-PUB-03-MULTITENANT-ASSETS depende de PUB-02.
- Jean fuera de ruta critica. Responsabilidades reasignadas a Manuel.

## Tareas Abiertas

| Sprint | Estado | Owner | Scope | Depende de |
|---|---|---|---|---|
| S-HC-REC-00B | cancelled | Manuel | Facebook duplicate cleanup | - |
| S-HC-PUB-03-MULTITENANT-ASSETS | pending | Manuel | Multi-tenant asset management: upload, replace, reorganize across tenants | S-HC-PUB-02-MULTIFORMAT-PREVIEW |
| S-HC-PUB-04-HOURLY-BATCH-CRON | pending | Manuel | Hourly batch cron publishing with timezone-aware scheduling | S-HC-PUB-02-MULTIFORMAT-PREVIEW, S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-PUB-05-RECONCILIATION-OPS | pending | Manuel | Operational reconciliation automation for ambiguous provider outcomes | S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-OBS-01-PUBLISHING-OBSERVABILITY | pending | Manuel | Publishing observability: structured logging, metrics dashboard, alert thresholds | S-HC-PUB-05-RECONCILIATION-OPS |
| S-HC-COMM-01-SELF-SERVICE-SIGNUP | pending | Manuel | Self-service tenant signup with trial gate and onboarding flow | S-HC-REC-00C |
| S-HC-COMM-02-BILLING-ACTIVATION | pending | Manuel | Tenant billing activation: plan selection, usage tracking, payment integration | S-HC-COMM-01-SELF-SERVICE-SIGNUP |
| S-HC-TEN-02-CEPEG-ONBOARDING | pending | Manuel | CEPEG tenant onboarding: brand, assets, network configuration | S-HC-PUB-03-MULTITENANT-ASSETS, S-HC-COMM-01-SELF-SERVICE-SIGNUP |

## Ready Ahora

| Sprint | Owner | Scope |
|---|---|---|
| Ninguno | - | - |

## Pendientes Bloqueados por Dependencias

| Sprint | Owner | Scope | Depende de |
|---|---|---|---|
| S-HC-PUB-03-MULTITENANT-ASSETS | Manuel | Multi-tenant asset management: upload, replace, reorganize across tenants | S-HC-PUB-02-MULTIFORMAT-PREVIEW |
| S-HC-PUB-04-HOURLY-BATCH-CRON | Manuel | Hourly batch cron publishing with timezone-aware scheduling | S-HC-PUB-02-MULTIFORMAT-PREVIEW, S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-PUB-05-RECONCILIATION-OPS | Manuel | Operational reconciliation automation for ambiguous provider outcomes | S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-OBS-01-PUBLISHING-OBSERVABILITY | Manuel | Publishing observability: structured logging, metrics dashboard, alert thresholds | S-HC-PUB-05-RECONCILIATION-OPS |
| S-HC-COMM-01-SELF-SERVICE-SIGNUP | Manuel | Self-service tenant signup with trial gate and onboarding flow | S-HC-REC-00C |
| S-HC-COMM-02-BILLING-ACTIVATION | Manuel | Tenant billing activation: plan selection, usage tracking, payment integration | S-HC-COMM-01-SELF-SERVICE-SIGNUP |
| S-HC-TEN-02-CEPEG-ONBOARDING | Manuel | CEPEG tenant onboarding: brand, assets, network configuration | S-HC-PUB-03-MULTITENANT-ASSETS, S-HC-COMM-01-SELF-SERVICE-SIGNUP |

## Reglas Activas

- No publicar en redes reales desde HeptaCore sin aprobacion explicita.
- No pedir ni commitear credenciales reales.
- No ejecutar scraping real.
- No gastar en campanas.
- No cerrar sprint sin actualizar vault, handoff y validaciones.
- No pisar trabajo del otro operador: usar preflight, zone check y canonical check.
