#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  colors,
  currentBranch,
  getArg,
  git,
  hasFlag,
  isMotherBranch,
  log,
  nonIgnoredDirtyFiles,
  nowVet,
  readJson,
  readMother,
  resolveOperator,
  ROOT,
  RUNS_DIR,
  sanitize,
  sh,
  today,
  writeJson,
  discoverLatestMother
} from "./lib.mjs";

const sprint = getArg("--sprint");
const operator = resolveOperator(getArg("--operator"));
const desc = getArg("--desc", "sprint");
const dryRun = hasFlag("--dry-run");
const vet = nowVet();
const mother = discoverLatestMother();

console.log("");
console.log(`${colors.bold}==============================================${colors.reset}`);
console.log(`${colors.bold}  HEPTACORE ORESHNIK PREFLIGHT${colors.reset}`);
console.log(`${colors.bold}  ${vet.iso}${colors.reset}`);
console.log(`${colors.bold}==============================================${colors.reset}`);
console.log("");

let blockers = 0;
let warnings = 0;
const branch = currentBranch();
const dirty = nonIgnoredDirtyFiles();

log("INFO", `Operator: ${operator}`);
log("INFO", `Sprint: ${sprint || "not specified"}`);
if (dryRun) log("INFO", "Mode: dry-run");
log("INFO", `Current branch: ${branch}`);
log("INFO", `Dynamic mother: ${mother.current} (v${mother.version})`);

console.log("");
log("INFO", "1/8 Auto-sync docs from mother (Google Docs model)");
const syncResult = sh(`node scripts/oreshnik/sync-from-mother.mjs`, { fatal: false });
if (syncResult) console.log(syncResult);
else log("OK", "Mother docs synced or no mother available yet.");

console.log("");
log("INFO", "2/8 Git fetch and mother availability");
const fetchResult = git(["fetch", "origin", "--prune", "--quiet"], { allowFail: true, timeoutMs: 15000 });
if (fetchResult.status === null) {
  warnings++;
  log("WARN", "git fetch timed out after 15s; continuing with local refs.");
}
const originMother = git(["rev-parse", "--verify", `origin/${mother.current}`], { allowFail: true });
const localMother = git(["rev-parse", "--verify", mother.current], { allowFail: true });
if (originMother.ok || localMother.ok) log("OK", "Mother branch is available locally or remotely.");
else {
  log("WARN", `Mother branch '${mother.current}' not found yet. This is acceptable before first shared mother is pushed.`);
  warnings++;
}

console.log("");
log("INFO", "3/8 Working tree");
if (dirty.length > 0) {
  log("WARN", `${dirty.length} changed file(s). Preflight will not auto-switch branches while dirty.`);
  warnings++;
} else {
  log("OK", "Working tree clean.");
}

console.log("");
log("INFO", "4/8 Branch management");
if (sprint) {
  const expected = `${operator}/${sanitize(sprint)}-${sanitize(desc)}-${today()}`;
  if (dryRun) {
    log("OK", `Dry-run: would use or create child branch ${expected}.`);
  } else if (isMotherBranch(branch)) {
    if (dirty.length > 0) {
      log("WARN", `On mother-like branch. Commit/stash first, then preflight can create ${expected}.`);
      warnings++;
    } else {
      const exists = git(["branch", "--list", expected], { allowFail: true }).output;
      if (exists) {
        git(["checkout", expected], { allowFail: false });
        log("OK", `Checked out existing child branch ${expected}.`);
      } else {
        git(["checkout", "-b", expected], { allowFail: false });
        log("OK", `Created child branch ${expected}.`);
      }
    }
  } else if (new RegExp(`^${operator}/`, "i").test(branch)) {
    log("OK", `Already on ${operator} child branch.`);
  } else {
    log("WARN", `Branch '${branch}' is neither mother nor ${operator}/*. Confirm this is intentional.`);
    warnings++;
  }
} else if (isMotherBranch(branch)) {
  log("WARN", "No --sprint provided and current branch is mother-like. Use --sprint to create a child branch.");
  warnings++;
}

