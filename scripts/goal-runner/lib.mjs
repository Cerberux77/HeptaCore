import { createHash, randomBytes } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve as pathResolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = pathResolve(__dirname, "..", "..");

export function resolveRoot() {
  return process.env.GOAL_RUNNER_TEST_ROOT || DEFAULT_ROOT;
}

function grDir() { return join(resolveRoot(), "var", "goal-runner"); }
function goalsDir() { return join(grDir(), "goals"); }
function historyDir() { return join(grDir(), "history"); }
function lockFile() { return join(grDir(), ".active-worktree.json"); }
function indexFile() { return join(grDir(), "index.json"); }
function schemaPath() { return join(resolveRoot(), "scripts", "goal-runner", "schema.json"); }

export const ALLOWED_STATUSES = ["DRAFT", "READY", "ACTIVE", "PAUSED", "BLOCKED_EXTERNAL", "COMPLETED", "ABORTED_CRITICAL_DEVIATION"];
export const TERMINAL_STATUSES = ["COMPLETED", "ABORTED_CRITICAL_DEVIATION"];
export const RESUMABLE_STATUSES = ["PAUSED", "BLOCKED_EXTERNAL"];
export const GATE_CONFIGURABLE_STATUSES = ["DRAFT", "READY"];

export const ALLOWED_TRANSITIONS = new Map([
  ["DRAFT", ["READY", "ABORTED_CRITICAL_DEVIATION"]],
  ["READY", ["ACTIVE", "ABORTED_CRITICAL_DEVIATION"]],
  ["ACTIVE", ["PAUSED", "BLOCKED_EXTERNAL", "COMPLETED", "ABORTED_CRITICAL_DEVIATION"]],
  ["PAUSED", ["ACTIVE", "ABORTED_CRITICAL_DEVIATION"]],
  ["BLOCKED_EXTERNAL", ["ACTIVE", "ABORTED_CRITICAL_DEVIATION"]],
  ["COMPLETED", []],
  ["ABORTED_CRITICAL_DEVIATION", []]
]);

export const GATE_ALLOWLIST = {
  "diff-check": { command: "git", args: ["diff", "--check"], timeout: 30000 },
  "typecheck": { command: "npm", args: ["run", "typecheck"], timeout: 120000 },
  "test": { command: "npm", args: ["run", "test"], timeout: 300000 },
  "build": { command: "npm", args: ["run", "build"], timeout: 300000 },
  "worker-validate": { command: "npm", args: ["run", "worker:validate"], timeout: 120000 },
  "oreshnik-reconcile": { command: "node", args: ["scripts/oreshnik/canonical-check.mjs"], timeout: 60000 },
  "oreshnik-drift": { command: "node", args: ["scripts/oreshnik/drift.mjs", "--check"], timeout: 30000 },
  "pub04-contract": { command: "node", args: ["scripts/goal-runner/pub04-contract-gate.mjs"], timeout: 300000 }
};

export const EVIDENCE_TYPES = ["code", "ui", "integration"];

export const SENSITIVE_PATTERNS = [
  /\.env$/i, /\.env\./i,
  /credential/i, /secret/i, /token/i, /password/i,
  /key\.pem$/i, /key\.json$/i, /\.pem$/i
];

export const ID_PATTERN = /^GR-\d{8}T\d{6}Z-[a-f0-9]{8}-[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$/;

// ─── ID Generation ───

export function generateGoalId(title) {
  const now = new Date();
  const parts = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const date = parts.slice(0, 8);
  const time = parts.slice(9, 15);
  const rand = randomBytes(4).toString("hex");
  const slug = sanitizeSlug(title);
  return `GR-${date}T${time}Z-${rand}-${slug}`;
}

export function generateGoalIdWithTime(title, iso) {
  const now = new Date(iso);
  const parts = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const date = parts.slice(0, 8);
  const time = parts.slice(9, 15);
  const rand = randomBytes(4).toString("hex");
  const slug = sanitizeSlug(title);
  return `GR-${date}T${time}Z-${rand}-${slug}`;
}

export function generateHistoryId(event) {
  const now = new Date();
  const ms = String(now.getUTCMilliseconds()).padStart(3, "0");
  const ts = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z/, `${ms}Z`);
  const rand = randomBytes(2).toString("hex");
  const slug = sanitizeSlug(event);
  return `${ts}-${rand}-${slug}`;
}

