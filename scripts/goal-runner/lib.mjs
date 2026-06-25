import { createHash, randomBytes } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve as pathResolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = pathResolve(__dirname, "..", "..");

export function resolveRoot() {
  return process.env.GOAL_RUNNER_TEST_ROOT || DEFAULT_ROOT;
}

// Late-bound path helpers – always resolve at call time
function grDir() { return join(resolveRoot(), "var", "goal-runner"); }
function goalsDir() { return join(grDir(), "goals"); }
function historyDir() { return join(grDir(), "history"); }
function lockFile() { return join(grDir(), ".active-worktree.json"); }
function indexFile() { return join(grDir(), "index.json"); }

export const ALLOWED_STATUSES = ["DRAFT", "READY", "ACTIVE", "PAUSED", "BLOCKED_EXTERNAL", "COMPLETED", "ABORTED_CRITICAL_DEVIATION"];
export const TERMINAL_STATUSES = ["COMPLETED", "ABORTED_CRITICAL_DEVIATION"];
export const RESUMABLE_STATUSES = ["PAUSED", "BLOCKED_EXTERNAL"];

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
  "playwright-focused": { command: "npx", args: ["playwright", "test"], timeout: 300000 }
};

export const EVIDENCE_TYPES = ["code", "ui", "integration"];

export const SENSITIVE_PATTERNS = [
  /\.env$/i, /\.env\./i,
  /credential/i, /secret/i, /token/i, /password/i,
  /key\.pem$/i, /key\.json$/i, /\.pem$/i
];

export const ID_PATTERN = /^GR-\d{8}T\d{6}Z-[a-f0-9]{4}-[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$/;

// ─── ID Generation ───

export function generateGoalId(title) {
  const now = new Date();
  const parts = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const date = parts.slice(0, 8);
  const time = parts.slice(9, 15);
  const rand = randomBytes(2).toString("hex");
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
  writeFileSync(path, JSON.stringify(value) + "\n", "utf8");
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

export function readState(goalId) {
  return readJson(join(goalsDir(), goalId, "state.json"));
}

export function writeState(goalId, state) {
  const dir = join(goalsDir(), goalId);
  ensureDir(dir);
  writeJson(join(dir, "state.json"), state);
}

export function readValidation(goalId) {
  return readJson(join(goalsDir(), goalId, "validation.json"));
}

export function writeValidation(goalId, validation) {
  const dir = join(goalsDir(), goalId);
  ensureDir(dir);
  writeJson(join(dir, "validation.json"), validation);
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

export function isLockStale(lock) {
  if (!lock) return true;
  const root = resolveRoot();
  if (lock.worktreeRoot !== root) return true;
  if (!lock.goalId || !validateGoalId(lock.goalId)) return true;
  const state = readState(lock.goalId);
  if (!state) return true;
  if (state.status !== "ACTIVE") return true;
  return false;
}

// ─── Index ───

export function readIndex() {
  return readJson(indexFile());
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
  const serialized = JSON.stringify(normalized);
  return createHash("sha256").update(serialized).digest("hex");
}

// ─── Evidence ───

export function validateEvidencePath(filePath) {
  if (!filePath || typeof filePath !== "string") return { valid: false, reason: "Path is required" };
  if (filePath.includes("..")) return { valid: false, reason: "Path traversal detected" };

  const root = resolveRoot();
  const normalPath = pathResolve(filePath);
  const normalRoot = pathResolve(root);

  if (!normalPath.startsWith(normalRoot + sep)) return { valid: false, reason: "Path must be relative to repo root" };

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

  const fullPath = pathResolve(evidencePath);
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

// ─── Validation Gates ───

export function validateGateIds(gateIds) {
  if (!Array.isArray(gateIds)) throw new Error("validationGates must be an array");
  for (const id of gateIds) {
    if (!GATE_ALLOWLIST[id]) throw new Error(`Unknown gate: ${id}. Allowed: ${Object.keys(GATE_ALLOWLIST).join(", ")}`);
  }
}

export function runGate(gateId) {
  const gate = GATE_ALLOWLIST[gateId];
  if (!gate) throw new Error(`Unknown gate: ${gateId}`);

  const start = Date.now();
  try {
    const result = spawnSync(gate.command, gate.args, {
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
      writeJson(path, { goalId, event, id, at: nowISO(), ...data });
      return id;
    }
  }
  throw new Error("Failed to generate unique history ID after 10 attempts");
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
