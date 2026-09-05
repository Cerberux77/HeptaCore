#!/usr/bin/env bash
set -euo pipefail

TASK_ID="${TASK_ID:-HC-ORESHNIK-RECOVERY-ALPHA6}"
OPERATOR="${OPERATOR:-manuel}"
RUN_ID="${RUN_ID:?RUN_ID is required}"
EXPECTED_BRANCH="${FUNCTIONAL_BRANCH:?FUNCTIONAL_BRANCH is required}"
EVIDENCE_DIR="${EVIDENCE_DIR:-${RUNNER_TEMP:-/tmp}/oreshnik-alpha6-adoption}"
TARGET_VERSION="0.3.0-alpha.6"
TARGET_COMMIT="3e4345b76238e18da8e4d259f537f0e9c64ce099"
TARGET_SHA256="66e0e6683cdf9587a873b27f20dd8c8538199eb511068e9c40b682ceadb176e8"
TARGET_ASSET="oreshnik-cli-0.3.0-alpha.6.tgz"
TARGET_VENDOR="vendor/oreshnik/oreshnik-cli-0.3.0-alpha.6-${TARGET_COMMIT}.tgz"
ROLLBACK_VERSION="0.2.0-alpha.16"
ROLLBACK_COMMIT="d983c051c79b99c3fcda6c4c200b7c96bda997ff"
ROLLBACK_SHA256="8e38737a7cc3ad88414582c4f51630e481bbf0723480079da93ca91b4f208473"
ROLLBACK_VENDOR="vendor/oreshnik/oreshnik-cli-0.2.0-alpha.16-${ROLLBACK_COMMIT}.tgz"
HANDOFF="docs/07_handoffs/HC-ORESHNIK-RECOVERY-ALPHA6.md"
ADOPTION_EVIDENCE="docs/oreshnik/ORESHNIK_0.3.0-alpha.6_ADOPTION_EVIDENCE.md"
CLI=(node node_modules/oreshnik-cli/dist/cli.js)

mkdir -p "$EVIDENCE_DIR" vendor/oreshnik docs/oreshnik docs/07_handoffs

current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "$EXPECTED_BRANCH" ]]; then
  echo "Refusing adoption outside Oreshnik branch: expected=$EXPECTED_BRANCH actual=$current_branch" >&2
  exit 31
fi

