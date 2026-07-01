# Multioperator Operations

## Canonical repos

- HeptaCore runtime baseline is the public `master` branch.
- Oreshnik control plane lives on `oreshnik/control`.
- Oreshnik package is vendored from `0.2.0-alpha.11`.

## Identity rules

- Human operator, harness, instance, and session are separate identities.
- `align --apply` creates or repairs local identity.
- `align --check` must be idempotent and non-mutating.
- Kilo adapters must never hardcode a human operator.

## Standard local flow

```powershell
npm ci
npx --no-install oreshnik --version
npm run oreshnik:ready
powershell -ExecutionPolicy Bypass -File scripts/oreshnik/onboard-operator.ps1 -Operator manuel -Harness codex -Instance new
powershell -ExecutionPolicy Bypass -File scripts/oreshnik/verify-operator-ready.ps1 -Operator manuel -Harness codex -Instance manuel-codex1
```

Then start the native contract:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/oreshnik/start-goal.ps1 -Harness codex -Operator manuel -Instance manuel-codex1
```

## Shared control plane

- Fetch `origin/master` and `origin/oreshnik/control` before certification or resume.
- `dispatch status` must not leave active claims or reserved zones behind after release.
- `dispatch reconcile` must complete without ambiguous repairs before publication.

## Safety constraints

- No `force push`.
- No manual edits to runtime JSON.
- No new real Run unless the task board is ready and authorized.
- No deploy or production actions from this workflow.