export function sanitizeSlug(text) {
  return String(text || "goal")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "goal";
}

export function validateGoalId(id) {
  return ID_PATTERN.test(id);
}

export function validateNoPathTraversal(str) {
  if (typeof str !== "string") return false;
  if (str.includes("..")) return false;
  if (/[<>:"|?*\\\/%]/.test(str)) return false;
  if (/[\x00-\x1f]/.test(str)) return false;
  return true;
}

// ─── Runtime Validation ───

function loadSchema() {
  return JSON.parse(readFileSync(schemaPath(), "utf8"));
}

export function validateStateObject(state) {
  if (!state || typeof state !== "object") return { valid: false, reason: "State is not an object" };
  const required = ["goalId", "title", "owner", "sprintId", "status", "branch", "baseSha", "evidenceRequired", "validationGates", "createdAt", "updatedAt"];
  for (const key of required) {
    if (!(key in state)) return { valid: false, reason: `Missing required field: ${key}` };
  }
  if (!ALLOWED_STATUSES.includes(state.status)) return { valid: false, reason: `Invalid status: ${state.status}` };
  if (!EVIDENCE_TYPES.includes(state.evidenceRequired)) return { valid: false, reason: `Invalid evidenceRequired: ${state.evidenceRequired}` };
  if (!validateGoalId(state.goalId)) return { valid: false, reason: `Invalid goalId format: ${state.goalId}` };
  if (!Array.isArray(state.validationGates)) return { valid: false, reason: "validationGates must be an array" };
  if (!Array.isArray(state.transitions)) return { valid: false, reason: "transitions must be an array" };
  if (typeof state.title !== "string" || !state.title) return { valid: false, reason: "title must be a non-empty string" };
  if (typeof state.branch !== "string" || !state.branch) return { valid: false, reason: "branch must be a non-empty string" };
  if (typeof state.owner !== "string" || !state.owner) return { valid: false, reason: "owner must be a non-empty string" };
  if (typeof state.baseSha !== "string" || !state.baseSha) return { valid: false, reason: "baseSha must be a non-empty string" };
  return { valid: true };
}

export function validateLockObject(lock) {
  if (!lock || typeof lock !== "object") return { valid: false, reason: "Lock is not an object" };
  const required = ["goalId", "branch", "worktreeRoot", "owner", "startedAt"];
  for (const key of required) {
    if (!(key in lock)) return { valid: false, reason: `Missing required field: ${key}` };
  }
  if (!validateGoalId(lock.goalId)) return { valid: false, reason: `Invalid goalId: ${lock.goalId}` };
  if (typeof lock.branch !== "string" || !lock.branch) return { valid: false, reason: "branch must be a non-empty string" };
  return { valid: true };
}

export function validateIndexObject(index) {
  if (!index || typeof index !== "object") return { valid: false, reason: "Index is not an object" };
  if (index.version !== 1) return { valid: false, reason: "Index version must be 1" };
  if (!Array.isArray(index.goals)) return { valid: false, reason: "goals must be an array" };
  for (const g of index.goals) {
    if (!g.goalId || !g.title || !g.owner || !g.status || !g.branch) return { valid: false, reason: `Invalid index entry for ${g.goalId || "unknown"}` };
  }
  return { valid: true };
}

export function validateValidationObject(val) {
  if (!val || typeof val !== "object") return { valid: false, reason: "Validation is not an object" };
  if (!val.goalId) return { valid: false, reason: "Missing goalId" };
  if (val.evidence && !Array.isArray(val.evidence)) return { valid: false, reason: "evidence must be an array" };
  if (val.gates && !Array.isArray(val.gates)) return { valid: false, reason: "gates must be an array" };
  return { valid: true };
}

export function validateState(goalId) {
  const state = readState(goalId);
  if (!state) return { valid: false, reason: "State not found" };
  return validateStateObject(state);
}

// ─── State Machine ───

export function validateTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS.get(from);
  if (!allowed) return { valid: false, reason: `Unknown status: ${from}` };
  if (TERMINAL_STATUSES.includes(from)) return { valid: false, reason: `Status ${from} is terminal and immutable` };
  if (!allowed.includes(to)) return { valid: false, reason: `Transition ${from} -> ${to} is not allowed` };
  return { valid: true };
}

export function applyTransition(state, to, by) {
  const check = validateTransition(state.status, to);
  if (!check.valid) throw new Error(check.reason);
  const now = nowISO();
  state.previousStatus = state.status;
  state.status = to;
  state.updatedAt = now;
  if (!Array.isArray(state.transitions)) state.transitions = [];
  state.transitions.push({ from: state.previousStatus, to, at: now, by });
  return state;
}

// ─── Time ───

export function nowISO() {
  return new Date().toISOString();
}

// ─── File I/O ───

export function readJson(path) {
  try {
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stableStringify(value) + "\n", "utf8");
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

export function readState(goalId) {
  return readJson(join(goalsDir(), goalId, "state.json"));
}

export function writeState(goalId, state) {
  const check = validateStateObject(state);
  if (!check.valid) throw new Error(`Invalid state: ${check.reason}`);
  const dir = join(goalsDir(), goalId);
  ensureDir(dir);
  writeJson(join(dir, "state.json"), state);
}

export function readValidation(goalId) {
  return readJson(join(goalsDir(), goalId, "validation.json"));
}

export function writeValidation(goalId, validation) {
  const check = validateValidationObject(validation);
  if (!check.valid) throw new Error(`Invalid validation: ${check.reason}`);
  const dir = join(goalsDir(), goalId);
  ensureDir(dir);
  writeJson(join(dir, "validation.json"), validation);
}

// ─── Stable JSON serialization ───

export function stableStringify(value) {
  return JSON.stringify(value, (_, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const keys = Object.keys(v).sort();
      const ordered = {};
      for (const k of keys) ordered[k] = v[k];
      return ordered;
    }
    return v;
  }, 2);
}

// ─── Lock ───

export function readLock() {
  return readJson(lockFile());
}

export function createLock(goalId, branch, worktreeRoot, owner) {
  const existing = readLock();
  if (existing) {
    if (!isLockStale(existing)) throw new Error(`Worktree already locked by goal ${existing.goalId}`);
    removeLock();
  }
  const lock = {
    goalId,
    branch,
    worktreeRoot,
    owner,
    startedAt: nowISO(),
    pid: process.pid
  };
  const check = validateLockObject(lock);
  if (!check.valid) throw new Error(`Invalid lock: ${check.reason}`);
  ensureDir(grDir());
  writeJson(lockFile(), lock);
  return lock;
}

export function removeLock() {
  const lf = lockFile();
  if (existsSync(lf)) {
    try { unlinkSync(lf); } catch { /* ok */ }
  }
}

export function removeLockForGoal(goalId) {
  if (!goalId) return;
  const lock = readLock();
  if (!lock) return;
  if (lock.goalId === goalId) removeLock();
}

export function isLockStale(lock) {
  if (!lock) return true;
  const root = resolveRoot();
  if (lock.worktreeRoot !== root) return true;
  if (!lock.goalId || !validateGoalId(lock.goalId)) return true;
  const branch = currentBranch();
  if (lock.branch !== branch) return true;
  const state = readState(lock.goalId);
  if (!state) return true;
  if (state.status !== "ACTIVE") return true;
  if (state.goalId !== lock.goalId) return true;
  if (state.branch !== lock.branch) return true;
  return false;
}

// ─── Index ───

export function readIndex() {
  const idx = readJson(indexFile());
  if (idx) {
    const check = validateIndexObject(idx);
    if (!check.valid) return null;
  }
  return idx;
}

export function reindex() {
  const gd = goalsDir();
  ensureDir(gd);
  let goals;
  try {
    goals = readdirSync(gd, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== ".gitkeep")
      .map((d) => {
        const state = readState(d.name);
        if (!state) return null;
        const check = validateStateObject(state);
        if (!check.valid) return null;
        return {
          goalId: state.goalId,
          title: state.title,
          owner: state.owner,
          sprintId: state.sprintId,
          status: state.status,
          branch: state.branch,
          createdAt: state.createdAt,
          updatedAt: state.updatedAt
        };
      })
      .filter(Boolean);
  } catch {
    goals = [];
  }

  goals.sort((a, b) => {
    const ca = a.createdAt || "";
    const cb = b.createdAt || "";
    if (ca < cb) return -1;
    if (ca > cb) return 1;
    return (a.goalId || "").localeCompare(b.goalId || "");
  });

  const maxUpdatedAt = goals.reduce((max, g) => {
    if (!g.updatedAt) return max;
    if (!max) return g.updatedAt;
    return g.updatedAt > max ? g.updatedAt : max;
  }, null);

  const contentHash = computeContentHash(goals);

  const index = {
    version: 1,
    generatedFromStateUpdatedAt: maxUpdatedAt,
    contentHash: `sha256:${contentHash}`,
    goals
  };

  writeJson(indexFile(), index);
  return index;
}

export function computeContentHash(goals) {
  if (!goals || goals.length === 0) {
    return createHash("sha256").update("[]").digest("hex");
  }
  const keys = Object.keys(goals[0]).sort();
  const normalized = goals.map((g) => {
    const ordered = {};
    for (const k of keys) ordered[k] = g[k];
    return ordered;
  });
  return createHash("sha256").update(stableStringify(normalized)).digest("hex");
}

// ─── Evidence ───

export function validateEvidencePath(filePath) {
  if (!filePath || typeof filePath !== "string") return { valid: false, reason: "Path is required" };
  if (isAbsolute(filePath)) return { valid: false, reason: "Absolute paths are not allowed; use a path relative to the repo root" };
  if (filePath.includes("..")) return { valid: false, reason: "Path traversal detected" };

  const root = resolveRoot();
  const normalPath = pathResolve(root, filePath);
  const normalRoot = pathResolve(root);

  if (!normalPath.startsWith(normalRoot + sep)) return { valid: false, reason: "Path must resolve within the repo root" };

  const relPath = relative(root, normalPath).replace(/\\/g, "/");

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(relPath)) return { valid: false, reason: `Path matches sensitive pattern: ${relPath}` };
  }

  if (!existsSync(normalPath)) return { valid: false, reason: "File does not exist" };

  try {
    const stat = lstatSync(normalPath);
    if (stat.isSymbolicLink()) {
      const realPath = realpathSync(normalPath);
      if (!realPath.startsWith(normalRoot + sep)) return { valid: false, reason: "Symlink points outside repo" };
    }
    if (stat.isDirectory()) return { valid: false, reason: "Directories cannot be used as evidence" };
    if (!stat.isFile()) return { valid: false, reason: "Path is not a regular file" };
  } catch (err) {
    return { valid: false, reason: `Cannot stat file: ${err.message}` };
  }

  return { valid: true, relPath };
}

