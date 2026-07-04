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
  normalizeRelativePath,
  normalizeRoot,
  parsePinnedGitDependency,
  readJson,
  resolveAuthorizedDispatchRuntime,
  validateGitignoreContract,
  validateGoalContract,
  validateOreshnikContract,
  validatePackageContract
} from "./ready-lib.mjs";

const require = createRequire(import.meta.url);
const ROOT = normalizeRoot(join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
const EXPECTED_ORESHNIK_VERSION = "0.2.0-alpha.13";
const issues = [];

function run(command, args) {
  return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function collectUnauthorizedGitStatusPaths(statusText, allowedPaths) {
  return statusText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => normalizeRelativePath(line.slice(3).split(" -> ").at(-1)))
    .filter((path) => !allowedPaths.has(path));
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

  const canonicalGoalPath = join(ROOT, ".kilo", "commands", "goal.md");
  const legacyGoalPath = join(ROOT, ".kilo", "command", "goal.md");
  if (!existsSync(canonicalGoalPath)) {
    issues.push(`missing canonical Kilo adapter: ${canonicalGoalPath}`);
  } else {
    const goalContract = readFileSync(canonicalGoalPath, "utf8");
    issues.push(...validateGoalContract(goalContract));
  }
  if (!existsSync(legacyGoalPath)) {
    issues.push(`missing legacy-compatible Kilo adapter: ${legacyGoalPath}`);
  } else {
    const legacyGoalContract = readFileSync(legacyGoalPath, "utf8");
    issues.push(...validateGoalContract(legacyGoalContract));
  }

  const gitignore = readFileSync(join(ROOT, ".gitignore"), "utf8");
  issues.push(...validateGitignoreContract(gitignore));

  const board = readJson(join(ROOT, "var", "oreshnik", "task-board.json"));
  if (!board?.project || !Array.isArray(board?.tasks)) {
    issues.push("var/oreshnik/task-board.json is missing project/tasks");
  }

  const currentBranch = run("git", ["branch", "--show-current"]);
  const authorizedRuntime = resolveAuthorizedDispatchRuntime(ROOT, { branch: currentBranch });
  issues.push(...collectRuntimeIssues(ROOT, { authorizedRuntime }));

  const forbiddenMatches = collectTextFileMatches(ROOT, FORBIDDEN_TEXT_TOKENS, {
    excludePaths: Array.from(READINESS_SCAN_EXCLUDES)
  });
  for (const match of forbiddenMatches.slice(0, 20)) {
    issues.push(`forbidden reference '${match.token}' found in ${match.path}`);
  }

  const gitStatus = run("git", ["status", "--porcelain"]);
  const dirtyPaths = collectUnauthorizedGitStatusPaths(gitStatus, authorizedRuntime?.allowedPaths || new Set());
  if (dirtyPaths.length > 0) issues.push("working tree is not clean");

  run("git", ["ls-remote", "--heads", "origin"]);
  run("git", ["rev-parse", "--verify", "origin/master"]);
  run("git", ["show-ref", "--verify", "refs/remotes/origin/oreshnik/control"]);

  const installedPackagePath = require.resolve("oreshnik-cli/package.json");
  if (!installedPackagePath.startsWith(join(ROOT, "node_modules"))) {
    issues.push(`oreshnik-cli resolves outside repo node_modules: ${installedPackagePath}`);
  }

  const installedPackage = readJson(installedPackagePath);
  if (installedPackage.version !== EXPECTED_ORESHNIK_VERSION) {
    issues.push(`oreshnik package version must be ${EXPECTED_ORESHNIK_VERSION}, got ${installedPackage.version}`);
  }
  const installedCliPath = join(dirname(installedPackagePath), "dist", "cli.js");
  const binVersion = run("node", [installedCliPath, "--version"]);
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
