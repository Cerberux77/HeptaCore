#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  colors,
  currentBranch,
  discoverLatestMother,
  getArg,
  git,
  isMotherBranch,
  log,
  nonIgnoredDirtyFiles,
  nowVet,
  readMother,
  resolveMother,
  resolveOperator,
  ROOT,
  RUNS_DIR,
  sanitize,
  sh,
  today,
  writeJson
} from "./lib.mjs";

const sprint = getArg("--sprint");
const operator = resolveOperator(getArg("--operator"));
const desc = getArg("--desc", "sprint");
const vet = nowVet();
let mother = readMother();

console.log("");
console.log(`${colors.bold}==============================================${colors.reset}`);
console.log(`${colors.bold}  HEPTACORE ORESHNIK PREFLIGHT${colors.reset}`);
console.log(`${colors.bold}  ${vet.iso}${colors.reset}`);
console.log(`${colors.bold}==============================================${colors.reset}`);
console.log("");

let blockers = 0;
let warnings = 0;
let branch = currentBranch();
let dirty = nonIgnoredDirtyFiles();

log("INFO", `Operator: ${operator}`);
log("INFO", `Sprint: ${sprint || "not specified"}`);
log("INFO", `Current branch: ${branch}`);
log("INFO", `Dynamic mother: ${mother.current} (v${mother.version})`);

console.log("");
log("INFO", "1/9 Remote sync and mother availability");
git(["fetch", "origin", "--prune", "--quiet"], { allowFail: true });
const remoteSync = syncCurrentBranch();
if (remoteSync.blocked) blockers++;
branch = currentBranch();
dirty = nonIgnoredDirtyFiles();

