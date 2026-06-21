---
type: master-dashboard
project: "HeptaCore"
status: active-production
phase: "Production baseline stabilized — S-HC-REC-00C canonical integration complete"
last_updated: "2026-06-21T05:17:30.292Z"
mother_branch: "MADRE/v45-s-hc-rec-00c-canonical-integration-after-recovery-2026-06-21"
tags:
  - "#central"
  - "#status/production-stable"
  - "#manuel"
  - "#heptacore"
---

# HeptaCore - Dashboard Canonico

> Fuente operativa: `var/oreshnik/task-board.json`. Los documentos de colaborador y status son derivados y deben ser regenerados si cambian las asignaciones.

## Estado Actual

| Campo | Valor |
|---|---|
| Task board actualizado | 2026-06-21T05:15:00.000Z |
| Rama madre | MADRE/v45-s-hc-rec-00c-canonical-integration-after-recovery-2026-06-21 |
| Produccion estable | `2fd9e24929ffe1022cf9521ed0f13888f30accbd` (heptacore.vercel.app) |
| Facebook / Instagram | Publican realmente desde la UI con durabilidad transaccional |
| Errores ambiguos | Bloqueados sin retry automatico; reconciliacion manual via IN_REVIEW |
| Tests | 156 (155 publish-flow + 1 calendar-state) |
| Campaign spend | Bloqueado |
| Real scraping | Bloqueado |
| S-HC-REC-00A | CERRADO |
| S-HC-REC-00B | CANCELADO (Manuel elimino manualmente el duplicado en Facebook) |
| S-HC-REC-00C | CERRADO |
| Siguiente fase | S-HC-PUB-02-MULTIFORMAT-PREVIEW — publicacion multiformato |
| Jean | Fuera de ruta critica; responsabilidades reasignadas a Manuel y agente principal |

## Orden de Ejecucion

- Fase completada: Baseline de publicacion recuperado y estabilizado (S-HC-REC-00A, SHA 2fd9e249). Facebook e Instagram publican realmente desde la UI con durabilidad transaccional.
- Fase completada: Integracion canonica (S-HC-REC-00C, SHA a25d1ca). Documentacion del repositorio actualizada.
- Siguiente fase: S-HC-PUB-02-MULTIFORMAT-PREVIEW — publicacion multiformato (Instagram Carousel, Stories, Facebook preview, asset manifest).
- Jean fuera de ruta critica. Responsabilidades pendientes reasignadas temporalmente a Manuel y al agente principal.

## Tareas Abiertas

| Sprint | Estado | Owner | Scope | Depende de |
|---|---|---|---|---|
| S-HC-REC-00B | cancelled | Manuel | Facebook duplicate cleanup | - |
| S-HC-PUB-02-MULTIFORMAT | pending | Manuel | Multiformat publishing: Instagram Carousel, Stories, Facebook preview, asset manifest | S-HC-REC-00C |

## Ready Ahora

| Sprint | Owner | Scope |
|---|---|---|
| Ninguno | - | - |

## Pendientes Bloqueados por Dependencias

| Sprint | Owner | Scope | Depende de |
|---|---|---|---|
| S-HC-PUB-02-MULTIFORMAT | Manuel | Multiformat publishing: Instagram Carousel, Stories, Facebook preview, asset manifest | S-HC-REC-00C |

## Reglas Activas

- Facebook e Instagram publican realmente desde la UI con aprobacion y durabilidad transaccional.
- Errores ambiguos del proveedor quedan bloqueados sin retry automatico.
- No pedir ni commitear credenciales reales.
- No ejecutar scraping real.
- No gastar en campanas.
- No cerrar sprint sin actualizar vault, handoff y validaciones.
- No pisar trabajo del otro operador: usar preflight, zone check y canonical check.

<!-- ORESHNIK:GENERATED:START -->
---
type: master-dashboard
project: "HeptaCore"
status: active-production
phase: "Canonical Oreshnik task board governs current assignments"
last_updated: "2026-06-21T05:54:29.386Z"
mother_branch: "MADRE/v45-s-hc-rec-00c-canonical-integration-after-recovery-2026-06-21"
tags:
  - "#central"
  - "#status/live-source"
---

# HeptaCore - Dashboard Canonico

> Fuente operativa: `var/oreshnik/task-board.json`. Los documentos de colaborador y status son derivados y deben ser regenerados si cambian las asignaciones.

