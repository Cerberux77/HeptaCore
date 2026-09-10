#!/usr/bin/env bash
set -euo pipefail

TASK_ID="S-HC-PUB-07-YOUTUBE-PUBLISHING"
RUN_ID="run-manuel-S-HC-PUB-07-YOUTUBE-PUBLISHING-20260910162001-40482454"
OPERATOR="manuel"
HARNESS="chatgpt"
INSTANCE_ALIAS="manuel-chatgpt1"
SESSION_ID="session_dcdf09f15279492f91b148a3e9c751e6"
FUNCTIONAL_BRANCH="dispatch/manuel/manuel-chatgpt1/publishing/S-HC-PUB-07-YOUTUBE-PUBLISHING/71b46093fd"
ORESHNIK_VERSION="0.3.0-alpha.6"
export ORESHNIK_LOCAL_STATE_DIR="$RUNNER_TEMP/oreshnik-local-state"

cp .github/ops/pub07-scheduler-patch.py "$RUNNER_TEMP/pub07-scheduler-patch.py"
cp .github/ops/pub07-scheduled.test.ts "$RUNNER_TEMP/pub07-scheduled.test.ts"

git fetch origin master oreshnik/control "$FUNCTIONAL_BRANCH"
git checkout -B controller origin/master
git config user.name "Manuel Vera via ChatGPT Operator"
git config user.email "manuel@heptacore.dev"

npm ci --ignore-scripts
test "$(node node_modules/oreshnik-cli/dist/cli.js --version)" = "$ORESHNIK_VERSION"
npm run oreshnik:ready

ROOT="$RUNNER_TEMP/oreshnik-wt-initial"
node node_modules/oreshnik-cli/dist/cli.js dispatch init --mother master --worktree-root "$ROOT" --repo . --json >/dev/null
node node_modules/oreshnik-cli/dist/cli.js dispatch takeover --run "$RUN_ID" --reason "Continue PUB-07 after validated immediate publishing; canonical zones must be amended for scheduled execution." --operator "$OPERATOR" --harness "$HARNESS" --instance "$INSTANCE_ALIAS" --session "$SESSION_ID" --repo . --json > "$RUNNER_TEMP/initial-takeover.json"
cat "$RUNNER_TEMP/initial-takeover.json"
test "$(jq -r .runId "$RUNNER_TEMP/initial-takeover.json")" = "$RUN_ID"
test "$(jq -r .functionalBranch "$RUNNER_TEMP/initial-takeover.json")" = "$FUNCTIONAL_BRANCH"
WT="$(jq -r .worktreePath "$RUNNER_TEMP/initial-takeover.json")"
test -d "$WT"

node "$WT/node_modules/oreshnik-cli/dist/cli.js" task block \
  --task "$TASK_ID" --run "$RUN_ID" --operator "$OPERATOR" \
  --harness "$HARNESS" --instance "$INSTANCE_ALIAS" --session "$SESSION_ID" \
  --kind technical_blocker \
  --reason "PUB-07 acceptance requires scheduled YouTube execution, but the canonical task omitted the existing cron executor, cron route and PUB-04 contract from its write zones." \
  --external-action "Amend canonical task zones to include scheduled publishing surfaces, then resume the preserved Run." \
  --resume-policy manual_unblock --repo "$WT"

git fetch origin master oreshnik/control
git reset --hard origin/master
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
node node_modules/oreshnik-cli/dist/cli.js task unblock --task "$TASK_ID" --operator "$OPERATOR" --note "Canonical zones amended by CAS for scheduled YouTube path." --repo .
git fetch origin master oreshnik/control
git reset --hard origin/master
node node_modules/oreshnik-cli/dist/cli.js task resume --task "$TASK_ID" --operator "$OPERATOR" --harness "$HARNESS" --instance "$INSTANCE_ALIAS" --session "$SESSION_ID" --note "Resume preserved PUB-07 Run after canonical zone correction." --repo .
git fetch origin master oreshnik/control "$FUNCTIONAL_BRANCH"