mother = resolveMother();
const latestMother = discoverLatestMother();
if (latestMother && latestMother.version > (mother.version || 0)) {
  if (dirty.length > 0) {
    log("FAIL", `Remote mother ${latestMother.name} is newer than declared ${mother.current}, but working tree is dirty. Commit/stash first.`);
    blockers++;
  } else {
    log("WARN", `Remote mother ${latestMother.name} is newer than declared ${mother.current}. Attempting automatic canonical sync.`);
    const sync = sh("node scripts/oreshnik/sync-latest-mother.mjs");
    console.log(sync);
    const syncPlain = sync.replace(/\x1b\[[0-9;]*m/g, "");
    if (syncPlain.includes("[ FAIL")) {
      blockers++;
    } else {
      mother = resolveMother();
      branch = currentBranch();
      dirty = nonIgnoredDirtyFiles();
    }
  }
}
const originMother = git(["rev-parse", "--verify", `origin/${mother.current}`], { allowFail: true });
const localMother = git(["rev-parse", "--verify", mother.current], { allowFail: true });
if (originMother.ok || localMother.ok) log("OK", "Mother branch is available locally or remotely.");
else {
  log("WARN", `Mother branch '${mother.current}' not found yet. Effective mother: ${mother.effective}.`);
  warnings++;
}

console.log("");
log("INFO", "2/9 Working tree");
{
  log("INFO", "Checking Obsidian vault lock...");
  const obsGuard = sh("node scripts/oreshnik/obsidian-guard.mjs --force");
  const obsPlain = obsGuard.replace(/\x1b\[[0-9;]*m/g, "");
  if (obsPlain.includes("[ FAIL")) {
    console.log(obsGuard);
    log("FAIL", "Obsidian vault lock detected and could not be resolved. Close Obsidian manually.");
    blockers++;
  } else {
    // Don't print full output for OK to keep output clean
    if (obsPlain.includes("[ WARN")) console.log(obsGuard);
  }
}
if (dirty.length > 0) {
  log("WARN", `${dirty.length} changed file(s). Preflight will not auto-switch branches while dirty.`);
  warnings++;
} else {
  log("OK", "Working tree clean.");
}

console.log("");
log("INFO", "3/9 Branch management");
if (sprint) {
  const expected = `${operator}/${sanitize(sprint)}-${sanitize(desc)}-${today()}`;
  if (isMotherBranch(branch)) {
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
log("INFO", "4/9 Zone check");
if (sprint) {
  const zone = sh(`node scripts/oreshnik/zone-check.mjs --sprint ${sprint} --operator ${operator}`);
  const zonePlain = zone.replace(/\x1b\[[0-9;]*m/g, "");
  if (zonePlain.includes("[ FAIL")) {
    console.log(zone);
    blockers++;
  } else {
    console.log(zone);
  }
} else {
  log("INFO", "Skipped because --sprint was not provided.");
}

console.log("");
log("INFO", "5/9 Canonical assignment/doc alignment");
{
  const canonical = sh(`node scripts/oreshnik/canonical-check.mjs --sprint ${sprint || ""} --operator ${operator}`);
  const canonicalPlain = canonical.replace(/\x1b\[[0-9;]*m/g, "");
  if (canonicalPlain.includes("[ FAIL")) {
    console.log(canonical);
    blockers++;
  } else {
    console.log(canonical);
  }
}

console.log("");
log("INFO", "6/9 Environment and secrets");
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
log("INFO", "7/9 Build checks available");
const pkg = existsSync(join(ROOT, "package.json"));
const prisma = existsSync(join(ROOT, "packages", "db", "prisma", "schema.prisma"));
if (pkg) log("OK", "package.json present.");
if (prisma) log("OK", "Prisma schema present.");

console.log("");
log("INFO", "8/9 Remote alignment summary");
log("OK", remoteSync.message);

console.log("");
log("INFO", "9/9 Session ledger");
mkdirSync(RUNS_DIR, { recursive: true });
writeJson(join(RUNS_DIR, ".last-preflight.json"), {
  sprint: sprint || null,
  operator,
  branch,
  mother: mother.current,
  effectiveMother: mother.effective,
  dirtyCount: dirty.length,
  blockers,
  warnings,
  at: vet.iso
});
writeFileSync(join(RUNS_DIR, ".session-start"), vet.iso, "utf8");
log("OK", "Preflight ledger updated.");

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

function syncCurrentBranch() {
  if (!branch || branch === "DETACHED") {
    log("WARN", "Detached HEAD; cannot compare against origin branch.");
    warnings++;
    return { blocked: false, message: "Detached HEAD; remote branch sync skipped." };
  }

  const remoteRef = `origin/${branch}`;
  const remoteExists = git(["rev-parse", "--verify", remoteRef], { allowFail: true });
  if (!remoteExists.ok) {
    log("WARN", `Remote branch ${remoteRef} not found yet. It will be created on close.`);
    warnings++;
    return { blocked: false, message: `Remote branch ${remoteRef} not found.` };
  }

  const localSha = git(["rev-parse", "HEAD"], { allowFail: false }).output;
  const remoteSha = git(["rev-parse", remoteRef], { allowFail: false }).output;
  if (localSha === remoteSha) {
    log("OK", `Local branch is aligned with ${remoteRef}.`);
    return { blocked: false, message: `Local branch aligned with ${remoteRef}.` };
  }

  const base = git(["merge-base", "HEAD", remoteRef], { allowFail: true }).output;
  if (!base) {
    log("FAIL", `Cannot find merge base with ${remoteRef}. Manual review required.`);
    return { blocked: true, message: `No merge base with ${remoteRef}.` };
  }

  if (base === localSha) {
    if (dirty.length > 0) {
      log("FAIL", `Local branch is behind ${remoteRef}, but working tree has ${dirty.length} changed file(s). Commit/stash first.`);
      return { blocked: true, message: `Behind ${remoteRef}; dirty tree prevents fast-forward.` };
    }
    git(["merge", "--ff-only", remoteRef], { allowFail: false });
    log("OK", `Fast-forwarded local branch from ${remoteRef}.`);
    return { blocked: false, message: `Fast-forwarded from ${remoteRef}.` };
  }

  if (base === remoteSha) {
    log("OK", `Local branch is ahead of ${remoteRef}; close will push it.`);
    return { blocked: false, message: `Local branch ahead of ${remoteRef}.` };
  }

  log("FAIL", `Local branch diverged from ${remoteRef}. Rebase/merge manually before working.`);
  return { blocked: true, message: `Diverged from ${remoteRef}.` };
}
