#!/usr/bin/env bash
set -euo pipefail

PARENT_ID="S-HC-PUB-07-YOUTUBE-PUBLISHING"
CHILD_ID="S-HC-PUB-07B-YOUTUBE-SCHEDULED-E2E"
OLD_RUN_ID="run-manuel-S-HC-PUB-07-YOUTUBE-PUBLISHING-20260910162001-40482454"
OLD_FUNCTIONAL_BRANCH="dispatch/manuel/manuel-chatgpt1/publishing/S-HC-PUB-07-YOUTUBE-PUBLISHING/71b46093fd"
OLD_PRODUCT_COMMIT="4a67b755dce1e8e7d91eff6c4c582e6d69dad64d"
OPERATOR="manuel"
HARNESS="chatgpt"
ORESHNIK_VERSION="0.3.0-alpha.6"
REGISTERED_AT="2026-09-10T17:40:00.000Z"
export ORESHNIK_LOCAL_STATE_DIR="$RUNNER_TEMP/oreshnik-local-state"

cp .github/ops/pub07-scheduler-patch.py "$RUNNER_TEMP/pub07-scheduler-patch.py"
cp .github/ops/pub07-scheduled.test.ts "$RUNNER_TEMP/pub07-scheduled.test.ts"

git fetch origin master oreshnik/control "$OLD_FUNCTIONAL_BRANCH"
git checkout -B controller origin/master
git config user.name "Manuel Vera via ChatGPT Operator"
git config user.email "manuel@heptacore.dev"

npm ci --ignore-scripts
test "$(node node_modules/oreshnik-cli/dist/cli.js --version)" = "$ORESHNIK_VERSION"
npm run oreshnik:ready

# Idempotently retire the old Run whose frozen write zones were incomplete.
node node_modules/oreshnik-cli/dist/cli.js dispatch supersede \
  --run "$OLD_RUN_ID" \
  --reason "Replan PUB-07 after discovering that its frozen zones omitted the scheduled cron/executor/contract surfaces. Validated product commit $OLD_PRODUCT_COMMIT remains durable on $OLD_FUNCTIONAL_BRANCH." \
  --force --repo . --json > "$RUNNER_TEMP/old-supersede.json"
cat "$RUNNER_TEMP/old-supersede.json"

git fetch origin master oreshnik/control
git reset --hard origin/master

