#!/usr/bin/env bash
set -euo pipefail

TASK_ID="S-HC-PUB-07-YOUTUBE-PUBLISHING"
OLD_RUN_ID="run-manuel-S-HC-PUB-07-YOUTUBE-PUBLISHING-20260910162001-40482454"
OLD_FUNCTIONAL_BRANCH="dispatch/manuel/manuel-chatgpt1/publishing/S-HC-PUB-07-YOUTUBE-PUBLISHING/71b46093fd"
OLD_PRODUCT_COMMIT="4a67b755dce1e8e7d91eff6c4c582e6d69dad64d"
OPERATOR="manuel"
HARNESS="chatgpt"
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

# The old Run froze an incomplete zone plan. Its product commit is already durable on the remote
# functional branch, so superseding is safe and is the native alpha.6 re-planning boundary.
node node_modules/oreshnik-cli/dist/cli.js dispatch supersede \
  --run "$OLD_RUN_ID" \
  --reason "Replan PUB-07 because the original canonical Task omitted the scheduled-publishing cron/executor/contract zones. Product commit $OLD_PRODUCT_COMMIT is preserved on $OLD_FUNCTIONAL_BRANCH." \
  --force --repo . --json > "$RUNNER_TEMP/old-supersede.json"
cat "$RUNNER_TEMP/old-supersede.json"
test "$(jq -r .assignmentId "$RUNNER_TEMP/old-supersede.json")" != "null"

git fetch origin master oreshnik/control
git reset --hard origin/master

# Amend only canonical planning metadata through Oreshnik CAS.
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
    reason: 'Correct canonical planning mismatch discovered during governed execution: scheduled YouTube acceptance requires the PUB-04 cron route, executor, contract and scheduled-path tests.',
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

# Register only this fresh runner after the old assignment is terminal.
ROOT="$RUNNER_TEMP/oreshnik-wt-replan-v2"
node node_modules/oreshnik-cli/dist/cli.js dispatch init --mother master --worktree-root "$ROOT" --repo . --json > "$RUNNER_TEMP/dispatch-init.json"
node node_modules/oreshnik-cli/dist/cli.js dispatch reconcile --repo . --json > "$RUNNER_TEMP/post-amend-reconcile.json"

# New Run, new execution identity, same canonical Task. The corrected zones are frozen here.
node node_modules/oreshnik-cli/dist/cli.js dispatch next \
  --task "$TASK_ID" --operator "$OPERATOR" --harness "$HARNESS" \
  --instance new --session new --max-retries 3 --repo . --json \
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

git -C "$NEW_WT" config user.name "Manuel Vera via ChatGPT Operator"
git -C "$NEW_WT" config user.email "manuel@heptacore.dev"
git -C "$NEW_WT" fetch origin "+refs/heads/$OLD_FUNCTIONAL_BRANCH:refs/remotes/origin/pub07-old"
# Salvage product code only; do not import the old runtime checkpoint commit.
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

# Commit only code within the amended zones.
git add apps/web/app/api/cron/publisher apps/web/lib/publishing-cron-executor.ts apps/web/lib/__tests__/pub07-scheduled.test.ts contracts/S-HC-PUB-04
git diff --cached --check
git diff --cached --name-only | tee "$RUNNER_TEMP/pub07-replan-files.txt"
test -n "$(git diff --cached --name-only)"
git commit -m "feat(publishing): complete scheduled YouTube execution"
git push origin "HEAD:$NEW_BRANCH"
git rev-parse HEAD | tee "$RUNNER_TEMP/pub07-replan-product-head.txt"

# Enter validating only after all deterministic gates pass.
node node_modules/oreshnik-cli/dist/cli.js evidence --task "$TASK_ID" --run "$NEW_RUN_ID" --operator "$OPERATOR" --start-validation --details "PUB-07 Video/Shorts immediate and scheduled software paths are implemented. Scheduled execution transports format/title/description/thumbnail, resolves provider credentialLabel dynamically with fail-closed missing-label behavior, and reuses PUB-04 transactional finalization/IN_REVIEW semantics. Focused plus full project gates passed; only a real authorized YouTube channel smoke can remain external." 
node node_modules/oreshnik-cli/dist/cli.js reconcile --write --json > "$RUNNER_TEMP/pub07-replan-local-reconcile.json"
git add var/oreshnik docs/oreshnik docs/obsidian-vault docs/07_handoffs 2>/dev/null || true
if ! git diff --cached --quiet; then
  git diff --cached --check
  git commit -m "chore(oreshnik): persist replanned PUB-07 validation checkpoint"
  git push origin "HEAD:$NEW_BRANCH"
fi
git rev-parse HEAD | tee "$RUNNER_TEMP/pub07-replan-final-head.txt"
printf 'PUB07_REPLAN_SUCCESS run=%s branch=%s\n' "$NEW_RUN_ID" "$NEW_BRANCH"