console.log("");
log("INFO", "5/8 Zone check");
if (sprint) {
  const zone = sh(`node scripts/oreshnik/zone-check.mjs --sprint ${sprint} --operator ${operator}`);
  if (zone.includes("[ FAIL")) {
    console.log(zone);
    blockers++;
  } else {
    console.log(zone);
  }
} else {
  log("INFO", "Skipped because --sprint was not provided.");
}

console.log("");
log("INFO", "6/8 Environment and secrets");
const forbidden = dirty.filter((file) => /^\.env($|\.)/.test(file) && !file.endsWith(".example"));
if (forbidden.length > 0) {
  forbidden.forEach((file) => log("FAIL", `Secret-like file changed: ${file}`));
  blockers++;
} else {
  log("OK", "No changed secret files detected.");
}
if (existsSync(join(ROOT, ".env.example"))) log("OK", ".env.example exists.");
else {
  log("WARN", ".env.example missing.");
  warnings++;
}

console.log("");
log("INFO", "7/8 Build checks available");
const pkg = existsSync(join(ROOT, "package.json"));
const prisma = existsSync(join(ROOT, "packages", "db", "prisma", "schema.prisma"));
if (pkg) log("OK", "package.json present.");
if (prisma) log("OK", "Prisma schema present.");

console.log("");
log("INFO", "8/8 Session ledger");
if (dryRun) {
  log("OK", "Dry-run: ledger not modified.");
} else {
  mkdirSync(RUNS_DIR, { recursive: true });
  writeJson(join(RUNS_DIR, ".last-preflight.json"), {
    sprint: sprint || null,
    operator,
    branch,
    mother: mother.current,
    dirtyCount: dirty.length,
    blockers,
    warnings,
    at: vet.iso
  });
  writeFileSync(join(RUNS_DIR, ".session-start"), vet.iso, "utf8");
  log("OK", "Preflight ledger updated.");
}

console.log("");
console.log(`${colors.bold}PRE-FLIGHT RESULT${colors.reset}`);
console.log(`  Blockers:  ${blockers}`);
console.log(`  Warnings:  ${warnings}`);
console.log(`  Operator:  ${operator}`);
console.log(`  Sprint:    ${sprint || "not specified"}`);
console.log(`  Branch:    ${branch}`);
console.log(`  Mother:    ${mother.current}`);
console.log("");

if (blockers > 0) {
  console.log(`${colors.red}${colors.bold}[ORESHNIK] BLOCKED${colors.reset}`);
  process.exit(1);
}

console.log(`${warnings > 0 ? colors.yellow : colors.green}${colors.bold}[ORESHNIK] OK${colors.reset}`);
console.log(`Close command: node scripts/oreshnik/close-sprint.mjs --sprint ${sprint || "SXX"} --operator ${operator} --desc "${desc}"`);

if (dryRun) {
  const taskBoard = readJson(join(ROOT, "var", "oreshnik", "task-board.json"), { tasks: [] });
  const chosenTask = sprint
    ? taskBoard.tasks.find((task) => task.id === sprint)
    : taskBoard.tasks.find((task) => task.status === "assigned")
      || taskBoard.tasks.find((task) => task.status === "ready" && task.owner === operator)
      || taskBoard.tasks.find((task) => task.status === "ready");
  const recommendedSprint = chosenTask?.id || sprint || "S-HC-PROD-00";
  const recommendedOwner = chosenTask?.owner || operator;
  const recommendedBranch = chosenTask?.branch || `${recommendedOwner}/${sanitize(recommendedSprint)}-${sanitize(desc)}-${today()}`;
  console.log("");
  console.log(JSON.stringify({
    ok: true,
    operator,
    mode: "dry-run",
    assignmentSource: "oreshnik",
    recommendedSprint,
    recommendedOwner,
    branch: recommendedBranch,
    status: chosenTask?.status || "unregistered",
    dependencies: chosenTask?.dependsOn || [],
    currentBranch: branch,
    mother: mother.current,
    publishAllowed: false,
    approvalRequired: recommendedSprint === "S-HC-PUB-01" || recommendedSprint === "S-HC-PROD-05",
    warnings,
    blockers
  }, null, 2));
}
