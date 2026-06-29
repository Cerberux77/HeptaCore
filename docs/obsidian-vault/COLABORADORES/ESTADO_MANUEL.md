---
type: collaborator-status
project: "HeptaCore"
operator: "Manuel"
last_updated: "2026-06-29T02:30:08.613Z"
generated_by: "Oreshnik canonical-check"
source: "var/oreshnik/task-board.json"
---

# Estado Manuel

> Documento derivado. `var/oreshnik/task-board.json` es la proyeccion compatible que debe mantenerse alineada con los artefactos durables de runtime.

## Ready

| Sprint | Scope | Depende de |
|---|---|---|
| S-HC-TOOL-01-GOAL-RUNNER-V1 | Goal Runner v1 for autonomous Kilo execution | S-HC-TEN-01-GLOBAL-TENANT-ADMIN |
| S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE | LLM provider selection, cost estimation and governance policy | - |
| S-HC-ASSET-02-FORMAT-DERIVATIVES | Format derivatives: badge interaction, format preview, intelligent crop, safe zones, asset variants | S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-PUB-06-REELS-STORIES-PUBLISHERS | Real publishing for Meta Reels and Stories: Instagram + Facebook | S-HC-PUB-03-MULTITENANT-ASSETS, S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-PUB-07-YOUTUBE-PUBLISHING | Real publishing for YouTube: Video 16:9 and YouTube Shorts | S-HC-PUB-03-MULTITENANT-ASSETS, S-HC-PUB-04-HOURLY-BATCH-CRON |

## Pending

| Sprint | Scope | Depende de |
|---|---|---|
| Ninguno | - | - |

## Detalle de Aceptacion

### S-HC-PUB-04-HOURLY-BATCH-CRON - Hourly batch cron publishing with timezone-aware scheduling

Estado: `integrated`

- Batch cron procesa multiples posts programados por hora
- Timezone-aware scheduling per tenant
- Rate limiting per platform
- Failure isolation (un post falla, los demas continuan)
- Cron idempotency preservada

Zonas: `apps/web/app/api/cron`, `apps/worker`, `packages/core`

### S-HC-PUB-05-RECONCILIATION-OPS - Operational reconciliation automation for ambiguous provider outcomes

Estado: `integrated`

- Automatic reconciliation for Case A (Result ok + externalPostId + incomplete Draft)
- Alert-only for Case B (Draft.externalPostId present + Result absent)
- Block and notify for Case C (no evidence)
- Never auto-retry provider calls

Zonas: `apps/web/lib/publishing-finalization.ts`, `apps/web/lib/draft-operational-state.ts`, `packages/core`

### S-HC-TOOL-01-GOAL-RUNNER-V1 - Goal Runner v1 for autonomous Kilo execution

Estado: `ready`

- Nucleo determinista implementado y probado
- Maquina de estados, locks, evidencia y gates operativos
- Integracion /goal y /preflight disponible en Kilo
- Anti-loop y limites de Playwright documentados
- Goal piloto ejecutado completamente con el propio Goal Runner
- Estado y evidencia sobreviven a clear y reinicio de sesion
- Cero cambios en Production
- Integracion posterior en la rama madre mediante cierre controlado

Zonas: `scripts/goal-runner/**`, `var/goal-runner/**`, `.kilo/command/goal.md`, `.kilo/command/preflight.md`, `AGENTS.md`, `package.json`, `docs/07_handoffs/**`, `docs/obsidian-vault/**`

### S-HC-AIGEN-01-ASSET-GENERATION-BROKER - AI asset generation broker: provider-agnostic, metered and billed

Estado: `blocked`

- Provider-agnostic generation broker (not hardcoded to single provider)
- Metered consumption with cost preview before generation
- Billed per request with usage tracking
- Optional: client may supply assets without using generation
- Generation respects brand guidelines from strategy

Zonas: `packages/agents`, `apps/web/app/api`, `packages/core`

### S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE - LLM provider selection, cost estimation and governance policy

Estado: `ready`

- Provider-agnostic LLM broker interface
- Model selection per task (strategy, generation, analysis)
- Cost estimation before executing expensive tasks
- Admin policy: authorized providers, models, max spend
- Usage tracking and billing integration

Zonas: `packages/agents`, `packages/core`, `apps/web/components`

