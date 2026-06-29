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

function validateHobbyCronMatrix() {
  const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));

  if (!Array.isArray(vercel.crons) || vercel.crons.length !== 24) {
    fail("vercel.json must contain exactly 24 daily publisher cron entries for Hobby.");
  }

  const seenHours = new Set();
  const seenSlots = new Set();

  for (const cron of vercel.crons) {
    const pathMatch = /^\/api\/cron\/publisher\?slot=(\d{2})$/.exec(cron?.path ?? "");
    const scheduleMatch = /^0 ([0-9]|1[0-9]|2[0-3]) \* \* \*$/.exec(cron?.schedule ?? "");

    if (!pathMatch || !scheduleMatch) {
      fail(`Invalid Hobby cron entry: ${JSON.stringify(cron)}`);
    }

    if (cron.schedule === "0 * * * *") {
      fail("A single hourly expression is forbidden on Hobby.");
    }

    const slot = pathMatch[1];
    const hour = Number(scheduleMatch[1]);

    if (slot !== String(hour).padStart(2, "0")) {
      fail(`Cron slot/hour mismatch: slot=${slot}, hour=${hour}`);
    }
    if (seenSlots.has(slot) || seenHours.has(hour)) {
      fail(`Duplicate Hobby cron slot/hour: slot=${slot}, hour=${hour}`);
    }

    seenSlots.add(slot);
    seenHours.add(hour);
  }

  for (let hour = 0; hour < 24; hour += 1) {
    const slot = String(hour).padStart(2, "0");
    if (!seenHours.has(hour) || !seenSlots.has(slot)) {
      fail(`Missing Hobby cron coverage for UTC hour ${slot}.`);
    }
  }
}

const lockPath = join(root, "var", "goal-runner", ".active-worktree.json");
if (!existsSync(lockPath)) {
  fail("No active Goal Runner lock. The contract gate must run inside the active final-correctness goal.");
}

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

validateHobbyCronMatrix();

const cronRoutePath = join(root, "apps", "web", "app", "api", "cron", "publisher", "route.ts");
const cronRoute = readFileSync(cronRoutePath, "utf8");

for (const fragment of [
  "executePublishingCron",
  "publishing-cron-executor",
  "validateCronSecret",
]) {
  if (!cronRoute.includes(fragment)) fail(`Cron route does not delegate through ${fragment}.`);
}

for (const fragment of [
  "publisher.publish(",
  "claimJob(",
  "attempts: { increment: 1 }",
  "recordUnconfirmedProviderFailure(",
  'process.env.CRON_SECRET ??',
  '"heptacore-cron-secret"',
  "trialLimit: 999999",
]) {
  if (cronRoute.includes(fragment)) {
    fail(`Cron route contains forbidden orchestration/configuration logic: ${fragment}`);
  }
}

if (!/scheduledFor:\s*\{\s*lte:\s*now\s*\}/.test(cronRoute)) {
  fail("Cron adapter must select all durable work with scheduledFor <= now.");
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

const executor = readFileSync(executorPath, "utf8");
if (executor.includes('"VIDUE"')) fail('Invalid media type typo "VIDUE" remains in executor.');

for (const testPath of [
  "apps/web/lib/__contract_tests__/pub04.acceptance.test.ts",
  "apps/web/lib/__tests__/vercel-cron-hobby-plan.test.ts",
]) {
  const test = run("npx", ["tsx", "--test", testPath], { timeout: 300000 });
  process.stdout.write(test.stdout || "");
  process.stderr.write(test.stderr || "");
  if (test.status !== 0) fail(`Immutable test failed: ${testPath}`);
}

console.log(
  "[PUB04-CONTRACT][PASS] Frozen files unchanged, 24-job Hobby cron matrix valid, routes delegated, and acceptance tests passed.",
);