export function computeFileHash(filePath) {
  const content = readFileSync(filePath);
  const hash = createHash("sha256").update(content).digest("hex");
  return `sha256:${hash}`;
}

export function addEvidence(goalId, evidenceType, evidencePath) {
  if (!EVIDENCE_TYPES.includes(evidenceType)) throw new Error(`Invalid evidence type: ${evidenceType}. Must be one of: ${EVIDENCE_TYPES.join(", ")}`);

  const check = validateEvidencePath(evidencePath);
  if (!check.valid) throw new Error(`Invalid evidence path: ${check.reason}`);

  const root = resolveRoot();
  const fullPath = pathResolve(root, evidencePath);
  const hash = computeFileHash(fullPath);
  const relPath = check.relPath;

  const validation = readValidation(goalId) || { goalId, evidence: [], gates: [] };
  validation.evidence.push({
    type: evidenceType,
    path: relPath,
    hash,
    addedAt: nowISO()
  });

  writeValidation(goalId, validation);
  return validation;
}

export function validateEvidenceComplete(goalId, requiredType) {
  const validation = readValidation(goalId);
  if (!validation || !validation.evidence || validation.evidence.length === 0) {
    return { valid: false, reason: "No evidence submitted" };
  }
  const hasMatch = validation.evidence.some((e) => e.type === requiredType);
  if (!hasMatch) return { valid: false, reason: `No evidence of required type: ${requiredType}` };
  return { valid: true };
}

