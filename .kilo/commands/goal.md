# Goal Runner Command (HeptaCore)

When the user invokes `/goal`, follow this protocol. The script `scripts/goal-runner/run.mjs` only manages state, locks, gates, and evidence. Kilo performs all inspection, planning, coding, testing, and iteration.

## Trigger phrases
- `/goal`
- "nuevo goal", "create goal", "start goal"
- "ejecutar goal", "run goal"
- "retomar goal", "resume goal"
- "mis goals", "goal status"
- "goal doctor", "goal runner health", "doctor"

## Step 1 — Status

Always begin with:

```
node scripts/goal-runner/run.mjs status
```

This reveals the active lock (if any), all goals with their status, and the current branch.

## Step 2 — Detect state

### 2a. Lock ACTIVE valido exists

Print the active goal. Ask:

> "Goal `<goalId>` esta ACTIVE en esta rama. Quieres retomarlo? [s/n]"

- If yes: Kilo reads `state.json`, `plan.md`, `progress.md` and continues from the last step.
- If no: ask if the user wants to pause or abort the goal. Do NOT remove the lock or abort without explicit confirmation.

### 2b. Lock stale exists

Print a warning:

> "Lock stale detectado para `<goalId>`. El estado no coincide. Eliminar lock? [s/n]"

- Do NOT delete the lock unless the user explicitly confirms.
- After cleanup, proceed to check for PAUSED/BLOCKED goals (2c).

### 2c. Goals PAUSED or BLOCKED on current branch

List them. Ask:

> "Goals pausados/bloqueados en esta rama: `<goalId>` — `<title>` (`<status>`). Retomar alguno? [id/n]"

- If the user selects one: activate with `run.mjs resume --goalId <id>`.
- If multiple: retomar solo uno. Los demas quedan en cola.

### 2d. No active, no resumable

Proceed to Step 3.

## Step 3 — Resolve goal definition

Before creating a goal, resolve with the user:

1. **Objetivo**: one-sentence description of the deliverable.
2. **Criterios de aceptacion**: concrete pass/fail conditions.
3. **Sprint**: read from `var/oreshnik/task-board.json`. If the user doesn't specify, use the next pending sprint for the operator.
4. **Owner**: from the operator identity (Manuel or Jean).
5. **Tipo de evidencia**: `code` (diff verificable), `ui` (screenshot/QA), or `integration` (test e2e).
6. **Gates**: default `typecheck,build,worker-validate`. Ask if additional gates are needed.
7. **Limites de alcance**: what is explicitly OUT of scope.

Do NOT create the goal until all 7 items are resolved.

## Step 4 — Create and plan

```
node scripts/goal-runner/run.mjs create --title "..." --owner <name> --sprintId <id> --evidenceRequired code|ui|integration --gates "g1,g2"
```

Kilo then writes `goals/<goalId>/plan.md` with a detailed step-by-step plan. After the plan exists:

```
node scripts/goal-runner/run.mjs plan-record --goalId <goalId>
node scripts/goal-runner/run.mjs activate --goalId <goalId>
```

## Step 5 — Execute

Kilo iterates the plan. For each step:

```
node scripts/goal-runner/run.mjs step-start --goalId <goalId> --step "description"
```

Kilo performs the technical work (inspect code, modify files, run tests, interpret results, fix errors).

After completion:

```
node scripts/goal-runner/run.mjs step-complete --goalId <goalId> --step "description" --result "summary of what was done"
```

## Step 6 — Findings

Register findings as they occur:

```
node scripts/goal-runner/run.mjs finding-add --goalId <goalId> --severity info|warn|blocker --content "description"
```

Use:
- `info`: noteworthy observation, not blocking.
- `warn`: scope drift, deferred work, risk identified.
- `blocker`: external dependency, missing credential, production gate.

## Step 7 — Evidence

Before completing, attach evidence of the required type:

```
node scripts/goal-runner/run.mjs evidence-add --goalId <goalId> --type code|ui|integration --path <relative-path>
```

Evidence rules:
- Only relative paths within the repo.
- No absolute paths, no path traversal.
- No `.env`, credentials, tokens, or secrets.
- SHA-256 computed by `run.mjs`.

## Step 8 — Validate and complete

```
node scripts/goal-runner/run.mjs validate --goalId <goalId>
node scripts/goal-runner/run.mjs complete --goalId <goalId>
```

`complete` will:
- Verify evidence of the required type exists.
- Run all configured gates.
- Transition to COMPLETED (immutable).
- Remove the active lock.
- Write `final-report.md`.

If gates fail, fix the issues and retry `validate` + `complete`.

## Anti-loop constraints (MANDATORY)

1. **Maximo 2 intentos con la misma hipotesis.** After the second identical failure, change root cause or strategy.
2. **Maximo 3 ciclos completos de correccion por blocker.** After the third cycle, escalate.
3. **No repetir comandos sin una hipotesis nueva.** Every retry must have a concrete theory.
4. **No modificar tests para ocultar defectos.** Tests fail because code is wrong — fix the code.
5. **Trabajo fuera de alcance**: registrar como `warn` via `finding-add`, marcar `DEFERRED` u `OUT_OF_SCOPE`. No ampliar el goal automaticamente.
6. **No entregar reportes intermedios** salvo decision de producto no resuelta, autorizacion de Production, bloqueo externo real, o desviacion critica.

## Playwright boundaries (when needed)

- Browser: Chromium only.
- Max 6 scenarios per goal.
- Max 2 attempts per scenario.
- Max 3 full Playwright executions per goal.
- Max 12 minutes total Playwright time per goal.
- No open loops (always close browser).
- Verify login and credentials before opening browser.
- Production: PROHIBITED.
- Development and Preview: permitted.
- Screenshot and trace: only on final failure, never on intermediate attempts.

## Hard stops

- **Production requires explicit user authorization.** Kilo must ask before any action affecting production.
- **Goal Runner does not replace Oreshnik.** Task board, zone map, and sprints remain authoritative.
- **Never auto-resume goals.** Always ask.
- **Never remove locks without explicit confirmation.**
- **COMPLETED and ABORTED_CRITICAL_DEVIATION are immutable.** No reopening.
- **Only one goal ACTIVE per worktree.** The script enforces this.
```
