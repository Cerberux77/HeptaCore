# PUB-04C Final Correctness Goal

Work only in the current HeptaCore PUB-04 worktree and branch.

Create exactly one Goal Runner goal:

- title: `Finalize PUB-04 production correctness`
- owner: `Manuel`
- sprintId: `S-HC-PUB-04C-FINAL-CORRECTNESS`
- evidenceRequired: `code`
- gates:
  `pub04-contract,diff-check,typecheck,test,build,worker-validate,oreshnik-reconcile,oreshnik-drift`

The goal base commit MUST have this exact subject:

`fix(publishing): restore Hobby-compatible hourly cron matrix`

Never modify any protected path from:

`scripts/goal-runner/pub04-contract-manifest.json`

## Canonical cron architecture

The Vercel Hobby architecture is frozen:

- exactly 24 daily cron definitions;
- one definition per UTC hour;
- each expression is `0 H * * *`;
- paths are `/api/cron/publisher?slot=HH`;
- `slot` is observability only;
- eligibility is always durable state with `scheduledFor <= now`;
- never replace this with one `0 * * * *` expression on Hobby.

Read:

`docs/operations/vercel-hobby-hourly-publisher.md`

## Remaining correctness work

Correct the implementation and real adapters without weakening the frozen contract:

1. Scheduled requests must be idempotent even after the draft is already `SCHEDULED`.
2. Two identical concurrent scheduling requests must return the same deterministic job rather than an arbitrary 409.
3. Cron live and dry-run must enforce tenant `automationMode`.
4. Live and dry-run must reject a missing draft, a draft not in `SCHEDULED`, or a draft whose network differs from the job provider.
5. Dry-run must evaluate the same pre-provider requirements as live, but perform zero writes and zero provider calls.
6. Replace the hardcoded `trialLimit: 999999` with the canonical HeptaCore trial limit.
7. Every post-claim write must require the current `claimToken`; a stale worker must not mutate the job or draft.
8. `recordProviderFailure` must update the draft only if the token-protected job update succeeded.
9. `markReconciliation` must enforce token ownership when called by an active worker.
10. `remainingDue` must include both jobs outside the batch and selected jobs skipped because the time budget was exhausted.
11. Remove the invalid `"VIDUE"` typo.
12. Add adapter-level tests that exercise the real Prisma repository adapters or extracted tested adapters, not local variables that imitate behavior.

Do not modify Oreshnik, deploy, call providers, touch Production, use Playwright, or use `shell: true`.

Iterate autonomously until all eight gates pass. Commit with:

`fix(publishing): finalize PUB-04 adapter correctness`

Push only the current branch and report all gates, tests, commit, and explicit confirmation of no provider/Production activity.
