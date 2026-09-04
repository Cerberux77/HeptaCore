#!/usr/bin/env bash
set -euo pipefail

TASK_ID="${TASK_ID:-HC-ORESHNIK-RECOVERY-ALPHA6}"
OPERATOR="${OPERATOR:-manuel}"
HARNESS="${HARNESS:-chatgpt}"
REPO="${REPO:-.}"
WORKTREE_ROOT="${WORKTREE_ROOT:-${RUNNER_TEMP:-/tmp}/oreshnik-wt}"
EVIDENCE_DIR="${EVIDENCE_DIR:-${RUNNER_TEMP:-/tmp}/oreshnik-alpha6-recovery}"
OUTPUT_FILE="${GITHUB_OUTPUT:-$EVIDENCE_DIR/outputs.env}"
STALE_YOUTUBE_TASK="S-HC-PUB-07-YOUTUBE-PUBLISHING"
STALE_YOUTUBE_RUN="run-manuel-S-HC-PUB-07-YOUTUBE-PUBLISHING-20260706072216-381f66dc"
STALE_YOUTUBE_BRANCH="dispatch/manuel/manuel-kilo8/publishing/S-HC-PUB-07-YOUTUBE-PUBLISHING/0235fe3455"
CLI=(node node_modules/oreshnik-cli/dist/cli.js)

mkdir -p "$WORKTREE_ROOT" "$EVIDENCE_DIR"
export TASK_ID OPERATOR HARNESS REPO WORKTREE_ROOT EVIDENCE_DIR
export STALE_YOUTUBE_TASK STALE_YOUTUBE_RUN STALE_YOUTUBE_BRANCH

git config user.name "Manuel Vera via ChatGPT Operator"
git config user.email "manuel@heptacore.dev"

ORIGIN_URL="$(git remote get-url origin)"
if [[ "$ORIGIN_URL" == *"@"* || "$ORIGIN_URL" == *"x-access-token"* || "$ORIGIN_URL" == *"${GITHUB_TOKEN:-__NO_TOKEN__}"* ]]; then
  echo "Refusing dispatch with credential-bearing origin URL." >&2
  exit 19
fi

git fetch --prune origin '+refs/heads/*:refs/remotes/origin/*' '+refs/heads/oreshnik/control:refs/remotes/origin/oreshnik/control' || git fetch --prune origin

MASTER_HEAD="$(git rev-parse origin/master)"
CURRENT_HEAD="$(git rev-parse HEAD)"
if [[ "$CURRENT_HEAD" != "$MASTER_HEAD" ]]; then
  echo "Refusing dispatch from stale checkout: HEAD=$CURRENT_HEAD origin/master=$MASTER_HEAD" >&2
  exit 20
fi

node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const taskId = process.env.TASK_ID;
const evidenceDir = process.env.EVIDENCE_DIR;
const board = JSON.parse(fs.readFileSync('var/oreshnik/task-board.json', 'utf8'));
const task = board.tasks.find((entry) => entry.id === taskId);
if (!task) throw new Error(`Canonical task ${taskId} is absent from task-board`);
if (!['ready', 'claimed', 'active'].includes(task.status)) {
  throw new Error(`Canonical task ${taskId} is not dispatchable; status=${task.status}`);
}
fs.writeFileSync(path.join(evidenceDir, 'task.json'), JSON.stringify({
  id: task.id,
  owner: task.owner,
  status: task.status,
  track: task.track,
  priority: task.priority,
  zones: task.zone || [],
  writeZones: task.writeZones || [],
  resources: task.resources || [],
  preferredHarnesses: task.executionRecommendation?.preferredHarnesses || [],
}, null, 2) + '\n');
NODE

npm run oreshnik:ready 2>&1 | tee "$EVIDENCE_DIR/readiness-before.log"
"${CLI[@]}" --version | tee "$EVIDENCE_DIR/bootstrap-version.txt"

"${CLI[@]}" dispatch init \
  --mother master \
  --worktree-root "$WORKTREE_ROOT" \
  --repo "$REPO" \
  --json | tee "$EVIDENCE_DIR/dispatch-init.json"

git fetch --prune origin '+refs/heads/*:refs/remotes/origin/*' '+refs/heads/oreshnik/control:refs/remotes/origin/oreshnik/control' || git fetch --prune origin

