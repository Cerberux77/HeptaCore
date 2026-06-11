---
type: master-dashboard
project: "HeptaCore"
status: active-production
phase: "Canonical Oreshnik task board governs current assignments"
last_updated: "2026-06-11T01:43:55.676Z"
mother_branch: "MADRE/v20-s-hc-maint-sync-01-preflight-remote-sync-obligatorio-2026-06-11"
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
| Task board actualizado | 2026-06-11T01:43:30.000Z |
| Rama madre | MADRE/v20-s-hc-maint-sync-01-preflight-remote-sync-obligatorio-2026-06-11 |
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
| S-HC-PROD-02 | ready | Jean | Production DB/Auth/env and Turpial seed smoke | S-HC-PROD-ALIGN |
| S-HC-PROD-03 | ready | Manuel | LLM provider adapter plus Turpial tenant functional QA and UX polish | S-HC-PROD-ALIGN |
| S-HC-PROD-04 | pending | Jean | Worker, Redis and persistent dry-run processing | S-HC-PROD-02 |
| S-HC-PROD-05 | pending | Manuel | Publishing gate UI, AuditLog and rollback proof | S-HC-PROD-03 |
| S-HC-PROD-06 | pending | Manuel | Oreshnik operator dashboard and canonical task board | S-HC-PROD-02, S-HC-PROD-03, S-HC-PROD-04, S-HC-PROD-05, S-HC-PROD-07, S-HC-PROD-08, S-HC-PROD-09, S-HC-PROD-10, S-HC-PROD-11 |
| S-HC-PROD-07 | pending | Manuel | Sales landing, client onboarding and login entry | S-HC-PROD-03 |
| S-HC-PROD-08 | pending | Manuel | Draft editor and post modification workflow | S-HC-PROD-03 |
| S-HC-PROD-09 | pending | Jean | Paid ads campaign engine with 35 percent overhead gate | S-HC-PROD-04 |
| S-HC-PROD-10 | pending | Manuel | Paid ads management UI and tenant billing surface | S-HC-PROD-05, S-HC-PROD-09 |
| S-HC-PROD-11 | pending | Jean | Paid scraper compliance and controlled discovery adapter | S-HC-PROD-04 |
| S-HC-MAINT-CLOSE-GATE-01 | ready | Manuel | Automatic closure validation gate before Oreshnik close | S-HC-MAINT-SYNC-01 |
| S-HC-RELEASE-01 | pending | Manuel+Jean | End-to-end Turpial Sound production proof | S-HC-PROD-02, S-HC-PROD-03, S-HC-PROD-04, S-HC-PROD-05, S-HC-PROD-06, S-HC-PROD-07, S-HC-PROD-08, S-HC-PROD-09, S-HC-PROD-10, S-HC-PROD-11 |

## Ready Ahora

| Sprint | Owner | Scope |
|---|---|---|
| S-HC-PROD-02 | Jean | Production DB/Auth/env and Turpial seed smoke |
| S-HC-PROD-03 | Manuel | LLM provider adapter plus Turpial tenant functional QA and UX polish |
| S-HC-MAINT-CLOSE-GATE-01 | Manuel | Automatic closure validation gate before Oreshnik close |

## Pendientes Bloqueados por Dependencias

| Sprint | Owner | Scope | Depende de |
|---|---|---|---|
| S-HC-PROD-04 | Jean | Worker, Redis and persistent dry-run processing | S-HC-PROD-02 |
| S-HC-PROD-05 | Manuel | Publishing gate UI, AuditLog and rollback proof | S-HC-PROD-03 |
| S-HC-PROD-06 | Manuel | Oreshnik operator dashboard and canonical task board | S-HC-PROD-02, S-HC-PROD-03, S-HC-PROD-04, S-HC-PROD-05, S-HC-PROD-07, S-HC-PROD-08, S-HC-PROD-09, S-HC-PROD-10, S-HC-PROD-11 |
| S-HC-PROD-07 | Manuel | Sales landing, client onboarding and login entry | S-HC-PROD-03 |
| S-HC-PROD-08 | Manuel | Draft editor and post modification workflow | S-HC-PROD-03 |
| S-HC-PROD-09 | Jean | Paid ads campaign engine with 35 percent overhead gate | S-HC-PROD-04 |
| S-HC-PROD-10 | Manuel | Paid ads management UI and tenant billing surface | S-HC-PROD-05, S-HC-PROD-09 |
| S-HC-PROD-11 | Jean | Paid scraper compliance and controlled discovery adapter | S-HC-PROD-04 |
| S-HC-RELEASE-01 | Manuel+Jean | End-to-end Turpial Sound production proof | S-HC-PROD-02, S-HC-PROD-03, S-HC-PROD-04, S-HC-PROD-05, S-HC-PROD-06, S-HC-PROD-07, S-HC-PROD-08, S-HC-PROD-09, S-HC-PROD-10, S-HC-PROD-11 |

## Reglas Activas

- No publicar en redes reales desde HeptaCore sin aprobacion explicita.
- No pedir ni commitear credenciales reales.
- No ejecutar scraping real.
- No gastar en campanas.
- No cerrar sprint sin actualizar vault, handoff y validaciones.
- No pisar trabajo del otro operador: usar preflight, zone check y canonical check.
