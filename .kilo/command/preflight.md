# Oreshnik Preflight Command (HeptaCore)

When a user identifies themselves or asks for pending tasks from HeptaCore, run Oreshnik preflight. CRITICAL: rebuild CLI first.

## Trigger phrases
- "soy Jean", "soy Architect", "soy Manuel"
- "dame mis pendientes", "mis tareas", "what are my tasks"
- "alineame", "preflight", "preparame", "que debo hacer"

## Action (STRICT)
1. Extract operator name (Jean, Architect, Manuel). Fallback: `git config user.name`.
2. ALWAYS rebuild Oreshnik CLI:
   ```
   cd ..\oreshnik && npm run build
   ```
3. Generate sprint: `S-HC-{OPERATOR}-{today}`
4. Run preflight from HeptaCore directory:
   ```
   node ..\oreshnik\dist\cli.js preflight --sprint {sprint} --operator {name} --desc "trabajo en curso"
   ```
5. Show preflight output AS-IS. Do NOT run your own task-board queries.

## Cross-operator blocking
- Preflight step 6 shows [BLOCK] for tasks in your zones being worked by other operators
- If [BLOCK] appears, coordinate with the other operator before touching those files

## Goal detection (AFTER preflight)

After preflight completes, check for an active or resumable goal:

```
node scripts/goal-runner/run.mjs status
```

### Lock ACTIVE valido

If a valid active lock exists:

> "Goal `<goalId>` esta ACTIVE en esta rama. Retomar? [s/n]"

- Yes: Kilo reads `state.json`, `plan.md`, `progress.md` and resumes from the last incomplete step.
- No: ask whether to pause the goal. Do NOT remove the lock without explicit confirmation.

### Lock stale

If a stale lock is detected (worktree, branch, or state mismatch):

> "Lock stale detectado para `<goalId>`. Eliminarlo? [s/n]"

- Do NOT delete without confirmation.
- After cleanup, check for PAUSED/BLOCKED goals.

### Goals PAUSED or BLOCKED on current branch

List them:

> "Goals pausados/bloqueados en esta rama: `<goalId>` — `<title>` (`<status>`). Retomar alguno? [id/n]"

- Only one at a time.
- If none selected, proceed with the sprint normally.

### No goals

Proceed with the sprint normally. Oreshnik task board governs the work.
