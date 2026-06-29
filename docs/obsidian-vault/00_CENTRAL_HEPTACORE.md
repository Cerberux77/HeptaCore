---
type: master-dashboard
project: "HeptaCore"
status: active-production
phase: "Canonical Oreshnik task board governs current assignments"
last_updated: "2026-06-29T02:30:08.611Z"
mother_branch: "MADRE/v47-s-hc-pub-03-multitenant-assets-multitenant-assets-metadata-compatibility-batch--2026-06-23"
tags:
  - "#central"
  - "#status/live-source"
---

# HeptaCore - Dashboard Canonico

> Fuente operativa compatible: `var/oreshnik/task-board.json`. Cuando existen artefactos durables por task/run, este board se reproyecta desde ellos y desde los journals de runtime antes de regenerar documentacion derivada.

## Estado Actual

| Campo | Valor |
|---|---|
| Task board actualizado | 2026-06-29T01:54:40.093Z |
| Rama madre | MADRE/v47-s-hc-pub-03-multitenant-assets-multitenant-assets-metadata-compatibility-batch--2026-06-23 |


## Orden de Ejecucion

- S-HC-PUB-04-HOURLY-BATCH-CRON
- S-HC-PUB-05-RECONCILIATION-OPS
- tooling
- ad-hoc
- ai-generation
- ai-infra
- analytics
- assets
- commercial
- data
- email-infra
- engagement
- foundation
- observability
- onboarding
- operations
- optimization
- product-ui
- production-infra
- publishing
- recovery
- release
- strategy
- support
- tenant-onboarding
- tenant-platform
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

## Tareas Abiertas

