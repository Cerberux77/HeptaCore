#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  currentBranch,
  getArg,
  git,
  nonIgnoredDirtyFiles,
  readJson,
  ROOT,
  RUNS_DIR
} from "./lib.mjs";

const candidate = getArg("--candidate", "S-HC-PUB-01");
const requestedOwner = getArg("--owner", "");
const dryRun = process.argv.includes("--dry-run");

function exists(relativePath) {
  return existsSync(join(ROOT, relativePath));
}

function readText(relativePath) {
  const path = join(ROOT, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function isStarterVaultOnly(file) {
  return file === "docs/Heptacore" || file.startsWith("docs/Heptacore/");
}

const branch = currentBranch();
const dirtyFiles = nonIgnoredDirtyFiles();
const blockingDirtyFiles = dirtyFiles.filter((file) => !isStarterVaultOnly(file));
const recentCommits = git(["log", "--oneline", "-5"], { allowFail: true }).output
  .split(/\r?\n/)
  .filter(Boolean);

const zoneMap = readJson(join(ROOT, "docs", "07_handoffs", "zone-map.json"), null);
const taskBoard = readJson(join(ROOT, "var", "oreshnik", "task-board.json"), { tasks: [] });
const lastPreflight = readJson(join(RUNS_DIR, ".last-preflight.json"), null);
const sprintEvents = git(["ls-files", "var/sprint-events"], { allowFail: true }).output
  .split(/\r?\n/)
  .filter(Boolean)
  .slice(-5);

const docsState = {
  central: exists("docs/obsidian-vault/00_CENTRAL_HEPTACORE.md"),
  index: exists("docs/obsidian-vault/00_INDICE_MAESTRO.md"),
  methodology: exists("docs/obsidian-vault/METODOLOGIA/METODOLOGIA_ORESHNIK_HEPTACORE.md"),
  controlBus: exists("docs/obsidian-vault/METODOLOGIA/ORESHNIK_CONTROL_BUS.md"),
  allocationProtocol: exists("docs/obsidian-vault/METODOLOGIA/TASK_ALLOCATION_PROTOCOL.md"),
  publishingSafety: exists("docs/obsidian-vault/METODOLOGIA/PUBLISHING_SAFETY_PROTOCOL.md"),
  tenantState: exists("docs/obsidian-vault/TENANTS/TURPIAL_SOUND/TENANT_STATUS.md")
};

const centralText = readText("docs/obsidian-vault/00_CENTRAL_HEPTACORE.md");
const publishBlocked = /Publicacion RRSS real\s*\|\s*Bloqueada/i.test(centralText) ||
  /publicacion real sigue bloqueada/i.test(centralText);

const taskFromBoard = taskBoard.tasks.find((task) => task.id === candidate);
const candidateDefinitions = {
  "S-HC-PUB-01": {
    sprint: "S-HC-PUB-01",
    title: "Turpial Sound first controlled publishing discovery and dry-run",
    recommendedOwner: "Jean",
    agent: "Codex",
    branch: "Jean/s-hc-pub-01-turpial-controlled-publishing-2026-06-09",
    risk: "medium",
    approvalRequired: true,
    allowedFiles: [
      "docs/obsidian-vault/TENANTS/TURPIAL_SOUND/**",
      "docs/obsidian-vault/COLABORADORES/**",
      "docs/07_handoffs/S-HC-PUB-01_HANDOFF.md"
    ],
    inspectOnlyFiles: [
      "apps/worker/**",
      "examples/tenants/turpial/content/**",
      "scripts/verify-turpial-oauth-vault.mjs",
      "scripts/verify-turpial-facebook-vault.mjs"
    ],
    prohibitedFiles: [
      ".env",
      ".env.*",
      "packages/db/**",
      "apps/web/app/api/oauth/**",
      "packages/integrations/**"
    ],
    validations: [
      "git status --short",
      "git branch --show-current",
      "git log --oneline -5",
      "npm run typecheck",
      "npm run build",
      "npm run worker:validate",
      "node .\\scripts\\verify-turpial-oauth-vault.mjs",
      "node .\\scripts\\verify-turpial-facebook-vault.mjs"
    ],
    stopCriteria: [
      "real publishing attempted",
      "token or secret appears in chat, logs, or diff",
      "DATABASE_URL or vault access unavailable for verification",
      "dirty critical file outside assigned scope",
      "Manuel approval missing for publish gate"
    ]
  }
};

const definition = candidateDefinitions[candidate] || {
  sprint: candidate,
  title: taskFromBoard?.title || "Unregistered candidate",
  recommendedOwner: taskFromBoard?.owner || requestedOwner || "Unassigned",
  agent: "Codex",
  branch: `${taskFromBoard?.owner || requestedOwner || "Owner"}/${candidate.toLowerCase()}-assignment`,
  risk: "unknown",
  approvalRequired: true,
  allowedFiles: [],
  inspectOnlyFiles: [],
  prohibitedFiles: [".env", ".env.*"],
  validations: ["npm run typecheck", "npm run build", "npm run worker:validate"],
  stopCriteria: ["candidate not registered in preflight-assignment script"]
};

const blockers = [];
const warnings = [];

if (blockingDirtyFiles.length > 0) blockers.push(`Dirty working tree outside ignored starter vault: ${blockingDirtyFiles.join(", ")}`);
if (!zoneMap?.zones) blockers.push("Missing or invalid docs/07_handoffs/zone-map.json");
if (!docsState.central || !docsState.index || !docsState.methodology) blockers.push("Canonical docs index/state incomplete");
if (!publishBlocked) blockers.push("Central docs do not show real publishing as blocked");
if (requestedOwner && requestedOwner !== definition.recommendedOwner) {
  warnings.push(`Requested owner ${requestedOwner} differs from Oreshnik recommended owner ${definition.recommendedOwner}`);
}
if (dirtyFiles.some(isStarterVaultOnly)) warnings.push("Untracked docs/Heptacore starter vault detected and ignored for allocation");
if (!lastPreflight) warnings.push("No .last-preflight.json found; run npm run oreshnik:preflight first");
else if (lastPreflight.blockers > 0) blockers.push("Last Oreshnik preflight had blockers");

const ok = blockers.length === 0;
const packet = {
  ok,
  dryRun,
  candidate,
  sprint: definition.sprint,
  title: definition.title,
  recommendedOwner: definition.recommendedOwner,
  requestedOwner: requestedOwner || null,
  agent: definition.agent,
  branch: definition.branch,
  currentBranch: branch,
  risk: definition.risk,
  publishAllowed: false,
  approvalRequired: definition.approvalRequired,
  assignmentStatus: dryRun ? "recommended_pending_formal_assignment" : "assigned_by_oreshnik",
  allowedFiles: definition.allowedFiles,
  inspectOnlyFiles: definition.inspectOnlyFiles,
  prohibitedFiles: definition.prohibitedFiles,
  validations: definition.validations,
  stopCriteria: definition.stopCriteria,
  preflight: lastPreflight,
  docsState,
  zoneMapPresent: Boolean(zoneMap?.zones),
  taskBoardCandidatePresent: Boolean(taskFromBoard),
  recentCommits,
  recentSprintEvents: sprintEvents,
  warnings,
  blockers
};

console.log(JSON.stringify(packet, null, 2));
process.exit(ok ? 0 : 1);
