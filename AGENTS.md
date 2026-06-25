# HeptaCore Agent Operating Rules

## Paso 0 - Oreshnik Preflight

Before starting implementation work, run:

```bash
npm run oreshnik:preflight -- --sprint S-HC-XX --operator Manuel --desc "descripcion"
```

Jean uses:

```bash
npm run oreshnik:preflight -- --sprint S-HC-XX --operator Jean --desc "descripcion"
```

If preflight reports blockers, stop and fix them before editing.

## Closing

Before closing a sprint:

```bash
npm run typecheck
npm run build
npm run worker:validate
npm run oreshnik:close -- --sprint S-HC-XX --operator Manuel --desc "descripcion"
```

Use `--push` only when the documentation closure is reviewed and ready to share:

```bash
npm run oreshnik:close -- --sprint S-HC-XX --operator Manuel --desc "descripcion" --push
```

## Branches

- Mother docs branches: `MADRE/vN-sprint-desc-date`
- Manuel child branches: `Manuel/sprint-desc-date`
- Jean child branches: `Jean/sprint-desc-date`

Do not work directly on the mother branch except through Oreshnik close/sync flows.

## Canonical Docs

- `docs/obsidian-vault/00_CENTRAL_HEPTACORE.md`
- `docs/obsidian-vault/SPRINTS/PLAN_MAESTRO_SPRINTS.md`
- `docs/obsidian-vault/METODOLOGIA/METODOLOGIA_ORESHNIK_HEPTACORE.md`
- `docs/07_handoffs/zone-map.json`

## Hard Stops

- No real RRSS publishing outside an explicitly authorized sprint. Publishing is operational and authorized within scoped sprint boundaries (e.g., S-HC-PUB-xx). Accidental publishing during QA, dry-run testing, or development is prohibited.
- No campaign spend.
- No real scraping.
- No credentials in git.
- No Prisma/schema/auth/security changes without double lock.
- No sprint closure without vault updates.
- Before `vercel deploy --prod` or any production deploy, run `npm run oreshnik:preflight` and verify drift step 10/10 is clean.

## Drift Detection

When work exceeds the planned sprint scope, register ad-hoc changes:

```bash
# Check current drift status
npm run oreshnik:drift -- --check

# Register drift silently (auto-assigns S-HC-DRIFT-NNN)
npm run oreshnik:drift -- --operator Manuel --mode silent --desc "que hiciste"
```

Preflight step 10/10 warns when unregistered changes are detected. Drift entries link to the mother branch on sprint close for traceability.

Oreshnik drift **no es automatico** — no hay git hooks ni watchers. Todo agente debe invocar `oreshnik:preflight` al iniciar y `oreshnik:drift` al detectar desborde de scope.

## Pre-Push Drift Hook

A non-blocking git pre-push hook warns when uncommitted files exceed the drift threshold:

```bash
# Install once per clone
npm run oreshnik:hook:install
```

The hook fires on every `git push` and:
- Scans working tree for uncommitted changes outside `var/oreshnik/`
- Scores them (file count, new files, deleted, critical zones)
- If score >= 3, prints a yellow warning with the `npm run oreshnik:drift` command
- NEVER blocks the push — advisory only

To test the hook manually:
```bash
node scripts/oreshnik/hooks/pre-push-check.mjs
```

## Goal Runner

Goal Runner manages isolated, deterministic work units within a sprint. It does not replace Oreshnik or the task board.

### Core rules

- **One goal ACTIVE per worktree.** Enforced by `scripts/goal-runner/run.mjs` via `.active-worktree.json`.
- **Oreshnik is the authority for sprints, zones, and owners.** Goal Runner references `sprintId` from `var/oreshnik/task-board.json` but does not modify it.
- **Goal Runner never replaces the task board.** Goals are execution units inside a sprint, not sprints themselves.
- Production actions require explicit user authorization. Preview and Development permit QA, seeds, and automation.
- **Kilo modifies code; `run.mjs` only manages state.** The script handles locks, transitions, gates, and evidence. It never inspects or modifies application code.
- **Terminal states (COMPLETED, ABORTED_CRITICAL_DEVIATION) are immutable.** No reopening.
- **COMPLETED is forbidden without evidence of the required type and all gates passing.**

### Goal lifecycle

```
DRAFT -> READY -> ACTIVE -> COMPLETED
                   |    |
                   +--> PAUSED -> ACTIVE
                   |
                   +--> BLOCKED_EXTERNAL -> ACTIVE
                   |
                   +--> ABORTED_CRITICAL_DEVIATION
```

### Key commands

```bash
node scripts/goal-runner/run.mjs status
node scripts/goal-runner/run.mjs create --title "..." --owner <name> --sprintId <id> --evidenceRequired code|ui|integration --gates "g1,g2"
node scripts/goal-runner/run.mjs plan-record --goalId <id>
node scripts/goal-runner/run.mjs activate --goalId <id>
node scripts/goal-runner/run.mjs step-start --goalId <id> --step "..."
node scripts/goal-runner/run.mjs step-complete --goalId <id> --step "..." --result "..."
node scripts/goal-runner/run.mjs evidence-add --goalId <id> --type code|ui|integration --path <relpath>
node scripts/goal-runner/run.mjs complete --goalId <id>
node scripts/goal-runner/run.mjs doctor
```

### Resumption

When `/goal` or preflight detects a goal ACTIVE, PAUSED, or BLOCKED on the current branch, Kilo offers resumption. Never auto-resume without explicit confirmation. Stale locks must be confirmed before removal.
