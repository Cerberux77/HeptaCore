#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import {
  EVENTS_DIR,
  RUNS_DIR,
  ROOT,
  colors,
  currentBranch,
  getArg,
  hasFlag,
  log,
  nowVet,
  porcelainPath,
  readJson,
  resolveArgs,
  statusPorcelain,
  writeJson
} from "./lib.mjs";

const DRIFT_LOG = join(RUNS_DIR, "drift-log.json");
const DRIFT_MODE = join(RUNS_DIR, ".drift-mode.json");
const ZONE_MAP = join(ROOT, "docs", "07_handoffs", "zone-map.json");
const TASK_BOARD = join(RUNS_DIR, "task-board.json");

const CRITICAL_PATTERNS = [
  /^packages\/db\//,
  /^\.env($|\.)/,
  /^apps\/web\/middleware\./,
  /^apps\/web\/proxy\./,
  /^package\.json$/,
  /^apps\/web\/app\/api\/auth\//,
  /^apps\/web\/lib\/auth/,
  /^packages\/db\/prisma\//
];

function logDrift(type, message) {
  const color = type === "OK" ? colors.green : type === "WARN" ? colors.yellow : colors.cyan;
  console.log(`  [DRIFT ${color}${type.padEnd(4)}${colors.reset}] ${message}`);
}

function resolveParentSprint() {
  const sprintFlag = getArg("--sprint");
  if (sprintFlag) return sprintFlag;

  const branch = currentBranch();
  const match = branch.match(/\/s-hc-([a-z0-9]+(?:-[a-z0-9]+)*?)(?:-202\d|-[a-z]{3,}|$)/i);
  if (match) {
    const suffix = match[1].toUpperCase().replace(/-PROD-/g, "-PROD_").replace(/-MAINT-/g, "-MAINT_").replace(/-RELEASE-/g, "-RELEASE_");
    if (suffix.includes("PROD_")) return `S-HC-${suffix}`;
    if (suffix.includes("MAINT_")) return `S-HC-${suffix}`;
    if (suffix.includes("RELEASE_")) return `S-HC-${suffix}`;
    return `S-HC-${suffix}`;
  }
  return "UNKNOWN";
}

function getChangedFilesDetailed() {
  const porcelain = statusPorcelain();
  const files = [];
  for (const line of porcelain) {
    const status = line.slice(0, 2).trim();
    const file = porcelainPath(line);
    if (file.startsWith("var/oreshnik/") || file.startsWith("output/")) continue;
    files.push({ status, file });
  }
  return files;
}

function computeDriftScore(files) {
  let score = 0;
  const details = [];

  const count = files.length;
  if (count >= 10) score += 3;
  else if (count >= 5) score += 2;
  else if (count >= 1) score += 1;
  details.push(`${count} file(s)`);

  const newFiles = files.filter((f) => f.status === "??" || f.status === "A");
  if (newFiles.length > 0) { score += 2; details.push(`${newFiles.length} new`); }

  const deleted = files.filter((f) => f.status === "D");
  if (deleted.length > 0) { score += 2; details.push(`${deleted.length} deleted`); }

  let criticalCount = 0;
  for (const f of files) {
    for (const pattern of CRITICAL_PATTERNS) {
      if (pattern.test(f.file)) { criticalCount++; break; }
    }
  }
  if (criticalCount > 0) { score += 2; details.push(`${criticalCount} critical`); }

  const zoneViolations = checkZoneViolations(files.map((f) => f.file));
  if (zoneViolations.length > 0) { score += 1; details.push(`${zoneViolations.length} zone mismatch`); }

  return { score: Math.min(score, 10), details };
}

function checkZoneViolations(files) {
  if (!existsSync(ZONE_MAP)) return [];
  const zoneMap = JSON.parse(readFileSync(ZONE_MAP, "utf8"));
  const violations = [];

  function globToRegex(glob) {
    const token = "__DOUBLE_STAR__";
    const escaped = glob
      .replaceAll("**", token)
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replaceAll("*", "[^/]*")
      .replaceAll(token, ".*");
    return new RegExp(`^${escaped}$`);
  }

  const sprint = getArg("--sprint");
  for (const file of files) {
    let inZone = false;
    for (const [pattern, zone] of Object.entries(zoneMap.zones)) {
      if (!globToRegex(pattern).test(file)) continue;
      inZone = true;
      if (zone.sprints?.includes("*")) break;
      if (sprint && zone.sprints?.includes(sprint)) break;
      violations.push(file);
      break;
    }
    if (!inZone) violations.push(file);
  }
  return violations;
}

