---
description: Oreshnik persistent Goal Runner with bounded gates
agent: code
---

<!-- ORESHNIK:LOCAL_CLI_RESOLVER BEGIN -->
# Oreshnik Local CLI Resolver

Do NOT install Oreshnik globally. Do NOT download or update packages during a Goal.

When a step instructs `oreshnik ...`, resolve the local CLI using this priority:

1. **Within Oreshnik repository** (current working directory is an Oreshnik source checkout):
   - Use `node dist/cli.js`
   - Example: `node dist/cli.js align --check --harness kilo --json`

2. **Oreshnik as local npm dependency** (node_modules/oreshnik exists):
   - Use `node_modules/.bin/oreshnik.cmd` (Windows) or `node_modules/.bin/oreshnik` (Unix)

3. **Oreshnik installed locally but not linked**:
   - Use `npx --no-install oreshnik`

Never rely on a global `oreshnik` command. Never run `npm install` or `npm update` during goal execution.

When the managed block below references `oreshnik`, substitute the resolved local CLI path.
<!-- ORESHNIK:LOCAL_CLI_RESOLVER END -->

<!-- ORESHNIK:KILO_GOAL BEGIN version=oreshnik-kilo-goal/v2 -->
# Oreshnik Goal

Run the native Oreshnik goal contract and obey it exactly. The CLI performs bounded
auto-alignment and target-safe dispatch internally; never re-implement that logic here.

1. Execute `oreshnik goal --harness kilo --auto-align --json`.
   - To require a specific task, append `--task <taskId>`.
2. Parse the JSON contract before touching any files. Read the `result` field.
3. Handle each `result` exactly:
   - `needs_alignment`: alignment could not be repaired automatically. Stop and report
     `alignmentIssues`. Do NOT run a second alignment loop from this prompt; `--auto-align`
     already attempted one bounded repair inside the CLI.
   - `target_missing`: the requested `--task` does not exist. Stop. Never dispatch another task.
   - `target_ineligible`: the requested `--task` exists but is not eligible. Stop and report
     `targetEligibility`. Never substitute another task.
   - `active_assignment_mismatch`: this instance already owns a different task. Stop; never
     touch the other task.
   - `no_task`: nothing is eligible. Stop.
   - `assigned` or `resumed`: work only inside the authorized `worktreePath` and
     `functionalBranch` returned by the contract.
4. Only touch files when the contract returns `assigned` or `resumed` with a `worktreePath`.
5. Never hardcode a human operator ID. Let the CLI resolve identity.
<!-- ORESHNIK:KILO_GOAL END -->