# alpha.6 has canonical Task registration but predates canonical Task amendment.
# Materialize a child Goal with the exact complete write surface instead of editing task-board JSON.
export CHILD_ID PARENT_ID REGISTERED_AT
node --input-type=module <<'NODE'
import fs from 'node:fs';
const board = JSON.parse(fs.readFileSync('var/oreshnik/task-board.json', 'utf8').replace(/^\uFEFF/, ''));
const base = board.tasks.find((t) => t.id === process.env.PARENT_ID);
if (!base) throw new Error(`Missing parent task ${process.env.PARENT_ID}`);
const zones = [
  'apps/web/lib/publishers',
  'apps/web/app/api/publishing',
  'packages/integrations',
  'apps/web/app/api/cron/publisher',
  'apps/web/lib/publishing-cron-executor.ts',
  'apps/web/lib/__tests__',
  'contracts/S-HC-PUB-04'
];
const task = {
  ...base,
  id: process.env.CHILD_ID,
  title: 'YouTube scheduled E2E integration: Video, Shorts, cron metadata and credentials',
  status: 'ready',
  track: 'publishing',
  priority: 'high',
  zone: zones,
  writeZones: zones,
  readZones: base.readZones || [],
  dependsOn: [
    'S-HC-PUB-03-MULTITENANT-ASSETS',
    'S-HC-PUB-04-HOURLY-BATCH-CRON'
  ],
  acceptance: [
    'Validated YouTube Video 16:9 and Shorts publisher is present in the governed delivery.',
    'Scheduled cron transports YouTube format, title, description, primary video and thumbnail to the provider adapter.',
    'Scheduled credential resolution uses the publisher credentialLabel dynamically and never hardcodes facebook_page_oauth.',
    'Missing credentialLabel fails closed before credential decryption.',
    'Scheduled dry-run recognizes YouTube formats without resolving credentials or invoking the provider.',
    'Provider-specific immediate and scheduled tests pass together.',
    'typecheck, build, worker validation and full repository tests pass.'
  ],
  attempts: 0,
  activeRun: undefined,
  blockState: undefined,
  handoff: undefined,
  validationGateResults: undefined,
  evidenceVerifications: undefined,
  history: [{
    at: process.env.REGISTERED_AT,
    action: 'canonical_task_registered',
    operator: 'manuel',
    description: 'Governed child Goal created because Oreshnik 0.3.0-alpha.6 freezes Run zones and does not yet expose canonical Task amendment.'
  }],
  updatedAt: process.env.REGISTERED_AT
};
const goalMarkdown = `# ${process.env.CHILD_ID}\n\n## Objective\nComplete the deterministic end-to-end YouTube publishing software path under the exact required write zones. This Goal owns the already validated immediate Video/Shorts provider code plus the scheduled PUB-04 cron bridge.\n\n## Governance\n- Parent acceptance remains ${process.env.PARENT_ID}.\n- Do not claim real external YouTube validation in this child Goal.\n- Never hardcode OAuth secrets or provider credentials.\n- Missing credential labels fail closed.\n- Only the declared zones may receive product-code changes.\n\n## Acceptance\n${task.acceptance.map((item) => `- ${item}`).join('\n')}\n`;
const registration = {
  schemaVersion: 1,
  taskId: process.env.CHILD_ID,
  task,
  goalMarkdown,
  registeredBy: 'manuel',
  registeredAt: process.env.REGISTERED_AT
};
fs.writeFileSync(process.env.RUNNER_TEMP + '/pub07b-registration.json', JSON.stringify(registration, null, 2) + '\n');
NODE

EXPECTED_HEAD="$(git rev-parse origin/master)"
node node_modules/oreshnik-cli/dist/cli.js task register \
  --spec "$RUNNER_TEMP/pub07b-registration.json" \
  --expected-head "$EXPECTED_HEAD" --mother master --repo . --json \
  > "$RUNNER_TEMP/pub07b-register-result.json"
cat "$RUNNER_TEMP/pub07b-register-result.json"
jq -e '.ok == true' "$RUNNER_TEMP/pub07b-register-result.json" >/dev/null

git fetch origin master oreshnik/control
git reset --hard origin/master
npm run oreshnik:ready

# Fresh runner and fresh identity for the canonical child Goal.
ROOT="$RUNNER_TEMP/oreshnik-wt-pub07b"
node node_modules/oreshnik-cli/dist/cli.js dispatch init --mother master --worktree-root "$ROOT" --repo . --json > "$RUNNER_TEMP/dispatch-init.json"
node node_modules/oreshnik-cli/dist/cli.js dispatch reconcile --repo . --json > "$RUNNER_TEMP/post-register-reconcile.json"
node node_modules/oreshnik-cli/dist/cli.js dispatch next \
  --task "$CHILD_ID" --operator "$OPERATOR" --harness "$HARNESS" \
  --instance new --session new --max-retries 3 --repo . --json \
  > "$RUNNER_TEMP/new-dispatch.json"
cat "$RUNNER_TEMP/new-dispatch.json"
test "$(jq -r .taskId "$RUNNER_TEMP/new-dispatch.json")" = "$CHILD_ID"
test "$(jq -r .result "$RUNNER_TEMP/new-dispatch.json")" = "assigned"
for zone in \
  "apps/web/lib/publishers" \
  "apps/web/app/api/publishing" \
  "apps/web/app/api/cron/publisher" \
  "apps/web/lib/publishing-cron-executor.ts" \
  "apps/web/lib/__tests__" \
  "contracts/S-HC-PUB-04"; do
  jq -e --arg z "$zone" '.zones | index($z) != null' "$RUNNER_TEMP/new-dispatch.json" >/dev/null
