---
type: collaborator-status
project: "HeptaCore"
operator: "Manuel"
last_updated: "2026-06-21T05:17:30.292Z"
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
| S-HC-PUB-02-MULTIFORMAT | Multiformat publishing: Instagram Carousel, Stories, Facebook preview, asset manifest | S-HC-REC-00C |

## Detalle de Aceptacion

### S-HC-REC-00B - Facebook duplicate cleanup

Estado: `cancelled`



Zonas: -

### S-HC-PUB-02-MULTIFORMAT - Multiformat publishing: Instagram Carousel, Stories, Facebook preview, asset manifest

Estado: `pending`

- Instagram Carousel publishing
- Instagram Stories publishing
- Required asset manifest and validation
- Visual dry-run per platform
- Facebook preview with caption
- Reuse idempotency and durable finalization

Zonas: `apps/web`, `apps/web/lib/publishers`, `packages/integrations`

<!-- ORESHNIK:GENERATED:START -->
---
type: collaborator-status
project: "HeptaCore"
operator: "Manuel"
last_updated: "2026-06-21T05:54:29.389Z"
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
| S-HC-PUB-02-MULTIFORMAT-PREVIEW | Multiformat preview and dry-run: Instagram Carousel, Stories, Facebook preview, asset manifest | S-HC-REC-00C |
| S-HC-PUB-03-MULTITENANT-ASSETS | Multi-tenant asset management: upload, replace, reorganize across tenants | S-HC-REC-00C |
| S-HC-PUB-04-HOURLY-BATCH-CRON | Scheduled cron batch publishing with timezone-aware scheduling | S-HC-PUB-02-MULTIFORMAT-PREVIEW, S-HC-PUB-03-MULTITENANT-ASSETS |
| S-HC-PUB-05-RECONCILE | Operational reconciliation automation for ambiguous provider outcomes | S-HC-PUB-02-MULTIFORMAT-PREVIEW, S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-OBS-01 | Observability: structured logging, metrics dashboard, alert thresholds | S-HC-PUB-04-HOURLY-BATCH-CRON |
| S-HC-COMM-01-SIGNUP | Self-service tenant signup with trial gate and onboarding flow | S-HC-REC-00C |
| S-HC-COMM-02-BILLING | Tenant billing: plan selection, usage tracking, payment integration | S-HC-COMM-01-SIGNUP |
| S-HC-TEN-02-CEPEG | CEPEQ tenant onboarding: brand, assets, network configuration | S-HC-COMM-01-SIGNUP |

## Detalle de Aceptacion

### S-HC-REC-00B - Facebook duplicate cleanup

Estado: `cancelled`



Zonas: -

### S-HC-PUB-02-MULTIFORMAT-PREVIEW - Multiformat preview and dry-run: Instagram Carousel, Stories, Facebook preview, asset manifest

Estado: `pending`

- Instagram Carousel publishing
- Instagram Stories publishing
- Required asset manifest and validation
- Visual dry-run per platform
- Facebook preview with caption
- Reuse idempotency and durable finalization

Zonas: `apps/web`, `apps/web/lib/publishers`, `packages/integrations`

### S-HC-PUB-03-MULTITENANT-ASSETS - Multi-tenant asset management: upload, replace, reorganize across tenants

Estado: `pending`

- Asset upload with tenant scoping
- Asset replacement preserves audit log
- Asset reorganization (move, rename, delete)
- Multi-format validation (images, video)
- Preview before publish

Zonas: `apps/web/app/api/tenant-assets`, `apps/web/components`, `packages/core`

### S-HC-PUB-04-HOURLY-BATCH-CRON - Scheduled cron batch publishing with timezone-aware scheduling

Estado: `pending`

- Batch cron processes multiple scheduled posts
- Timezone-aware scheduling per tenant
- Rate limiting per platform
- Failure isolation (one post fails, others proceed)
- Cron idempotency preserved

Zonas: `apps/web/app/api/cron`, `apps/worker`, `packages/core`

### S-HC-PUB-05-RECONCILE - Operational reconciliation automation for ambiguous provider outcomes

Estado: `pending`

- Automatic reconciliation for Case A (Result ok + externalPostId + incomplete Draft)
- Alert-only for Case B (Draft.externalPostId present + Result absent)
- Block and notify for Case C (no evidence)
- Never auto-retry provider calls

Zonas: `apps/web/lib/publishing-finalization.ts`, `apps/web/lib/draft-operational-state.ts`, `packages/core`

### S-HC-OBS-01 - Observability: structured logging, metrics dashboard, alert thresholds

Estado: `pending`

- Structured logging with correlation IDs
- Publishing metrics dashboard (attempts, failures, latency)
- Alert thresholds for provider failures
- Daily digest summarizing publishing activity

Zonas: `apps/web`, `packages/core`, `docs`

### S-HC-COMM-01-SIGNUP - Self-service tenant signup with trial gate and onboarding flow

Estado: `pending`

- Self-service registration with email verification
- Trial tenant creation with default config
- Guided onboarding wizard (brand, networks, first draft)
- Trial gate enforcement before publishing

Zonas: `apps/web/app/register`, `apps/web/app/api/auth`, `packages/db`, `apps/web/components`

### S-HC-COMM-02-BILLING - Tenant billing: plan selection, usage tracking, payment integration

Estado: `pending`

- Plan selection (Free, Pro, Agency)
- Usage tracking (posts, assets, tenants)
- Payment gateway integration (Stripe)
- Invoice generation and history

Zonas: `apps/web/app/api/billing`, `packages/db`, `apps/web/components`

### S-HC-TEN-02-CEPEG - CEPEQ tenant onboarding: brand, assets, network configuration

Estado: `pending`

- CEPEQ tenant seeded with brand identity
- Asset upload and organization for CEPEQ
- Facebook/Instagram network configuration
- Initial strategy draft generated

Zonas: `examples/tenants/cepeq`, `apps/web`, `packages/db`


<!-- ORESHNIK:GENERATED:END -->