ROOT2="$RUNNER_TEMP/oreshnik-wt-resumed"
node node_modules/oreshnik-cli/dist/cli.js dispatch init --mother master --worktree-root "$ROOT2" --repo . --json >/dev/null
node node_modules/oreshnik-cli/dist/cli.js dispatch takeover --run "$RUN_ID" --reason "Hydrate the resumed preserved PUB-07 Run on this runner after canonical zone amendment." --operator "$OPERATOR" --harness "$HARNESS" --instance "$INSTANCE_ALIAS" --session "$SESSION_ID" --repo . --json > "$RUNNER_TEMP/resumed-takeover.json"
cat "$RUNNER_TEMP/resumed-takeover.json"
test "$(jq -r .runId "$RUNNER_TEMP/resumed-takeover.json")" = "$RUN_ID"
test "$(jq -r .functionalBranch "$RUNNER_TEMP/resumed-takeover.json")" = "$FUNCTIONAL_BRANCH"
jq -e '.zones | index("apps/web/app/api/cron/publisher") != null' "$RUNNER_TEMP/resumed-takeover.json" >/dev/null
jq -e '.zones | index("contracts/S-HC-PUB-04") != null' "$RUNNER_TEMP/resumed-takeover.json" >/dev/null
WT2="$(jq -r .worktreePath "$RUNNER_TEMP/resumed-takeover.json")"
test -d "$WT2"

git -C "$WT2" config user.name "Manuel Vera via ChatGPT Operator"
git -C "$WT2" config user.email "manuel@heptacore.dev"
git -C "$WT2" fetch origin "+refs/heads/$FUNCTIONAL_BRANCH:refs/remotes/origin/current-pub07"
git -C "$WT2" merge --ff-only refs/remotes/origin/current-pub07
python3 "$RUNNER_TEMP/pub07-scheduler-patch.py" "$WT2" "$RUNNER_TEMP/pub07-scheduled.test.ts"
cd "$WT2"
git diff --check
git status --short | tee "$RUNNER_TEMP/pub07-scheduler-status.txt"
bad="$(git status --short | sed -E 's/^.. //' | grep -Ev '^(apps/web/lib/publishers/|apps/web/app/api/publishing/|packages/integrations/|apps/web/app/api/cron/publisher/|apps/web/lib/publishing-cron-executor.ts$|apps/web/lib/__tests__/|contracts/S-HC-PUB-04/|var/oreshnik/|docs/oreshnik/|docs/obsidian-vault/|docs/07_handoffs/)' || true)"
if [ -n "$bad" ]; then printf '%s\n' "$bad"; echo 'OUT_OF_AMENDED_ZONE_CHANGE'; exit 1; fi

npm ci --ignore-scripts
ESBUILD_VERSION="$(node -p "require('esbuild/package.json').version")"
npm install --no-save --package-lock=false --ignore-scripts "@esbuild/linux-x64@$ESBUILD_VERSION"
npm run db:generate
npx tsx --test apps/web/lib/publishers/__tests__/youtube.test.ts apps/web/lib/__tests__/pub07-scheduled.test.ts | tee "$RUNNER_TEMP/pub07-scheduler-focused.txt"

npm run typecheck | tee "$RUNNER_TEMP/pub07-scheduler-typecheck.txt"
npm run build | tee "$RUNNER_TEMP/pub07-scheduler-build.txt"
npm run worker:validate | tee "$RUNNER_TEMP/pub07-scheduler-worker.txt"
npm test | tee "$RUNNER_TEMP/pub07-scheduler-full-tests.txt"
git diff --check

git add apps/web/app/api/cron/publisher apps/web/lib/publishing-cron-executor.ts apps/web/lib/__tests__/pub07-scheduled.test.ts contracts/S-HC-PUB-04
git diff --cached --check
git diff --cached --name-only | tee "$RUNNER_TEMP/pub07-scheduler-files.txt"
test -n "$(git diff --cached --name-only)"
git commit -m "feat(publishing): complete scheduled YouTube execution"
git push origin "HEAD:$FUNCTIONAL_BRANCH"
git rev-parse HEAD | tee "$RUNNER_TEMP/pub07-scheduler-head.txt"

node node_modules/oreshnik-cli/dist/cli.js evidence --task "$TASK_ID" --run "$RUN_ID" --operator "$OPERATOR" --start-validation --details "PUB-07 immediate and scheduled YouTube Video/Shorts paths are implemented; scheduled execution now transports format/title/description/thumbnail and resolves youtube_oauth dynamically. Focused and full project gates pass. Real provider credential/channel smoke remains an external validation gate." || true
node node_modules/oreshnik-cli/dist/cli.js reconcile --write --json > "$RUNNER_TEMP/pub07-scheduler-reconcile.json" || true
git add var/oreshnik docs/oreshnik docs/obsidian-vault docs/07_handoffs 2>/dev/null || true
if ! git diff --cached --quiet; then
  git diff --cached --check
  git commit -m "chore(oreshnik): persist PUB-07 scheduled validation checkpoint"
  git push origin "HEAD:$FUNCTIONAL_BRANCH"
fi

printf 'PUB07_SCHEDULER_SUCCESS\n'
