# S-HC-TEN-02A-CANONICAL-ROLE-MODEL-PLATFORMROLE

## Objective

Repair the current HeptaCore auth model so the platform role and tenant roles match the agreed canonical architecture:

- `User.platformRole = SUPER_ADMIN`
- `Membership.role in {TENANT_ADMIN, PUBLISHER}`

## Current mismatch

The repository still contains the legacy functional roles `OWNER`, `ADMIN`, `VIEWER`, `STRATEGIST`, `EDITOR`, `ANALYST`, `APPROVER`, and `SUPER_ADMIN` inside `Membership.role`. That contradicts the canonical model and makes `activeTenantId` and membership aliases too permissive.

## Canonical target

- Global authorization is granted only by `User.platformRole`
- Tenant authorization is granted only by `Membership.role`
- `SUPER_ADMIN` must not require tenant membership
- `TENANT_ADMIN` and `PUBLISHER` must be the only tenant functional roles

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

## Files changed

Pending implementation.

## Validation

Pending implementation.

## Guardrails

- No secrets committed
- No production DB mutated without approval
- PR #7 not modified
- Oreshnik alpha.15 adoption not touched
