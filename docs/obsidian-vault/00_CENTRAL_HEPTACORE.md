---
type: master-dashboard
project: "HeptaCore"
status: active-production
phase: "Canonical Oreshnik task board governs current assignments"
last_updated: "2026-06-14T08:48:10.009Z"
mother_branch: "MADRE/v44-s-hc-maint-align-01-qa-review-fixes-de-11-tareas-jean-sistema-de-pub-2026-06-14"
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
| Task board actualizado | 2026-06-14T08:47:00.166Z |
| Rama madre | MADRE/v44-s-hc-maint-align-01-qa-review-fixes-de-11-tareas-jean-sistema-de-pub-2026-06-14 |
| Publicacion RRSS real | Bloqueada hasta aprobacion explicita |
| Campaign spend | Bloqueado |
| Real scraping | Bloqueado |

## Orden de Ejecucion

- Wave 1 parallel: Jean S-HC-PROD-02, Manuel S-HC-PROD-03 (LLM provider adapter + Turpial tenant QA)
- Wave 2 parallel: Jean S-HC-PROD-04, Manuel S-HC-PROD-05 after S-HC-PROD-03
- Wave 3 parallel: Jean S-HC-PROD-09/S-HC-PROD-11, Manuel S-HC-PROD-07/S-HC-PROD-08/S-HC-PROD-10 after core proof
- Wave 4 sequential: S-HC-PROD-06 control bus/dashboard after PROD-02/03/04/05/07/08/09/10/11
- Final: S-HC-RELEASE-01 end-to-end Turpial Sound production proof
- tarea-para-turpialsound-y-mantis-embeber-videos
- configurar-sprints-oreshnik-configurar-los-spri
- eliminar-restricciones-publicaci-n-en-heptacore
- hay-algo-que-no-entiendo-y-que-necesito-que-me-r
- en-la-cola-de-draft-de-heptacore-algunos-draft
- en-heptacore-quiero-agregar-la-posibilidad-de-in
- el-proceso-de-carga-de-activos-en-heptacore-en
- en-la-seccion-de-asstes-de-heptacore-debe-existi
- el-card-proximo-primer-hito-en-heptacore-d
- en-el-cronograma-de-heptacore-que-significa-el
- en-heptacore-la-seccion-checklist-no-se-si-esta
- en-heptacore-dashboard-reportes-quisiera-algo
- en-publicacion-heptacore-muestra-cards-de-readi
- en-el-dashboard-de-admn-global-en-heptacore-los
- para-heptacore-implementar-la-posibilidad-de-ed
- en-heptacore-eliminar-bloqueos-desactivar-los-b
- implementar-inicio-de-heptacore-se-debe-cambia
- para-heptacore-interactuar-tableros-configurar
- para-heptacore-incluir-hora-incorporar-el-par-m
- el-modal-de-admin-llm-en-heptacore-debe-tener-un
- como-publica-heptacore-posts-programados-si-estoy-offline

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