done
NEW_RUN_ID="$(jq -r .runId "$RUNNER_TEMP/new-dispatch.json")"
NEW_BRANCH="$(jq -r .functionalBranch "$RUNNER_TEMP/new-dispatch.json")"
NEW_WT="$(jq -r .worktreePath "$RUNNER_TEMP/new-dispatch.json")"
ASSIGNMENT_ID="$(jq -r .assignmentId "$RUNNER_TEMP/new-dispatch.json")"
printf '%s\n' "$NEW_RUN_ID" > "$RUNNER_TEMP/new-run-id.txt"
printf '%s\n' "$NEW_BRANCH" > "$RUNNER_TEMP/new-branch.txt"
printf '%s\n' "$ASSIGNMENT_ID" > "$RUNNER_TEMP/new-assignment-id.txt"
test -d "$NEW_WT"

git -C "$NEW_WT" config user.name "Manuel Vera via ChatGPT Operator"
git -C "$NEW_WT" config user.email "manuel@heptacore.dev"
git -C "$NEW_WT" fetch origin "+refs/heads/$OLD_FUNCTIONAL_BRANCH:refs/remotes/origin/pub07-old"
# Salvage only the validated product commit, never the old Run projection checkpoint.
git -C "$NEW_WT" cherry-pick "$OLD_PRODUCT_COMMIT"
python3 "$RUNNER_TEMP/pub07-scheduler-patch.py" "$NEW_WT" "$RUNNER_TEMP/pub07-scheduled.test.ts"

cd "$NEW_WT"
git diff --check
git status --short | tee "$RUNNER_TEMP/pub07-replan-status.txt"
bad="$(git status --short | sed -E 's/^.. //' | grep -Ev '^(apps/web/lib/publishers/|apps/web/app/api/publishing/|packages/integrations/|apps/web/app/api/cron/publisher/|apps/web/lib/publishing-cron-executor.ts$|apps/web/lib/__tests__/|contracts/S-HC-PUB-04/|var/oreshnik/|docs/oreshnik/|docs/obsidian-vault/|docs/07_handoffs/)' || true)"
if [ -n "$bad" ]; then printf '%s\n' "$bad"; echo 'OUT_OF_CHILD_ZONE_CHANGE'; exit 1; fi

npm ci --ignore-scripts
ESBUILD_VERSION="$(node -p "require('esbuild/package.json').version")"
npm install --no-save --package-lock=false --ignore-scripts "@esbuild/linux-x64@$ESBUILD_VERSION"
npm run db:generate
npx tsx --test apps/web/lib/publishers/__tests__/youtube.test.ts apps/web/lib/__tests__/pub07-scheduled.test.ts | tee "$RUNNER_TEMP/pub07-replan-focused.txt"

npm run typecheck | tee "$RUNNER_TEMP/pub07-replan-typecheck.txt"
npm run build | tee "$RUNNER_TEMP/pub07-replan-build.txt"
npm run worker:validate | tee "$RUNNER_TEMP/pub07-replan-worker.txt"
npm test | tee "$RUNNER_TEMP/pub07-replan-full-tests.txt"
git diff --check

# Commit only the scheduled-path changes; immediate product code remains isolated in its cherry-picked commit.
git add apps/web/app/api/cron/publisher apps/web/lib/publishing-cron-executor.ts apps/web/lib/__tests__/pub07-scheduled.test.ts contracts/S-HC-PUB-04
git diff --cached --check
git diff --cached --name-only | tee "$RUNNER_TEMP/pub07-replan-files.txt"
test -n "$(git diff --cached --name-only)"
git commit -m "feat(publishing): complete scheduled YouTube E2E execution"
git push origin "HEAD:$NEW_BRANCH"
git rev-parse HEAD | tee "$RUNNER_TEMP/pub07-replan-product-head.txt"

