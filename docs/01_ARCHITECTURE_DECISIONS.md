# Architecture Decisions

## Stack

- Web: Next.js App Router with TypeScript.
- Auth: Auth.js / NextAuth credentials provider with bcrypt password hashes.
- Worker: Node.js workspace app, tenant-aware, dry-run by default.
- DB: PostgreSQL with Prisma.
- Queues: BullMQ + Redis code exists; production worker needs persistent hosting outside Vercel serverless.
- Storage: local tenant assets for the Turpial seed; S3-compatible object storage remains the expected production direction.
- AI orchestration: `packages/agents` first, with provider adapters later.
- Integrations: mock Meta adapters exist for sandbox/dry-run. Real adapters remain blocked until explicit approval.

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

## Deployment Boundary

`master` / `origin/master` is the closest productive/pre-productive base and the branch used by the current Vercel deploy flow. Vercel can host the web app, but BullMQ workers require Redis and a persistent process host such as Railway, Fly.io, a VPS, or another worker-capable platform.

## Sensitive Actions

The default mode is draft/dry-run. Real publishing, campaign spend, paid scraping, sensitive replies, credential changes, bulk messages, and deletion require explicit approval.

## Known Platform Debt

Next 16 warns that `middleware.ts` is deprecated and recommends migrating to `proxy`. This is a follow-up technical task because the current build passes and the warning is not blocking pre-production alignment.
