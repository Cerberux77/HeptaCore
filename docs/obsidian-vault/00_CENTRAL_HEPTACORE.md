---
type: master-dashboard
project: "HeptaCore"
status: active-production
phase: "S-HC-REC-00C canonical integration — production baseline stabilized"
last_updated: "2026-06-21T04:30:00.000Z"
mother_branch: "MADRE/v44-s-hc-maint-align-01-qa-review-fixes-de-11-tareas-jean-sistema-de-pub-2026-06-14"
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
| Task board actualizado | 2026-06-21T04:30:00.000Z |
| Rama madre | MADRE/v44-s-hc-maint-align-01-qa-review-fixes-de-11-tareas-jean-sistema-de-pub-2026-06-14 |
| Produccion estable | `2fd9e24929ffe1022cf9521ed0f13888f30accbd` (heptacore.vercel.app) |
| Facebook / Instagram | Publican realmente desde la UI con aprobacion y durabilidad transaccional |
| Errores ambiguos | Bloqueados sin retry automatico; reconciliacion manual requerida |
| Tests | 156 (publish-flow: 155 + calendar-state: 1) |
| Campaign spend | Bloqueado |
| Real scraping | Bloqueado |
| S-HC-REC-00A | CERRADO — baseline de publicacion recuperado y estabilizado |
| S-HC-REC-00B | CANCELADO — Manuel elimino manualmente el duplicado en Facebook |
| S-HC-REC-00C | EN CURSO — integracion canonica |
| Siguiente fase | Publicacion multiformato (S-HC-PUB-02-MULTIFORMAT-PREVIEW) |
| Jean | Fuera de ruta critica; responsabilidades pendientes reasignadas temporalmente a Manuel y agente principal |

## Orden de Ejecucion

- Fase actual: S-HC-REC-00C — integracion canonica del baseline productivo
- Siguiente: S-HC-PUB-02-MULTIFORMAT-PREVIEW — publicacion multiformato (Instagram Carousel, Stories, Facebook preview)
- Backlog: S-HC-PROD-06 (reconciliacion automatica, mutation testing), Asset lifecycle sprint

## Tareas Abiertas

| Sprint | Estado | Owner | Scope | Depende de |
|---|---|---|---|---|
| S-HC-REC-00C | EN CURSO | Manuel | Integracion canonica del baseline productivo | S-HC-REC-00A |
| S-HC-PUB-02-MULTIFORMAT | PENDIENTE | Manuel | Publicacion multiformato: Carousel, Stories, previews | S-HC-REC-00C |

## Ready Ahora

| Sprint | Owner | Scope |
|---|---|---|
| Ninguno | - | - |

## Pendientes Bloqueados por Dependencias

| Sprint | Owner | Scope | Depende de |
|---|---|---|---|
| S-HC-PROD-06 | Manuel | Control bus, reconcilacion automatica, mutation testing | S-HC-PUB-02 |
| Asset lifecycle | Manuel | Helpers / asset lifecycle | S-HC-PUB-02 |

## Reasignacion Temporal (Jean → Manuel + Agente Principal)

Jean queda fuera de la ruta critica. Sus responsabilidades pendientes se reasignan a Manuel y al agente principal hasta nuevo aviso de Oreshnik o decision del Arquitecto.

## Pendientes Bloqueados por Dependencias

| Sprint | Owner | Scope | Depende de |
|---|---|---|---|
| Ninguno | - | - |

## Reglas Activas

- Publicacion en Facebook e Instagram es operativa desde la UI con aprobacion y durabilidad transaccional.
- Errores ambiguos del proveedor quedan bloqueados sin retry automatico.
- No pedir ni commitear credenciales reales.
- No ejecutar scraping real.
- No gastar en campanas.
- No cerrar sprint sin actualizar vault, handoff y validaciones.
- No pisar trabajo del otro operador: usar preflight, zone check y canonical check.
