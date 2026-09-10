#!/usr/bin/env bash
set -euo pipefail

TASK_ID="S-HC-PUB-07-YOUTUBE-PUBLISHING"
OLD_RUN_ID="run-manuel-S-HC-PUB-07-YOUTUBE-PUBLISHING-20260910162001-40482454"
OLD_FUNCTIONAL_BRANCH="dispatch/manuel/manuel-chatgpt1/publishing/S-HC-PUB-07-YOUTUBE-PUBLISHING/71b46093fd"
OLD_PRODUCT_COMMIT="4a67b755dce1e8e7d91eff6c4c582e6d69dad64d"
OPERATOR="manuel"
HARNESS="chatgpt"
INSTANCE_ALIAS="manuel-chatgpt1"
SESSION_ID="session_dcdf09f15279492f91b148a3e9c751e6"
ORESHNIK_VERSION="0.3.0-alpha.6"
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

# Register this ephemeral machine, then take over the exact old Run once more.
ROOT="$RUNNER_TEMP/oreshnik-wt-replan"
node node_modules/oreshnik-cli/dist/cli.js dispatch init --mother master --worktree-root "$ROOT" --repo . --json > "$RUNNER_TEMP/dispatch-init.json"
node node_modules/oreshnik-cli/dist/cli.js dispatch takeover \
  --run "$OLD_RUN_ID" \
  --reason "Replan PUB-07 after discovering canonical scheduled-publishing zones were omitted; preserve validated code before releasing the old Run." \
  --operator "$OPERATOR" --harness "$HARNESS" --instance "$INSTANCE_ALIAS" --session "$SESSION_ID" \
  --repo . --json > "$RUNNER_TEMP/old-takeover.json"
cat "$RUNNER_TEMP/old-takeover.json"
test "$(jq -r .runId "$RUNNER_TEMP/old-takeover.json")" = "$OLD_RUN_ID"
test "$(jq -r .functionalBranch "$RUNNER_TEMP/old-takeover.json")" = "$OLD_FUNCTIONAL_BRANCH"

# Explicitly materialize the exact takeover identity with Oreshnik's own helper.
export ORESHNIK_MACHINE_ID_OVERRIDE="$(jq -r .machineId "$RUNNER_TEMP/old-takeover.json")"
export TAKEOVER_JSON="$RUNNER_TEMP/old-takeover.json"
export REPOSITORY_ID="$(git show origin/oreshnik/control:control-plane.json | jq -r .repository.id)"
node --input-type=module <<'NODE'
import fs from 'node:fs';
import { hydrateEphemeralTakeoverLocalState } from './node_modules/oreshnik-cli/dist/core/ephemeral-takeover-local-state.js';
const take = JSON.parse(fs.readFileSync(process.env.TAKEOVER_JSON, 'utf8'));
const result = hydrateEphemeralTakeoverLocalState({
  operatorId: take.operator,
  harnessId: take.harnessId,
  agentInstanceUid: take.agentInstanceUid,
  agentInstanceAlias: take.agentInstanceAlias,
  sessionId: take.sessionId,
  machineId: take.machineId,
  repositoryId: process.env.REPOSITORY_ID,
  identityOrigin: take.identityOrigin || 'explicit',
  instanceCreated: false,
  sessionCreated: false,
  sources: { operator: 'flag', harness: 'flag', instance: 'flag', session: 'flag' }
}, process.env.ORESHNIK_LOCAL_STATE_DIR);
if (!result.ok) { console.error(result.error); process.exit(1); }
console.log('NATIVE_IDENTITY_HYDRATION_PASS');
NODE

# Release the old frozen-zone Run. This preserves its remote branch/code but frees runtime authority.
node node_modules/oreshnik-cli/dist/cli.js dispatch release \
  --run "$OLD_RUN_ID" --operator "$OPERATOR" --harness "$HARNESS" \
  --instance "$INSTANCE_ALIAS" --session "$SESSION_ID" --repo . --json \
  > "$RUNNER_TEMP/old-release.json"
cat "$RUNNER_TEMP/old-release.json"
jq -e '.runStatus == "released" or .assignmentStatus == "released" or .resourceReleaseApplied == true' "$RUNNER_TEMP/old-release.json" >/dev/null

git fetch origin master oreshnik/control
git reset --hard origin/master

# Amend only planning metadata, with CAS against the current canonical master.
EXPECTED_HEAD="$(git rev-parse origin/master)"
export EXPECTED_HEAD
node --input-type=module <<'NODE' | tee "$RUNNER_TEMP/amendment.json"
import { createCanonicalTaskAmendmentService } from './node_modules/oreshnik-cli/dist/index.js';
const service = createCanonicalTaskAmendmentService(process.cwd());
const result = service.amend({
  motherBranch: 'master',
  expectedHead: process.env.EXPECTED_HEAD,
  amendment: {
    schemaVersion: 1,
    taskId: 'S-HC-PUB-07-YOUTUBE-PUBLISHING',
    patch: {
      zone: [
        'apps/web/lib/publishers',
        'apps/web/app/api/publishing',
        'packages/integrations',
        'apps/web/app/api/cron/publisher',
        'apps/web/lib/publishing-cron-executor.ts',
        'apps/web/lib/__tests__',
        'contracts/S-HC-PUB-04'
      ]
    },
    reason: 'Correct canonical planning mismatch discovered during governed execution: scheduled YouTube acceptance requires the existing PUB-04 cron route, executor, contract and scheduled-path tests.',
    amendedBy: 'manuel',
    amendedAt: new Date().toISOString()
  }
});
if (!result.ok) { console.error(result.error); process.exit(1); }
console.log(JSON.stringify(result.value, null, 2));
NODE

