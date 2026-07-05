#!/usr/bin/env node
import { colors, log, porcelainPath, statusPorcelain } from "./lib.mjs";

const IGNORED_PREFIXES = [
  "var/oreshnik/",
  "var/goal-runner/",
  "output/",
];

const IGNORED_EXACT = new Set([
  ".DS_Store",
]);

const CRITICAL_PATTERNS = [
  /^packages\/db\//,
  /^\.env($|\.)/,
  /^apps\/web\/middleware\./,
  /^apps\/web\/proxy\./,
  /^package\.json$/,
  /^apps\/web\/app\/api\/auth\//,
  /^apps\/web\/lib\/auth/,
  /^packages\/db\/prisma\//,
];

function isIgnored(path) {
  if (IGNORED_EXACT.has(path)) return true;
  return IGNORED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function readChanges() {
  return statusPorcelain()
    .map((line) => ({
      status: line.slice(0, 2).trim() || "??",
      path: porcelainPath(line),
    }))
    .filter((entry) => entry.path && !isIgnored(entry.path));
}

function isCritical(path) {
  return CRITICAL_PATTERNS.some((pattern) => pattern.test(path));
}

function summarize(changes) {
  const critical = changes.filter((entry) => isCritical(entry.path));
  const nonCritical = changes.filter((entry) => !isCritical(entry.path));
  return { critical, nonCritical };
}

function printSection(title, entries, color) {
  if (entries.length === 0) return;
  console.log(`${color}${title}${colors.reset}`);
  for (const entry of entries) {
    console.log(`  ${entry.status.padEnd(2)} ${entry.path}`);
  }
}

function main() {
  const changes = readChanges();

  console.log("");
  console.log(`${colors.bold}ORESHNIK DRIFT CI${colors.reset}`);
  console.log(`  Non-interactive drift check for cloud CI.`);
  console.log("");

  if (changes.length === 0) {
    log("OK", "No uncommitted drift detected outside ignored runtime/artifact paths.");
    console.log("");
    process.exit(0);
  }

  const { critical, nonCritical } = summarize(changes);

  if (critical.length > 0) {
    log("FAIL", `Critical uncommitted drift detected (${critical.length} path(s)).`);
    printSection("Critical drift:", critical, colors.red);
    if (nonCritical.length > 0) {
      printSection("Additional non-critical drift:", nonCritical, colors.yellow);
    }
    console.log("");
    process.exit(1);
  }

  log("OK", `No critical drift detected. Non-critical changes: ${nonCritical.length}.`);
  printSection("Non-critical drift:", nonCritical, colors.yellow);
  console.log("");
  process.exit(0);
}

main();
