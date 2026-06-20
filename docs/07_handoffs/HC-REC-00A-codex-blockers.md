# Codex Promotion Blockers — S-HC-REC-00A

Date: 2026-06-20
Veredict: CHANGES_REQUIRED_BEFORE_PROMOTION (resolved in B.4A / B.4A.1 / B.4B)
Sprint: S-HC-REC-00A
Operator: Manuel
Branch: manuel/s-hc-rec-00a-ui-publishing-baseline
HEAD: 667437e (pending B.4B commit)

## Status

AWAITING_CODEX_FINAL_REVIEW_AFTER_B4B

All P1 blockers from audit resolved. Staged deployment pending B.4B completion.

## Resolved P1 Blockers

### 1. Race: scheduled vs immediate claim
- Both paths use atomic `updateMany where {status: APPROVED}`.
- Immediate uses `buildImmediateJobId`, scheduled uses `buildScheduledJobId` with timestamp.
- Cron uses `updateMany where {id, status: "SCHEDULED"}` on PublishingJob.

### 2. Manual approval reusable
- `useEffect([selectedId, publishMode])` resets approval, state, and message.
- Controls frozen during loading.
- Stale responses ignored via requestId.

### 3. Provider success persistence failure
- PublishingResult persisted first, ContentDraft second, each independently wrapped.
- Failure returns HTTP 202 with `providerConfirmed: true` and externalPostId.
- Draft NEVER reverted to APPROVED after providerConfirmed.
- Legacy + immediate job IDs checked before claim.

### 4. Cron hardening
- `checkCronJobEligibility()` validates: draft status, network match, externalPostId absence, result absence, scheduledFor, immediate pre-attempt exclusion.
- Atomic claim via `updateMany where {id, status: "SCHEDULED"}` transitions to PUBLISHED before provider call.

### 5. Instagram container readiness
- `waitForInstagramContainerReady` with single global deadline (50s).
- Polls `status_code` with backoff 1s-8s, max 12 attempts.
- 9007 post-readiness: repoll same containerId, single retry.

### 6. Serverless budget
- `maxDuration: 60` on publish route (Vercel Pro limit).
- Instagram polling: 50s deadline, 10s margin for auth/DB/persistence.

## Staged Deployments

- dpl_5LwY9FoBZjS9D2u5mpi1rhq5NFJJ (B.3 durability)
- Production: dpl_8iKrhoJMEsrTLWfgzCQyVPD1saEM (heptacore.vercel.app)

## P2/P3 Deferred

| Item | Target Sprint |
|---|---|
| next lint (deprecated in Next.js 16) | S-HC-PROD-06 |
| npm vulnerabilities | S-HC-PROD-06 |
| Worker Redis / scheduling robusto | S-HC-PROD-05 |
| Asset deduplication | Asset lifecycle sprint |
| Oreshnik task board | S-OR-REC-00B / S-HC-REC-00C |
| Turpial E2E final | S-HC-PUB-01 |

## Rule

Do not close Oreshnik until S-OR-REC-00B and S-HC-REC-00C fix the command layer.
Do not promote to production without Codex approval.