git fetch origin master oreshnik/control
git reset --hard origin/master
npm run oreshnik:ready
node node_modules/oreshnik-cli/dist/cli.js dispatch reconcile --repo . --json > "$RUNNER_TEMP/post-amend-reconcile.json"

# Dispatch a fresh Run for the SAME Task so the amended zones are frozen into the new assignment.
node node_modules/oreshnik-cli/dist/cli.js dispatch next \
  --task "$TASK_ID" --operator "$OPERATOR" --harness "$HARNESS" \
  --instance "$INSTANCE_ALIAS" --session "$SESSION_ID" --max-retries 3 --repo . --json \
  > "$RUNNER_TEMP/new-dispatch.json"
cat "$RUNNER_TEMP/new-dispatch.json"
test "$(jq -r .taskId "$RUNNER_TEMP/new-dispatch.json")" = "$TASK_ID"
test "$(jq -r .result "$RUNNER_TEMP/new-dispatch.json")" = "assigned"
jq -e '.zones | index("apps/web/app/api/cron/publisher") != null' "$RUNNER_TEMP/new-dispatch.json" >/dev/null
jq -e '.zones | index("apps/web/lib/publishing-cron-executor.ts") != null' "$RUNNER_TEMP/new-dispatch.json" >/dev/null
jq -e '.zones | index("contracts/S-HC-PUB-04") != null' "$RUNNER_TEMP/new-dispatch.json" >/dev/null
NEW_RUN_ID="$(jq -r .runId "$RUNNER_TEMP/new-dispatch.json")"
NEW_BRANCH="$(jq -r .functionalBranch "$RUNNER_TEMP/new-dispatch.json")"
NEW_WT="$(jq -r .worktreePath "$RUNNER_TEMP/new-dispatch.json")"
printf '%s\n' "$NEW_RUN_ID" > "$RUNNER_TEMP/new-run-id.txt"
printf '%s\n' "$NEW_BRANCH" > "$RUNNER_TEMP/new-branch.txt"
test -d "$NEW_WT"

# Salvage only the already validated product commit, never old runtime/governance projections.
git -C "$NEW_WT" config user.name "Manuel Vera via ChatGPT Operator"
git -C "$NEW_WT" config user.email "manuel@heptacore.dev"
git -C "$NEW_WT" fetch origin "+refs/heads/$OLD_FUNCTIONAL_BRANCH:refs/remotes/origin/pub07-old"
git -C "$NEW_WT" cherry-pick "$OLD_PRODUCT_COMMIT"
python3 "$RUNNER_TEMP/pub07-scheduler-patch.py" "$NEW_WT" "$RUNNER_TEMP/pub07-scheduled.test.ts"

cd "$NEW_WT"
git diff --check
git status --short | tee "$RUNNER_TEMP/pub07-replan-status.txt"
bad="$(git status --short | sed -E 's/^.. //' | grep -Ev '^(apps/web/lib/publishers/|apps/web/app/api/publishing/|packages/integrations/|apps/web/app/api/cron/publisher/|apps/web/lib/publishing-cron-executor.ts$|apps/web/lib/__tests__/|contracts/S-HC-PUB-04/|var/oreshnik/|docs/oreshnik/|docs/obsidian-vault/|docs/07_handoffs/)' || true)"
if [ -n "$bad" ]; then printf '%s\n' "$bad"; echo 'OUT_OF_AMENDED_ZONE_CHANGE'; exit 1; fi

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

# Commit only the new scheduled-path product changes. The cherry-picked immediate commit is already isolated.
git add apps/web/app/api/cron/publisher apps/web/lib/publishing-cron-executor.ts apps/web/lib/__tests__/pub07-scheduled.test.ts contracts/S-HC-PUB-04
git diff --cached --check
git diff --cached --name-only | tee "$RUNNER_TEMP/pub07-replan-files.txt"
test -n "$(git diff --cached --name-only)"
git commit -m "feat(publishing): complete scheduled YouTube execution"
git push origin "HEAD:$NEW_BRANCH"
git rev-parse HEAD | tee "$RUNNER_TEMP/pub07-replan-product-head.txt"

# Persist governed validation state for the new Run.
node node_modules/oreshnik-cli/dist/cli.js evidence --task "$TASK_ID" --run "$NEW_RUN_ID" --operator "$OPERATOR" --start-validation --details "PUB-07 immediate and scheduled YouTube Video/Shorts software paths are implemented. Scheduled execution transports format/title/description/thumbnail, uses provider credentialLabel with fail-closed missing-label behavior, and reuses PUB-04 IN_REVIEW transactional finalization. Focused and full project gates pass. Real authorized YouTube channel smoke remains external validation." || true
node node_modules/oreshnik-cli/dist/cli.js reconcile --write --json > "$RUNNER_TEMP/pub07-replan-local-reconcile.json" || true
git add var/oreshnik docs/oreshnik docs/obsidian-vault docs/07_handoffs 2>/dev/null || true
if ! git diff --cached --quiet; then
  git diff --cached --check
  git commit -m "chore(oreshnik): persist replanned PUB-07 validation checkpoint"
  git push origin "HEAD:$NEW_BRANCH"
fi
git rev-parse HEAD | tee "$RUNNER_TEMP/pub07-replan-final-head.txt"
printf 'PUB07_REPLAN_SUCCESS run=%s branch=%s\n' "$NEW_RUN_ID" "$NEW_BRANCH"
