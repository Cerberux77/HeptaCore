# S-HC-TEN-02A-CANONICAL-ROLE-MODEL-PLATFORMROLE

## Oreshnik rebase evidence

- Rebased branch: `rebase-check/ten-02a-on-master-a1f1560`
- Rebased HEAD: `96acb6ec0ee186e2ae4a152030f50d8f7a4332fe`
- Base master validated before rebase: `a1f156005df8f1eda7868f73b752ef70e8446629`
- Base master includes:
  - PR #8 `/recover` reset-link guard
  - PR #7 vendored `oreshnik-cli 0.2.0-alpha.15`

This rebase preserved the TEN-02A recovery architecture while keeping the post-PR8 security policy from `master`.

## Objective

Repair the current HeptaCore auth model so the platform role and tenant roles match the agreed canonical architecture:

- `User.platformRole = SUPER_ADMIN`
- `Membership.role in {TENANT_ADMIN, PUBLISHER}`

## Branch and commits

- Branch: `codex/s-hc-ten-02a-canonical-role-model-platformrole-2026-07-09`
- Checkpoint commit: `f024918`
- Follow-up remote fixes:
  - preserve platform admin identifiers exactly;
  - remove runtime legacy role aliases;
  - move legacy conversion to repair-only path;
  - keep `SUPER_ADMIN` out of tenant role badge;
  - update canonical role tests so runtime aliases are rejected and repair conversion is tested separately.

## Current mismatch

The repository contained the legacy functional roles `OWNER`, `ADMIN`, `VIEWER`, `STRATEGIST`, `EDITOR`, `ANALYST`, `APPROVER`, and `SUPER_ADMIN` inside `Membership.role`. That contradicted the canonical model and made runtime membership aliases too permissive.

## Canonical target

- Global authorization is granted only by `User.platformRole`.
- Tenant authorization is granted only by `Membership.role`.
- `SUPER_ADMIN` must not require tenant membership.
- `TENANT_ADMIN` and `PUBLISHER` must be the only tenant functional roles.
- `activeTenantId` selects context only; it never grants authorization.

## Recovery guard after rebase

- `/recover` keeps the TEN-02A `password-reset-service` abstraction.
- Recovery input remains identifier-based; it is not reverted to email-only.
- Default response remains generic: `{ ok: true }`.
- `debugResetLink` is emitted only when:

```bash
HEPTACORE_EXPOSE_RESET_LINKS=1
```

- `VERCEL_ENV` is not used to expose reset links.
- Preview does not expose reset links implicitly.
- The handler must not reveal whether the target user exists.

## Platform admin identifiers

The real platform admin login identifiers are exact legacy identifiers:

- `jean`
- `mvera`

Bootstrap must not convert them to invented emails such as `jean@heptacore.dev` or `mvera@heptacore.dev`.

If a configured value contains `@`, it is treated as an email and normalized to lowercase. If it does not contain `@`, it is preserved exactly as the legacy login identifier.

Preferred env:

```bash
HEPTACORE_PLATFORM_ADMIN_IDENTIFIERS="mvera,jean"
```

## Safe legacy conversion

| Legacy membership role | Canonical action |
|---|---|
| `SUPER_ADMIN` | Set `User.platformRole = SUPER_ADMIN` and remove obsolete membership |
| `OWNER` | Convert to `TENANT_ADMIN` |
| `ADMIN` | Convert to `TENANT_ADMIN` |
| `TENANT_ADMIN` | Keep |
| `PUBLISHER` | Keep |

## Ambiguous role abort behavior

The repair flow must stop and report safely if any of these roles are present in live target data:

- `STRATEGIST`
- `EDITOR`
- `ANALYST`
- `APPROVER`
- `VIEWER`

These roles require a manual assignment decision and must not be converted automatically.

## Runtime authorization rule

Runtime authorization must not use legacy aliases. `OWNER` and `ADMIN` are not valid runtime shortcuts for `TENANT_ADMIN`.

Tenant access is granted only when:

- `User.platformRole === "SUPER_ADMIN"`, or
- `Membership.role === "TENANT_ADMIN"`, or
- `Membership.role === "PUBLISHER"`, depending on the route permission.

## Migration / repair strategy

The repair script uses raw SQL for legacy role inspection and repair so it can read historical enum values even after the Prisma schema is reduced to the canonical `UserRole` enum.

Mutation is gated by:

```bash
HEPTACORE_ALLOW_ROLE_REPAIR=1 node scripts/repair-canonical-role-model.mjs --apply
```

Default execution is dry-run and reports counts/ambiguous rows without mutating data.

## Files changed

Main areas changed in the WIP branch:

- `packages/db/prisma/schema.prisma`
- `scripts/repair-canonical-role-model.mjs`
- `scripts/seed-admin.mjs`
- `scripts/seed-qa-e2e.mjs`
- `apps/web/lib/role-model.ts`
- `apps/web/lib/canonical-tenant-role.ts`
- `apps/web/lib/permissions.ts`
- `apps/web/lib/rbac.ts`
- `apps/web/lib/tenant-access.ts`
- `apps/web/lib/admin-capabilities.ts`
- `apps/web/lib/session-capabilities.ts`
- `apps/web/lib/password-reset-service.ts`
- `apps/web/lib/__tests__/canonical-tenant-role.test.ts`
- password reset routes/pages/tests
- tenant/admin API routes and tests
- this Oreshnik evidence file

## Validation

Rebase validation against the post-PR7 / post-PR8 `master` base:

- `npm run oreshnik:ready`: PASS, `ORESHNIK READY FOR KILO + GOAL RUNNER`
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run test:infra`: PASS, `160/160` tests passing
- `git diff --check`: PASS

Operational Oreshnik checks executed during evidence refresh:

- `npm run oreshnik:status`
- `npm run oreshnik:dispatch:status`

`npm run oreshnik:dispatch:status` completed and reported the current remote control-plane inventory and historical duplicate warnings without mutating state.

## Integration status

- TEN-02A is now rebased on the validated `master` that already contains PR #8 and PR #7.
- Local Oreshnik release-governance gates listed above are green on the rebased worktree.
- This evidence update does not change auth behavior, Prisma schema contents, or role semantics beyond documenting the already rebased state.

## Guardrails

- No secrets committed.
- No production DB mutated.
- No merge performed.
- No force-push performed.
- PR #7 was not modified.
- Oreshnik alpha.15 adoption was not touched.
- Oreshnik alpha.15 remains baseline `N`.
- Oreshnik alpha.16 was not started.
