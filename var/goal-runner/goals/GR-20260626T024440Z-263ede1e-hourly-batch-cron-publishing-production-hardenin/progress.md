# Progress — GR-20260626T024440Z-263ede1e-hourly-batch-cron-publishing-production-hardenin

## 2026-06-26T02:46:58.636Z

- **Prisma schema: add claim/lease fields and indexes** — IN PROGRESS

## 2026-06-26T02:51:15.519Z

- **Prisma schema: add claim/lease fields and indexes** — DONE
  Result: Added claimedAt, claimToken, providerAttemptStartedAt fields to PublishingJob. Added indexes on (status, scheduledFor) and (status, claimedAt). Generated Prisma client v7.8.0. Manual migration created.

## 2026-06-26T02:51:17.661Z

- **vercel.json: single hourly cron + fail-closed auth helpers** — IN PROGRESS

## 2026-06-26T02:51:49.262Z

- **vercel.json: single hourly cron + fail-closed auth helpers** — DONE
  Result: vercel.json: replaced 24 slot crons with single hourly cron. Created cron-auth.ts with timing-safe secret validation. Created publishing-cron-time.ts with UTC window helpers.

## 2026-06-26T02:51:50.065Z

- **Deterministic scheduled job IDs + safe claim/lease + publish route fix** — IN PROGRESS

## 2026-06-26T02:53:08.247Z

- **Deterministic scheduled job IDs + safe claim/lease + publish route fix** — DONE
  Result: publishing-execution.ts: added buildDeterministicScheduledJobId. publishing-claim.ts: created with claimJob, generateClaimToken, isClaimExpired, canReclaimExpiredJob. publishing-revalidation.ts: created with full pre-publish revalidation and block classification. publish/route.ts: scheduled flow uses deterministic IDs and  with upsert.

## 2026-06-26T02:53:09.110Z

- **Cron route rewrite with batch budget, dry-run, structured observability** — IN PROGRESS

## 2026-06-26T02:56:42.936Z

- **Cron route rewrite with batch budget, dry-run, structured observability** — DONE
  Result: Cron route rewritten with auth, time windows, claim/lease, revalidation, batch budget, dry-run, and structured observability. All existing 569 tests pass. Typecheck, build, worker-validate all green.

## 2026-06-26T02:56:45.230Z

- **Comprehensive tests: 32+ scenarios covering all contracts** — IN PROGRESS

## 2026-06-26T02:58:49.058Z

- **Comprehensive tests: 32+ scenarios covering all contracts** — DONE
  Result: Created publishing-cron.test.ts with 60 new tests covering all 32 contract scenarios. Total: 629 tests, all passing.

## 2026-06-26T02:58:58.156Z

- **Oreshnik preflight, drift, reconcile gates + evidence + validate + complete** — IN PROGRESS
