#!/usr/bin/env bash
set -euo pipefail

TASK_ID="S-HC-PUB-07B-YOUTUBE-SCHEDULED-E2E"
RUN_ID="run-manuel-S-HC-PUB-07B-YOUTUBE-SCHEDULED-E2E-20260910173721-206fad0f"
OPERATOR="manuel"
HARNESS="chatgpt"
INSTANCE_ALIAS="manuel-chatgpt1"
SESSION_ID="session_f41fead26d4548cd84d66159a64bad09"
FUNCTIONAL_BRANCH="dispatch/manuel/manuel-chatgpt1/publishing/S-HC-PUB-07B-YOUTUBE-SCHEDULED-E2E/da546a5360"
ORESHNIK_VERSION="0.3.0-alpha.6"
export ORESHNIK_LOCAL_STATE_DIR="$RUNNER_TEMP/oreshnik-local-state"

git fetch origin master oreshnik/control "$FUNCTIONAL_BRANCH"
git checkout -B controller origin/master
git config user.name "Manuel Vera via ChatGPT Operator"
git config user.email "manuel@heptacore.dev"

npm ci --ignore-scripts
test "$(node node_modules/oreshnik-cli/dist/cli.js --version)" = "$ORESHNIK_VERSION"
npm run oreshnik:ready

ROOT="$RUNNER_TEMP/oreshnik-wt-pub07b-recover"
node node_modules/oreshnik-cli/dist/cli.js dispatch init --mother master --worktree-root "$ROOT" --repo . --json > "$RUNNER_TEMP/pub07b-recover-init.json"
node node_modules/oreshnik-cli/dist/cli.js dispatch takeover \
  --run "$RUN_ID" \
  --reason "Recover PUB-07B after all deterministic gates passed but structured dry-run evidence was not yet recorded." \
  --operator "$OPERATOR" --harness "$HARNESS" --instance "$INSTANCE_ALIAS" --session "$SESSION_ID" \
  --repo . --json > "$RUNNER_TEMP/pub07b-recover-takeover.json"
cat "$RUNNER_TEMP/pub07b-recover-takeover.json"
test "$(jq -r .runId "$RUNNER_TEMP/pub07b-recover-takeover.json")" = "$RUN_ID"
test "$(jq -r .functionalBranch "$RUNNER_TEMP/pub07b-recover-takeover.json")" = "$FUNCTIONAL_BRANCH"
WT="$(jq -r .worktreePath "$RUNNER_TEMP/pub07b-recover-takeover.json")"
test -d "$WT"

git -C "$WT" config user.name "Manuel Vera via ChatGPT Operator"
git -C "$WT" config user.email "manuel@heptacore.dev"
git -C "$WT" fetch origin "+refs/heads/$FUNCTIONAL_BRANCH:refs/remotes/origin/pub07b-current"
# takeover should already materialize this branch; fast-forward defensively only.
git -C "$WT" merge --ff-only refs/remotes/origin/pub07b-current
cd "$WT"

npm ci --ignore-scripts
npm run db:generate

DRY_ARGS=(tsx --test --test-name-pattern "scheduled dry-run recognizes YouTube formats without calling provider" apps/web/lib/__tests__/pub07-scheduled.test.ts)
DRY_CMD="npx ${DRY_ARGS[*]}"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
START_MS="$(date +%s%3N)"
set +e
npx "${DRY_ARGS[@]}" > >(tee "$RUNNER_TEMP/pub07b-dry-run.stdout") 2> >(tee "$RUNNER_TEMP/pub07b-dry-run.stderr" >&2)
DRY_EXIT=$?
set -e
FINISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
FINISH_MS="$(date +%s%3N)"
DURATION_MS=$((FINISH_MS - START_MS))
test "$DRY_EXIT" -eq 0

grep -F "PUB-07 scheduled dry-run recognizes YouTube formats without calling provider" "$RUNNER_TEMP/pub07b-dry-run.stdout" >/dev/null
grep -F "fail 0" "$RUNNER_TEMP/pub07b-dry-run.stdout" >/dev/null

