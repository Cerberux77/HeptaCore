# MVP Roadmap

## Current Position

HeptaCore is a production platform. The canonical deployable base is `master`. Facebook Feed and Instagram Feed publish real posts from the UI with transactional durability. 156 tests validate the publishing state machine.

## Closed / Implemented

| Sprint | Status | Notes |
|---|---|---|
| S-HC-00 | Closed | Monorepo, docs, Prisma baseline, worker seed, Oreshnik baseline. |
| S-HC-01 | Closed | Console/dashboard, checklist, draft queue UI. |
| S-HC-02 | Closed | Turpial seed/import path and DB service layer baseline. |
| S-HC-03 | Closed | Strategy runner. |
| S-HC-04 | Closed | Auth, RBAC, tenant guards, audit baseline. |
| S-HC-05 | Closed | Approval queue and human gates. |
| S-HC-06 | Closed | BullMQ/Redis worker queue code and dry-run jobs. |
| S-HC-07 | Closed | Reports dashboard and daily summary data. |
| S-HC-08 | Closed | Meta adapter sandbox/mock layer. |
| S-HC-09 | Closed | Publish readiness gate. |
| S-HC-REC-00A | Closed | Publishing baseline recovery. Facebook + Instagram live from UI. |
| S-HC-REC-00C | Closed | Canonical integration. Oreshnik aligned. |
| S-HC-PUB-02-MULTIFORMAT-PREVIEW | Closed | Carousel, Story, Feed previews and dry-run. Cero provider calls. |

## Active

| Sprint | Status | Notes |
|---|---|---|
| S-HC-PUB-03-MULTITENANT-ASSETS | Active | Multi-tenant asset management, metadata extraction, format compatibility. Vercel Blob storage. |

## Pending — Publishing

| Sprint | Dependencies |
|---|---|
| S-HC-PUB-04-HOURLY-BATCH-CRON | PUB-02 + PUB-03 |
| S-HC-PUB-05-RECONCILIATION-OPS | PUB-04 |
| S-HC-OBS-01-PUBLISHING-OBSERVABILITY | PUB-05 |

## Pending — Commercial

| Sprint | Dependencies |
|---|---|
| S-HC-COMM-01-SELF-SERVICE-SIGNUP | REC-00C |
| S-HC-COMM-02-BILLING-ACTIVATION | COMM-01 |

## Pending — End-to-End Vision

12 additional sprints covering onboarding, AI, strategy, assets, operations, support, analytics, engagement and optimization. See `PRODUCT_VISION_END_TO_END.md` and `var/oreshnik/task-board.json` for full details.

## Hard Stops

- No campaign spend without explicit approval.
- No real scraping.
- No credentials in git.
- No Prisma/schema/auth/security changes without double lock.
- No sprint closure without vault updates and Oreshnik validations.
- Cero provider calls in preview/classification sprints.