# A governed cross-machine takeover intentionally reconstructs the local Run
# projection under var/oreshnik/** (task-board, Claim, task artifact, Run
# manifest). That projection is required by subsequent evidence commands and is
# therefore allowed to be dirty here. Any mutation outside var/oreshnik/** is
# still a hard stop so product/code drift cannot enter this adoption Run.
mapfile -t dirty_paths < <(
  {
    git diff --name-only
    git diff --cached --name-only
    git ls-files --others --exclude-standard
  } | sed '/^$/d' | sort -u
)
unexpected_dirty=()
for dirty_path in "${dirty_paths[@]}"; do
  if [[ "$dirty_path" != var/oreshnik/* ]]; then
    unexpected_dirty+=("$dirty_path")
  fi
done
if (( ${#unexpected_dirty[@]} > 0 )); then
  echo "Refusing adoption: unexpected dirty paths exist outside the governed runtime projection." >&2
  printf '  %s\n' "${unexpected_dirty[@]}" >&2
  git status --short >&2
  exit 32
fi
if (( ${#dirty_paths[@]} > 0 )); then
  printf '%s\n' "${dirty_paths[@]}" | tee "$EVIDENCE_DIR/rehydrated-runtime-dirty-paths.txt"
fi

if [[ ! -f "$ROLLBACK_VENDOR" ]]; then
  echo "Rollback TGZ is missing: $ROLLBACK_VENDOR" >&2
  exit 33
fi
printf '%s  %s\n' "$ROLLBACK_SHA256" "$ROLLBACK_VENDOR" | sha256sum -c - | tee "$EVIDENCE_DIR/rollback-sha256-before.txt"

asset_tmp="$EVIDENCE_DIR/$TARGET_ASSET"
pack_dir="$EVIDENCE_DIR/registry-pack"
mkdir -p "$pack_dir"
pack_name="$(cd "$pack_dir" && npm pack "oreshnik-cli@$TARGET_VERSION" --ignore-scripts --silent | tail -n 1)"
if [[ -z "$pack_name" || ! -f "$pack_dir/$pack_name" ]]; then
  echo "Unable to obtain exact npm transport for oreshnik-cli@$TARGET_VERSION" >&2
  exit 36
fi
cp "$pack_dir/$pack_name" "$asset_tmp"
printf '%s  %s\n' "$TARGET_SHA256" "$asset_tmp" | sha256sum -c - | tee "$EVIDENCE_DIR/alpha6-release-sha256.txt"
cp "$asset_tmp" "$TARGET_VENDOR"
printf '%s  %s\n' "$TARGET_SHA256" "$TARGET_VENDOR" | sha256sum -c - | tee "$EVIDENCE_DIR/alpha6-vendor-sha256.txt"

node - <<'NODE'
const fs = require('node:fs');
const pkgPath = 'package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const expected = `file:vendor/oreshnik/oreshnik-cli-0.3.0-alpha.6-3e4345b76238e18da8e4d259f537f0e9c64ce099.tgz`;
if (!pkg.dependencies || !pkg.dependencies['oreshnik-cli']) throw new Error('package.json has no oreshnik-cli dependency');
pkg.dependencies['oreshnik-cli'] = expected;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const readyPath = 'scripts/oreshnik/ready.mjs';
let ready = fs.readFileSync(readyPath, 'utf8');
const before = 'const EXPECTED_ORESHNIK_VERSION = "0.2.0-alpha.16";';
const after = 'const EXPECTED_ORESHNIK_VERSION = "0.3.0-alpha.6";';
if (ready.includes(before)) ready = ready.replace(before, after);
else if (!ready.includes(after)) throw new Error('ready.mjs expected-version contract is neither alpha16 nor alpha6');
fs.writeFileSync(readyPath, ready);
NODE

npm install --package-lock-only --ignore-scripts 2>&1 | tee "$EVIDENCE_DIR/npm-lock-update.log"
npm ci 2>&1 | tee "$EVIDENCE_DIR/npm-ci-alpha6.log"

installed_version="$("${CLI[@]}" --version)"
printf '%s\n' "$installed_version" | tee "$EVIDENCE_DIR/installed-version.txt"
if [[ "$installed_version" != "$TARGET_VERSION" ]]; then
  echo "Installed Oreshnik mismatch: expected=$TARGET_VERSION actual=$installed_version" >&2
  exit 34
fi

npm run oreshnik:command-catalog 2>&1 | tee "$EVIDENCE_DIR/command-catalog-generation.log"
node - <<'NODE'
const fs = require('node:fs');
const catalog = JSON.parse(fs.readFileSync('docs/operations/oreshnik-command-catalog.json', 'utf8'));
if (catalog.version !== '0.3.0-alpha.6') throw new Error(`Command catalog version mismatch: ${catalog.version}`);
if (catalog.source !== 'node_modules/oreshnik-cli/dist/cli.js') throw new Error(`Unexpected catalog source: ${catalog.source}`);
console.log(JSON.stringify({catalogVersion: catalog.version, commandCount: catalog.commands.length}, null, 2));
NODE

git diff --check
cat > "$ADOPTION_EVIDENCE" <<EOF
# Oreshnik 0.3.0-alpha.6 Adoption Evidence

## Governed Run

- Task: \`$TASK_ID\`
- Run: \`$RUN_ID\`
- Operator: \`$OPERATOR\`
- Harness: \`chatgpt\`
- Functional branch: \`$EXPECTED_BRANCH\`

## Exact release identity

- Version: \`$TARGET_VERSION\`
- Release commit: \`$TARGET_COMMIT\`
- Release asset: \`$TARGET_ASSET\`
- Required SHA-256: \`${TARGET_SHA256^^}\`
- Transport: npm registry tarball accepted only after exact SHA-256 equality with the canonical GitHub Release asset digest.
- Vendored path: \`$TARGET_VENDOR\`
- Dependency mode: exact local \`file:\` pin; no floating/latest dependency.

## Rollback retained

- Version: \`$ROLLBACK_VERSION\`
- Release commit: \`$ROLLBACK_COMMIT\`
- Required SHA-256: \`${ROLLBACK_SHA256^^}\`
- Vendored path: \`$ROLLBACK_VENDOR\`
- Rollback artifact is retained unchanged and digest-verified before adoption.

## Validation contract

The candidate is not integration-ready until consumer readiness, exact CLI version, generated command catalog, reconcile check, typecheck, build, tests, worker validation, git diff check, and Oreshnik governed evidence gates all pass. No product feature, production deploy, live publication, campaign spend, credential, token, or environment mutation is part of this Run.
EOF

cat > "$HANDOFF" <<EOF
# HC-ORESHNIK-RECOVERY-ALPHA6

## Objective

Recover HeptaCore governance on the exact Oreshnik \`0.3.0-alpha.6\` release before resuming product development.

## Run identity

- Run: \`$RUN_ID\`
- Operator: \`$OPERATOR\`
- Harness: \`chatgpt\`
- Branch: \`$EXPECTED_BRANCH\`

## Candidate state

The alpha6 release tarball has been obtained through the npm transport and accepted only after matching the canonical GitHub Release SHA-256 exactly, vendored under its release commit, pinned through \`package.json\`/\`package-lock.json\`, installed, and used to regenerate the real CLI command catalog. Alpha16 remains present as a digest-verified rollback artifact.

## Hard stops

No product feature, deployment, live publication, spend, secret, credential, or environment mutation is authorized in this Run.

## Continuation

Run the complete alpha6 consumer and HeptaCore gate matrix, persist canonical validation evidence, advance the same Run to \`ready_for_integration\`, then integrate through Oreshnik only if all checks remain green.
EOF

git add package.json package-lock.json "$TARGET_VENDOR" scripts/oreshnik/ready.mjs docs/operations/oreshnik-command-catalog.json "$ADOPTION_EVIDENCE" "$HANDOFF"
git diff --cached --check
git commit -m "chore(oreshnik): adopt 0.3.0-alpha.6"
git push origin "HEAD:$EXPECTED_BRANCH"

npm run oreshnik:ready 2>&1 | tee "$EVIDENCE_DIR/oreshnik-ready.log"
"${CLI[@]}" --version 2>&1 | tee "$EVIDENCE_DIR/oreshnik-version.log"
"${CLI[@]}" status 2>&1 | tee "$EVIDENCE_DIR/oreshnik-status.log"
"${CLI[@]}" reconcile --check --json 2>&1 | tee "$EVIDENCE_DIR/oreshnik-reconcile-check.json"
"${CLI[@]}" handoff --help 2>&1 | tee "$EVIDENCE_DIR/oreshnik-handoff-help.log"
npm run typecheck 2>&1 | tee "$EVIDENCE_DIR/typecheck.log"
npm run build 2>&1 | tee "$EVIDENCE_DIR/build.log"
npm run test 2>&1 | tee "$EVIDENCE_DIR/test.log"
npm run worker:validate 2>&1 | tee "$EVIDENCE_DIR/worker-validate.log"
git diff --check
printf '%s  %s\n' "$ROLLBACK_SHA256" "$ROLLBACK_VENDOR" | sha256sum -c - | tee "$EVIDENCE_DIR/rollback-sha256-after.txt"
printf '%s  %s\n' "$TARGET_SHA256" "$TARGET_VENDOR" | sha256sum -c - | tee "$EVIDENCE_DIR/alpha6-vendor-sha256-after.txt"

cat >> "$ADOPTION_EVIDENCE" <<EOF

## Candidate gate result

All of the following passed on the committed functional-branch candidate:

- \`npm run oreshnik:ready\`
- installed CLI version exactly \`$TARGET_VERSION\`
- real CLI \`status\`
- \`oreshnik reconcile --check --json\`
- \`oreshnik handoff --help\`
- \`npm run typecheck\`
- \`npm run build\`
- \`npm run test\`
- \`npm run worker:validate\`
- \`git diff --check\`
- alpha6 vendored digest re-check
- alpha16 rollback digest re-check

Gate logs are retained as the GitHub Actions evidence artifact for the recovery execution.
EOF

cat >> "$HANDOFF" <<EOF

## Gate result

All required consumer and HeptaCore gates passed on the alpha6 candidate. The next governed action is Oreshnik validation lifecycle transition on this same Run; integration remains prohibited until \`ready_for_integration\` is persisted.
EOF

git add "$ADOPTION_EVIDENCE" "$HANDOFF"
git diff --cached --check
git commit -m "docs(oreshnik): record alpha6 adoption gate evidence"
git push origin "HEAD:$EXPECTED_BRANCH"

"${CLI[@]}" evidence \
  --task "$TASK_ID" \
  --operator "$OPERATOR" \
  --run "$RUN_ID" \
  --handoff "$HANDOFF" \
  --details "Exact alpha6 release/digest verified; candidate and rollback digests verified; full consumer and HeptaCore gates passed." \
  --start-validation 2>&1 | tee "$EVIDENCE_DIR/evidence-start-validation.log"

git add var/oreshnik docs/obsidian-vault docs/07_handoffs docs/oreshnik || true
if ! git diff --cached --quiet; then
  git diff --cached --check
  git commit -m "chore(oreshnik): persist alpha6 validation state"
  git push origin "HEAD:$EXPECTED_BRANCH"
fi

"${CLI[@]}" evidence \
  --task "$TASK_ID" \
  --operator "$OPERATOR" \
  --run "$RUN_ID" \
  --handoff "$HANDOFF" \
  --details "Alpha6 adoption verified; configured typecheck/build/worker/tests gates passed under governed evidence execution." \
  --ready-for-integration 2>&1 | tee "$EVIDENCE_DIR/evidence-ready-for-integration.log"

"${CLI[@]}" reconcile --write --json 2>&1 | tee "$EVIDENCE_DIR/reconcile-write-final.json"
git add var/oreshnik docs/obsidian-vault docs/07_handoffs docs/oreshnik || true
if ! git diff --cached --quiet; then
  git diff --cached --check
  git commit -m "chore(oreshnik): persist alpha6 integration-ready evidence"
fi
git push origin "HEAD:$EXPECTED_BRANCH"

"${CLI[@]}" reconcile --check --json 2>&1 | tee "$EVIDENCE_DIR/reconcile-check-final.json"
npm run oreshnik:ready 2>&1 | tee "$EVIDENCE_DIR/oreshnik-ready-final.log"
git status --porcelain | tee "$EVIDENCE_DIR/git-status-final.txt"
if [[ -s "$EVIDENCE_DIR/git-status-final.txt" ]]; then
  echo "Run worktree is not clean after final alpha6 evidence persistence." >&2
  exit 35
fi

printf '%s\n' "alpha6 adoption and governed evidence completed" | tee "$EVIDENCE_DIR/adoption-result.txt"
