#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  colors,
  currentBranch,
  discoverLatestMother,
  git,
  log,
  nonIgnoredDirtyFiles,
  nowVet,
  readJson,
  resolveMother,
  resolveOperator,
  ROOT,
  sh
} from "./lib.mjs";

const operator = resolveOperator();
const vet = nowVet();
const branch = currentBranch();

const DERIVED_DOCS = [
  "docs/obsidian-vault/00_CENTRAL_HEPTACORE.md",
  "docs/obsidian-vault/COLABORADORES/ESTADO_JEAN.md",
  "docs/obsidian-vault/COLABORADORES/ESTADO_MANUEL.md",
  "docs/obsidian-vault/PRODUCT/STATUS_BOARD.md"
];
const CANONICAL_AUTO_CONFLICTS = new Set([...DERIVED_DOCS, "var/oreshnik/task-board.json"]);

console.log("");
console.log(`${colors.bold}Oreshnik Sync Latest Mother${colors.reset}`);
console.log("");
log("INFO", `Branch: ${branch}`);

git(["fetch", "origin", "--prune", "--quiet"], { allowFail: true });

const currentMother = resolveMother();
const latest = discoverLatestMother();
if (!latest) {
  log("WARN", "No MADRE/vN branch found locally or remotely.");
  process.exit(0);
}

const latestRef = git(["rev-parse", "--verify", `origin/${latest.name}`], { allowFail: true }).ok ? `origin/${latest.name}` : latest.name;
log("INFO", `Declared mother: ${currentMother.current} (v${currentMother.version || "unknown"})`);
log("INFO", `Latest mother: ${latest.name} (v${latest.version})`);

if (latest.version <= (currentMother.version || 0)) {
  log("OK", "Declared mother is already current.");
  process.exit(0);
}

const dirty = nonIgnoredDirtyFiles();
if (dirty.length > 0) {
  log("FAIL", `Working tree has ${dirty.length} changed file(s). Commit or stash before syncing latest mother.`);
  process.exit(1);
}

const merge = git(["merge", "--no-ff", latestRef, "-m", `chore(oreshnik): sync from ${latest.name}`], { allowFail: true });
if (merge.ok) {
  log("OK", `Merged ${latest.name} without conflicts.`);
  process.exit(0);
}

const conflicts = git(["diff", "--name-only", "--diff-filter=U"], { allowFail: true }).output.split(/\r?\n/).filter(Boolean);
const unsupported = conflicts.filter((file) => !CANONICAL_AUTO_CONFLICTS.has(file));
if (unsupported.length > 0) {
  unsupported.forEach((file) => log("FAIL", `Manual merge required for non-canonical conflict: ${file}`));
  process.exit(1);
}

if (conflicts.includes("var/oreshnik/task-board.json")) {
  mergeTaskBoard("var/oreshnik/task-board.json");
}

const canonical = sh(`node scripts/oreshnik/canonical-check.mjs --fix --operator ${operator}`);
console.log(canonical);
git(["add", "var/oreshnik/task-board.json", ...DERIVED_DOCS], { allowFail: false });

const remaining = git(["diff", "--name-only", "--diff-filter=U"], { allowFail: true }).output.split(/\r?\n/).filter(Boolean);
if (remaining.length > 0) {
  remaining.forEach((file) => log("FAIL", `Unresolved conflict remains: ${file}`));
  process.exit(1);
}

git(["commit", "--no-edit"], { allowFail: false });
log("OK", `Auto-resolved canonical conflicts and merged ${latest.name}.`);

function readStage(stage, file) {
  const output = execFileSync("git", ["show", `:${stage}:${file}`], {
    cwd: ROOT,
    encoding: "utf8"
  });
  return output.replace(/^\uFEFF/, "");
}

function mergeTaskBoard(file) {
  const ours = JSON.parse(readStage(2, file));
  const theirs = JSON.parse(readStage(3, file));
  const merged = structuredClone(theirs);
  const mergedTasks = new Map(merged.tasks.map((task) => [task.id, task]));

  for (const task of ours.tasks || []) {
    if (!mergedTasks.has(task.id)) {
      const releaseIndex = merged.tasks.findIndex((item) => item.id === "S-HC-RELEASE-01");
      if (releaseIndex >= 0) merged.tasks.splice(releaseIndex, 0, task);
      else merged.tasks.push(task);
      mergedTasks.set(task.id, task);
    }
  }

  merged.reassignments = mergeUniqueArray(ours.reassignments || [], theirs.reassignments || []);
  merged.updatedAt = vet.iso;

  const target = join(ROOT, ...file.split("/"));
  writeFileSync(target, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  log("OK", "Merged task-board by task id; latest mother wins existing tasks, local-only tasks preserved.");
}

function mergeUniqueArray(a, b) {
  const seen = new Set();
  return [...a, ...b].filter((item) => {
    const key = JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
