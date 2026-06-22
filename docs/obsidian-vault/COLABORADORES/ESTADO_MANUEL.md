---
type: collaborator-status
project: "HeptaCore"
operator: "Manuel"
last_updated: "2026-06-21T19:09:31.241Z"
generated_by: "Oreshnik canonical-check"
source: "var/oreshnik/task-board.json"
---

# Estado Manuel

> Documento derivado. La fuente operativa es `var/oreshnik/task-board.json`.

## Ready

| Sprint | Scope | Depende de |
|---|---|---|
| Ninguno | - | - |

## Pending

| Sprint | Scope | Depende de |
|---|---|---|
| S-HC-PUB-03-MULTITENANT-ASSETS | Multi-tenant asset management: upload, replace, reorganize across tenants | S-HC-PUB-02-MULTIFORMAT-PREVIEW |
| S-HC-PUB-04-HOURLY-BATCH-CRON | Hourly batch cron publishing with timezone-aware scheduling | S-HC-PUB-02-MULTIFORMAT-PREVIEW, S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-PUB-05-RECONCILIATION-OPS | Operational reconciliation automation for ambiguous provider outcomes | S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-OBS-01-PUBLISHING-OBSERVABILITY | Publishing observability: structured logging, metrics dashboard, alert thresholds | S-HC-PUB-05-RECONCILIATION-OPS |
| S-HC-COMM-01-SELF-SERVICE-SIGNUP | Self-service tenant signup with trial gate and onboarding flow | S-HC-REC-00C |
| S-HC-COMM-02-BILLING-ACTIVATION | Tenant billing activation: plan selection, usage tracking, payment integration | S-HC-COMM-01-SELF-SERVICE-SIGNUP |
| S-HC-TEN-02-CEPEG-ONBOARDING | CEPEG tenant onboarding: brand, assets, network configuration | S-HC-PUB-03-MULTITENANT-ASSETS, S-HC-COMM-01-SELF-SERVICE-SIGNUP |

## Detalle de Aceptacion

### S-HC-REC-00B - Facebook duplicate cleanup

Estado: `cancelled`



Zonas: -

### S-HC-PUB-03-MULTITENANT-ASSETS - Multi-tenant asset management: upload, replace, reorganize across tenants

Estado: `pending`

- Asset upload con tenant scoping
- Asset replacement preserva audit log
- Asset reorganization (move, rename, delete)
- Multi-format validation (images, video)
- Preview before publish

Zonas: `apps/web/app/api/tenant-assets`, `apps/web/components`, `packages/core`

### S-HC-PUB-04-HOURLY-BATCH-CRON - Hourly batch cron publishing with timezone-aware scheduling

Estado: `pending`

- Batch cron procesa multiples posts programados por hora
- Timezone-aware scheduling per tenant
- Rate limiting per platform
- Failure isolation (un post falla, los demas continuan)
- Cron idempotency preservada

Zonas: `apps/web/app/api/cron`, `apps/worker`, `packages/core`

### S-HC-PUB-05-RECONCILIATION-OPS - Operational reconciliation automation for ambiguous provider outcomes

Estado: `pending`

- Automatic reconciliation for Case A (Result ok + externalPostId + incomplete Draft)
- Alert-only for Case B (Draft.externalPostId present + Result absent)
- Block and notify for Case C (no evidence)
- Never auto-retry provider calls

Zonas: `apps/web/lib/publishing-finalization.ts`, `apps/web/lib/draft-operational-state.ts`, `packages/core`

### S-HC-OBS-01-PUBLISHING-OBSERVABILITY - Publishing observability: structured logging, metrics dashboard, alert thresholds

Estado: `pending`

- Structured logging with correlation IDs
- Publishing metrics dashboard (attempts, failures, latency)
- Alert thresholds for provider failures
- Daily digest summarizing publishing activity

Zonas: `apps/web`, `packages/core`, `docs`

### S-HC-COMM-01-SELF-SERVICE-SIGNUP - Self-service tenant signup with trial gate and onboarding flow

Estado: `pending`

- Self-service registration with email verification
- Trial tenant creation with default config
- Guided onboarding wizard (brand, networks, first draft)
- Trial gate enforcement before publishing

Zonas: `apps/web/app/register`, `apps/web/app/api/auth`, `packages/db`, `apps/web/components`

### S-HC-COMM-02-BILLING-ACTIVATION - Tenant billing activation: plan selection, usage tracking, payment integration

Estado: `pending`

- Plan selection (Free, Pro, Agency)
- Usage tracking (posts, assets, tenants)
- Payment gateway integration (Stripe)
- Invoice generation and history

