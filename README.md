# HeptaCore

HeptaCore is a multi-tenant AI marketing operating system for strategy, RRSS content, approvals, publishing workflows, response management, analytics, campaign recommendations, lead operations, and client reporting.

## Current Status

HeptaCore is an MVP tecnico pre-produccion. The closest deployable/productive base is `master` / `origin/master`; the current production-like commit identified during canonical alignment is `000ce31`.

`https://heptacore.vercel.app` is the Vercel target, but production usefulness depends on configured environment variables, database migrations, and seed data. Real RRSS publishing remains blocked by design.

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

- No real RRSS publishing without explicit human approval.
- No real Meta adapters are connected in this repository state.
- Worker publishing remains draft/dry-run first.
- BullMQ workers need persistent hosting with Redis outside Vercel serverless.
- Secrets belong in environment variables, secret manager, or encrypted vault rows, never in git.
