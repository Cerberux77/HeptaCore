---
type: status-board
project: "HeptaCore"
last_updated: "2026-06-21T19:09:31.241Z"
generated_by: "Oreshnik canonical-check"
source: "var/oreshnik/task-board.json"
---

# STATUS BOARD - Realidad Canonica del Repositorio

> Fuente operativa: `var/oreshnik/task-board.json`. Si este documento contradice el task board, el preflight debe bloquear.

## Orden de Ejecucion Actual

- Fase completada: S-HC-REC-00A — baseline de publicacion recuperado y estabilizado (SHA 2fd9e249). Facebook e Instagram publican realmente desde la UI con durabilidad transaccional.
- Fase completada: S-HC-REC-00C — integracion canonica en master (SHA e1fef06). Documentacion y Oreshnik alineados.
- Fase completada: oreshnik-cli@0.2.0-alpha.0 publicado. reconcile --check/--write operacional.
- Fase activa (un sprint por vez): S-HC-PUB-02-MULTIFORMAT-PREVIEW.
- S-HC-COMM-01-SELF-SERVICE-SIGNUP permanece pendiente. S-HC-PUB-03-MULTITENANT-ASSETS depende de PUB-02.
- Jean fuera de ruta critica. Responsabilidades reasignadas a Manuel.

## Tareas Ready/Pending

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

## Asignacion Manuel

| Sprint | Estado | Scope | Depende de |
|---|---|---|---|
| S-HC-REC-00B | cancelled | Facebook duplicate cleanup | - |
| S-HC-PUB-03-MULTITENANT-ASSETS | pending | Multi-tenant asset management: upload, replace, reorganize across tenants | S-HC-PUB-02-MULTIFORMAT-PREVIEW |
| S-HC-PUB-04-HOURLY-BATCH-CRON | pending | Hourly batch cron publishing with timezone-aware scheduling | S-HC-PUB-02-MULTIFORMAT-PREVIEW, S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-PUB-05-RECONCILIATION-OPS | pending | Operational reconciliation automation for ambiguous provider outcomes | S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-OBS-01-PUBLISHING-OBSERVABILITY | pending | Publishing observability: structured logging, metrics dashboard, alert thresholds | S-HC-PUB-05-RECONCILIATION-OPS |
| S-HC-COMM-01-SELF-SERVICE-SIGNUP | pending | Self-service tenant signup with trial gate and onboarding flow | S-HC-REC-00C |
| S-HC-COMM-02-BILLING-ACTIVATION | pending | Tenant billing activation: plan selection, usage tracking, payment integration | S-HC-COMM-01-SELF-SERVICE-SIGNUP |
| S-HC-TEN-02-CEPEG-ONBOARDING | pending | CEPEG tenant onboarding: brand, assets, network configuration | S-HC-PUB-03-MULTITENANT-ASSETS, S-HC-COMM-01-SELF-SERVICE-SIGNUP |

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
| S-HC-REC-00A | Manuel | UI Publishing Baseline Recovery — production publishing stabilized |
| S-HC-REC-00C | Manuel | Canonical integration — recovered production baseline integrated into master |
| S-HC-PUB-02-MULTIFORMAT-PREVIEW | Manuel | Multiformat preview and dry-run: format model, asset manifest, platform previews, validations |
| S-HC-PROD-02 | Jean | Production DB/Auth/env and Turpial seed smoke |
| S-HC-RELEASE-01 | Manuel+Jean | End-to-end Turpial Sound production proof |
| S-HC-DRIFT-001 | Manuel | sprint |
| S-HC-DRIFT-002 | Manuel | Codex multi-RRSS refactor, readiness gates, UI fixes, migrations, vercelignore |
| S-HC-DRIFT-003 | Manuel | Sistema de publicacion con 3 modos, 24 crons Vercel, cron publisher idempotente |