# Canonical handoff and lifecycle validation.
node node_modules/oreshnik-cli/dist/cli.js handoff create \
  --task "$CHILD_ID" --run "$NEW_RUN_ID" --operator "$OPERATOR" --reason validation_checkpoint \
  --objective "Deliver deterministic YouTube Video/Shorts immediate plus scheduled E2E software path." \
  --implemented "YouTube resumable upload provider with Video and Shorts metadata/thumbnail support." \
  --implemented "PUB-04 scheduled bridge now transports format/title/description/thumbnail and dynamic credentialLabel." \
  --implemented "Missing credentialLabel fails closed; dry-run never resolves credentials or calls provider." \
  --test-run "Focused YouTube immediate + scheduled tests PASS." \
  --test-run "typecheck PASS; build PASS; worker validation PASS; full npm test PASS." \
  --gate "git diff --check PASS; child-zone assertion PASS." \
  --decision "External live YouTube channel smoke is deliberately retained on parent ${PARENT_ID}; this child makes no unsupported provider claim." \
  --exact-point "Software E2E is complete and ready for governed integration." \
  --first-command "npx oreshnik evidence --task ${CHILD_ID} --run ${NEW_RUN_ID} --operator manuel --ready-for-integration" \
  --completion-criterion "Child is merged and terminalized on master with all deterministic gates green." \
  --json > "$RUNNER_TEMP/pub07b-handoff.json"
cat "$RUNNER_TEMP/pub07b-handoff.json"
HANDOFF_JSON="$(jq -r .jsonPath "$RUNNER_TEMP/pub07b-handoff.json")"
HANDOFF_MD="$(jq -r .markdownPath "$RUNNER_TEMP/pub07b-handoff.json")"
test -f "$HANDOFF_JSON"
test -f "$HANDOFF_MD"
node node_modules/oreshnik-cli/dist/cli.js handoff validate --path "$HANDOFF_JSON" --json > "$RUNNER_TEMP/pub07b-handoff-validation.json"
jq -e '.valid == true' "$RUNNER_TEMP/pub07b-handoff-validation.json" >/dev/null

node node_modules/oreshnik-cli/dist/cli.js evidence \
  --task "$CHILD_ID" --run "$NEW_RUN_ID" --operator "$OPERATOR" \
  --handoff "$HANDOFF_MD" --details "Deterministic PUB-07B E2E implementation and explicit project gates passed." \
  --start-validation | tee "$RUNNER_TEMP/pub07b-validation-start.txt"
node node_modules/oreshnik-cli/dist/cli.js evidence \
  --task "$CHILD_ID" --run "$NEW_RUN_ID" --operator "$OPERATOR" \
  --handoff "$HANDOFF_MD" --details "All configured governed gates passed for the complete deterministic YouTube E2E software path." \
  --ready-for-integration | tee "$RUNNER_TEMP/pub07b-ready-for-integration.txt"

node node_modules/oreshnik-cli/dist/cli.js reconcile --write --json > "$RUNNER_TEMP/pub07-replan-local-reconcile.json"
git add var/oreshnik docs/oreshnik docs/obsidian-vault docs/07_handoffs 2>/dev/null || true
if ! git diff --cached --quiet; then
  git diff --cached --check
  git commit -m "chore(oreshnik): persist PUB-07B integration-ready evidence"
fi
git push origin "HEAD:$NEW_BRANCH"
git rev-parse HEAD | tee "$RUNNER_TEMP/pub07-replan-final-head.txt"
printf 'PUB07B_READY run=%s assignment=%s branch=%s handoff=%s\n' "$NEW_RUN_ID" "$ASSIGNMENT_ID" "$NEW_BRANCH" "$HANDOFF_MD"
