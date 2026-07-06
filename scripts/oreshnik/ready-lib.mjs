import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

export const REQUIRED_GATE_NAMES = ["typecheck", "build", "worker", "tests"];
export const REQUIRED_GOAL_SNIPPETS = [
  "oreshnik goal --harness kilo --auto-align --json",
  "authorized `worktreePath` and",
  "`functionalBranch` returned by the contract",
  "Never hardcode a human operator ID."
];
export const FORBIDDEN_GOAL_SNIPPETS = ["--operator kilo", "--operator manuel", "--operator jean", "Owner: Kilo Agent"];
export const FORBIDDEN_TEXT_TOKENS = ["D:\\H1", "D:\\PROYECTOS\\SMOKE", "../oreshnik"];
export const READINESS_SCAN_EXCLUDES = new Set([
  "scripts/oreshnik/ready-lib.mjs",
  "scripts/oreshnik/ready.mjs",
  "scripts/oreshnik/__tests__/ready.test.mjs"
]);

const TEXT_FILE_EXTENSIONS = new Set([".json", ".md", ".mjs", ".js", ".ts", ".tsx", ".txt", ".yaml", ".yml"]);
const SKIP_DIRS = new Set([".git", "node_modules", ".next", "dist", "coverage", ".turbo"]);
const ACTIVE_TASK_STATUSES = new Set(["claimed", "validating", "ready_for_integration"]);
const ACTIVE_CLAIM_STATUSES = new Set(["claimed", "active"]);

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

export function parsePinnedGitDependency(spec) {
  if (typeof spec !== "string") return { ok: false, reason: "dependency must be a string" };
  const match = spec.match(/^git\+https:\/\/github\.com\/Cerberux77\/oreshnik\.git#([0-9a-f]{40})$/i)
    || spec.match(/^file:vendor\/oreshnik\/oreshnik-cli-[0-9A-Za-z.+-]+-([0-9a-f]{40})\.tgz$/i);
  if (!match) {
    return { ok: false, reason: "dependency must pin oreshnik-cli to an exact github.com/Cerberux77/oreshnik commit via git+https or a vendored tarball with the full commit in its filename" };
  }
  return { ok: true, commit: match[1].toLowerCase() };
}

export function validatePackageContract(pkg) {
  const issues = [];
  const depSpec = pkg?.dependencies?.["oreshnik-cli"];
  const parsed = parsePinnedGitDependency(depSpec);
  if (!parsed.ok) issues.push(parsed.reason);
  if (!pkg?.scripts?.["oreshnik:ready"]) issues.push("package.json must expose npm run oreshnik:ready");
  if (!pkg?.scripts?.["test:infra"]) issues.push("package.json must expose npm run test:infra");
  return { issues, pinnedCommit: parsed.ok ? parsed.commit : null };
}

export function validateEvidenceGateCoverage(gateNames) {
  const issues = [];
  const present = new Set(gateNames);
  for (const gate of REQUIRED_GATE_NAMES) {
    if (!present.has(gate)) {
      issues.push(`missing required gate '${gate}'`);
    }
  }
  return issues;
}

export function validateOreshnikContract(config) {
  const issues = [];
  const operators = Array.isArray(config?.operators) ? config.operators : [];
  const activeOperators = operators.filter((operator) => String(operator?.status || "").toLowerCase() === "active");
  const activeOperatorIds = new Set(activeOperators.map((operator) => String(operator.id || "").toLowerCase()));
  if (!activeOperatorIds.has("manuel")) {
    issues.push("operator registry must include manuel as the active human operator");
  }
  for (const legacyId of ["kilo", "codex"]) {
    if (activeOperatorIds.has(legacyId)) {
      issues.push(`operator registry must not keep ${legacyId} as an active human operator`);
    }
  }
  const gates = Array.isArray(config?.validation?.gates) ? config.validation.gates : [];
  const gateNames = gates.map((gate) => gate.name);
  issues.push(...validateEvidenceGateCoverage(gateNames));
  return issues;
}

export function validateGoalContract(markdown) {
  const issues = REQUIRED_GOAL_SNIPPETS
    .filter((snippet) => !markdown.includes(snippet))
    .map((snippet) => `goal contract missing snippet: ${snippet}`);
  for (const token of FORBIDDEN_GOAL_SNIPPETS) {
    if (markdown.includes(token)) {
      issues.push(`goal contract contains forbidden token: ${token}`);
    }
  }
  return issues;
}

export function validateGitignoreContract(gitignoreText) {
  const issues = [];
  if (!String(gitignoreText || "").includes("var/goal-runner/")) {
    issues.push(".gitignore must ignore var/goal-runner/");
  }
  return issues;
}

export function collectTextFileMatches(root, tokens, options = {}) {
  const excluded = new Set((options.excludePaths || []).map(normalizeRelativePath));
  const matches = [];
  walk(root, (path) => {
    const relPath = normalizeRelativePath(relative(root, path));
    if (excluded.has(relPath)) return;
    const ext = extname(path).toLowerCase();
    if (!TEXT_FILE_EXTENSIONS.has(ext)) return;
    const content = readFileSync(path, "utf8");
    for (const token of tokens) {
      if (content.includes(token)) {
        matches.push({ path: relPath, token });
      }
    }
  });
  return matches;
}

export function collectRuntimeIssues(root) {
  const issues = [];
  const claimsDir = join(root, "var", "oreshnik", "claims");
  if (existsSync(claimsDir)) {
    const claimFiles = readdirSync(claimsDir).filter((entry) => !entry.startsWith("."));
    if (claimFiles.length > 0) {
      issues.push(`orphan claim files present: ${claimFiles.join(", ")}`);
    }
  }

  const runsDir = join(root, "var", "oreshnik", "runs");
  const activeRunsByTask = new Map();
  if (existsSync(runsDir)) {
    walk(runsDir, (path) => {
      if (!path.endsWith(".json")) return;
      const manifest = readJson(path);
      if (!manifest?.taskId || !manifest?.runId) return;
      const active =
        ACTIVE_TASK_STATUSES.has(String(manifest.taskStatus || "").toLowerCase()) ||
        ACTIVE_CLAIM_STATUSES.has(String(manifest.claimStatus || "").toLowerCase());
      if (!active) return;
      const list = activeRunsByTask.get(manifest.taskId) || [];
      list.push(manifest.runId);
      activeRunsByTask.set(manifest.taskId, list);
    });
  }

  for (const [taskId, runIds] of activeRunsByTask.entries()) {
    if (runIds.length > 1) {
      issues.push(`task ${taskId} has multiple active runs: ${runIds.join(", ")}`);
    }
  }

  return issues;
}

function walk(root, visit) {
  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "." || entry.name === "..") continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path, visit);
      continue;
    }
    if (!entry.isFile()) continue;
    if (statSync(path).size > 2_000_000) continue;
    visit(path);
  }
}

export function normalizeIssueList(items) {
  return Array.from(new Set(items)).sort();
}

export function normalizeRoot(path) {
  return resolve(path);
}

function normalizeRelativePath(path) {
  return String(path).replace(/\\/g, "/");
}
