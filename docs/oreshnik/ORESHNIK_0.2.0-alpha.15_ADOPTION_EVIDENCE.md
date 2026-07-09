# Oreshnik 0.2.0-alpha.15 Adoption Evidence

This document records HeptaCore's adoption of the vendored Oreshnik operational package produced by the REL-15 normalization work.

## Source package

- Source repository: `Cerberux77/oreshnik`
- Source PR: `https://github.com/Cerberux77/oreshnik/pull/18`
- Source commit: `48bdbae47dc676606e2d64d656786eef58afa6c7`
- Source merge commit: `0530717a744ff0e0b1a0714a47ee4a4d4faf6611`
- Package version: `0.2.0-alpha.15`
- Source tarball: `oreshnik-cli-0.2.0-alpha.15.tgz`
- Source SHA-256: `0CDF05A6AE0E79E8C7A32047F0C8B84091164099C83AC2881A8A56A9ADC2D481`

## HeptaCore vendored package

- Vendored tarball: `vendor/oreshnik/oreshnik-cli-0.2.0-alpha.15-48bdbae47dc676606e2d64d656786eef58afa6c7.tgz`
- Dependency spec: `file:vendor/oreshnik/oreshnik-cli-0.2.0-alpha.15-48bdbae47dc676606e2d64d656786eef58afa6c7.tgz`
- Expected readiness version: `0.2.0-alpha.15`

The vendored filename keeps the full Oreshnik source commit so `npm run oreshnik:ready` can verify that the dependency is pinned to an exact reviewed source revision.

## Validation plan

- `npm install`
- `npm run oreshnik:ready`
- `npm run typecheck`
- `npm run build`
- `npm run test:infra`
- `git diff --check`

## Scope guard

This adoption only updates HeptaCore's pinned Oreshnik CLI package and readiness expectation.

It does not change product code, Prisma schema, environment files, task-board state, active assignments, claims, runs, zones, HeptaCore behavior, release automation, or production deployment configuration.
