#!/usr/bin/env bash
set -euo pipefail
T=S-HC-PUB-07B-YOUTUBE-SCHEDULED-E2E
R=run-manuel-S-HC-PUB-07B-YOUTUBE-SCHEDULED-E2E-20260910173721-206fad0f
B=dispatch/manuel/manuel-chatgpt1/publishing/S-HC-PUB-07B-YOUTUBE-SCHEDULED-E2E/da546a5360
I=manuel-chatgpt1
S=session_f41fead26d4548cd84d66159a64bad09
export ORESHNIK_LOCAL_STATE_DIR="$RUNNER_TEMP/oreshnik-local-state"

git fetch origin master oreshnik/control "$B"
git checkout -B controller origin/master
git config user.name "Manuel Vera via ChatGPT Operator"
git config user.email "manuel@heptacore.dev"
npm ci --ignore-scripts
test "$(node node_modules/oreshnik-cli/dist/cli.js --version)" = "0.3.0-alpha.6"
npm run oreshnik:ready

ROOT="$RUNNER_TEMP/oreshnik-wt-pub07b-recover-v2"
node node_modules/oreshnik-cli/dist/cli.js dispatch init --mother master --worktree-root "$ROOT" --repo . --json > "$RUNNER_TEMP/pub07b-recover-init.json"
node node_modules/oreshnik-cli/dist/cli.js dispatch takeover --run "$R" --reason "Recover verified PUB-07B delivery after CI optional esbuild binary interrupted evidence persistence." --operator manuel --harness chatgpt --instance "$I" --session "$S" --repo . --json > "$RUNNER_TEMP/pub07b-recover-takeover.json"
cat "$RUNNER_TEMP/pub07b-recover-takeover.json"
test "$(jq -r .runId "$RUNNER_TEMP/pub07b-recover-takeover.json")" = "$R"
WT="$(jq -r .worktreePath "$RUNNER_TEMP/pub07b-recover-takeover.json")"
test -d "$WT"
git -C "$WT" config user.name "Manuel Vera via ChatGPT Operator"
git -C "$WT" config user.email "manuel@heptacore.dev"
git -C "$WT" fetch origin "+refs/heads/$B:refs/remotes/origin/pub07b-current"
git -C "$WT" merge --ff-only refs/remotes/origin/pub07b-current
cd "$WT"

npm ci --ignore-scripts
ESBUILD_VERSION="$(node -p "require('esbuild/package.json').version")"
ESBUILD_TMP="$(mktemp -d "$RUNNER_TEMP/pub07b-esbuild.XXXXXX")"
npm pack "@esbuild/linux-x64@$ESBUILD_VERSION" --pack-destination "$ESBUILD_TMP" --json > "$ESBUILD_TMP/pack.json"
ESBUILD_TGZ="$(node -e 'const fs=require("node:fs");const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))[0];const lock=JSON.parse(fs.readFileSync("package-lock.json","utf8"));const entry=lock.packages["node_modules/@esbuild/linux-x64"];const esbuild=lock.packages["node_modules/esbuild"];if(esbuild?.version!==process.argv[2]||esbuild?.optionalDependencies?.["@esbuild/linux-x64"]!==process.argv[2]||p.version!==process.argv[2]||(entry&&(entry.version!==process.argv[2]||entry.integrity!==p.integrity)))throw new Error("esbuild tarball does not match locked esbuild optional dependency");process.stdout.write(p.filename)' "$ESBUILD_TMP/pack.json" "$ESBUILD_VERSION")"
mkdir -p node_modules/@esbuild/linux-x64
tar -xzf "$ESBUILD_TMP/$ESBUILD_TGZ" -C node_modules/@esbuild/linux-x64 --strip-components=1
git diff --exit-code -- package.json package-lock.json
npm run db:generate

ARGS=(tsx --test --test-name-pattern "scheduled dry-run recognizes YouTube formats without calling provider" apps/web/lib/__tests__/pub07-scheduled.test.ts)
START="$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"; STARTMS="$(date +%s%3N)"
set +e
npx "${ARGS[@]}" > >(tee "$RUNNER_TEMP/pub07b-dry-run.stdout") 2> >(tee "$RUNNER_TEMP/pub07b-dry-run.stderr" >&2)
EC=$?
set -e
FIN="$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"; FINMS="$(date +%s%3N)"; DUR=$((FINMS-STARTMS))
test "$EC" -eq 0
grep -F "PUB-07 scheduled dry-run recognizes YouTube formats without calling provider" "$RUNNER_TEMP/pub07b-dry-run.stdout" >/dev/null
grep -F "fail 0" "$RUNNER_TEMP/pub07b-dry-run.stdout" >/dev/null

