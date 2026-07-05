# Oreshnik Cloud CI Runbook

This runbook explains how HeptaCore uses Oreshnik Cloud CI and how to respond when it fails.

## Purpose

Oreshnik Cloud CI adds a non-disruptive cloud safety layer on top of the existing local Oreshnik workflow.

It does not replace local commands such as:

- `npm run oreshnik:preflight`
- `npm run oreshnik:ready`
- `npm run oreshnik:canonical`
- `npm run oreshnik:gate`

## When the Workflow Runs

The workflow runs in these cases:

- On `pull_request` targeting `master`
- On `push` to any branch except `master`

This gives branch-level validation before anything is merged.

## What It Validates

The workflow runs these steps:

1. `npm ci`
2. `npm run oreshnik:ready`
3. `npm run oreshnik:canonical`
4. `npm run oreshnik:drift:ci`
5. `npm run oreshnik:gate`

If available, it also uploads artifacts from:

- `var/oreshnik/`
- `var/goal-runner/`

## How to Read Failures

Treat each failure according to the step that failed.

## If `oreshnik:ready` Fails

This usually means one of these conditions is true:

- dependencies were not installed correctly
- `origin/oreshnik/control` was not fetched
- the working tree is unexpectedly dirty
- local/CI runtime prerequisites are incomplete

What to do:

1. Confirm `npm ci` completed successfully.
2. Confirm the workflow fetched `origin/master` and `origin/oreshnik/control`.
3. Read the exact error from `scripts/oreshnik/ready.mjs`.
4. If the issue is branch dirtiness, inspect whether the CI job created or modified files unexpectedly.

## If `oreshnik:canonical` Fails

This means derived Oreshnik documents are no longer aligned with the canonical task board.

What to do:

1. Inspect the failure output for the exact derived document mismatch.
2. Compare against `var/oreshnik/task-board.json`.
3. Regenerate or realign the derived docs locally before pushing again.

Do not bypass this failure by editing the task board casually.

## If `oreshnik:drift:ci` Fails

This means CI detected uncommitted critical drift in the checked-out workspace.

The CI drift check is intentionally non-interactive:

- no menus
- no prompts
- exit `1` on critical drift
- exit `0` when no critical drift is present

What to do:

1. Read the printed path list.
2. Confirm whether the modified path is a protected area such as `package.json`, `.env`, auth, middleware, or Prisma.
3. If the failure is unexpected in CI, inspect whether a previous step generated files in tracked protected paths.

## If `oreshnik:gate` Fails

This means the operational gate did not accept the branch state.

What to do:

1. Read the exact gate output first.
2. Check whether prerequisite Oreshnik evidence is missing.
3. Verify that the branch still satisfies the expected operational constraints for the current sprint/task.

Do not weaken the gate only to make CI pass.

## Branch Protection

Branch protection is intentionally out of scope for this phase.

Why:

- this phase is only about proving the workflow is stable
- we do not want to block normal work before the job has passed in at least one real PR
- enabling protection too early would be operationally disruptive

Recommended next step after this phase:

- require `Oreshnik Cloud CI / oreshnik-cloud-ci` on `master` only after at least one real PR passes end-to-end

## Operational Notes

- The cloud workflow is additive and should not break local Oreshnik usage.
- `scripts/oreshnik/drift.mjs` remains the interactive/local path.
- `scripts/oreshnik/drift-ci.mjs` exists only for non-interactive CI execution.
