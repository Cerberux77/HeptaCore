---
type: status-board
project: HeptaCore
last_updated: "2026-06-13T21:13:30.800Z"
generated_by: Oreshnik CLI
source: var/oreshnik/task-board.json
---

# STATUS BOARD - HeptaCore

> Fuente operativa: var/oreshnik/task-board.json

## Orden de Ejecucion

1. Wave 1 parallel: Jean S-HC-PROD-02, Manuel S-HC-PROD-03 (LLM provider adapter + Turpial tenant QA)
2. Wave 2 parallel: Jean S-HC-PROD-04, Manuel S-HC-PROD-05 after S-HC-PROD-03
3. Wave 3 parallel: Jean S-HC-PROD-09/S-HC-PROD-11, Manuel S-HC-PROD-07/S-HC-PROD-08/S-HC-PROD-10 after core proof
4. Wave 4 sequential: S-HC-PROD-06 control bus/dashboard after PROD-02/03/04/05/07/08/09/10/11
5. Final: S-HC-RELEASE-01 end-to-end Turpial Sound production proof
6. tarea-para-turpialsound-y-mantis-embeber-videos
7. configurar-sprints-oreshnik-configurar-los-spri
8. eliminar-restricciones-publicaci-n-en-heptacore
9. hay-algo-que-no-entiendo-y-que-necesito-que-me-r
10. en-la-cola-de-draft-de-heptacore-algunos-draft
11. en-heptacore-quiero-agregar-la-posibilidad-de-in
12. el-proceso-de-carga-de-activos-en-heptacore-en
13. en-la-seccion-de-asstes-de-heptacore-debe-existi
14. el-card-proximo-primer-hito-en-heptacore-d
15. en-el-cronograma-de-heptacore-que-significa-el
16. en-heptacore-la-seccion-checklist-no-se-si-esta
17. en-heptacore-dashboard-reportes-quisiera-algo
18. en-publicacion-heptacore-muestra-cards-de-readi
19. en-el-dashboard-de-admn-global-en-heptacore-los
20. para-heptacore-implementar-la-posibilidad-de-ed
21. en-heptacore-eliminar-bloqueos-desactivar-los-b
22. implementar-inicio-de-heptacore-se-debe-cambia
23. para-heptacore-interactuar-tableros-configurar
24. para-heptacore-incluir-hora-incorporar-el-par-m
25. el-modal-de-admin-llm-en-heptacore-debe-tener-un

## Tareas Ready/Pending

| Sprint | Estado | Owner | Scope | Depende de |
|---|---|---|---|---|
| eliminar-restricciones-publicaci-n-en-heptacore | ready | Jean | Eliminar Restricciones Publicación en heptacore: E |  |
| hay-algo-que-no-entiendo-y-que-necesito-que-me-r | ready | Jean | Hay algo que no entiendo y que necesito que me res |  |
| en-la-cola-de-draft-de-heptacore-algunos-draft | ready | Jean | en la cola de draft de heptacore, algunos draft me |  |
| en-heptacore-quiero-agregar-la-posibilidad-de-in | ready | Jean | En heptacore quiero agregar la posibilidad de inco |  |
| el-proceso-de-carga-de-activos-en-heptacore-en | ready | Jean | el proceso de carga de activos en heptacore  en el |  |
| en-la-seccion-de-asstes-de-heptacore-debe-existi | ready | Jean | en la seccion de asstes de heptacore debe existir  |  |
| el-card-proximo-primer-hito-en-heptacore-d | ready | Jean | el card “proximo” “primer hito” en heptacore , deb |  |
| en-el-cronograma-de-heptacore-que-significa-el | ready | Jean | en el cronograma de heptacore, que significa el ch |  |
| en-heptacore-la-seccion-checklist-no-se-si-esta | ready | Jean | en heptacore  la seccion checklist no se si esta f |  |
| en-heptacore-dashboard-reportes-quisiera-algo | ready | Jean | en heptacore, dashboard, reportes, quisiera algo m |  |
| en-publicacion-heptacore-muestra-cards-de-readi | ready | Manuel | en publicacion, heptacore muestra cards de readine |  |
| en-el-dashboard-de-admn-global-en-heptacore-los | ready | Manuel | en el dashboard de admn global en heptacore los ca |  |
| para-heptacore-implementar-la-posibilidad-de-ed | ready | Manuel | para heptacore: Implementar la posibilidad de edit |  |
| en-heptacore-eliminar-bloqueos-desactivar-los-b | ready | Manuel | en heptacore Eliminar bloqueos: Desactivar los blo |  |
| implementar-inicio-de-heptacore-se-debe-cambia | ready | Manuel | Implementar inicio de heptacore : se debe cambiar  |  |
| para-heptacore-interactuar-tableros-configurar | ready | architect | para heptacore Interactuar tableros: Configurar la |  |
| para-heptacore-incluir-hora-incorporar-el-par-m | ready | architect | para heptacore Incluir hora: Incorporar el parámet |  |
| el-modal-de-admin-llm-en-heptacore-debe-tener-un | ready | architect | el modal de admin llm en heptacore debe tener un b |  |

## Hard Stops

- No credenciales en git.

## Sprints Cerrados

| Sprint | Owner | Scope |
|---|---|---|
| S-HC-00 | Manuel | Foundation baseline commit |
| S-HC-01 | Jean | Console shell: tenant dashboard, onboarding, check |
| S-HC-02 | Jean | Turpial importer and Prisma seed |
| S-HC-03 | Jean | Agent strategy runner |
| S-HC-04 | Jean | Auth, RBAC and tenant guards |
| S-HC-05 | Jean | Approval queue and human gates |
| S-HC-06 | Jean | Worker queue with retries and tenant scope |
| S-HC-07 | Jean | Turpial tenant dashboard report |
| S-HC-08 | Jean | Meta adapter sandbox design |
| S-HC-09 | Jean | First tenant publish readiness gate |
| S-HC-PROD-02 | Jean | Production DB/Auth/env and Turpial seed smoke |
| S-HC-PROD-03 | Manuel | LLM provider adapter plus Turpial tenant functiona |
| S-HC-PROD-04 | Jean | Worker, Redis and persistent dry-run processing |
| S-HC-PROD-05 | Manuel | Publishing gate UI, AuditLog and rollback proof |
| S-HC-PROD-06 | Manuel | Oreshnik operator dashboard and canonical task boa |