export TASK_ID RUN_ID OPERATOR DRY_CMD STARTED_AT FINISHED_AT DURATION_MS DRY_EXIT
export DRY_STDOUT_FILE="$RUNNER_TEMP/pub07b-dry-run.stdout"
export DRY_STDERR_FILE="$RUNNER_TEMP/pub07b-dry-run.stderr"
node --input-type=module <<'NODE' | tee "$RUNNER_TEMP/pub07b-structured-evidence.json"
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { createTaskRuntimeService } from './node_modules/oreshnik-cli/dist/index.js';
const stdout = fs.readFileSync(process.env.DRY_STDOUT_FILE, 'utf8');
const stderr = fs.readFileSync(process.env.DRY_STDERR_FILE, 'utf8');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const command = 'npx';
const args = ['tsx','--test','--test-name-pattern','scheduled dry-run recognizes YouTube formats without calling provider','apps/web/lib/__tests__/pub07-scheduled.test.ts'];
const commandFingerprint = sha(JSON.stringify({ command, args, cwd: process.cwd() }));
const resultFingerprint = sha(JSON.stringify({ exitCode: Number(process.env.DRY_EXIT), stdout, stderr }));
const gate = {
  gateId: 'dry-run',
  command,
  args,
  cwd: process.cwd(),
  startedAt: process.env.STARTED_AT,
  finishedAt: process.env.FINISHED_AT,
  durationMs: Number(process.env.DURATION_MS),
  exitCode: Number(process.env.DRY_EXIT),
  signal: null,
  timedOut: false,
  spawnError: null,
  stdout,
  stderr,
  passed: Number(process.env.DRY_EXIT) === 0,
  attempt: 1,
  commandFingerprint,
  resultFingerprint,
  stdoutBytes: Buffer.byteLength(stdout),
  stderrBytes: Buffer.byteLength(stderr),
  stdoutTruncated: false,
  stderrTruncated: false,
};
const runtime = createTaskRuntimeService(process.cwd());
const result = runtime.recordTaskValidationResults({
  taskId: process.env.TASK_ID,
  operator: process.env.OPERATOR,
  runId: process.env.RUN_ID,
  gateResults: [gate],
  taskBoardPath: 'var/oreshnik/task-board.json',
});
if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}
const dry = result.value.evidenceVerifications.find((entry) => entry.itemId === 'dry_run_summary' && entry.verified === true);
if (!dry) {
  console.error(JSON.stringify(result.value.evidenceVerifications, null, 2));
  throw new Error('Oreshnik did not derive verified dry_run_summary from the real dry-run gate.');
}
console.log(JSON.stringify({
  dryRunEvidence: dry,
  validationGateIds: result.value.runManifest.validationGateResults?.map((entry) => entry.gateId) || [],
}, null, 2));
NODE

# Re-create a stable handoff with explicit structured dry-run evidence after takeover.
node node_modules/oreshnik-cli/dist/cli.js handoff create \
  --task "$TASK_ID" --run "$RUN_ID" --operator "$OPERATOR" --reason validation_checkpoint \
  --objective "Deliver deterministic YouTube Video/Shorts immediate plus scheduled E2E software path." \
  --implemented "YouTube resumable upload provider supports 16:9 Video and Shorts metadata/thumbnail flow." \
  --implemented "Scheduled PUB-04 bridge transports format/title/description/thumbnail and resolves provider credentialLabel dynamically." \
  --implemented "Missing credentialLabel fails closed; dry-run resolves neither credential nor provider network call." \
  --test-run "Structured dry-run gate PASS: scheduled YouTube dry-run recognizes format and performs zero credential/provider calls." \
  --test-run "Prior focused suite PASS 10/10; typecheck/build/worker/full repository tests PASS." \
  --gate "Oreshnik dry_run_summary structured evidence verified from real command/output fingerprints." \
  --decision "Live external YouTube channel smoke remains on parent S-HC-PUB-07-YOUTUBE-PUBLISHING and is not fabricated here." \
  --exact-point "All deterministic PUB-07B acceptance and structured evidence are complete; transition to ready_for_integration." \
  --first-command "npx oreshnik evidence --task $TASK_ID --run $RUN_ID --operator manuel --ready-for-integration" \
  --completion-criterion "PUB-07B merged and terminalized on master." \
  --json > "$RUNNER_TEMP/pub07b-recover-handoff.json"
cat "$RUNNER_TEMP/pub07b-recover-handoff.json"
HANDOFF_JSON="$(jq -r .jsonPath "$RUNNER_TEMP/pub07b-recover-handoff.json")"
HANDOFF_MD="$(jq -r .markdownPath "$RUNNER_TEMP/pub07b-recover-handoff.json")"
node node_modules/oreshnik-cli/dist/cli.js handoff validate --path "$HANDOFF_JSON" --json > "$RUNNER_TEMP/pub07b-recover-handoff-validation.json"
jq -e '.valid == true' "$RUNNER_TEMP/pub07b-recover-handoff-validation.json" >/dev/null

# Re-enter validating idempotently, then let Oreshnik itself run configured gates and enforce evidence.
node node_modules/oreshnik-cli/dist/cli.js evidence \
  --task "$TASK_ID" --run "$RUN_ID" --operator "$OPERATOR" \
  --handoff "$HANDOFF_MD" --details "Structured dry-run evidence recorded from a real zero-provider-call test; proceeding with governed integration gates." \
  --start-validation | tee "$RUNNER_TEMP/pub07b-recover-validation-start.txt"
node node_modules/oreshnik-cli/dist/cli.js evidence \
  --task "$TASK_ID" --run "$RUN_ID" --operator "$OPERATOR" \
  --handoff "$HANDOFF_MD" --details "All deterministic E2E gates and structured dry-run evidence passed." \
  --ready-for-integration | tee "$RUNNER_TEMP/pub07b-recover-ready.txt"

node node_modules/oreshnik-cli/dist/cli.js reconcile --write --json > "$RUNNER_TEMP/pub07b-recover-reconcile.json"
# Never commit generated next-env.d.ts; persist only governed runtime/evidence documentation.
git checkout -- apps/web/next-env.d.ts 2>/dev/null || true
git add var/oreshnik docs/oreshnik docs/obsidian-vault docs/07_handoffs 2>/dev/null || true
if ! git diff --cached --quiet; then
  git diff --cached --check
  git commit -m "chore(oreshnik): persist PUB-07B verified E2E evidence"
fi
git push origin "HEAD:$FUNCTIONAL_BRANCH"
git rev-parse HEAD | tee "$RUNNER_TEMP/pub07b-recover-final-head.txt"
printf 'PUB07B_EVIDENCE_RECOVERY_SUCCESS handoff=%s\n' "$HANDOFF_MD"
