# HeptaCore

HeptaCore is a multi-tenant AI marketing operating system for strategy, RRSS content, approvals, publishing workflows, response management, analytics, campaign recommendations, lead operations, and client reporting.

Turpial Sound / Turpial Marketplace is included only as the first imported tenant example under `examples/tenants/turpial`.

## Monorepo

```txt
apps/web                 Next.js landing and product console shell
apps/worker              RRSS worker migrated from the Turpial bot seed
packages/agents          Agent contracts, modes, council, strategy engine
packages/core            Shared domain types and guardrails
packages/db              Prisma schema and DB scripts
packages/integrations    Social network adapter contracts
packages/ui              Shared brand/UI tokens
docs                     Product, architecture, security, roadmap
examples/tenants/turpial Imported Turpial docs, assets, drafts, queue
```

## Commands

```bash
npm install
npm run dev
npm run worker:validate
npm run db:generate
```

The worker defaults to draft/dry-run mode. Do not connect real credentials or publish without explicit human approval.