### S-HC-AN-01-CAMPAIGN-PERFORMANCE - Campaign performance analytics: reach, engagement, metrics per post and campaign

Estado: `blocked`

- Reach and impressions where API permits
- Interactions, likes, comments
- Shares and saves where API permits
- Metrics per publication and per campaign
- Visual dashboard with trends

Zonas: `apps/web/components`, `apps/web/app/api`, `packages/core`

### S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST - Strategy-driven asset manifest: per-publication asset requirements

Estado: `blocked`

- Per-publication asset manifest: type, network, format, resolution, aspect ratio, duration
- Creative guideline, scene context, branding, logo placement
- Status tracking: missing, uploaded, compatible, incompatible, approved, AI-generated
- Client choice: supply, request help, or generate via AI
- Progress bar with direct CTA for each missing asset

Zonas: `apps/web/components`, `packages/core`

### S-HC-ASSET-02-FORMAT-DERIVATIVES - Format derivatives: badge interaction, format preview, intelligent crop, safe zones, asset variants

Estado: `ready`

- Badge de compatibilidad clickeable que abre detalle de formato
- Preview especifico de formato con crop y safe zones visuales
- Crop manual interactivo por formato (recorte, reposicion)
- Crop inteligente automatico con deteccion de sujeto/centro
- Fit con fondo (blur, color, gradiente) cuando el asset no llena el frame
- Safe zones indicadas visualmente (titulo, UI de plataforma, texto)
- Aceptar/deshacer cambios por formato
- Asset original inmutable; derivados como registros separados con relacion sourceAsset
- Versionado de derivados
- Generacion por lote de variantes para todos los formatos requeridos
- Imagenes primero; video fuera de este sprint o como fase separada

Zonas: `apps/web/components`, `packages/core`, `apps/web/lib`

### S-HC-COMM-01-SELF-SERVICE-SIGNUP - Self-service tenant signup with trial gate and onboarding flow

Estado: `blocked`

- Self-service registration with email verification
- Trial tenant creation with default config
- Guided onboarding wizard (brand, networks, first draft)
- Trial gate enforcement before publishing

Zonas: `apps/web/app/register`, `apps/web/app/api/auth`, `packages/db`, `apps/web/components`

### S-HC-COMM-02-BILLING-ACTIVATION - Tenant billing activation: plan selection, usage tracking, payment integration

Estado: `blocked`

- Plan selection (Free, Pro, Agency)
- Usage tracking (posts, assets, tenants)
- Payment gateway integration (Stripe)
- Invoice generation and history

Zonas: `apps/web/app/api/billing`, `packages/db`, `apps/web/components`

### S-HC-INBOX-01-UNIFIED-ENGAGEMENT - Unified engagement inbox: read and respond to messages and comments

Estado: `blocked`

- Unified inbox for messages and comments across platforms
- Read and respond according to platform permissions
- Classification: positive, negative, neutral
- Summary of themes and sentiment

Zonas: `apps/web/components`, `apps/web/app/api`, `packages/integrations`

### S-HC-OBS-01-PUBLISHING-OBSERVABILITY - Publishing observability: structured logging, metrics dashboard, alert thresholds

Estado: `blocked`

- Structured logging with correlation IDs
- Publishing metrics dashboard (attempts, failures, latency)
- Alert thresholds for provider failures
- Daily digest summarizing publishing activity

Zonas: `apps/web`, `packages/core`, `docs`

### S-HC-ONB-01-MASTER-BRIEF-INGESTION - Master document ingestion: extract structured info from company briefs

Estado: `blocked`

- Upload master document (PDF, DOCX, Markdown, texto)
- Extract structured information: brand, product, audience, tone
- Identify data gaps, contradictions and ambiguous zones
- Store as structured tenant context

Zonas: `apps/web/components`, `packages/core`, `packages/agents`

### S-HC-ONB-02-GAP-RESOLUTION-WIZARD - Gap resolution wizard: dynamic form to resolve missing or conflicting data

Estado: `blocked`

- Ask only for missing data with dynamic questions
- Avoid unnecessarily long forms
- Save progress and allow continuation later
- Reduce friction with contextual help

Zonas: `apps/web/components`, `packages/core`

### S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT - Campaign review and deployment: batch approval, schedule, publish

