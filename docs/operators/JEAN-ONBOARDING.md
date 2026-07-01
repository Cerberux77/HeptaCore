# Jean Onboarding

## Clean-room bootstrap

1. Clone the certified `master` branch.
2. Run `npm ci`.
3. Confirm `npx --no-install oreshnik --version` prints `0.2.0-alpha.11`.
4. Run `npm run oreshnik:ready`.

## Jean with Kilo

```powershell
powershell -ExecutionPolicy Bypass -File scripts/oreshnik/onboard-operator.ps1 -Operator jean -Harness kilo -Instance new
powershell -ExecutionPolicy Bypass -File scripts/oreshnik/verify-operator-ready.ps1 -Operator jean -Harness kilo -Instance jean-kilo1
```

Kilo must keep both managed adapters aligned:

- `.kilo/commands/goal.md`
- `.kilo/command/goal.md`

Use `/goal` inside Kilo after `npm run oreshnik:ready`.

## Jean with Codex

```powershell
powershell -ExecutionPolicy Bypass -File scripts/oreshnik/onboard-operator.ps1 -Operator jean -Harness codex -Instance new
powershell -ExecutionPolicy Bypass -File scripts/oreshnik/verify-operator-ready.ps1 -Operator jean -Harness codex -Instance jean-codex1
```

To start the native contract from a terminal:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/oreshnik/start-goal.ps1 -Harness codex -Operator jean -Instance jean-codex1
```

## Expected control-plane checks

- `refs/remotes/origin/oreshnik/control` must exist.
- `npx oreshnik align --check` must be idempotent.
- `npm run oreshnik:ready` must pass before starting `/goal`.
- Jean must not edit runtime JSON by hand.