Zonas: `apps/web/app/api/billing`, `packages/db`, `apps/web/components`

### S-HC-TEN-02-CEPEG-ONBOARDING - CEPEG tenant onboarding: brand, assets, network configuration

Estado: `pending`

- CEPEG tenant seeded with brand identity
- Asset upload and organization for CEPEG
- Facebook/Instagram network configuration
- Initial strategy draft generated

Zonas: `examples/tenants/cepeg`, `apps/web`, `packages/db`

<!-- ORESHNIK:GENERATED:START -->
---
type: collaborator-status
project: "HeptaCore"
operator: "Manuel"
last_updated: "2026-06-22T19:33:37.361Z"
generated_by: "Oreshnik canonical-check"
source: "var/oreshnik/task-board.json"
---

# Estado Manuel

> Documento derivado. La fuente operativa es `var/oreshnik/task-board.json`.

## Ready

| Sprint | Scope | Depende de |
|---|---|---|
| Ninguno | - | - |

## Pending

| Sprint | Scope | Depende de |
|---|---|---|
| S-HC-PUB-04-HOURLY-BATCH-CRON | Hourly batch cron publishing with timezone-aware scheduling | S-HC-PUB-02-MULTIFORMAT-PREVIEW, S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-PUB-05-RECONCILIATION-OPS | Operational reconciliation automation for ambiguous provider outcomes | S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-OBS-01-PUBLISHING-OBSERVABILITY | Publishing observability: structured logging, metrics dashboard, alert thresholds | S-HC-PUB-05-RECONCILIATION-OPS |
| S-HC-COMM-01-SELF-SERVICE-SIGNUP | Self-service tenant signup with trial gate and onboarding flow | S-HC-REC-00C |
| S-HC-COMM-02-BILLING-ACTIVATION | Tenant billing activation: plan selection, usage tracking, payment integration | S-HC-COMM-01-SELF-SERVICE-SIGNUP |
| S-HC-ONB-01-MASTER-BRIEF-INGESTION | Master document ingestion: extract structured info from company briefs | S-HC-COMM-02-BILLING-ACTIVATION |
| S-HC-ONB-02-GAP-RESOLUTION-WIZARD | Gap resolution wizard: dynamic form to resolve missing or conflicting data | S-HC-ONB-01-MASTER-BRIEF-INGESTION |
| S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE | LLM provider selection, cost estimation and governance policy | - |
| S-HC-STRAT-01-MASTER-STRATEGY-WORKBENCH | Master strategy workbench: LLM-powered strategy generation and conversational refinement | S-HC-ONB-02-GAP-RESOLUTION-WIZARD, S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE |
| S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT | Content calendar blueprint: master publishing calendar from strategy | S-HC-STRAT-01-MASTER-STRATEGY-WORKBENCH |
| S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST | Strategy-driven asset manifest: per-publication asset requirements | S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT, S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-AIGEN-01-ASSET-GENERATION-BROKER | AI asset generation broker: provider-agnostic, metered and billed | S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST, S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE, S-HC-COMM-02-BILLING-ACTIVATION |
| S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT | Campaign review and deployment: batch approval, schedule, publish | S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT, S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST, S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-SUP-01-ASSISTED-CUSTOMER-CHANNELS | Assisted customer channels: LLM assistant, WhatsApp, email, human escalation | S-HC-COMM-02-BILLING-ACTIVATION |
| S-HC-AN-01-CAMPAIGN-PERFORMANCE | Campaign performance analytics: reach, engagement, metrics per post and campaign | S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT, S-HC-OBS-01-PUBLISHING-OBSERVABILITY |
| S-HC-INBOX-01-UNIFIED-ENGAGEMENT | Unified engagement inbox: read and respond to messages and comments | S-HC-AN-01-CAMPAIGN-PERFORMANCE |
| S-HC-OPT-01-SENTIMENT-STRATEGY-ITERATION | Sentiment-driven strategy iteration: results → improved strategy | S-HC-AN-01-CAMPAIGN-PERFORMANCE, S-HC-INBOX-01-UNIFIED-ENGAGEMENT |
| S-HC-TEN-02-CEPEG-ONBOARDING | CEPEG tenant onboarding: brand, assets, network configuration | S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT, S-HC-COMM-02-BILLING-ACTIVATION, S-HC-ONB-02-GAP-RESOLUTION-WIZARD, S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT, S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST |

## Detalle de Aceptacion

### S-HC-REC-00B - Facebook duplicate cleanup

Estado: `cancelled`



Zonas: -

