import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, "..", "..");
export const RUNS_DIR = join(ROOT, "var", "oreshnik");
export const EVENTS_DIR = join(ROOT, "var", "sprint-events");
export const MOTHER_FILE = join(RUNS_DIR, ".mother-version.json");
export const VAULT_DIR = join(ROOT, "docs", "obsidian-vault");
export const CENTRAL_DOC = join(VAULT_DIR, "00_CENTRAL_HEPTACORE.md");

export const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m"
};

export function log(type, message) {
  const color = type === "OK" ? colors.green : type === "FAIL" ? colors.red : type === "WARN" ? colors.yellow : colors.cyan;
  console.log(`  [ ${color}${type.padEnd(4)}${colors.reset} ] ${message}`);
}

export function getArg(name, fallback = "") {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

export function hasFlag(name) {
  return process.argv.includes(name);
}

export function git(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    timeout: options.timeoutMs
  });
  if (result.status !== 0 && !options.allowFail) {
    throw new Error((result.stderr || result.stdout || `git ${args.join(" ")}`).trim());
  }
  return {
    ok: result.status === 0,
    output: (result.stdout || "").trim(),
    error: (result.stderr || "").trim(),
    status: result.status
  };
}

export function sh(command, options = {}) {
  try {
    return execFileSync(process.platform === "win32" ? "cmd.exe" : "sh", process.platform === "win32" ? ["/d", "/s", "/c", command] : ["-lc", command], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
      timeout: options.timeoutMs || 30000
    }).trim();
  } catch (error) {
    if (options.fatal) throw error;
    return "";
  }
}

export function readJson(path, fallback) {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readMother() {
  return readJson(MOTHER_FILE, {
    version: 1,
    current: "master",
    branches: []
  });
}

export function writeMother(value) {
  writeJson(MOTHER_FILE, value);
}

export function discoverLatestMother() {
  git(["fetch", "origin", "--prune", "--quiet"], { allowFail: true, timeoutMs: 15000 });
  const raw = git(["ls-remote", "--heads", "origin", "refs/heads/MADRE/v*"], { allowFail: true }).output;
  if (!raw) return readMother();

  const branches = raw.split(/\r?\n/).filter(Boolean).map((line) => {
    const match = line.match(/refs\/heads\/(MADRE\/v(\d+)-.*)/);
    return match ? { name: match[1], version: parseInt(match[2], 10) } : null;
  }).filter(Boolean);

  if (branches.length === 0) return readMother();

  branches.sort((a, b) => b.version - a.version);
  const latest = branches[0];
  const local = readMother();

  if (latest.version > (local.version || 0)) {
    log("INFO", `Discovered newer mother on origin: ${latest.name} (v${latest.version}) vs local v${local.version || 0}`);
    writeMother({
      ...local,
      version: latest.version,
      current: latest.name
    });
    return { ...local, version: latest.version, current: latest.name };
  }

  return local;
}

export function currentBranch() {
  return git(["branch", "--show-current"], { allowFail: true }).output || "DETACHED";
}

export function sanitize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function nowVet() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(now);
  return { display: date.replace(",", ""), iso: now.toISOString(), date: today() };
}

export function resolveOperator(flag) {
  if (flag) return flag;
  if (process.env.ORESHNIK_OPERATOR) return process.env.ORESHNIK_OPERATOR;
  const name = git(["config", "user.name"], { allowFail: true }).output.toLowerCase();
  if (name.includes("manuel") || name.includes("mvera")) return "Manuel";
  if (name.includes("jean")) return "Jean";
  return "Manuel";
}

export function isMotherBranch(branch) {
  return /^(main|master|RAMA[-_]MADRE|MADRE\/|integration\/|prod\/)/i.test(branch);
}

export function statusPorcelain() {
  return git(["status", "--porcelain"], { allowFail: true }).output.split(/\r?\n/).filter(Boolean);
}

export function nonIgnoredDirtyFiles() {
  return statusPorcelain()
    .map((line) => line.slice(3))
    .filter((file) => !file.startsWith("var/oreshnik/") && !file.startsWith("output/"));
}
