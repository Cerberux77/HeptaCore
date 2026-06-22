# HeptaCore Product Brief

HeptaCore is a multi-tenant AI marketing operating system for businesses that need continuous RRSS execution without losing strategic control.

## Current Product Stage

HeptaCore is a production multi-tenant platform with real Facebook and Instagram Feed publishing operational from the UI. The product delivers: Next.js console, tenant-aware data model, Auth.js login, approval workflow, reporting, dry-run and live publishing, provider durability (IN_REVIEW → PUBLISHED state machine), 156 tests, Vercel Blob asset storage, and Turpial Sound as the first production tenant.

Multiformat preview (Carousel, Story) is complete. Multi-tenant asset management with metadata extraction and format compatibility classification is in active development. The full end-to-end vision (landing → onboarding → strategy → assets → calendar → publishing → metrics → optimization) is canonically documented in `PRODUCT_VISION_END_TO_END.md`.

## Promise

Convert market, audience, product, competitor, content, interaction, and operational signals into actionable marketing decisions: strategy, content, campaigns, responses, leads, approvals, and reports.

## Target User

- Agencies managing several clients.
- Operators who need a stronger alternative to traditional community management.
- Founders with products that need structured social growth.
- Service businesses that need a content, response, and reporting engine.

## Differentiators

- Strategy first, content second.
- Tenant-isolated workspaces and approvals.
- Human approval gates for sensitive actions.
- Real Meta adapters connected and verified in production.
- Provider-agnostic AI broker (LLM and asset generation).
- Monetization: subscription + AI consumption + optional services.
- Campaign overhead model: 35% over real platform spend, approved before execution.

## Architecture

- Next.js 16.2.6 web console with Turbopack.
- Prisma + PostgreSQL for multi-tenant data.
- Vercel Blob for tenant-scoped asset storage.
- BullMQ/Redis worker queue for async publishing.
- Oreshnik for git-native sprint management and zone-locked operations.
- 24 Vercel cron slots for scheduled publishing.

## Current Backlog Phases

See `PRODUCT_VISION_END_TO_END.md` and `var/oreshnik/task-board.json` for full sprint breakdown:
- Publishing (PUB-03 ACTIVE, PUB-04/05 pending)
- Commercial (COMM-01/02 pending)
- Onboarding (ONB-01/02 pending)
- AI Infrastructure (AI-01 pending)
- Strategy (STRAT-01/02 pending)
- Assets & Generation (ASSET-01, AIGEN-01 pending)
- Operations (OPS-01 pending)
- Support (SUP-01 pending)
- Analytics & Engagement (AN-01, INBOX-01 pending)
- Optimization (OPT-01 pending)