### S-HC-PUB-03-MULTITENANT-ASSETS - Multi-tenant asset management: upload, replace, metadata extraction, compatibility classification

Estado: `active`

- Upload persistente en Vercel Blob (heptacore-assets, publico, tenant-scoped)
- Asset replacement preserva audit log
- Asset reorganization (move, rename, delete)
- Extraccion automatica de metadata al subir o reemplazar: width, height, sizeBytes, MIME, durationSeconds para video, orientacion, aspect ratio
- Persistencia de metadata en Asset.metadata
- Recalculo de metadata despues de reemplazar contenido
- Clasificacion central por formato: IDEAL, USABLE, INCOMPATIBLE
- Compatibilidad por plataforma: Instagram Feed, Instagram Carousel, Instagram Story, Instagram Reel, Facebook Feed imagen, Facebook Feed video, Facebook Story/Reel, YouTube Short, YouTube Video 16:9
- Badges visibles en la biblioteca de activos por formato
- Filtros por red, formato, orientacion y compatibilidad
- Reutilizacion de publishing-formats.ts sin reglas paralelas
- Assets legacy continuan funcionando
- Cero llamadas a proveedores sociales
- Preview antes de publish
- BLOB_READ_WRITE_TOKEN documentado como requerido (sin exponer valor)
- Codigo base en commit c78d71d20451cc73e446d2c6053421029cd29d42

Zonas: `apps/web/app/api/tenant-assets`, `apps/web/components`, `packages/core`, `apps/web/lib/publishing-formats.ts`

### S-HC-PUB-04-HOURLY-BATCH-CRON - Hourly batch cron publishing with timezone-aware scheduling

Estado: `pending`

- Batch cron procesa multiples posts programados por hora
- Timezone-aware scheduling per tenant
- Rate limiting per platform
- Failure isolation (un post falla, los demas continuan)
- Cron idempotency preservada

Zonas: `apps/web/app/api/cron`, `apps/worker`, `packages/core`

### S-HC-PUB-05-RECONCILIATION-OPS - Operational reconciliation automation for ambiguous provider outcomes

Estado: `pending`

- Automatic reconciliation for Case A (Result ok + externalPostId + incomplete Draft)
- Alert-only for Case B (Draft.externalPostId present + Result absent)
- Block and notify for Case C (no evidence)
- Never auto-retry provider calls

Zonas: `apps/web/lib/publishing-finalization.ts`, `apps/web/lib/draft-operational-state.ts`, `packages/core`

### S-HC-OBS-01-PUBLISHING-OBSERVABILITY - Publishing observability: structured logging, metrics dashboard, alert thresholds

Estado: `pending`

- Structured logging with correlation IDs
- Publishing metrics dashboard (attempts, failures, latency)
- Alert thresholds for provider failures
- Daily digest summarizing publishing activity

Zonas: `apps/web`, `packages/core`, `docs`

### S-HC-COMM-01-SELF-SERVICE-SIGNUP - Self-service tenant signup with trial gate and onboarding flow

Estado: `pending`

- Self-service registration with email verification
- Trial tenant creation with default config
- Guided onboarding wizard (brand, networks, first draft)
- Trial gate enforcement before publishing

Zonas: `apps/web/app/register`, `apps/web/app/api/auth`, `packages/db`, `apps/web/components`

### S-HC-COMM-02-BILLING-ACTIVATION - Tenant billing activation: plan selection, usage tracking, payment integration

Estado: `pending`

- Plan selection (Free, Pro, Agency)
- Usage tracking (posts, assets, tenants)
- Payment gateway integration (Stripe)
- Invoice generation and history

Zonas: `apps/web/app/api/billing`, `packages/db`, `apps/web/components`

### S-HC-ONB-01-MASTER-BRIEF-INGESTION - Master document ingestion: extract structured info from company briefs

Estado: `pending`

- Upload master document (PDF, DOCX, Markdown, texto)
- Extract structured information: brand, product, audience, tone
- Identify data gaps, contradictions and ambiguous zones
- Store as structured tenant context

Zonas: `apps/web/components`, `packages/core`, `packages/agents`

### S-HC-ONB-02-GAP-RESOLUTION-WIZARD - Gap resolution wizard: dynamic form to resolve missing or conflicting data

Estado: `pending`

- Ask only for missing data with dynamic questions
- Avoid unnecessarily long forms
- Save progress and allow continuation later
- Reduce friction with contextual help

Zonas: `apps/web/components`, `packages/core`

### S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE - LLM provider selection, cost estimation and governance policy

Estado: `pending`

