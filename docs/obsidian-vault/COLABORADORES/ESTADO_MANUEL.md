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

