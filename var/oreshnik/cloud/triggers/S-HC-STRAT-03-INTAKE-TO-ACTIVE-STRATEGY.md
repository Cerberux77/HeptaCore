# Oreshnik Cloud trigger — S-HC-STRAT-03-INTAKE-TO-ACTIVE-STRATEGY

This file is a non-runtime control-plane trigger for a Codex Cloud task.

Authoritative execution contract:

- `docs/oreshnik/S-HC-STRAT-03-INTAKE-TO-ACTIVE-STRATEGY.md`
- `var/oreshnik/cloud/requests/S-HC-STRAT-03-INTAKE-TO-ACTIVE-STRATEGY.json`
- GitHub issue `#16`

Codex must not edit `var/oreshnik/task-board.json`, Runs, claims, assignments, locks, or reservations manually.
It must run the installed Oreshnik CLI, canonically inject/register the Task when absent, then enter through:

```bash
node node_modules/oreshnik-cli/dist/cli.js goal --harness codex --repo . --json
```

All implementation must occur only in the exact Run, branch, worktree, instance and zones returned by Oreshnik.

Requested terminal state: `READY_FOR_MANUAL_QA` without merge or production deployment.
