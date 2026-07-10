# Oreshnik 0.2.0-alpha.16 Adoption Evidence

This document records HeptaCore's adoption of the vendored Oreshnik operational package that introduced the canonical operator handoff command.

## Source package

- Source repository: `Cerberux77/oreshnik`
- Handoff PR: `https://github.com/Cerberux77/oreshnik/pull/19`
- Release PRs: `https://github.com/Cerberux77/oreshnik/pull/20`, `https://github.com/Cerberux77/oreshnik/pull/21`, `https://github.com/Cerberux77/oreshnik/pull/22`
- Release tag: `v0.2.0-alpha.16`
- Release commit: `d983c051c79b99c3fcda6c4c200b7c96bda997ff`
- Package version: `0.2.0-alpha.16`
- GitHub Release asset: `oreshnik-cli-0.2.0-alpha.16.tgz`
- GitHub Release asset SHA-256: `8E38737A7CC3AD88414582C4F51630E481BBF0723480079DA93CA91B4F208473`

## HeptaCore vendored package

- Vendored tarball: `vendor/oreshnik/oreshnik-cli-0.2.0-alpha.16-d983c051c79b99c3fcda6c4c200b7c96bda997ff.tgz`
- Dependency spec: `file:vendor/oreshnik/oreshnik-cli-0.2.0-alpha.16-d983c051c79b99c3fcda6c4c200b7c96bda997ff.tgz`
- Expected readiness version: `0.2.0-alpha.16`

The vendored filename keeps the full Oreshnik release commit so `npm run oreshnik:ready` can verify that the dependency is pinned to an exact reviewed source revision.

## Canonical handoff smoke

Validated from the HeptaCore clean adoption worktree:

- `node node_modules\oreshnik-cli\dist\cli.js --version`: `0.2.0-alpha.16`
- `node node_modules\oreshnik-cli\dist\cli.js handoff --help`: exposes `create`, `show`, `validate`, `resume`, and `list`
- `npm run oreshnik:ready`: PASS, `ORESHNIK READY FOR KILO + GOAL RUNNER`

## Preflight evidence

`npm run oreshnik:preflight -- --sprint S-HC-INFRA-BASELINE-GATES-RECOVERY --operator Manuel --desc "adopcion oreshnik alpha16 recovery ci"` was executed after the bootstrap pin.

Result:

- Blockers: `0`
- Warnings: `3`
- Warning 1: remote branch for the adoption PR did not exist yet.
- Warning 2: canonical alignment reports `S-HC-TEN-02A-CANONICAL-ROLE-MODEL-PLATFORMROLE` missing from status board while present in task state.
- Warning 3: 18 historical injection proposals remain pending.

The preflight auto-synced the first local adoption branch to `MADRE/v55`, which would have mixed PUB-06 history into the alpha16 adoption PR. That branch was not pushed. The clean adoption branch was rebuilt from `origin/master` with only the alpha16 bootstrap commit.

## Validation plan

- `npm ci --ignore-scripts --no-audit --no-fund --prefer-offline`
- `npm run oreshnik:ready`
- `node node_modules\oreshnik-cli\dist\cli.js --version`
- `node node_modules\oreshnik-cli\dist\cli.js handoff --help`
- `npm run typecheck`
- `npm run build`
- `npm run test:infra`
- `npm run worker:validate`
- `git diff --check`

## Rollback

Rollback to the prior vendored package is mechanical:

1. Restore `package.json` dependency to `file:vendor/oreshnik/oreshnik-cli-0.2.0-alpha.15-48bdbae47dc676606e2d64d656786eef58afa6c7.tgz`.
2. Restore `scripts/oreshnik/ready.mjs` expected version to `0.2.0-alpha.15`.
3. Regenerate `package-lock.json` with `npm install --package-lock-only --ignore-scripts --no-audit --no-fund --prefer-offline`.
4. Run `npm ci --ignore-scripts --no-audit --no-fund --prefer-offline`.
5. Run `npm run oreshnik:ready`.

## Scope guard

This adoption only updates HeptaCore's pinned Oreshnik CLI package, readiness expectation, and adoption evidence.

It does not change product code, Prisma schema, environment files, task-board state, active assignments, claims, runs, zones, HeptaCore behavior, release automation, production deployment configuration, OAuth credentials, or social publishing configuration.