Estado: `blocked`

- Batch review of campaign drafts
- Approve/reject per draft or bulk
- Schedule deployment with cron integration
- Publishing queue with visibility (approved, scheduled, published, blocked)
- Rollback capability for scheduled posts

Zonas: `apps/web/app/api/publishing`, `apps/web/components`, `packages/core`

### S-HC-OPT-01-SENTIMENT-STRATEGY-ITERATION - Sentiment-driven strategy iteration: results → improved strategy

Estado: `blocked`

- Versioned strategy with iteration history
- Recommendations based on real performance data
- Sentiment analysis feeding into next strategy cycle
- Before/after comparison per iteration

Zonas: `packages/agents`, `apps/web/components`, `packages/core`

### S-HC-PUB-06-REELS-STORIES-PUBLISHERS - Real publishing for Meta Reels and Stories: Instagram + Facebook

Estado: `ready`

- Instagram Reel publishing real con durabilidad transaccional
- Instagram Story imagen publishing real
- Instagram Story video publishing real
- Facebook Story imagen publishing real
- Facebook Story video publishing real
- Facebook Reel publishing real
- Preview/dry-run para cada combinacion antes de publicacion real
- Provider-specific tests con evidencia real para cada formato
- Reutilizacion de transactional finalization y IN_REVIEW state machine
- Cero declaracion de soporte hasta que la combinacion concreta haya sido validada

Zonas: `apps/web/lib/publishers`, `apps/web/app/api/publishing`, `packages/integrations`

### S-HC-PUB-07-YOUTUBE-PUBLISHING - Real publishing for YouTube: Video 16:9 and YouTube Shorts

Estado: `ready`

- YouTube Video 16:9 publishing real con titulo, descripcion, thumbnail y metadata
- YouTube Shorts publishing real con metadata requerida
- Programacion y publicacion real
- Preview/dry-run para cada formato
- Provider-specific tests con evidencia real para cada formato
- Reutilizacion de transactional finalization y IN_REVIEW state machine
- Cero declaracion de soporte hasta validacion real

Zonas: `apps/web/lib/publishers`, `apps/web/app/api/publishing`, `packages/integrations`

### S-HC-PUB-08-PLATFORM-FORMAT-PARITY - Platform-format parity: manifest, preview, dry-run, scheduling and publishing for every supported format

Estado: `blocked`

- Paridad de capacidades (preview, dry-run, publicacion, metricas) para cada formato soportado
- Auditoria de la matriz de capacidad red/formato: sin combinaciones sin responsable asignado
- Manifiesto de activos cubre todos los formatos con reglas validadas
- Preview especifico de plataforma para cada formato
- Tests provider-specific para todos los formatos publicables
- Documentacion del estado de cada combinacion en PRODUCT_VISION_END_TO_END

Zonas: `apps/web/lib/publishers`, `apps/web/lib/publishing-formats.ts`, `apps/web/components`, `packages/integrations`

### S-HC-STRAT-01-MASTER-STRATEGY-WORKBENCH - Master strategy workbench: LLM-powered strategy generation and conversational refinement

Estado: `blocked`

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

Estado: `blocked`

- Generate per-format publishing schedule from strategy
- Slots with network, format, date, time window
- Draft stubs auto-created with strategy context
- Visual calendar with drag-to-reschedule
- Approval workflow per slot

Zonas: `apps/web/components`, `apps/web/lib/dashboard.ts`, `packages/core`

### S-HC-SUP-01-ASSISTED-CUSTOMER-CHANNELS - Assisted customer channels: LLM assistant, WhatsApp, email, human escalation

Estado: `blocked`

- HeptaCore LLM assistant for product guidance
- WhatsApp support channel
- Email support with ticket tracking
- Human escalation path for complex issues

Zonas: `apps/web/components`, `apps/web/app/api/assistant`, `packages/core`

### S-HC-TEN-02-CEPEG-ONBOARDING - CEPEG tenant onboarding: brand, assets, network configuration

Estado: `blocked`

- CEPEG tenant seeded with brand identity
- Asset upload and organization for CEPEG
- Facebook/Instagram network configuration
- Initial strategy draft generated

Zonas: `examples/tenants/cepeg`, `apps/web`, `packages/db`

