# HeptaCore

HeptaCore is a multi-tenant AI marketing operating system for strategy, RRSS content, approvals, publishing workflows, response management, analytics, campaign recommendations, lead operations, and client reporting.

## Current Status

HeptaCore is a production multi-tenant AI marketing operating system. Production stable: `2fd9e24929ffe1022cf9521ed0f13888f30accbd` deployed at [`https://heptacore.vercel.app`](https://heptacore.vercel.app). Facebook and Instagram publish real posts from the UI. Ambiguous provider errors are blocked without automatic retry (manual reconciliation required). 156 tests validate the transactional publishing state machine.

## Monorepo

```txt
apps/web                 Next.js product console, login, approvals, reports, readiness
apps/worker              RRSS dry-run worker and BullMQ queue code
packages/agents          Agent contracts, modes, council, strategy engine
packages/core            Shared domain types and guardrails
packages/db              Prisma schema and DB scripts
packages/integrations    Social network adapter contracts and mock Meta adapters
packages/ui              Shared brand/UI tokens
docs                     Product, architecture, security, roadmap
examples/tenants/turpial Imported Turpial docs, assets, drafts, queue
```

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run worker:validate
npx prisma validate --schema packages/db/prisma/schema.prisma
```

## Production Guardrails

##

- Live RRSS publishing is operational (Facebook Page, Instagram) with approval gates and transactional durability.
- Real Meta adapters (Facebook Page, Instagram) are connected and verified in production.
- Ambiguous provider outcomes are blocked without automatic retry; manual reconciliation via IN_REVIEW state machine.
- Publishing worker remains serverless via Vercel cron (24 daily slots, idempotent publisher).
- Secrets belong in environment variables or encrypted vault rows, never in git.
- No campaign spend, no real scraping.
