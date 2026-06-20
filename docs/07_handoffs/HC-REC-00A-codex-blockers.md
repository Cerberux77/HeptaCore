# Codex Promotion Blockers — S-HC-REC-00A

Date: 2026-06-20
Veredict: CHANGES_REQUIRED_BEFORE_PROMOTION
Sprint: S-HC-REC-00A
Operator: Manuel
Branch: manuel/s-hc-rec-00a-ui-publishing-baseline
HEAD: c339530

## Status

FUNCTIONALLY_VERIFIED_BUT_NOT_PROMOTION_READY

Facebook and Instagram published successfully from production UI. Codex audit identified three P1 blockers that must be resolved before promotion.

## P1 Blockers

### 1. Race: scheduled vs immediate claim

- Immediate path claims draft via `updateMany` (APPROVED -> SCHEDULED).
- Scheduled path uses direct `update` without conditional check.
- Race: scheduled request that read APPROVED before immediate claim can still succeed and create a PublishingJob. Cron may later re-publish.

### 2. Manual approval reusable

- `manualApproval` boolean persists across draft changes and mode changes.
- Approval given for draft A with mode `immediate` remains true when switching to draft B or `scheduled`.

### 3. Provider success persistence failure window

- Provider returns `externalPostId` successfully.
- If persistence (draft update, job update, result insert) fails after provider success, the current code reverts draft to APPROVED via the error catch.
- This loses the externalPostId and allows duplicate publishing.

## P2/P3 Deferred

| Item | Target Sprint |
|---|---|
| next lint (deprecated in Next.js 16) | S-HC-PROD-06 |
| npm vulnerabilities | S-HC-PROD-06 |
| Global asset deduplication | Asset lifecycle sprint |
| Worker Redis persistent | S-HC-PROD-05 |
| Scheduling E2E complete | S-HC-PROD-05 |
| Oreshnik dashboard | S-OR-REC-00B / S-HC-REC-00C |
| YouTube / LinkedIn publishers | Future |

## Staged Deployments

- dpl_7HmrdvsbPY5CqhJjPF3HsW9Wornw (B.2.2 candidate, superseded)
- dpl_9ukgvjwgqu2U6Gqk8rH7fCyL6856 (B.2.4 Instagram fix)
- Production: dpl_8iKrhoJMEsrTLWfgzCQyVPD1saEM (heptacore.vercel.app still active)

## Rule

Do not close Oreshnik until S-OR-REC-00B and S-HC-REC-00C fix the command layer.
