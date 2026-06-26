#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = join(root, "scripts", "goal-runner", "pub04-contract-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

function fail(message, detail = "") {
  console.error(`[PUB04-CONTRACT][FAIL] ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

function run(command, args, options = {}) {
  const isWinAlias = process.platform === "win32" && (command === "npm" || command === "npx");
  const actualCommand = isWinAlias ? (process.env.ComSpec || "cmd.exe") : command;
  const actualArgs = isWinAlias ? ["/c", command, ...args] : args;
  return spawnSync(actualCommand, actualArgs, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
    ...options,
  });
}

const lockPath = join(root, "var", "goal-runner", ".active-worktree.json");
if (!existsSync(lockPath)) fail("No active Goal Runner lock. The contract gate must run inside the active corrective goal.");
const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const statePath = join(root, "var", "goal-runner", "goals", lock.goalId, "state.json");
if (!existsSync(statePath)) fail(`Goal state not found for ${lock.goalId}`);
const state = JSON.parse(readFileSync(statePath, "utf8"));

if (state.sprintId !== manifest.sprint) {
  fail(`Wrong sprint for PUB-04 contract gate: ${state.sprintId}`);
}
if (!state.baseSha || !/^[0-9a-f]{40}$/i.test(state.baseSha)) {
  fail("Goal baseSha is missing or invalid.");
}

const subject = run("git", ["show", "-s", "--format=%s", state.baseSha]);
if (subject.status !== 0) fail("Cannot inspect goal baseSha.", subject.stderr);
if (subject.stdout.trim() !== manifest.baselineCommitSubject) {
  fail(
    "Goal was not created from the frozen acceptance baseline.",
    `Expected base subject: ${manifest.baselineCommitSubject}\nActual: ${subject.stdout.trim()}`,
  );
}

for (const path of manifest.protectedPaths) {
  const baseCheck = run("git", ["cat-file", "-e", `${state.baseSha}:${path}`]);
  if (baseCheck.status !== 0) fail(`Protected path did not exist in baseline: ${path}`);
  const diff = run("git", ["diff", "--exit-code", state.baseSha, "--", path]);
  if (diff.status !== 0) {
    fail(`Protected acceptance file was modified: ${path}`, diff.stdout || diff.stderr);
  }
}

const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
if (!Array.isArray(vercel.crons) || vercel.crons.length !== 1) {
  fail("vercel.json must contain exactly one cron entry.");
}
if (
  vercel.crons[0]?.path !== "/api/cron/publisher" ||
  vercel.crons[0]?.schedule !== "0 * * * *"
) {
  fail("The single cron must be /api/cron/publisher with schedule 0 * * * *.");
}

const cronRoutePath = join(root, "apps", "web", "app", "api", "cron", "publisher", "route.ts");
const cronRoute = readFileSync(cronRoutePath, "utf8");
const requiredCronFragments = [
  "executePublishingCron",
  "publishing-cron-executor",
  "validateCronSecret",
];
for (const fragment of requiredCronFragments) {
  if (!cronRoute.includes(fragment)) fail(`Cron route does not delegate through ${fragment}.`);
}
const forbiddenCronFragments = [
  "publisher.publish(",
  "claimJob(",
  "attempts: { increment: 1 }",
  "recordUnconfirmedProviderFailure(",
  'process.env.CRON_SECRET ??',
  '"heptacore-cron-secret"',
];
for (const fragment of forbiddenCronFragments) {
  if (cronRoute.includes(fragment)) fail(`Cron route still contains forbidden orchestration logic: ${fragment}`);
}

const publishRoute = readFileSync(
  join(root, "apps", "web", "app", "api", "publishing", "publish", "route.ts"),
  "utf8",
);
if (!publishRoute.includes("schedulePublication") || !publishRoute.includes("publishing-scheduler-service")) {
  fail("Publishing route must delegate scheduled creation to publishing-scheduler-service.");
}

const executorPath = join(root, "apps", "web", "lib", "publishing-cron-executor.ts");
const schedulerPath = join(root, "apps", "web", "lib", "publishing-scheduler-service.ts");
for (const path of [executorPath, schedulerPath]) {
  if (!existsSync(path)) fail(`Required implementation module missing: ${path}`);
  const source = readFileSync(path, "utf8");
  if (source.includes("PUB04_NOT_IMPLEMENTED")) fail(`Placeholder remains in ${path}`);
  if (/shell\s*:\s*true/.test(source)) fail(`shell:true is forbidden in ${path}`);
}

const contractTest = run(
  "npx",
  ["tsx", "--test", "apps/web/lib/__contract_tests__/pub04.acceptance.test.ts"],
  { timeout: 300000 },
);
process.stdout.write(contractTest.stdout || "");
process.stderr.write(contractTest.stderr || "");
if (contractTest.status !== 0) fail("Immutable PUB-04 acceptance tests failed.");

console.log("[PUB04-CONTRACT][PASS] Protected files unchanged, routes delegated, and acceptance tests passed.");
