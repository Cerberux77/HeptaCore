---
type: status-board
project: "HeptaCore"
last_updated: "2026-06-25T20:08:17.244Z"
generated_by: "Oreshnik canonical-check"
source: "var/oreshnik/task-board.json"
---

# STATUS BOARD - Realidad Canonica del Repositorio

> Fuente operativa: `var/oreshnik/task-board.json`. Si este documento contradice el task board, el preflight debe bloquear.

## Orden de Ejecucion Actual

- Fase completada: S-HC-TEN-01-GLOBAL-TENANT-ADMIN — tres roles canonicos (OWNER/ADMIN/VIEWER), normalizacion heredada, identidad en /admin y /tenant/*, 5/5 E2E en Preview (SHA 4b82628), 569 unit tests.
- Fase completada: S-HC-REC-00A — baseline de publicacion recuperado y estabilizado (SHA 2fd9e249). Facebook e Instagram publican realmente desde la UI con durabilidad transaccional.
- Fase completada: S-HC-REC-00C — integracion canonica en master (SHA 9329fe8). Documentacion y Oreshnik alineados.
- Fase completada: oreshnik-cli@0.2.0-alpha.0 publicado. reconcile --check/--write operacional.
- Fase completada: S-HC-PUB-02-MULTIFORMAT-PREVIEW — preview y dry-run multiformato para Instagram y Facebook.
- Fase completada: S-HC-PUB-03-MULTITENANT-ASSETS — biblioteca multi-tenant, metadata, compatibilidad, colecciones, inspector (SHA 31dd93e).
- Siguiente fase (un sprint por vez): S-HC-PUB-04-HOURLY-BATCH-CRON — batch cron publishing.
- Fase activa: S-HC-TOOL-01-GOAL-RUNNER-V1 — Goal Runner v1 para ejecucion autonoma de Kilo. Nucleo implementado, integrado con /goal y /preflight. Pendiente goal piloto y posterior integracion en rama madre.
- EMAIL-01 infraestructura de codigo preparada (modelos, templates, provider abstraction, webhook, Link-Only activo). Integracion externa bloqueada hasta dominio final.
- Modo operacional actual: EMAIL_PROVIDER=disabled. Invitaciones se entregan via enlace copiable (inviteLink). Correos reales: 0.
- Reels, Stories y YouTube forman parte obligatoria del alcance final de HeptaCore. Las combinaciones sin publisher real quedan pendientes de implementacion en PUB-06, PUB-07 o PUB-08.
- Jean fuera de ruta critica. Responsabilidades reasignadas a Manuel.

## Tareas Ready/Pending

| Sprint | Estado | Owner | Scope | Depende de |
|---|---|---|---|---|
| S-HC-PUB-04-HOURLY-BATCH-CRON | pending | Manuel | Hourly batch cron publishing with timezone-aware scheduling | S-HC-PUB-02-MULTIFORMAT-PREVIEW, S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-PUB-05-RECONCILIATION-OPS | pending | Manuel | Operational reconciliation automation for ambiguous provider outcomes | S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-PUB-06-REELS-STORIES-PUBLISHERS | pending | Manuel | Real publishing for Meta Reels and Stories: Instagram + Facebook | S-HC-PUB-03-MULTITENANT-ASSETS, S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-PUB-07-YOUTUBE-PUBLISHING | pending | Manuel | Real publishing for YouTube: Video 16:9 and YouTube Shorts | S-HC-PUB-03-MULTITENANT-ASSETS, S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-PUB-08-PLATFORM-FORMAT-PARITY | pending | Manuel | Platform-format parity: manifest, preview, dry-run, scheduling and publishing for every supported format | S-HC-PUB-06-REELS-STORIES-PUBLISHERS, S-HC-PUB-07-YOUTUBE-PUBLISHING |
| S-HC-OBS-01-PUBLISHING-OBSERVABILITY | pending | Manuel | Publishing observability: structured logging, metrics dashboard, alert thresholds | S-HC-PUB-05-RECONCILIATION-OPS |
| S-HC-TOOL-01-GOAL-RUNNER-V1 | active | Manuel | Goal Runner v1 for autonomous Kilo execution | S-HC-TEN-01-GLOBAL-TENANT-ADMIN |
| S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION | pending | Jean | Transactional email foundation: domain sender, DNS, reputation, provider integration | - |
| S-HC-COMM-01-SELF-SERVICE-SIGNUP | pending | Manuel | Self-service tenant signup with trial gate and onboarding flow | S-HC-TEN-01-GLOBAL-TENANT-ADMIN, S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION |
| S-HC-COMM-02-BILLING-ACTIVATION | pending | Manuel | Tenant billing activation: plan selection, usage tracking, payment integration | S-HC-COMM-01-SELF-SERVICE-SIGNUP |
| S-HC-ONB-01-MASTER-BRIEF-INGESTION | pending | Manuel | Master document ingestion: extract structured info from company briefs | S-HC-COMM-02-BILLING-ACTIVATION |
| S-HC-ONB-02-GAP-RESOLUTION-WIZARD | pending | Manuel | Gap resolution wizard: dynamic form to resolve missing or conflicting data | S-HC-ONB-01-MASTER-BRIEF-INGESTION |
| S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE | pending | Manuel | LLM provider selection, cost estimation and governance policy | - |
| S-HC-STRAT-01-MASTER-STRATEGY-WORKBENCH | pending | Manuel | Master strategy workbench: LLM-powered strategy generation and conversational refinement | S-HC-ONB-02-GAP-RESOLUTION-WIZARD, S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE |
| S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT | pending | Manuel | Content calendar blueprint: master publishing calendar from strategy | S-HC-STRAT-01-MASTER-STRATEGY-WORKBENCH |
| S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST | pending | Manuel | Strategy-driven asset manifest: per-publication asset requirements | S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT, S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-ASSET-02-FORMAT-DERIVATIVES | pending | Manuel | Format derivatives: badge interaction, format preview, intelligent crop, safe zones, asset variants | S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-AIGEN-01-ASSET-GENERATION-BROKER | pending | Manuel | AI asset generation broker: provider-agnostic, metered and billed | S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST, S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE, S-HC-COMM-02-BILLING-ACTIVATION |
| S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT | pending | Manuel | Campaign review and deployment: batch approval, schedule, publish | S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT, S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST, S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-SUP-01-ASSISTED-CUSTOMER-CHANNELS | pending | Manuel | Assisted customer channels: LLM assistant, WhatsApp, email, human escalation | S-HC-COMM-02-BILLING-ACTIVATION |
| S-HC-AN-01-CAMPAIGN-PERFORMANCE | pending | Manuel | Campaign performance analytics: reach, engagement, metrics per post and campaign | S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT, S-HC-OBS-01-PUBLISHING-OBSERVABILITY |
| S-HC-INBOX-01-UNIFIED-ENGAGEMENT | pending | Manuel | Unified engagement inbox: read and respond to messages and comments | S-HC-AN-01-CAMPAIGN-PERFORMANCE |
| S-HC-OPT-01-SENTIMENT-STRATEGY-ITERATION | pending | Manuel | Sentiment-driven strategy iteration: results → improved strategy | S-HC-AN-01-CAMPAIGN-PERFORMANCE, S-HC-INBOX-01-UNIFIED-ENGAGEMENT |
| S-HC-TEN-02-CEPEG-ONBOARDING | pending | Manuel | CEPEG tenant onboarding: brand, assets, network configuration | S-HC-TEN-01-GLOBAL-TENANT-ADMIN, S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT, S-HC-COMM-02-BILLING-ACTIVATION, S-HC-ONB-02-GAP-RESOLUTION-WIZARD, S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT, S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST |

## Asignacion Manuel

| Sprint | Estado | Scope | Depende de |
|---|---|---|---|
| S-HC-PUB-04-HOURLY-BATCH-CRON | pending | Hourly batch cron publishing with timezone-aware scheduling | S-HC-PUB-02-MULTIFORMAT-PREVIEW, S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-PUB-05-RECONCILIATION-OPS | pending | Operational reconciliation automation for ambiguous provider outcomes | S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-PUB-06-REELS-STORIES-PUBLISHERS | pending | Real publishing for Meta Reels and Stories: Instagram + Facebook | S-HC-PUB-03-MULTITENANT-ASSETS, S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-PUB-07-YOUTUBE-PUBLISHING | pending | Real publishing for YouTube: Video 16:9 and YouTube Shorts | S-HC-PUB-03-MULTITENANT-ASSETS, S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-PUB-08-PLATFORM-FORMAT-PARITY | pending | Platform-format parity: manifest, preview, dry-run, scheduling and publishing for every supported format | S-HC-PUB-06-REELS-STORIES-PUBLISHERS, S-HC-PUB-07-YOUTUBE-PUBLISHING |
| S-HC-OBS-01-PUBLISHING-OBSERVABILITY | pending | Publishing observability: structured logging, metrics dashboard, alert thresholds | S-HC-PUB-05-RECONCILIATION-OPS |
| S-HC-TOOL-01-GOAL-RUNNER-V1 | active | Goal Runner v1 for autonomous Kilo execution | S-HC-TEN-01-GLOBAL-TENANT-ADMIN |
| S-HC-COMM-01-SELF-SERVICE-SIGNUP | pending | Self-service tenant signup with trial gate and onboarding flow | S-HC-TEN-01-GLOBAL-TENANT-ADMIN, S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION |
| S-HC-COMM-02-BILLING-ACTIVATION | pending | Tenant billing activation: plan selection, usage tracking, payment integration | S-HC-COMM-01-SELF-SERVICE-SIGNUP |
| S-HC-ONB-01-MASTER-BRIEF-INGESTION | pending | Master document ingestion: extract structured info from company briefs | S-HC-COMM-02-BILLING-ACTIVATION |
| S-HC-ONB-02-GAP-RESOLUTION-WIZARD | pending | Gap resolution wizard: dynamic form to resolve missing or conflicting data | S-HC-ONB-01-MASTER-BRIEF-INGESTION |
| S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE | pending | LLM provider selection, cost estimation and governance policy | - |
| S-HC-STRAT-01-MASTER-STRATEGY-WORKBENCH | pending | Master strategy workbench: LLM-powered strategy generation and conversational refinement | S-HC-ONB-02-GAP-RESOLUTION-WIZARD, S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE |
| S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT | pending | Content calendar blueprint: master publishing calendar from strategy | S-HC-STRAT-01-MASTER-STRATEGY-WORKBENCH |
| S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST | pending | Strategy-driven asset manifest: per-publication asset requirements | S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT, S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-ASSET-02-FORMAT-DERIVATIVES | pending | Format derivatives: badge interaction, format preview, intelligent crop, safe zones, asset variants | S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-AIGEN-01-ASSET-GENERATION-BROKER | pending | AI asset generation broker: provider-agnostic, metered and billed | S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST, S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE, S-HC-COMM-02-BILLING-ACTIVATION |
| S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT | pending | Campaign review and deployment: batch approval, schedule, publish | S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT, S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST, S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-SUP-01-ASSISTED-CUSTOMER-CHANNELS | pending | Assisted customer channels: LLM assistant, WhatsApp, email, human escalation | S-HC-COMM-02-BILLING-ACTIVATION |
| S-HC-AN-01-CAMPAIGN-PERFORMANCE | pending | Campaign performance analytics: reach, engagement, metrics per post and campaign | S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT, S-HC-OBS-01-PUBLISHING-OBSERVABILITY |
| S-HC-INBOX-01-UNIFIED-ENGAGEMENT | pending | Unified engagement inbox: read and respond to messages and comments | S-HC-AN-01-CAMPAIGN-PERFORMANCE |
| S-HC-OPT-01-SENTIMENT-STRATEGY-ITERATION | pending | Sentiment-driven strategy iteration: results → improved strategy | S-HC-AN-01-CAMPAIGN-PERFORMANCE, S-HC-INBOX-01-UNIFIED-ENGAGEMENT |
| S-HC-TEN-02-CEPEG-ONBOARDING | pending | CEPEG tenant onboarding: brand, assets, network configuration | S-HC-TEN-01-GLOBAL-TENANT-ADMIN, S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT, S-HC-COMM-02-BILLING-ACTIVATION, S-HC-ONB-02-GAP-RESOLUTION-WIZARD, S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT, S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST |

## Asignacion Jean

| Sprint | Estado | Scope | Depende de |
|---|---|---|---|
| S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION | pending | Transactional email foundation: domain sender, DNS, reputation, provider integration | - |

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
| S-HC-TEN-01-GLOBAL-TENANT-ADMIN | Manuel | Global tenant administration and provisioning |
| S-HC-00 | Manuel | Foundation baseline commit |
| S-HC-01 | Jean | Console shell: tenant dashboard, onboarding, checklist, draft queue |
| S-HC-02 | Jean | Turpial importer and Prisma seed |
| S-HC-REC-00A | Manuel | UI Publishing Baseline Recovery — production publishing stabilized |
| S-HC-REC-00B | Manuel | Facebook duplicate cleanup |
| S-HC-REC-00C | Manuel | Canonical integration — recovered production baseline integrated into master |
| S-HC-PUB-02-MULTIFORMAT-PREVIEW | Manuel | Multiformat preview and dry-run: format model, asset manifest, platform previews, validations |
| S-HC-PUB-03-MULTITENANT-ASSETS | Manuel | Multi-tenant asset management: upload, replace, metadata extraction, compatibility classification |
| S-HC-PROD-02 | Jean | Production DB/Auth/env and Turpial seed smoke |
| S-HC-RELEASE-01 | Manuel+Jean | End-to-end Turpial Sound production proof |
| S-HC-DRIFT-001 | Manuel | sprint |
| S-HC-DRIFT-002 | Manuel | Codex multi-RRSS refactor, readiness gates, UI fixes, migrations, vercelignore |
| S-HC-DRIFT-003 | Manuel | Sistema de publicacion con 3 modos, 24 crons Vercel, cron publisher idempotente |