# Recovery fence for a known stale July delivery lineage. The assignment still says
# ready_for_integration while its claim and run are released and the canonical Task is ready.
# We preserve the remote branch and only supersede the stale control-plane ownership.
git show origin/oreshnik/control:control-plane.json >"$EVIDENCE_DIR/control-plane-before-stale-repair.json"
git show "origin/master:var/oreshnik/tasks/$STALE_YOUTUBE_TASK.json" >"$EVIDENCE_DIR/youtube-task-master-before-repair.json"
if ! git show-ref --verify --quiet "refs/remotes/origin/$STALE_YOUTUBE_BRANCH"; then
  echo "Refusing stale-lineage repair because preserved YouTube branch is missing: $STALE_YOUTUBE_BRANCH" >&2
  exit 23
fi
git rev-list --left-right --count "origin/master...origin/$STALE_YOUTUBE_BRANCH" >"$EVIDENCE_DIR/youtube-branch-divergence.txt"
git log --oneline --no-decorate "origin/master..origin/$STALE_YOUTUBE_BRANCH" >"$EVIDENCE_DIR/youtube-branch-preserved-commits.txt"

REPAIR_DECISION="$(node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const evidenceDir = process.env.EVIDENCE_DIR;
const taskId = process.env.STALE_YOUTUBE_TASK;
const runId = process.env.STALE_YOUTUBE_RUN;
const branch = process.env.STALE_YOUTUBE_BRANCH;
const control = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'control-plane-before-stale-repair.json'), 'utf8'));
const task = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'youtube-task-master-before-repair.json'), 'utf8'));
const assignment = control.assignments.find((entry) => entry.taskId === taskId && entry.runId === runId);
const claim = control.claims.find((entry) => entry.taskId === taskId && entry.runId === runId);
const run = control.runs.find((entry) => entry.taskId === taskId && entry.runId === runId);
if (!assignment || !claim || !run) throw new Error('Known stale YouTube lineage is incomplete in control plane');
if (assignment.functionalBranch !== branch) throw new Error(`Stale YouTube branch mismatch: ${assignment.functionalBranch}`);
if (task.status !== 'ready') throw new Error(`Canonical ${taskId} must be ready before stale-lineage repair; got ${task.status}`);
if (Array.isArray(task.runs) && task.runs.length !== 0) throw new Error(`Canonical ${taskId} unexpectedly contains durable runs`);
if (assignment.status === 'superseded') {
  console.error(JSON.stringify({ decision: 'already_superseded', assignmentStatus: assignment.status, claimStatus: claim.status, runStatus: run.status }, null, 2));
  process.stdout.write('already_superseded');
  process.exit(0);
}
if (assignment.status !== 'ready_for_integration') {
  throw new Error(`Expected stale YouTube assignment ready_for_integration, got ${assignment.status}`);
}
if (claim.status !== 'released' || run.status !== 'released') {
  throw new Error(`Expected released stale claim/run, got claim=${claim.status} run=${run.status}`);
}
console.error(JSON.stringify({ decision: 'supersede', assignmentStatus: assignment.status, claimStatus: claim.status, runStatus: run.status, preservedBranch: branch }, null, 2));
process.stdout.write('supersede');
NODE
)"

echo "$REPAIR_DECISION" >"$EVIDENCE_DIR/youtube-stale-repair-decision.txt"
if [[ "$REPAIR_DECISION" == "supersede" ]]; then
  "${CLI[@]}" dispatch supersede \
    --run "$STALE_YOUTUBE_RUN" \
    --reason "HC-ORESHNIK-RECOVERY-ALPHA6: stale ready_for_integration assignment contradicts released claim/run and canonical task=ready; preserve remote branch $STALE_YOUTUBE_BRANCH for later governed salvage and supersede only stale ownership." \
    --repo "$REPO" \
    --json | tee "$EVIDENCE_DIR/youtube-stale-supersede.json"
elif [[ "$REPAIR_DECISION" != "already_superseded" ]]; then
  echo "Unexpected stale-repair decision: $REPAIR_DECISION" >&2
  exit 24
fi