- Provider-agnostic LLM broker interface
- Model selection per task (strategy, generation, analysis)
- Cost estimation before executing expensive tasks
- Admin policy: authorized providers, models, max spend
- Usage tracking and billing integration

Zonas: `packages/agents`, `packages/core`, `apps/web/components`

### S-HC-STRAT-01-MASTER-STRATEGY-WORKBENCH - Master strategy workbench: LLM-powered strategy generation and conversational refinement

Estado: `pending`

- Generate target audience, value proposition, tone and language
- Recommend networks, format by network, volume and frequency
- Propose calendar with timezone windows
- Generate copy, CTA, hashtags and variants per format
- Conversational refinement: chat with AI, request changes, compare versions
- Approve final strategy
- Select provider/model/reasoning level within policy
- Show estimated cost before executing

Zonas: `packages/agents`, `apps/web/components`, `packages/core`

### S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT - Content calendar blueprint: master publishing calendar from strategy

Estado: `pending`

- Generate per-format publishing schedule from strategy
- Slots with network, format, date, time window
- Draft stubs auto-created with strategy context
- Visual calendar with drag-to-reschedule
- Approval workflow per slot

Zonas: `apps/web/components`, `apps/web/lib/dashboard.ts`, `packages/core`

### S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST - Strategy-driven asset manifest: per-publication asset requirements

Estado: `pending`

- Per-publication asset manifest: type, network, format, resolution, aspect ratio, duration
- Creative guideline, scene context, branding, logo placement
- Status tracking: missing, uploaded, compatible, incompatible, approved, AI-generated
- Client choice: supply, request help, or generate via AI
- Progress bar with direct CTA for each missing asset

Zonas: `apps/web/components`, `packages/core`

### S-HC-AIGEN-01-ASSET-GENERATION-BROKER - AI asset generation broker: provider-agnostic, metered and billed

Estado: `pending`

- Provider-agnostic generation broker (not hardcoded to single provider)
- Metered consumption with cost preview before generation
- Billed per request with usage tracking
- Optional: client may supply assets without using generation
- Generation respects brand guidelines from strategy

Zonas: `packages/agents`, `apps/web/app/api`, `packages/core`

### S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT - Campaign review and deployment: batch approval, schedule, publish

Estado: `pending`

- Batch review of campaign drafts
- Approve/reject per draft or bulk
- Schedule deployment with cron integration
- Publishing queue with visibility (approved, scheduled, published, blocked)
- Rollback capability for scheduled posts

Zonas: `apps/web/app/api/publishing`, `apps/web/components`, `packages/core`

### S-HC-SUP-01-ASSISTED-CUSTOMER-CHANNELS - Assisted customer channels: LLM assistant, WhatsApp, email, human escalation

Estado: `pending`

- HeptaCore LLM assistant for product guidance
- WhatsApp support channel
- Email support with ticket tracking
- Human escalation path for complex issues

Zonas: `apps/web/components`, `apps/web/app/api/assistant`, `packages/core`

### S-HC-AN-01-CAMPAIGN-PERFORMANCE - Campaign performance analytics: reach, engagement, metrics per post and campaign

Estado: `pending`

- Reach and impressions where API permits
- Interactions, likes, comments
- Shares and saves where API permits
- Metrics per publication and per campaign
- Visual dashboard with trends

Zonas: `apps/web/components`, `apps/web/app/api`, `packages/core`

### S-HC-INBOX-01-UNIFIED-ENGAGEMENT - Unified engagement inbox: read and respond to messages and comments

Estado: `pending`

- Unified inbox for messages and comments across platforms
- Read and respond according to platform permissions
- Classification: positive, negative, neutral
- Summary of themes and sentiment

Zonas: `apps/web/components`, `apps/web/app/api`, `packages/integrations`

### S-HC-OPT-01-SENTIMENT-STRATEGY-ITERATION - Sentiment-driven strategy iteration: results → improved strategy

Estado: `pending`

- Versioned strategy with iteration history
- Recommendations based on real performance data
- Sentiment analysis feeding into next strategy cycle
- Before/after comparison per iteration

Zonas: `packages/agents`, `apps/web/components`, `packages/core`

### S-HC-TEN-02-CEPEG-ONBOARDING - CEPEG tenant onboarding: brand, assets, network configuration

Estado: `pending`

- CEPEG tenant seeded with brand identity
- Asset upload and organization for CEPEG
- Facebook/Instagram network configuration
- Initial strategy draft generated

Zonas: `examples/tenants/cepeg`, `apps/web`, `packages/db`


<!-- ORESHNIK:GENERATED:END -->
