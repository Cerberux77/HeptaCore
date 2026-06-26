# Plan: Hourly Batch Cron Publishing Production Hardening

## Architecture Overview

Replace 24 individual Vercel cron entries with a single hourly cron. Harden authentication (fail-closed), timezone handling, idempotent scheduling, safe claim/lease semantics, correct attempt counting, full pre-publish revalidation, monotonic result idempotency, batch budget, dry-run mode, structured observability, and comprehensive tests.

## Steps

### Step 1 — Prisma schema: add claim/lease fields and indexes

- Add `claimedAt` (DateTime?), `claimToken` (String?) to PublishingJob
- Add `providerAttemptStartedAt` (DateTime?) to PublishingJob
- Add indexes: `@@index([status, scheduledFor])`, `@@index([status, claimedAt])`
- Generate migration

### Step 2 — vercel.json: single hourly cron

- Replace 24 slot-based crons with `{ "path": "/api/cron/publisher", "schedule": "0 * * * *" }`
- Remove `slot` dependency

### Step 3 — Extract pure time window helpers

- Create `apps/web/lib/publishing-cron-time.ts`
- Pure functions with injectable `now: Date`:
  - `computeWindow(now, windowMinutes)` → `{ windowStart, windowEnd }` (UTC)
  - `classifyJob(scheduledFor, now)` → `"future" | "currentWindow" | "backlog"`
  - `isBeforeOrEqual(a, b)` safe comparison
- Produce ISO UTC timestamps

### Step 4 — Fail-closed authentication

- Create `apps/web/lib/cron-auth.ts`
- `validateCronSecret(header): { valid, error? }` with timing-safe comparison
- Remove `?? "heptacore-cron-secret"` default
- Empty/missing CRON_SECRET → fail early with config error (no DB access)
- Wrong bearer → 401
- Never log/return secret

### Step 5 — Deterministic scheduled job IDs

- Fix `buildScheduledJobId` / create new `buildDeterministicScheduledJobId(draftId, network, scheduledFor)`
- Modify `/api/publishing/publish/route.ts` scheduled flow to use deterministic ID
- Transactional: ContentDraft status change + PublishingJob create/reuse in one $transaction
- Concurrent requests → no duplicate jobs
- Repeated request → return existing compatible job
- Invalid `scheduledAt` → 400 (no silent `Invalid Date`)

### Step 6 — Safe claim and lease

- `claimJob(jobId, claimToken)`: atomic `updateMany` SCHEDULED → IN_REVIEW with `claimedAt` and `claimToken`
- Before provider call: set `providerAttemptStartedAt`
- Worker with expired claim (pre-provider) → recoverable
- Worker with claim where provider call started → not auto-retried (reconciliation)
- Two concurrent workers → at most one provider call
- Old worker cannot finalize lost claim

### Step 7 — Correct attempt semantics

- `attempts` incremented only right before actual provider call
- Not incremented for: queries, batch selection, claims, pre-flight validations, skipped jobs
- Tests: no-asset, no-social-account, no-scopes, two-workers-one-winner, real-provider-failure, ambiguous, max-attempts

### Step 8 — Full pre-publish revalidation

- Extract `apps/web/lib/publishing-revalidation.ts`
- Validate before provider call:
  - tenant exists, not suspended, not archived
  - automationMode compatible (not DRAFT_ONLY)
  - draft exists, SCHEDULED
  - draft.network === job.provider
  - format supported for live
  - no externalPostId
  - no durable previous result
  - trial limit
  - asset required + public HTTPS URL
  - socialAccount connected (use draft.socialAccountId when present, fallback to most recent)
  - required scopes
  - credential resolvable
- Classify blocks: retryable-before-provider, terminal-before-provider, reconciliation-required, provider-failure-retryable, provider-failure-terminal
- Stable codes, no free strings

### Step 9 — Monotonic result idempotency

- Reuse `commitConfirmedPublication`, `hasDurableProviderSuccess`
- `PUBLISHED` only after real provider confirmation
- Result with `ok:true` + `externalPostId` never degraded
- Draft with `externalPostId` never re-sent
- Provider-confirmed but local persistence failed → reconciliation
- No second provider call when durable success evidence exists

### Step 10 — Batch budget policy

- `BATCH_LIMIT` configurable with safe min/max bounds (default 20, min 1, max 50)
- Internal time budget < Vercel maxDuration (e.g., 50s of 60s)
- Stop taking new jobs before budget exhaustion
- Never cancel an in-flight provider call
- Leave unclaimed jobs for next hour
- Return `remainingDue`, `timeBudgetExhausted`
- Oldest-first ordering preserved
- Concurrency: fixed small (2) if used, with atomic claim preservation

### Step 11 — Dry-run mode

- `GET /api/cron/publisher?dry_run=true` with CRON_SECRET
- No state changes, no attempt increments, no results, no provider calls
- Returns: eligible, blocked, backlog, future jobs with classification
- Works in Preview and local
- Production still requires CRON_SECRET

### Step 12 — Structured observability

- Run summary with: runId, startedAt, finishedAt, windowStart, windowEnd, currentWindowDue, backlogDue, selected, claimed, published, reconciliationRequired, retryableFailures, terminalFailures, skipped, remainingDue, timeBudgetExhausted, duration
- Per-job: stable codes, no secrets/tokens/full provider responses
- `published` only increments on durable finalization confirmed
- Provider confirmed + incomplete persistence → `reconciliationRequired` (not `published`)

### Step 13 — Tests (32+ scenarios)

- Add `apps/web/lib/__tests__/publishing-cron.test.ts`
- Fake Prisma and publishers via dependency injection
- Cover all 32 scenarios from the contract

### Step 14 — Cron route rewrite

- Rewrite `apps/web/app/api/cron/publisher/route.ts` using extracted services
- Integrate all hardened components

### Step 15 — Immediate publish compatibility

- Ensure `/api/publishing/publish/route.ts` unchanged flows still work
- Dry-run mode preserved
- Scheduled mode uses deterministic IDs + transactional create

### Step 16 — Oreshnik preflight and drift

- Run `npm run oreshnik:preflight`
- Register any ad-hoc drift if needed

### Step 17 — Validate gates and complete

- Run all 7 gates
- Fix issues iteratively
- Attach evidence
- Complete goal