// ─── Plan validation ───

export function validatePlanFile(goalId, planPath) {
  if (!planPath) return { valid: false, reason: "Plan path is required" };
  if (isAbsolute(planPath)) return { valid: false, reason: "Absolute paths are not allowed" };
  if (planPath.includes("..")) return { valid: false, reason: "Path traversal detected" };

  const expectedDir = join("var", "goal-runner", "goals", goalId);
  if (!planPath.startsWith(expectedDir.replace(/\\/g, "/")) && !planPath.startsWith(expectedDir)) {
    return { valid: false, reason: `Plan must be inside ${expectedDir}` };
  }

  const root = resolveRoot();
  const fullPath = join(root, planPath);
  if (!existsSync(fullPath)) return { valid: false, reason: "Plan file does not exist" };

  try {
    const stat = lstatSync(fullPath);
    if (!stat.isFile()) return { valid: false, reason: "Plan path is not a regular file" };
    const content = readFileSync(fullPath, "utf8").trim();
    if (!content) return { valid: false, reason: "Plan file is empty" };
  } catch (err) {
    return { valid: false, reason: `Cannot read plan file: ${err.message}` };
  }

  return { valid: true };
}

// ─── Validation Gates ───

export const CMD_ALIASES = { npm: true, npx: true };

export function resolveGateSpawn(command, args) {
  if (process.platform === "win32" && CMD_ALIASES[command]) {
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/c", command, ...args]
    };
  }
  return { command, args };
}