## Estado Actual

| Campo | Valor |
|---|---|
| Task board actualizado | 2026-06-21T05:30:00.000Z |
| Rama madre | MADRE/v45-s-hc-rec-00c-canonical-integration-after-recovery-2026-06-21 |


## Orden de Ejecucion

- Fase completada: Baseline de publicacion recuperado y estabilizado (S-HC-REC-00A, SHA 2fd9e249). Facebook e Instagram publican realmente desde la UI con durabilidad transaccional.
- Fase completada: Integracion canonica (S-HC-REC-00C, SHA 0877376). Documentacion del repositorio actualizada.
- Fase completada: Oreshnik command layer ready (0.2.0-alpha.0). Reconcile check/write operational.
- Siguiente fase (parallel): S-HC-PUB-02-MULTIFORMAT-PREVIEW + S-HC-PUB-03-MULTITENANT-ASSETS.
- Jean fuera de ruta critica. Responsabilidades pendientes reasignadas temporalmente a Manuel y al agente principal.

## Tareas Abiertas

| Sprint | Estado | Owner | Scope | Depende de |
|---|---|---|---|---|
| S-HC-REC-00B | cancelled | Manuel | Facebook duplicate cleanup | - |
| S-HC-PUB-02-MULTIFORMAT-PREVIEW | pending | Manuel | Multiformat preview and dry-run: Instagram Carousel, Stories, Facebook preview, asset manifest | S-HC-REC-00C |
| S-HC-PUB-03-MULTITENANT-ASSETS | pending | Manuel | Multi-tenant asset management: upload, replace, reorganize across tenants | S-HC-REC-00C |
| S-HC-PUB-04-HOURLY-BATCH-CRON | pending | Manuel | Scheduled cron batch publishing with timezone-aware scheduling | S-HC-PUB-02-MULTIFORMAT-PREVIEW, S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-PUB-05-RECONCILE | pending | Manuel | Operational reconciliation automation for ambiguous provider outcomes | S-HC-PUB-02-MULTIFORMAT-PREVIEW, S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-OBS-01 | pending | Manuel | Observability: structured logging, metrics dashboard, alert thresholds | S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-COMM-01-SIGNUP | pending | Manuel | Self-service tenant signup with trial gate and onboarding flow | S-HC-REC-00C |
| S-HC-COMM-02-BILLING | pending | Manuel | Tenant billing: plan selection, usage tracking, payment integration | S-HC-COMM-01-SIGNUP |
| S-HC-TEN-02-CEPEG | pending | Manuel | CEPEQ tenant onboarding: brand, assets, network configuration | S-HC-COMM-01-SIGNUP |

## Ready Ahora

| Sprint | Owner | Scope |
|---|---|---|
| Ninguno | - | - |

## Pendientes Bloqueados por Dependencias

| Sprint | Owner | Scope | Depende de |
|---|---|---|---|
| S-HC-PUB-02-MULTIFORMAT-PREVIEW | Manuel | Multiformat preview and dry-run: Instagram Carousel, Stories, Facebook preview, asset manifest | S-HC-REC-00C |
| S-HC-PUB-03-MULTITENANT-ASSETS | Manuel | Multi-tenant asset management: upload, replace, reorganize across tenants | S-HC-REC-00C |
| S-HC-PUB-04-HOURLY-BATCH-CRON | Manuel | Scheduled cron batch publishing with timezone-aware scheduling | S-HC-PUB-02-MULTIFORMAT-PREVIEW, S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-PUB-05-RECONCILE | Manuel | Operational reconciliation automation for ambiguous provider outcomes | S-HC-PUB-02-MULTIFORMAT-PREVIEW, S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-OBS-01 | Manuel | Observability: structured logging, metrics dashboard, alert thresholds | S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-COMM-01-SIGNUP | Manuel | Self-service tenant signup with trial gate and onboarding flow | S-HC-REC-00C |
| S-HC-COMM-02-BILLING | Manuel | Tenant billing: plan selection, usage tracking, payment integration | S-HC-COMM-01-SIGNUP |
| S-HC-TEN-02-CEPEG | Manuel | CEPEQ tenant onboarding: brand, assets, network configuration | S-HC-COMM-01-SIGNUP |

<!-- ORESHNIK:GENERATED:END -->