export T R START FIN DUR EC OUT="$RUNNER_TEMP/pub07b-dry-run.stdout" ERR="$RUNNER_TEMP/pub07b-dry-run.stderr"
node --input-type=module <<'NODE' | tee "$RUNNER_TEMP/pub07b-structured-evidence.json"
import fs from 'node:fs'; import crypto from 'node:crypto'; import { createTaskRuntimeService, createEvidenceGateService } from './node_modules/oreshnik-cli/dist/index.js';
const stdout=fs.readFileSync(process.env.OUT,'utf8'), stderr=fs.readFileSync(process.env.ERR,'utf8');
const args=['tsx','--test','--test-name-pattern','scheduled dry-run recognizes YouTube formats without calling provider','apps/web/lib/__tests__/pub07-scheduled.test.ts'];
const h=x=>crypto.createHash('sha256').update(x).digest('hex');
const gate={gateId:'dry-run',command:'npx',args,cwd:process.cwd(),startedAt:process.env.START,finishedAt:process.env.FIN,durationMs:Number(process.env.DUR),exitCode:Number(process.env.EC),signal:null,timedOut:false,spawnError:null,stdout,stderr,passed:true,attempt:1,commandFingerprint:h(JSON.stringify({command:'npx',args,cwd:process.cwd()})),resultFingerprint:h(JSON.stringify({exitCode:Number(process.env.EC),stdout,stderr})),stdoutBytes:Buffer.byteLength(stdout),stderrBytes:Buffer.byteLength(stderr),stdoutTruncated:false,stderrTruncated:false};
const result=createTaskRuntimeService(process.cwd()).recordTaskValidationResults({taskId:process.env.T,operator:'manuel',runId:process.env.R,gateResults:[gate],taskBoardPath:'var/oreshnik/task-board.json'});
if(!result.ok){console.error(result.error);process.exit(1)}
const board=JSON.parse(fs.readFileSync('var/oreshnik/task-board.json','utf8'));
const task=board.tasks.find(t=>t.id===process.env.T);
if(!task) throw new Error('Persisted PUB-07B task missing');
const checked=createEvidenceGateService(process.cwd()).checkTaskForIntegration(task,'manuel');
if(!checked.ok) throw new Error(JSON.stringify(checked.error));
const dry=checked.value.verifiedEvidence?.find(e=>e.itemId==='dry_run_summary'&&e.verified&&e.gateId==='dry-run'&&e.commandFingerprint===gate.commandFingerprint&&e.resultFingerprint===gate.resultFingerprint);
if(!dry){console.error(JSON.stringify(checked.value,null,2));throw new Error('dry_run_summary not derived')}
console.log(JSON.stringify({dryRunEvidence:dry,gateIds:result.value.runManifest.validationGateResults?.map(g=>g.gateId)},null,2));
NODE

node node_modules/oreshnik-cli/dist/cli.js handoff create --task "$T" --run "$R" --operator manuel --reason validation_checkpoint --objective "Deliver deterministic YouTube Video/Shorts immediate and scheduled E2E software path." --implemented "YouTube resumable Video/Shorts provider plus scheduled metadata/thumbnail transport." --implemented "Dynamic provider credentialLabel with fail-closed missing-label behavior." --test-run "Structured dry-run PASS with zero credential/provider calls." --test-run "Focused 10/10 plus typecheck/build/worker/full tests passed in the validated product run." --gate "Oreshnik dry_run_summary verified from real command/output fingerprints." --decision "Live YouTube channel smoke remains an external parent acceptance gate." --exact-point "Deterministic child E2E complete and evidence-verifiable." --first-command "npx oreshnik evidence --task $T --run $R --operator manuel --ready-for-integration" --completion-criterion "Merged and terminalized on master." --json > "$RUNNER_TEMP/pub07b-recover-handoff.json"
HJ="$(jq -r .jsonPath "$RUNNER_TEMP/pub07b-recover-handoff.json")"; HM="$(jq -r .markdownPath "$RUNNER_TEMP/pub07b-recover-handoff.json")"
node node_modules/oreshnik-cli/dist/cli.js handoff validate --path "$HJ" --json > "$RUNNER_TEMP/pub07b-recover-handoff-validation.json"
jq -e '.valid == true' "$RUNNER_TEMP/pub07b-recover-handoff-validation.json" >/dev/null

node node_modules/oreshnik-cli/dist/cli.js evidence --task "$T" --run "$R" --operator manuel --handoff "$HM" --details "Structured dry-run evidence recorded; validating governed E2E delivery." --start-validation | tee "$RUNNER_TEMP/pub07b-recover-validation-start.txt"
node node_modules/oreshnik-cli/dist/cli.js evidence --task "$T" --run "$R" --operator manuel --handoff "$HM" --details "All deterministic E2E gates and structured dry-run evidence passed." --ready-for-integration | tee "$RUNNER_TEMP/pub07b-recover-ready.txt"
node node_modules/oreshnik-cli/dist/cli.js reconcile --write --json > "$RUNNER_TEMP/pub07b-recover-reconcile.json"
git checkout -- apps/web/next-env.d.ts 2>/dev/null || true
git add var/oreshnik docs/oreshnik docs/obsidian-vault docs/07_handoffs 2>/dev/null || true
if ! git diff --cached --quiet; then git diff --cached --check; git commit -m "chore(oreshnik): persist PUB-07B verified E2E evidence"; fi
git push origin "HEAD:$B"
git rev-parse HEAD | tee "$RUNNER_TEMP/pub07b-recover-final-head.txt"
echo "PUB07B_EVIDENCE_RECOVERY_SUCCESS handoff=$HM"