export function validateGateIds(gateIds) {
  if (!Array.isArray(gateIds)) throw new Error("validationGates must be an array");
  for (const id of gateIds) {
    if (!GATE_ALLOWLIST[id]) throw new Error(`Unknown gate: ${id}. Allowed: ${Object.keys(GATE_ALLOWLIST).join(", ")}`);
  }
}

export function normalizeGateList(gateIds) {
  if (!gateIds || gateIds.length === 0) return [];
  const seen = new Set();
  return gateIds.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function setGates(goalId, gateIds) {
  validateGateIds(gateIds);
  const normalized = normalizeGateList(gateIds);
  const state = readState(goalId);
  if (!state) throw new Error("Goal not found");
  if (!GATE_CONFIGURABLE_STATUSES.includes(state.status)) {
    throw new Error(`Gates can only be set in ${GATE_CONFIGURABLE_STATUSES.join(" or ")} status (current: ${state.status})`);
  }
  state.validationGates = normalized;
  state.updatedAt = nowISO();
  writeState(goalId, state);
  return state;
}

export function runGate(gateId) {
  const gate = GATE_ALLOWLIST[gateId];
  if (!gate) throw new Error(`Unknown gate: ${gateId}`);

  const start = Date.now();
  try {
    const { command, args } = resolveGateSpawn(gate.command, gate.args);
    const result = spawnSync(command, args, {
      cwd: resolveRoot(),
      encoding: "utf8",
      timeout: gate.timeout,
      stdio: "pipe",
      shell: false
    });

    const durationMs = Date.now() - start;
    const stdout = (result.stdout || "").slice(0, 500);
    const stderr = (result.stderr || "").slice(0, 500);
    const summary = stdout || stderr || (result.status === 0 ? "OK" : `Exit code ${result.status}`);

    return {
      gate: gateId,
      passed: result.status === 0,
      exitCode: result.status ?? 1,
      durationMs,
      summary: summary.replace(/\n/g, " ").slice(0, 200)
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    return {
      gate: gateId,
      passed: false,
      exitCode: err.code === "ETIMEDOUT" ? 124 : 1,
      durationMs,
      summary: err.message.slice(0, 200)
    };
  }
}

export function runGates(goalId, gateIds) {
  validateGateIds(gateIds);
  const results = gateIds.map((id) => runGate(id));
  const validation = readValidation(goalId) || { goalId, evidence: [], gates: [] };
  validation.gates = results;
  writeValidation(goalId, validation);
  return results;
}

// ─── History ───

export function writeHistoryEvent(goalId, event, data) {
  const dir = join(historyDir(), goalId);
  ensureDir(dir);

  for (let attempt = 0; attempt < 10; attempt++) {
    const id = generateHistoryId(event);
    const path = join(dir, `${id}.json`);
    if (!existsSync(path)) {
      const record = { goalId, event, id, at: nowISO(), ...data };
      const sanitized = sanitizeHistoryData(record);
      writeJson(path, sanitized);
      return id;
    }
  }
  throw new Error("Failed to generate unique history ID after 10 attempts");
}

function sanitizeHistoryData(data) {
  const clean = { ...data };
  if (typeof clean.path === "string" && isAbsolute(clean.path)) delete clean.path;
  return clean;
}

// ─── Git Helpers ───

export function currentBranch() {
  try {
    return execFileSync("git", ["branch", "--show-current"], { cwd: resolveRoot(), encoding: "utf8" }).trim();
  } catch {
    return "UNKNOWN";
  }
}

export function currentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: resolveRoot(), encoding: "utf8" }).trim();
  } catch {
    return "UNKNOWN";
  }
}

