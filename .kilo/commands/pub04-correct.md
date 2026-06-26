# PUB-04 Corrective Goal — frozen acceptance contract

Work only in the current worktree and branch.

Create exactly one Goal Runner goal with:

- title: `Correct PUB-04 cron execution semantics`
- owner: `Manuel`
- sprintId: `S-HC-PUB-04B-CRON-CORRECTNESS`
- evidenceRequired: `code`
- gates:
  `pub04-contract,diff-check,typecheck,test,build,worker-validate,oreshnik-reconcile,oreshnik-drift`

The goal base commit MUST be the commit whose subject is:

`test(publishing): freeze PUB-04 acceptance contract`

Protected files are defined in:

`scripts/goal-runner/pub04-contract-manifest.json`

Never modify any protected path. The `pub04-contract` gate compares them against the goal base commit and will fail if they change.

## Task

Replace the placeholders and correct the real production architecture until the immutable contract gate passes:

- `apps/web/lib/publishing-cron-executor.ts`
- `apps/web/lib/publishing-scheduler-service.ts`

Then make the real routes delegate to those tested services:

- `apps/web/app/api/cron/publisher/route.ts`
- `apps/web/app/api/publishing/publish/route.ts`

Use adapters around Prisma, publishers, credential resolution, audit logging, and finalization. Keep domain orchestration in the injected services.

Required semantics are encoded in the frozen contract tests. In particular:

- all pre-provider validation happens before attempts increment;
- attempts increments exactly once immediately before a real provider call;
- every mutation after claim is protected by claimToken;
- expired pre-provider leases can be reclaimed;
- post-provider leases are reconciliation-only;
- dry-run performs zero writes and cannot report PUBLISHED;
- fixed socialAccountId never falls back;
- unsupported live formats stay blocked;
- retryable failures leave job and draft compatible with the next cron;
- durable success reconciles locally without another provider call;
- remainingDue counts the complete due set, not only the selected batch;
- scheduling is deterministic, atomic, idempotent, and rejects Invalid Date.

Do not weaken the contract, bypass it, duplicate test-only implementations, or add alternate routes. The production route must use the same services exercised by the immutable tests.

Do not touch Production, Vercel settings, real credentials, Meta, Facebook, Instagram, Oreshnik source, or any other worktree. Do not deploy. Do not use Playwright. Never use `shell: true`.

Iterate autonomously until all eight gates pass. Ordinary test, build, type, and implementation failures are not reasons to stop. Stop only for a real external blocker or a required destructive migration.

Before completion:

1. run `pub04-contract` by Goal Runner;
2. run all configured gates;
3. attach code evidence from the real executor implementation;
4. run Goal Runner doctor and require `Healthy: YES`;
5. commit with:
   `fix(publishing): correct hourly cron execution semantics`
6. push only the current branch;
7. report final commit, tests, gates, and explicit confirmation that no provider and no Production system was touched.
