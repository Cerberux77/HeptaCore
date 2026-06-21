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