| Sprint | Estado | Owner | Scope | Depende de |
|---|---|---|---|---|
| S-HC-PUB-04-HOURLY-BATCH-CRON | integrated | Manuel | Hourly batch cron publishing with timezone-aware scheduling | S-HC-PUB-02-MULTIFORMAT-PREVIEW, S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-PUB-05-RECONCILIATION-OPS | integrated | Manuel | Operational reconciliation automation for ambiguous provider outcomes | S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-TOOL-01-GOAL-RUNNER-V1 | ready | Manuel | Goal Runner v1 for autonomous Kilo execution | S-HC-TEN-01-GLOBAL-TENANT-ADMIN |
| S-HC-AIGEN-01-ASSET-GENERATION-BROKER | blocked | Manuel | AI asset generation broker: provider-agnostic, metered and billed | S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST, S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE, S-HC-COMM-02-BILLING-ACTIVATION |
| S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE | ready | Manuel | LLM provider selection, cost estimation and governance policy | - |
| S-HC-AN-01-CAMPAIGN-PERFORMANCE | blocked | Manuel | Campaign performance analytics: reach, engagement, metrics per post and campaign | S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT, S-HC-OBS-01-PUBLISHING-OBSERVABILITY |
| S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST | blocked | Manuel | Strategy-driven asset manifest: per-publication asset requirements | S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT, S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-ASSET-02-FORMAT-DERIVATIVES | ready | Manuel | Format derivatives: badge interaction, format preview, intelligent crop, safe zones, asset variants | S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-COMM-01-SELF-SERVICE-SIGNUP | blocked | Manuel | Self-service tenant signup with trial gate and onboarding flow | S-HC-TEN-01-GLOBAL-TENANT-ADMIN, S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION |
| S-HC-COMM-02-BILLING-ACTIVATION | blocked | Manuel | Tenant billing activation: plan selection, usage tracking, payment integration | S-HC-COMM-01-SELF-SERVICE-SIGNUP |
| S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION | pending | Jean | Transactional email foundation: domain sender, DNS, reputation, provider integration | - |
| S-HC-INBOX-01-UNIFIED-ENGAGEMENT | blocked | Manuel | Unified engagement inbox: read and respond to messages and comments | S-HC-AN-01-CAMPAIGN-PERFORMANCE |
| S-HC-OBS-01-PUBLISHING-OBSERVABILITY | blocked | Manuel | Publishing observability: structured logging, metrics dashboard, alert thresholds | S-HC-PUB-05-RECONCILIATION-OPS |
| S-HC-ONB-01-MASTER-BRIEF-INGESTION | blocked | Manuel | Master document ingestion: extract structured info from company briefs | S-HC-COMM-02-BILLING-ACTIVATION |
| S-HC-ONB-02-GAP-RESOLUTION-WIZARD | blocked | Manuel | Gap resolution wizard: dynamic form to resolve missing or conflicting data | S-HC-ONB-01-MASTER-BRIEF-INGESTION |
| S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT | blocked | Manuel | Campaign review and deployment: batch approval, schedule, publish | S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT, S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST, S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-OPT-01-SENTIMENT-STRATEGY-ITERATION | blocked | Manuel | Sentiment-driven strategy iteration: results → improved strategy | S-HC-AN-01-CAMPAIGN-PERFORMANCE, S-HC-INBOX-01-UNIFIED-ENGAGEMENT |
| S-HC-PUB-06-REELS-STORIES-PUBLISHERS | ready | Manuel | Real publishing for Meta Reels and Stories: Instagram + Facebook | S-HC-PUB-03-MULTITENANT-ASSETS, S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-PUB-07-YOUTUBE-PUBLISHING | ready | Manuel | Real publishing for YouTube: Video 16:9 and YouTube Shorts | S-HC-PUB-03-MULTITENANT-ASSETS, S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-PUB-08-PLATFORM-FORMAT-PARITY | blocked | Manuel | Platform-format parity: manifest, preview, dry-run, scheduling and publishing for every supported format | S-HC-PUB-06-REELS-STORIES-PUBLISHERS, S-HC-PUB-07-YOUTUBE-PUBLISHING |
| S-HC-STRAT-01-MASTER-STRATEGY-WORKBENCH | blocked | Manuel | Master strategy workbench: LLM-powered strategy generation and conversational refinement | S-HC-ONB-02-GAP-RESOLUTION-WIZARD, S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE |
| S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT | blocked | Manuel | Content calendar blueprint: master publishing calendar from strategy | S-HC-STRAT-01-MASTER-STRATEGY-WORKBENCH |
| S-HC-SUP-01-ASSISTED-CUSTOMER-CHANNELS | blocked | Manuel | Assisted customer channels: LLM assistant, WhatsApp, email, human escalation | S-HC-COMM-02-BILLING-ACTIVATION |
| S-HC-TEN-02-CEPEG-ONBOARDING | blocked | Manuel | CEPEG tenant onboarding: brand, assets, network configuration | S-HC-TEN-01-GLOBAL-TENANT-ADMIN, S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT, S-HC-COMM-02-BILLING-ACTIVATION, S-HC-ONB-02-GAP-RESOLUTION-WIZARD, S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT, S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST |

## Ready Ahora

| Sprint | Owner | Scope |
|---|---|---|
| S-HC-TOOL-01-GOAL-RUNNER-V1 | Manuel | Goal Runner v1 for autonomous Kilo execution |
| S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE | Manuel | LLM provider selection, cost estimation and governance policy |
| S-HC-ASSET-02-FORMAT-DERIVATIVES | Manuel | Format derivatives: badge interaction, format preview, intelligent crop, safe zones, asset variants |
| S-HC-PUB-06-REELS-STORIES-PUBLISHERS | Manuel | Real publishing for Meta Reels and Stories: Instagram + Facebook |
| S-HC-PUB-07-YOUTUBE-PUBLISHING | Manuel | Real publishing for YouTube: Video 16:9 and YouTube Shorts |

## Pendientes Bloqueados por Dependencias

| Sprint | Owner | Scope | Depende de |
|---|---|---|---|
| S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION | Jean | Transactional email foundation: domain sender, DNS, reputation, provider integration | - |

## Integration Train Outcomes Recientes

| Sprint | Resultado | Madre | Task | Source | Compatibility | Advance |
|---|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - | - |
