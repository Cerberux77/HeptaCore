---
type: status-board
project: "HeptaCore"
last_updated: "2026-06-21T04:49:24.876Z"
generated_by: "Oreshnik canonical-check"
source: "var/oreshnik/task-board.json"
---

# STATUS BOARD - Realidad Canonica del Repositorio

> Fuente operativa: `var/oreshnik/task-board.json`. Si este documento contradice el task board, el preflight debe bloquear.

## Orden de Ejecucion Actual

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

## Tareas Ready/Pending

| Sprint | Estado | Owner | Scope | Depende de |
|---|---|---|---|---|


## Asignacion Manuel

| Sprint | Estado | Scope | Depende de |
|---|---|---|---|
| Ninguno | - | - | - |


## Asignacion Jean

| Sprint | Estado | Scope | Depende de |
|---|---|---|---|
| Ninguno | - | - | - |


## Hard Stops Vigentes

- No real RRSS publishing sin desbloqueo explicito.
- No campaign spend.
- No real scraping.
- No credenciales en git.
- No Prisma/schema/auth/security changes sin doble lock cuando aplique.
- No sprint closure sin vault, handoff y validaciones.

## Sprints Cerrados Segun Task Board

| Sprint | Owner | Scope |
|---|---|---|
| S-HC-00 | Manuel | Foundation baseline commit |
| S-HC-01 | Jean | Console shell: tenant dashboard, onboarding, checklist, draft queue |
| S-HC-02 | Jean | Turpial importer and Prisma seed |
| S-HC-03 | Jean | Agent strategy runner |
| S-HC-04 | Jean | Auth, RBAC and tenant guards |
| S-HC-05 | Jean | Approval queue and human gates |
| S-HC-06 | Jean | Worker queue with retries and tenant scope |
| S-HC-07 | Jean | Turpial tenant dashboard report |
| S-HC-08 | Jean | Meta adapter sandbox design |
| S-HC-09 | Jean | First tenant publish readiness gate |
| S-HC-PROD-02 | Jean | Production DB/Auth/env and Turpial seed smoke |
| S-HC-PROD-03 | Manuel | LLM provider adapter plus Turpial tenant functional QA and UX polish |
| S-HC-PROD-04 | Jean | Worker, Redis and persistent dry-run processing |
| S-HC-PROD-05 | Manuel | Publishing gate UI, AuditLog and rollback proof |
| S-HC-PROD-06 | Manuel | Oreshnik operator dashboard and canonical task board |
| S-HC-PROD-07 | Manuel | Sales landing, client onboarding and login entry |
| S-HC-PROD-08 | Manuel | Draft editor and post modification workflow |
| S-HC-PROD-09 | Jean | Paid ads campaign engine with 35 percent overhead gate |
| S-HC-PROD-10 | Manuel | Paid ads management UI and tenant billing surface |
| S-HC-PROD-11 | Jean | Paid scraper compliance and controlled discovery adapter |
| S-HC-MAINT-ALIGN-01 | Manuel | Canonical task board and derived docs alignment gate |
| S-HC-MAINT-PUSH-01 | Manuel | Mandatory remote push on every Oreshnik close |
| S-HC-MAINT-SYNC-01 | Manuel | Mandatory remote fast-forward and divergence gate in preflight |
| S-HC-MAINT-CLOSE-GATE-01 | Manuel | Automatic closure validation gate before Oreshnik close |
| S-HC-MAINT-MOTHER-SYNC-01 | Manuel | Automatic canonical merge for newer MADRE branches |
| S-HC-MAINT-CLOSE-SPAWN-01 | Manuel | Remove shell warning from closure validation gate |
| S-HC-JEAN-ALIGN | Jean | Oreshnik + Worker alignment (Plan Maestro Sprint 10/11) |
| S-HC-RELEASE-01 | Manuel+Jean | End-to-end Turpial Sound production proof |
| S-HC-DRIFT-001 | Manuel | sprint |
| S-HC-DRIFT-002 | Manuel | Codex multi-RRSS refactor, readiness gates, UI fixes, migrations, vercelignore |
| eliminar-restricciones-publicaci-n-en-heptacore | Jean | Eliminar Restricciones Publicación en heptacore: Eliminar los bloqueos estrictos en el panel de administración. Habilitar la autorización necesaria para realizar publicaciones manuales de contenido. |
| hay-algo-que-no-entiendo-y-que-necesito-que-me-r | Jean | Hay algo que no entiendo y que necesito que me respondas respecto a heptacore. al momento de entrar en el dashboard del tenant, en este caso turpialsoun desde el dashboard en heptacore, hay un car cli |
| en-la-cola-de-draft-de-heptacore-algunos-draft | Jean | en la cola de draft de heptacore, algunos draft me dan la opcion de aprobar, otros ya no me dan la opcion, posiblemente porque ya los aprobe, pero en el card “aprobados” aparecen 0 “listos para public |
| en-heptacore-quiero-agregar-la-posibilidad-de-in | Jean | En heptacore quiero agregar la posibilidad de incorporar una nueva publicacion, debe funcionar asi: va a ser una opcion “agregar publicacion” al darle a ese boton un modal me solicita el activo o acti |
| el-proceso-de-carga-de-activos-en-heptacore-en | Jean | el proceso de carga de activos en heptacore  en el boton de activos, tiene una seccion de **Assets y configuraciones pendientes**  que indica de manera general como debe ser el formato de archivo para |
| en-la-seccion-de-asstes-de-heptacore-debe-existi | Jean | en la seccion de asstes de heptacore debe existir la posibilidad de reemplazar un archivo por otro, cambiar nombre, si cambia el nombre la estrategia lo debe reemplazar como corresponda. |
| el-card-proximo-primer-hito-en-heptacore-d | Jean | el card “proximo” “primer hito” en heptacore , debe ser dinamico es decir indicar el estado de la siguiente publicacion, no se a que se riefiere con primer hito, revisar eso y proponer. |
| en-el-cronograma-de-heptacore-que-significa-el | Jean | en el cronograma de heptacore, que significa el chip “low” que funcion real tiene? incluye in microtexto con hoover que lo explique y que permita una accion para cambiar ese estado o resolverlo. |
| en-heptacore-la-seccion-checklist-no-se-si-esta | Jean | en heptacore  la seccion checklist no se si esta funcionando debinadmente, por ejemplo estoy viendo que requiere “al menos un draft aprobado” pero ya he aprobado varios y no puedo publicar. tambien fa |
| en-heptacore-dashboard-reportes-quisiera-algo | Jean | en heptacore, dashboard, reportes, quisiera algo mas visual, replantealo |
| en-publicacion-heptacore-muestra-cards-de-readi | Manuel | en publicacion, heptacore muestra cards de readiness, pero los que no estan completados, por ejemplo “draft 0” o “token”, “cuenta”, “assets” si faltan, deben ser cliqueables y llevarme al sitio donde  |
| en-el-dashboard-de-admn-global-en-heptacore-los | architect | en el dashboard de admn global en heptacore los cards de estado no son clickables ni llevan a la seccion donde debo supervisar la accion o ejecutarla esto debe resolverse. el modo approval\_required n |
| para-heptacore-implementar-la-posibilidad-de-ed | Manuel | para heptacore: Implementar la posibilidad de editar y gestionar publicaciones directamente dentro de la cola de borradores. esta mejora se hizo pero los cambios no se estan guardando. se ve cuando lo |
| en-heptacore-eliminar-bloqueos-desactivar-los-b | Manuel | en heptacore Eliminar bloqueos: Desactivar los bloqueos manuales para habilitar el flujo de publicación real hacia el entorno de producción. |
| implementar-inicio-de-heptacore-se-debe-cambia | Manuel | Implementar inicio de heptacore : se debe cambiar la regla que impide que al entrar en la pagina en producción me lleva directamente al dashboard, creo que ocurre porque la cookie no caduca *\*valida  |
| para-heptacore-interactuar-tableros-configurar | architect | para heptacore Interactuar tableros: Configurar las tarjetas del tablero como elementos cliqueables para facilitar la navegación a las acciones de gestión. |
| para-heptacore-incluir-hora-incorporar-el-par-m | architect | para heptacore Incluir hora: Incorporar el parámetro de hora de venezuela en el diseño de la estrategia para optimizar el alcance de las publicaciones, debes incorporar un boton para cambiar la zona h |
| el-modal-de-admin-llm-en-heptacore-debe-tener-un | architect | el modal de admin llm en heptacore debe tener un boton que permita simular el costo aproximado de la creacion de una estrategia, debe leer los datos cargados del tenant, analizar el producto, y estima |
| como-publica-heptacore-posts-programados-si-estoy-offline | Jean | confirma o explica como va a ser la publicacion de un determinado post programado segun calendario si estoy offline? se supone que el sistema debe publicar desde la pagina tomando los assets y estrategia y horarios en la pagina web, pero me queda la duda porque no tengo cron definido en ese repo, no quiero pagar por un servicio de terceros, como lo resuelve heptacore que opciones tengo cual es tu propuesta |
| S-HC-DRIFT-003 | Manuel | Sistema de publicacion con 3 modos (dry_run/scheduled/immediate), 24 crons Vercel Hobby compatibles, cron publisher con idempotencia transaccional, QA + fixes de 11 tareas Jean (checklist, asset rename/upload, risk tooltip, nueva publicacion modal, reports visual, milestone dinamico, restricciones estructurales) |