git fetch --prune origin '+refs/heads/oreshnik/control:refs/remotes/origin/oreshnik/control' "+refs/heads/$STALE_YOUTUBE_BRANCH:refs/remotes/origin/$STALE_YOUTUBE_BRANCH"
git show origin/oreshnik/control:control-plane.json >"$EVIDENCE_DIR/control-plane-after-stale-repair.json"
if ! git show-ref --verify --quiet "refs/remotes/origin/$STALE_YOUTUBE_BRANCH"; then
  echo "Stale-lineage repair removed the preserved YouTube branch; refusing to continue." >&2
  exit 25
fi
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const control = JSON.parse(fs.readFileSync(path.join(process.env.EVIDENCE_DIR, 'control-plane-after-stale-repair.json'), 'utf8'));
const assignment = control.assignments.find((entry) => entry.taskId === process.env.STALE_YOUTUBE_TASK && entry.runId === process.env.STALE_YOUTUBE_RUN);
if (!assignment) throw new Error('Stale YouTube assignment disappeared instead of being terminalized');
if (assignment.status !== 'superseded') throw new Error(`Expected superseded stale YouTube assignment, got ${assignment.status}`);
console.log(JSON.stringify({ staleRepairVerified: true, assignmentId: assignment.assignmentId, status: assignment.status, preservedBranch: process.env.STALE_YOUTUBE_BRANCH }, null, 2));
NODE

"${CLI[@]}" dispatch reconcile \
  --repo "$REPO" \
  --json | tee "$EVIDENCE_DIR/dispatch-reconcile.json"

"${CLI[@]}" dispatch status \
  --repo "$REPO" \
  --json | tee "$EVIDENCE_DIR/dispatch-status-before.json"

npm run oreshnik:ready 2>&1 | tee "$EVIDENCE_DIR/readiness-after-reconcile.log"

"${CLI[@]}" dispatch explain \
  --task "$TASK_ID" \
  --operator "$OPERATOR" \
  --repo "$REPO" \
  --json | tee "$EVIDENCE_DIR/dispatch-explain.json"

"${CLI[@]}" goal \
  --operator "$OPERATOR" \
  --harness "$HARNESS" \
  --task "$TASK_ID" \
  --auto-align \
  --repo "$REPO" \
  --max-retries 3 \
  --json | tee "$EVIDENCE_DIR/goal.json"

git fetch --prune origin '+refs/heads/oreshnik/control:refs/remotes/origin/oreshnik/control'
git show origin/oreshnik/control:control-plane.json >"$EVIDENCE_DIR/control-plane-after.json"

