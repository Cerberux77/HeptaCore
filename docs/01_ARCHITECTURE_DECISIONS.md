# Architecture Decisions

## Stack

- Web: Next.js App Router with TypeScript.
- Worker: Node.js workspace app, tenant-aware, dry-run by default.
- DB: PostgreSQL with Prisma.
- Queues: BullMQ + Redis in the next implementation sprint.
- Auth: Better Auth, Clerk, or Auth.js after deciding deployment target.
- Storage: S3-compatible object storage.
- AI orchestration: `packages/agents` first, with provider adapters later.
- Integrations: official APIs first, scraping disabled by default.

## Multi-Tenancy

Decision: shared PostgreSQL database for MVP with `tenantId` on tenant-owned tables.

Why:

- Fastest to build and operate.
- Easier cross-client admin dashboard.
- Lower cost during pilot phase.
- Adequate isolation if every query is tenant-scoped and audited.

Future:

- Enterprise tenants may move to dedicated database/schema.
- Secrets are never treated as normal tenant data. They belong in KMS/secret manager or encrypted vault rows.

## Sensitive Actions

The default mode is `draft_only`. Real publishing, campaign spend, paid scraping, sensitive replies, credential changes, bulk messages, and deletion require explicit approval.