// ─── Checking ───

export function getActiveGoal(branch) {
  const lock = readLock();
  if (lock && !isLockStale(lock)) {
    return { source: "lock", goalId: lock.goalId, status: "ACTIVE" };
  }

  const index = readIndex();
  if (index && Array.isArray(index.goals)) {
    const resumable = index.goals.filter(
      (g) => RESUMABLE_STATUSES.includes(g.status) && g.branch === branch
    );
    if (resumable.length > 0) {
      return { source: "index", goals: resumable };
    }
  }

  return null;
}

// ─── Doctor ───

export function doctorCheck() {
  const errors = [];
  const warnings = [];
  const info = [];
  const root = resolveRoot();
  const branch = currentBranch();

  doctorValidateWorktree(root, branch, errors, warnings, info);
  doctorCheckIndexConsistency(root, errors, warnings);
  doctorCheckMandatoryFiles(root, errors, warnings, info);

  if (errors.length === 0 && info.length === 0) {
    info.push({ code: "DOCTOR-I001", severity: "info", message: "All systems healthy" });
  }

  return {
    healthy: errors.length === 0,
    worktree: root,
    branch,
    errors,
    warnings,
    info
  };
}

function doctorValidateWorktree(root, branch, errors, warnings, info) {
  const lock = readLock();

  if (lock) {
    const stale = isLockStale(lock);

    if (stale) {
      let reason = "";

      if (lock.worktreeRoot !== root) reason = `worktree root mismatch (lock: ${lock.worktreeRoot}, current: ${root})`;
      else if (!lock.goalId || !validateGoalId(lock.goalId)) reason = "lock has invalid goalId";
      else if (lock.branch !== branch) reason = `branch mismatch (lock: ${lock.branch}, current: ${branch})`;
      else {
        const lockState = readState(lock.goalId);
        if (!lockState) reason = `state file not found for goal ${lock.goalId}`;
        else if (lockState.status !== "ACTIVE") reason = `goal ${lock.goalId} status is ${lockState.status}, not ACTIVE`;
        else if (lockState.goalId !== lock.goalId) reason = `goalId mismatch in state`;
        else if (lockState.branch !== lock.branch) reason = `branch mismatch in state`;
        else reason = "unknown staleness";
      }

      errors.push({ code: "DOCTOR-001", severity: "error", message: `Lock is stale: ${reason}` });
    } else {
      info.push({ code: "DOCTOR-I002", severity: "info", message: `Lock valid for goal ${lock.goalId} (ACTIVE)` });
    }
  }

  const index = readIndex();
  if (index && Array.isArray(index.goals)) {
    const activeStates = index.goals.filter((g) => g.status === "ACTIVE");
    for (const g of activeStates) {
      if (!lock || lock.goalId !== g.goalId) {
        const state = readState(g.goalId);
        if (state && state.status === "ACTIVE") {
          errors.push({ code: "DOCTOR-002", severity: "error", message: `Goal ${g.goalId} is ACTIVE but no lock file exists` });
        }
      }
    }
  }

  if (!lock) {
    const resumableOnBranch = [];
    const allGoals = index?.goals || [];
    for (const g of allGoals) {
      if (RESUMABLE_STATUSES.includes(g.status) && g.branch === branch) {
        resumableOnBranch.push(g.goalId);
      }
    }
    if (resumableOnBranch.length > 0) {
      warnings.push({ code: "DOCTOR-W001", severity: "warning", message: `${resumableOnBranch.length} resumable goal(s) on this branch: ${resumableOnBranch.join(", ")}` });
    }
  }
}