node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const evidenceDir = process.env.EVIDENCE_DIR;
const taskId = process.env.TASK_ID;
const expectedOperator = process.env.OPERATOR;
const expectedHarness = process.env.HARNESS;
const goal = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'goal.json'), 'utf8'));
const control = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'control-plane-after.json'), 'utf8'));
if (!['assigned', 'resumed', 'taken_over'].includes(goal.result)) {
  throw new Error(`Oreshnik goal did not assign/resume ${taskId}; result=${goal.result}`);
}
if (goal.taskId !== taskId) throw new Error(`Oreshnik returned wrong task ${goal.taskId}`);
if (String(goal.operator).toLowerCase() !== expectedOperator.toLowerCase()) {
  throw new Error(`Oreshnik returned wrong operator ${goal.operator}`);
}
if (goal.harnessId !== expectedHarness) {
  throw new Error(`Oreshnik returned harness ${goal.harnessId}; expected ${expectedHarness}`);
}
for (const key of ['runId', 'assignmentId', 'operator', 'agentInstanceUid', 'agentInstanceAlias', 'sessionId', 'functionalBranch', 'worktreePath']) {
  if (!goal[key]) throw new Error(`Oreshnik goal omitted ${key}`);
}
const assignment = control.assignments.find((entry) => entry.assignmentId === goal.assignmentId && entry.runId === goal.runId);
const claim = control.claims.find((entry) => entry.assignmentId === goal.assignmentId && entry.runId === goal.runId);
const run = control.runs.find((entry) => entry.assignmentId === goal.assignmentId && entry.runId === goal.runId);
if (!assignment) throw new Error('Canonical assignment missing from remote control plane');
if (!claim) throw new Error('Canonical claim missing from remote control plane');
if (!run) throw new Error('Canonical run missing from remote control plane');
if (assignment.taskId !== taskId || claim.taskId !== taskId || run.taskId !== taskId) {
  throw new Error('Remote control-plane lineage points to a different task');
}
const context = {
  schema: 'heptacore-oreshnik-recovery-run/v1',
  taskId,
  result: goal.result,
  runId: goal.runId,
  assignmentId: goal.assignmentId,
  claimId: claim.claimId,
  operator: goal.operator,
  delegatedInterface: 'ChatGPT',
  infrastructure: 'GitHub Actions',
  harnessId: goal.harnessId,
  agentInstanceUid: goal.agentInstanceUid,
  agentInstanceAlias: goal.agentInstanceAlias,
  sessionId: goal.sessionId,
  machineId: goal.machineId,
  motherBranch: goal.motherBranch,
  functionalBranch: goal.functionalBranch,
  worktreePath: goal.worktreePath,
  zones: goal.zones || [],
  controlHead: goal.controlHead,
  taskBoardHead: goal.taskBoardHead,
  createdAt: goal.createdAt,
  assignmentStatus: assignment.status,
  claimStatus: claim.status,
  runStatus: run.status,
  targetOreshnikVersion: '0.3.0-alpha.6',
  targetOreshnikCommit: '3e4345b76238e18da8e4d259f537f0e9c64ce099',
  targetReleaseSha256: '66E0E6683CDF9587A873B27F20DD8C8538199EB511068E9C40B682CEADB176E8',
  rollbackVersion: '0.2.0-alpha.16',
  restrictions: ['no-product-features', 'no-merge-before-gates', 'no-deploy', 'no-live-publish', 'no-campaign-spend', 'no-secrets'],
};
fs.writeFileSync(path.join(evidenceDir, 'execution-context.json'), JSON.stringify(context, null, 2) + '\n');
const outputFile = process.env.GITHUB_OUTPUT || path.join(evidenceDir, 'outputs.env');
const outputs = {
  run_id: context.runId,
  assignment_id: context.assignmentId,
  claim_id: context.claimId,
  operator: context.operator,
  harness: context.harnessId,
  instance_uid: context.agentInstanceUid,
  instance_alias: context.agentInstanceAlias,
  session_id: context.sessionId,
  machine_id: context.machineId,
  branch: context.functionalBranch,
  worktree: context.worktreePath,
  control_head: context.controlHead,
  task_board_head: context.taskBoardHead,
};
fs.appendFileSync(outputFile, Object.entries(outputs).map(([key, value]) => `${key}=${value ?? ''}`).join('\n') + '\n');
console.log(JSON.stringify(context, null, 2));
NODE

RUN_WORKTREE="$(node -p "JSON.parse(require('fs').readFileSync('$EVIDENCE_DIR/execution-context.json','utf8')).worktreePath")"
FUNCTIONAL_BRANCH="$(node -p "JSON.parse(require('fs').readFileSync('$EVIDENCE_DIR/execution-context.json','utf8')).functionalBranch")"

if [[ ! -d "$RUN_WORKTREE" ]]; then
  echo "Oreshnik-assigned worktree does not exist: $RUN_WORKTREE" >&2
  exit 21
fi

cd "$RUN_WORKTREE"
if [[ "$(git branch --show-current)" != "$FUNCTIONAL_BRANCH" ]]; then
  echo "Worktree branch mismatch: expected $FUNCTIONAL_BRANCH, got $(git branch --show-current)" >&2
  exit 22
fi

mkdir -p docs/oreshnik/executions
cp "$EVIDENCE_DIR/execution-context.json" docs/oreshnik/executions/HC-ORESHNIK-RECOVERY-ALPHA6-RUN.json
git add docs/oreshnik/executions/HC-ORESHNIK-RECOVERY-ALPHA6-RUN.json
if ! git diff --cached --quiet; then
  git commit -m "chore(oreshnik): record alpha6 recovery canonical run"
fi
git push --set-upstream origin "$FUNCTIONAL_BRANCH"

cd "$OLDPWD"
"${CLI[@]}" dispatch status --repo "$REPO" --json | tee "$EVIDENCE_DIR/dispatch-status-after.json"

echo "Canonical Oreshnik recovery execution created:"
cat "$EVIDENCE_DIR/execution-context.json"
