# Findings — GR-20260626T061207Z-d9fa103a-finalize-pub-04-production-correctness

## 2026-06-26T06:22:01.867Z — BLOCKER

Pre-existing encoding mismatch in protected files at base commit 2936c16: docs/operations/vercel-hobby-hourly-publisher.md contains U+00BA (masculine ordinal) instead of U+00FA (u-acute) in 'unicamente', but apps/web/lib/__tests__/vercel-cron-hobby-plan.test.ts expects the correct UTF-8 character. Both files are protected. The test has never passed at this base commit.

## 2026-06-26T06:38:33.085Z — BLOCKER

Reason: Protected baseline encoding mismatch in docs/operations/vercel-hobby-hourly-publisher.md prevents immutable contract from passing. Implementation changes were rescued externally before baseline repair.
