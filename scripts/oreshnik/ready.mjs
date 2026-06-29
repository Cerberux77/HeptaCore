#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FORBIDDEN_TEXT_TOKENS,
  READINESS_SCAN_EXCLUDES,
  collectRuntimeIssues,
  collectTextFileMatches,
  normalizeIssueList,
  normalizeRoot,
  parsePinnedGitDependency,
  readJson,
  validateGoalContract,
  validateOreshnikContract,
  validatePackageContract
} from "./ready-lib.mjs";

const require = createRequire(import.meta.url);
const ROOT = normalizeRoot(join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
const issues = [];

function run(command, args) {
  return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
}

try {
  const pkg = readJson(join(ROOT, "package.json"));
  const pkgIssues = validatePackageContract(pkg);
  issues.push(...pkgIssues.issues);

  const lockRaw = readFileSync(join(ROOT, "package-lock.json"), "utf8");
  if (lockRaw.includes("../oreshnik")) {
    issues.push("package-lock.json still resolves oreshnik from ../oreshnik");
  }

  const config = readJson(join(ROOT, ".oreshnik.json"));
  issues.push(...validateOreshnikContract(config));

  const goalContract = readFileSync(join(ROOT, ".kilo", "commands", "goal.md"), "utf8");
  issues.push(...validateGoalContract(goalContract));

  const board = readJson(join(ROOT, "var", "oreshnik", "task-board.json"));
  if (!board?.project || !Array.isArray(board?.tasks)) {
    issues.push("var/oreshnik/task-board.json is missing project/tasks");
  }

  issues.push(...collectRuntimeIssues(ROOT));

  const forbiddenMatches = collectTextFileMatches(ROOT, FORBIDDEN_TEXT_TOKENS, {
    excludePaths: Array.from(READINESS_SCAN_EXCLUDES)
  });
  for (const match of forbiddenMatches.slice(0, 20)) {
    issues.push(`forbidden reference '${match.token}' found in ${match.path}`);
  }

  const gitStatus = run("git", ["status", "--porcelain"]);
  if (gitStatus) issues.push("working tree is not clean");

  run("git", ["ls-remote", "--heads", "origin"]);
  run("git", ["rev-parse", "--verify", "origin/master"]);
  run("git", ["show-ref", "--verify", "refs/remotes/origin/oreshnik/control"]);

  const installedPackagePath = require.resolve("oreshnik-cli/package.json");
  if (!installedPackagePath.startsWith(join(ROOT, "node_modules"))) {
    issues.push(`oreshnik-cli resolves outside repo node_modules: ${installedPackagePath}`);
  }

  const installedPackage = readJson(installedPackagePath);
  const binVersion = run("npx", ["--no-install", "oreshnik", "--version"]);
  if (binVersion !== installedPackage.version) {
    issues.push(`oreshnik binary version mismatch: bin=${binVersion} package=${installedPackage.version}`);
  }

  const depSpec = pkg?.dependencies?.["oreshnik-cli"];
  const pinned = parsePinnedGitDependency(depSpec);
  if (pinned.ok && !lockRaw.includes(pinned.commit)) {
    issues.push(`package-lock.json does not pin the expected oreshnik commit ${pinned.commit}`);
  }
} catch (error) {
  issues.push(error instanceof Error ? error.message : String(error));
}

const normalized = normalizeIssueList(issues);
if (normalized.length > 0) {
  for (const issue of normalized) {
    console.error(`[FAIL] ${issue}`);
  }
  process.exit(1);
}

console.log("ORESHNIK READY FOR KILO + GOAL RUNNER");
