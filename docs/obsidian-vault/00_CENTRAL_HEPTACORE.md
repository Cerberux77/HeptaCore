---
type: master-dashboard
project: "HeptaCore"
status: active-production
phase: "Canonical Oreshnik task board governs current assignments"
last_updated: "2026-06-11T03:20:09.431Z"
mother_branch: "MADRE/v34-s-hc-release-01-e2e-turpial-sound-production-proof-2026-06-11"
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
| Task board actualizado | 2026-06-11T03:19:41.362Z |
| Rama madre | MADRE/v34-s-hc-release-01-e2e-turpial-sound-production-proof-2026-06-11 |
| Publicacion RRSS real | Bloqueada hasta aprobacion explicita |
| Campaign spend | Bloqueado |
| Real scraping | Bloqueado |

## Orden de Ejecucion

- Wave 1 parallel: Jean S-HC-PROD-02, Manuel S-HC-PROD-03 (LLM provider adapter + Turpial tenant QA)
- Wave 2 parallel: Jean S-HC-PROD-04, Manuel S-HC-PROD-05 after S-HC-PROD-03
- Wave 3 parallel: Jean S-HC-PROD-09/S-HC-PROD-11, Manuel S-HC-PROD-07/S-HC-PROD-08/S-HC-PROD-10 after core proof
- Wave 4 sequential: S-HC-PROD-06 control bus/dashboard after PROD-02/03/04/05/07/08/09/10/11
- Final: S-HC-RELEASE-01 end-to-end Turpial Sound production proof

## Tareas Abiertas

| Sprint | Estado | Owner | Scope | Depende de |
|---|---|---|---|---|


## Ready Ahora

| Sprint | Owner | Scope |
|---|---|---|
| Ninguno | - | - |

## Pendientes Bloqueados por Dependencias

| Sprint | Owner | Scope | Depende de |
|---|---|---|---|
| Ninguno | - | - |

## Reglas Activas

- No publicar en redes reales desde HeptaCore sin aprobacion explicita.
- No pedir ni commitear credenciales reales.
- No ejecutar scraping real.
- No gastar en campanas.
- No cerrar sprint sin actualizar vault, handoff y validaciones.
- No pisar trabajo del otro operador: usar preflight, zone check y canonical check.
