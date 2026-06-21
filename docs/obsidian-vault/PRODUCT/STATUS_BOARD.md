---
type: status-board
project: "HeptaCore"
last_updated: "2026-06-21T05:17:30.292Z"
generated_by: "Oreshnik canonical-check"
source: "var/oreshnik/task-board.json"
---

# STATUS BOARD - Realidad Canonica del Repositorio

> Fuente operativa: `var/oreshnik/task-board.json`. Si este documento contradice el task board, el preflight debe bloquear.

## Orden de Ejecucion Actual

- Fase completada: Baseline de publicacion recuperado y estabilizado (S-HC-REC-00A, SHA 2fd9e249). Facebook e Instagram publican realmente desde la UI con durabilidad transaccional.
- Fase completada: Integracion canonica (S-HC-REC-00C, SHA a25d1ca). Documentacion del repositorio actualizada.
- Siguiente fase: S-HC-PUB-02-MULTIFORMAT-PREVIEW — publicacion multiformato (Instagram Carousel, Stories, Facebook preview, asset manifest).
- Jean fuera de ruta critica. Responsabilidades pendientes reasignadas temporalmente a Manuel y al agente principal.

## Tareas Ready/Pending

| Sprint | Estado | Owner | Scope | Depende de |
|---|---|---|---|---|
| S-HC-REC-00B | cancelled | Manuel | Facebook duplicate cleanup | - |
| S-HC-PUB-02-MULTIFORMAT | pending | Manuel | Multiformat publishing: Instagram Carousel, Stories, Facebook preview, asset manifest | S-HC-REC-00C |

## Asignacion Manuel

| Sprint | Estado | Scope | Depende de |
|---|---|---|---|
| S-HC-REC-00B | cancelled | Facebook duplicate cleanup | - |
| S-HC-PUB-02-MULTIFORMAT | pending | Multiformat publishing: Instagram Carousel, Stories, Facebook preview, asset manifest | S-HC-REC-00C |

## Asignacion Jean

| Sprint | Estado | Scope | Depende de |
|---|---|---|---|
| Ninguno | - | - | - |


## Hard Stops Vigentes

- Facebook e Instagram publican realmente desde la UI con aprobacion y durabilidad transaccional. Errores ambiguos quedan bloqueados sin retry automatico.
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
| S-HC-REC-00A | Manuel | UI Publishing Baseline Recovery — production publishing stabilized |
| S-HC-REC-00C | Manuel | Canonical integration — recovered production baseline integrated into master |
| S-HC-PROD-02 | Jean | Production DB/Auth/env and Turpial seed smoke |
| S-HC-PROD-03 | Manuel | LLM provider adapter plus Turpial tenant functional QA and UX polish |
| S-HC-PROD-04 | Jean | Worker, Redis and persistent dry-run processing |
| S-HC-PROD-05 | Manuel | Publishing gate UI, AuditLog and rollback proof |
| S-HC-PROD-06 | Manuel | Oreshnik operator dashboard and canonical task board |
| S-HC-PROD-07 | Manuel | Sales landing, client onboarding and login entry |
| S-HC-PROD-08 | Manuel | Draft editor and post modification workflow |
| S-HC-RELEASE-01 | Manuel+Jean | End-to-end Turpial Sound production proof |
| S-HC-MAINT-ALIGN-01 | Manuel | Canonical task board and derived docs alignment gate |
| S-HC-DRIFT-001 | Manuel | sprint |
| S-HC-DRIFT-002 | Manuel | Codex multi-RRSS refactor, readiness gates, UI fixes, migrations, vercelignore |
| S-HC-DRIFT-003 | Manuel | Sistema de publicacion con 3 modos, 24 crons Vercel, cron publisher idempotente, QA Jean |

<!-- ORESHNIK:GENERATED:START -->
---
type: status-board
project: "HeptaCore"
last_updated: "2026-06-21T05:54:29.392Z"
generated_by: "Oreshnik canonical-check"
source: "var/oreshnik/task-board.json"
---

# STATUS BOARD - Realidad Canonica del Repositorio

> Fuente operativa: `var/oreshnik/task-board.json`. Si este documento contradice el task board, el preflight debe bloquear.

## Orden de Ejecucion Actual

- Fase completada: Baseline de publicacion recuperado y estabilizado (S-HC-REC-00A, SHA 2fd9e249). Facebook e Instagram publican realmente desde la UI con durabilidad transaccional.
- Fase completada: Integracion canonica (S-HC-REC-00C, SHA 0877376). Documentacion del repositorio actualizada.
- Fase completada: Oreshnik command layer ready (0.2.0-alpha.0). Reconcile check/write operational.
- Siguiente fase (parallel): S-HC-PUB-02-MULTIFORMAT-PREVIEW + S-HC-PUB-03-MULTITENANT-ASSETS.
- Jean fuera de ruta critica. Responsabilidades pendientes reasignadas temporalmente a Manuel y al agente principal.

## Tareas Ready/Pending

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

## Hard Stops Vigentes

- No credenciales en git.
- No sprint closure sin vault, handoff y validaciones.

## Sprints Cerrados Segun Task Board

| Sprint | Owner | Scope |
|---|---|---|
| S-HC-00 | Manuel | Foundation baseline commit |
| S-HC-01 | Jean | Console shell: tenant dashboard, onboarding, checklist, draft queue |
| S-HC-02 | Jean | Turpial importer and Prisma seed |
| S-HC-REC-00A | Manuel | UI Publishing Baseline Recovery — production publishing stabilized |
| S-HC-REC-00C | Manuel | Canonical integration — recovered production baseline integrated into master |
| S-HC-PROD-02 | Jean | Production DB/Auth/env and Turpial seed smoke |
| S-HC-RELEASE-01 | Manuel+Jean | End-to-end Turpial Sound production proof |
| S-HC-DRIFT-001 | Manuel | sprint |
| S-HC-DRIFT-002 | Manuel | Codex multi-RRSS refactor, readiness gates, UI fixes, migrations, vercelignore |
| S-HC-DRIFT-003 | Manuel | Sistema de publicacion con 3 modos, 24 crons Vercel, cron publisher idempotente |

<!-- ORESHNIK:GENERATED:END -->