function doctorCheckIndexConsistency(root, errors, warnings) {
  const index = readIndex();

  if (!index) {
    const gd = goalsDir();
    let dirEmpty = true;
    try {
      const entries = readdirSync(gd, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== ".gitkeep");
      if (entries.length > 0) dirEmpty = false;
    } catch {
      // goals dir doesn't exist, handled by mandatory files check
    }
    if (!dirEmpty) {
      errors.push({ code: "DOCTOR-008", severity: "error", message: "Index file missing or invalid but goals directory is not empty. Run reindex." });
    }
    return;
  }

  const gd = goalsDir();
  let goalDirs = [];
  try {
    goalDirs = readdirSync(gd, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== ".gitkeep")
      .map((d) => d.name);
  } catch {
    goalDirs = [];
  }

  const indexGoalIds = new Set(index.goals.map((g) => g.goalId));
  const dirGoalIds = new Set(goalDirs);

  for (const dirId of dirGoalIds) {
    if (!indexGoalIds.has(dirId)) {
      const state = readState(dirId);
      if (!state) {
        errors.push({ code: "DOCTOR-003", severity: "error", message: `State file missing or unreadable for goal directory: ${dirId}` });
      } else {
        const stateCheck = validateStateObject(state);
        if (!stateCheck.valid) {
          errors.push({ code: "DOCTOR-007", severity: "error", message: `State invalid for ${dirId}: ${stateCheck.reason}` });
        }
      }
      warnings.push({ code: "DOCTOR-004", severity: "warning", message: `Goal directory exists but not in index: ${dirId}` });
    }
  }

  for (const idxGoal of index.goals) {
    if (!dirGoalIds.has(idxGoal.goalId)) {
      warnings.push({ code: "DOCTOR-005", severity: "warning", message: `Index entry has no goal directory: ${idxGoal.goalId}` });
      continue;
    }

    const state = readState(idxGoal.goalId);
    if (!state) {
      errors.push({ code: "DOCTOR-003", severity: "error", message: `State file not found for indexed goal ${idxGoal.goalId}` });
      continue;
    }

    const stateCheck = validateStateObject(state);
    if (!stateCheck.valid) {
      errors.push({ code: "DOCTOR-007", severity: "error", message: `State invalid for ${idxGoal.goalId}: ${stateCheck.reason}` });
      continue;
    }

    if (state.status !== idxGoal.status) {
      warnings.push({ code: "DOCTOR-004", severity: "warning", message: `Status mismatch for ${idxGoal.goalId}: index=${idxGoal.status}, state=${state.status}` });
    }
  }

  const goals = index.goals.filter((g) => dirGoalIds.has(g.goalId)).map((g) => g);
  const recomputedHash = computeContentHash(goals);
  if (index.contentHash && index.contentHash !== `sha256:${recomputedHash}`) {
    warnings.push({ code: "DOCTOR-W003", severity: "warning", message: "Index content hash is stale. Run reindex." });
  }
}

function doctorCheckMandatoryFiles(root, errors, warnings, info) {
  const grd = grDir();
  const gd = goalsDir();
  const hd = historyDir();
  const schemaP = schemaPath();

  if (!existsSync(grd)) {
    errors.push({ code: "DOCTOR-006", severity: "error", message: `Goal Runner directory missing: var/goal-runner/` });
    return;
  }

  if (!existsSync(gd)) {
    errors.push({ code: "DOCTOR-006", severity: "error", message: `Goals directory missing: var/goal-runner/goals/` });
  }

  if (!existsSync(hd)) {
    warnings.push({ code: "DOCTOR-W002", severity: "warning", message: "History directory does not exist yet (created on first event)" });
  }

  if (!existsSync(schemaP)) {
    errors.push({ code: "DOCTOR-009", severity: "error", message: `Schema file missing: scripts/goal-runner/schema.json` });
  }

  if (!existsSync(indexFile())) {
    warnings.push({ code: "DOCTOR-W003", severity: "warning", message: "Index file does not exist. Run reindex." });
  }

  try {
    const gdEntries = readdirSync(gd, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== ".gitkeep");
    if (gdEntries.length === 0) {
      warnings.push({ code: "DOCTOR-W004", severity: "warning", message: "No goals found in goals directory" });
    }
  } catch {
    // already handled above
  }
}
