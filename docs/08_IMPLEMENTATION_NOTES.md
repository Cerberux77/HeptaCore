# Implementation Notes

## Current Result

This repo is a HeptaCore MVP tecnico pre-produccion. `master` / `origin/master` is the closest productive/pre-productive base and includes the web console, Auth.js credentials login, RBAC checks, approval APIs, Turpial seed data, reporting/readiness views, BullMQ worker code, and mock Meta adapters.

## Validation Baseline

The canonical alignment audit expects these checks before closure:

```bash
npm run typecheck
npm run build
npm run worker:validate
npx prisma validate --schema packages/db/prisma/schema.prisma
git diff --check
```

## Immediate Next Tasks

1. Configure production/pre-production environment variables outside git.
2. Apply Prisma migrations to the production/pre-production database.
3. Seed admin and `turpial-sound` into that database.
4. Host the worker outside Vercel serverless with Redis.
5. Implement S-HC-PUB-01 as dry-run-only publishing from UI with explicit approval and audit logging.
6. Track Next 16 `middleware.ts` to `proxy` migration as a follow-up maintenance task.

## Manual Inputs Needed

- Final deployment environment values.
- Production database target.
- Worker hosting target and Redis provider.
- Explicit approval policy for any future real publishing.
- Final HeptaCore logo decision.
