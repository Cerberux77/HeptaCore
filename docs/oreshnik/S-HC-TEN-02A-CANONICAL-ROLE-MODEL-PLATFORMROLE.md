# S-HC-TEN-02A-CANONICAL-ROLE-MODEL-PLATFORMROLE

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
  - keep `SUPER_ADMIN` out of tenant role badge.

## Current mismatch

The repository contained the legacy functional roles `OWNER`, `ADMIN`, `VIEWER`, `STRATEGIST`, `EDITOR`, `ANALYST`, `APPROVER`, and `SUPER_ADMIN` inside `Membership.role`. That contradicted the canonical model and made runtime membership aliases too permissive.

## Canonical target

- Global authorization is granted only by `User.platformRole`.
- Tenant authorization is granted only by `Membership.role`.
- `SUPER_ADMIN` must not require tenant membership.
- `TENANT_ADMIN` and `PUBLISHER` must be the only tenant functional roles.
- `activeTenantId` selects context only; it never grants authorization.

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
- password reset routes/pages/tests
- tenant/admin API routes and tests
- this Oreshnik evidence file

## Validation

Local validation reported before the WIP checkpoint:

- `npm run typecheck`: OK
- `npm run build`: OK
- `npm run test -w @heptacore/web -- tenant-admin-service`: OK, 608/608 tests passing
- `npm run test -w @heptacore/web -- error-messages tenant-admin-service`: OK

Validation still required after the follow-up remote fixes:

- `npm run typecheck`
- `npm run build`
- `npm run test:infra`
- `npm run test -w @heptacore/web`
- `git diff --check`
- `npm run oreshnik:ready` if available/applicable

## Vercel status

The checkpoint commit `f024918` had Vercel failing. The Vercel log was not accessible through this evidence pass. The failure must be inspected and fixed or documented as external/unrelated before this task can be marked ready for integration.

## Guardrails

- No secrets committed.
- No production DB mutated.
- No merge performed.
- No force-push performed.
- PR #7 was not modified.
- Oreshnik alpha.15 adoption was not touched.
- Oreshnik alpha.15 remains baseline `N`.
- Oreshnik alpha.16 was not started.