function readDriftLog() {
  return readJson(DRIFT_LOG, { entries: [], lastId: 0 });
}

function readDriftMode() {
  return readJson(DRIFT_MODE, { mode: null, sessionBranch: "", setAt: "" });
}

function registerDriftEntry({ mode, title, description, parentSprint, operator, changedFiles }) {
  const vet = nowVet();
  const log = readDriftLog();
  const nextId = (log.lastId || 0) + 1;
  const id = `S-HC-DRIFT-${String(nextId).padStart(3, "0")}`;

  const zones = [...new Set(changedFiles.map((f) => {
    const parts = f.file.split("/");
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    return parts[0];
  }))];

  const entry = {
    id,
    title: title || description,
    operator,
    status: "recorded",
    mode,
    parentSprint,
    parentBranch: currentBranch(),
    date: vet.date,
    at: vet.iso,
    description,
    zones,
    changedFiles: changedFiles.map((f) => `${f.status} ${f.file}`),
    fileCount: changedFiles.length
  };

  log.entries.push(entry);
  log.lastId = nextId;
  writeJson(DRIFT_LOG, log);
  addToTaskBoard(entry);

  const eventPath = join(EVENTS_DIR, `${vet.date}_${id}_DRIFT_RECORDED.json`);
  writeJson(eventPath, entry);

  logDrift("OK", `Drift ${id} registered: ${entry.title}`);
  return entry;
}

function addToTaskBoard(entry) {
  if (!existsSync(TASK_BOARD)) return;
  const board = readJson(TASK_BOARD, null);
  if (!board?.tasks) return;

  if (board.tasks.find((t) => t.id === entry.id)) return;

  board.tasks.push({
    id: entry.id,
    title: entry.title,
    owner: entry.operator,
    backupOwner: entry.operator,
    status: "done",
    track: "ad-hoc",
    zone: entry.zones,
    dependsOn: entry.parentSprint !== "UNKNOWN" ? [entry.parentSprint] : [],
    acceptance: [`Ad-hoc: ${entry.description}`],
    handoff: `Drift registered via preflight on ${entry.date}. Mode: ${entry.mode}.`,
    history: [{
      at: entry.at,
      action: "drift-recorded",
      operator: entry.operator,
      mode: entry.mode,
      description: entry.description
    }]
  });

  board.updatedAt = entry.at;
  writeJson(TASK_BOARD, board);
  logDrift("OK", `Added ${entry.id} to task board.`);
}

// ─── INTERACTIVE PROMPT ───

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function promptChoice(files, score, details) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log("");
  console.log(`${colors.bold}${colors.yellow}=== Oreshnik Drift Detection ===${colors.reset}`);
  console.log(`  ${colors.yellow}Unplanned changes detected outside current sprint scope.${colors.reset}`);
  console.log(`  Files: ${details.join(" | ")}`);
  console.log(`  Relevance score: ${score}/10 (threshold: 3)`);
  console.log("");
  console.log(`  ${colors.bold}[1]${colors.reset} Silently record as ad-hoc sprint`);
  console.log(`  ${colors.bold}[2]${colors.reset} Record with description`);
  console.log(`  ${colors.bold}[3]${colors.reset} Auto-record all drifts this session (silent)`);
  console.log(`  ${colors.bold}[4]${colors.reset} Ignore this drift`);
  console.log(`  ${colors.bold}[5]${colors.reset} Ignore all drifts this session`);
  console.log(`  ${colors.bold}[6]${colors.reset} Cancel (block preflight)`);
  console.log("");

  let choice;
  while (true) {
    choice = (await ask(rl, "  Choice [1-6]: ")).trim();
    if (/^[1-6]$/.test(choice)) break;
    console.log(`  ${colors.red}Invalid. Enter 1-6.${colors.reset}`);
  }

  if (choice === "2") {
    const desc = await ask(rl, "  Description: ");
    rl.close();
    return { choice: 2, desc: desc.trim() };
  }

  rl.close();
  return { choice: parseInt(choice), desc: "" };
}

