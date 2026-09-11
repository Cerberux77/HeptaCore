<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-PUB-07B-YOUTUBE-SCHEDULED-E2E"
sprint: "publishing"
status: "integrated"
owner: "Manuel"
last_updated: "2026-09-11T00:02:27.699Z"
source: "var/oreshnik/tasks/S-HC-PUB-07B-YOUTUBE-SCHEDULED-E2E.json"
---

# Task S-HC-PUB-07B-YOUTUBE-SCHEDULED-E2E

## Scope

YouTube scheduled E2E integration: Video, Shorts, cron metadata and credentials

## Runtime

- estado: `integrated`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `3`
- handoff: docs/oreshnik/handoffs/S-HC-PUB-07B-YOUTUBE-SCHEDULED-E2E/handoff-20260910T221119888Z-3622de053b4a.md

## Dependencias

- S-HC-PUB-03-MULTITENANT-ASSETS
- S-HC-PUB-04-HOURLY-BATCH-CRON

## Zonas

### Compat

- `apps/web/lib/publishers`
- `apps/web/app/api/publishing`
- `packages/integrations`
- `apps/web/app/api/cron/publisher`
- `apps/web/lib/publishing-cron-executor.ts`
- `apps/web/lib/__tests__`
- `contracts/S-HC-PUB-04`

### Read

- Ninguna

### Write

- `apps/web/lib/publishers`
- `apps/web/app/api/publishing`
- `packages/integrations`
- `apps/web/app/api/cron/publisher`
- `apps/web/lib/publishing-cron-executor.ts`
- `apps/web/lib/__tests__`
- `contracts/S-HC-PUB-04`

## Aceptacion

- Validated YouTube Video 16:9 and Shorts publisher is present in the governed delivery.
- Scheduled cron transports YouTube format, title, description, primary video and thumbnail to the provider adapter.
- Scheduled credential resolution uses the publisher credentialLabel dynamically and never hardcodes facebook_page_oauth.
- Missing credentialLabel fails closed before credential decryption.
- Scheduled dry-run recognizes YouTube formats without resolving credentials or invoking the provider.
- Provider-specific immediate and scheduled tests pass together.
- typecheck, build, worker validation and full repository tests pass.

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->