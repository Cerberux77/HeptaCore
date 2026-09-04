#!/usr/bin/env bash
set -euo pipefail

TASK_ID="${TASK_ID:-HC-ORESHNIK-RECOVERY-ALPHA6}"
OPERATOR="${OPERATOR:-manuel}"
HARNESS="${HARNESS:-chatgpt}"
REPO="${REPO:-.}"
WORKTREE_ROOT="${WORKTREE_ROOT:-${RUNNER_TEMP:-/tmp}/oreshnik-wt}"
EVIDENCE_DIR="${EVIDENCE_DIR:-${RUNNER_TEMP:-/tmp}/oreshnik-alpha6-recovery}"
OUTPUT_FILE="${GITHUB_OUTPUT:-$EVIDENCE_DIR/outputs.env}"
CLI=(node node_modules/oreshnik-cli/dist/cli.js)

mkdir -p "$WORKTREE_ROOT" "$EVIDENCE_DIR"
export TASK_ID OPERATOR HARNESS REPO WORKTREE_ROOT EVIDENCE_DIR

if [[ -n "${GITHUB_TOKEN:-}" && -n "${GITHUB_REPOSITORY:-}" ]]; then
  git remote set-url origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
fi

git config user.name "Manuel Vera via ChatGPT Operator"
git config user.email "manuel@heptacore.dev"
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