// ─── MAIN ───

async function main() {
  const { operator, desc: argDesc } = resolveArgs();
  const title = getArg("--title") || "";
  const desc = getArg("--desc") || argDesc || title || "";
  const mode = getArg("--mode") || "";
  const checkOnly = hasFlag("--check");

  if (checkOnly) {
    const log = readDriftLog();
    console.log("");
    console.log(`${colors.bold}Oreshnik Drift Log${colors.reset}`);
    if (log.entries.length === 0) {
      console.log("  No drift entries recorded.");
    } else {
      for (const e of log.entries) {
        console.log(`  ${e.id.padEnd(18)} ${e.date} ${e.operator.padEnd(8)} ${e.title}`);
      }
    }
    console.log("");
    process.exit(0);
  }

  // Explicit drift registration from CLI
  if (mode === "silent" || mode === "explicit") {
    const parentSprint = resolveParentSprint();
    const changedFiles = getChangedFilesDetailed();
    const entry = registerDriftEntry({
      mode,
      title: title || desc || "unplanned work",
      description: desc || title || "unplanned work",
      parentSprint,
      operator,
      changedFiles
    });
    if (mode === "explicit") {
      console.log("");
      console.log(`${colors.bold}DRIFT RECORDED: ${entry.id}${colors.reset}`);
      console.log(`  Title:    ${entry.title}`);
      console.log(`  Operator: ${entry.operator}`);
      console.log(`  Parent:   ${entry.parentSprint}`);
      console.log(`  Files:    ${entry.fileCount}`);
      console.log("");
    }
    process.exit(0);
  }

  // Interactive drift check (called from preflight)
  const changedFiles = getChangedFilesDetailed();
  if (changedFiles.length === 0) process.exit(0);

  const { score, details } = computeDriftScore(changedFiles);
  if (score < 3) process.exit(0);

  const currentMode = readDriftMode();
  const sessionBranch = currentBranch();

  if (currentMode.sessionBranch === sessionBranch) {
    if (currentMode.mode === "silent") {
      registerDriftEntry({
        mode: "silent",
        title: "auto-drift",
        description: `Auto-recorded: ${details.join(" | ")}`,
        parentSprint: resolveParentSprint(),
        operator,
        changedFiles
      });
      process.exit(0);
    }
    if (currentMode.mode === "ignore") {
      process.exit(0);
    }
  }

  const { choice, desc: promptDesc } = await promptChoice(changedFiles, score, details);

  switch (choice) {
    case 1:
      registerDriftEntry({
        mode: "silent",
        title: `drift: ${details[0]}`,
        description: `Silent drift: ${details.join(" | ")}`,
        parentSprint: resolveParentSprint(),
        operator,
        changedFiles
      });
      break;
    case 2:
      registerDriftEntry({
        mode: "explicit",
        title: promptDesc || `drift: ${details[0]}`,
        description: promptDesc || `Drift: ${details.join(" | ")}`,
        parentSprint: resolveParentSprint(),
        operator,
        changedFiles
      });
      break;
    case 3:
      writeJson(DRIFT_MODE, { mode: "silent", sessionBranch, setAt: nowVet().iso });
      registerDriftEntry({
        mode: "silent",
        title: `session-drift: ${details[0]}`,
        description: `Session silent mode: ${details.join(" | ")}`,
        parentSprint: resolveParentSprint(),
        operator,
        changedFiles
      });
      logDrift("WARN", "All future drifts this session will be silently recorded.");
      break;
    case 4:
      logDrift("INFO", "Drift ignored for this occurrence.");
      break;
    case 5:
      writeJson(DRIFT_MODE, { mode: "ignore", sessionBranch, setAt: nowVet().iso });
      logDrift("WARN", "All future drifts this session will be ignored.");
      break;
    case 6:
      logDrift("FAIL", "Drift detection blocked. Resolve manually.");
      process.exit(1);
  }

  console.log("");
  process.exit(0);
}

main().catch((err) => {
  console.error(`${colors.red}FATAL: ${err.message}${colors.reset}`);
  process.exit(1);
});
