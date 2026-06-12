#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..", "..");

const colors = { reset: "\x1b[0m", bold: "\x1b[1m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m" };
const CRITICAL = [/^packages\/db\//, /^\.env($|\.)/, /^apps\/web\/middleware\./, /^apps\/web\/proxy\./, /^package\.json$/, /^apps\/web\/app\/api\/auth\//, /^apps\/web\/lib\/auth/, /^packages\/db\/prisma\//];

function git(args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", shell: true });
  return (r.stdout || "").trim();
}

function getDirtyFiles() {
  const out = git(["status", "--porcelain"]);
  if (!out) return [];
  return out.split(/\r?\n/).filter(Boolean).map((line) => {
    const status = line.slice(0, 2).trim();
    const file = line.slice(3).replace(/^"|"$/g, "");
    return { status, file };
  }).filter((f) => !f.file.startsWith("var/oreshnik/") && !f.file.startsWith("output/"));
}

function computeScore(files) {
  let score = 0;
  const count = files.length;
  if (count >= 10) score += 3;
  else if (count >= 5) score += 2;
  else if (count >= 1) score += 1;
  const newCount = files.filter((f) => f.status === "??" || f.status === "A").length;
  if (newCount > 0) score += 2;
  const delCount = files.filter((f) => f.status === "D").length;
  if (delCount > 0) score += 2;
  const critCount = files.filter((f) => CRITICAL.some((p) => p.test(f.file))).length;
  if (critCount > 0) score += 2;
  return { score: Math.min(score, 10), count, newCount, delCount, critCount };
}

const dirty = getDirtyFiles();
const { score, count, newCount, delCount, critCount } = computeScore(dirty);

const lastMsg = git(["log", "-1", "--format=%s"]);
const hasDrift = /S-HC-DRIFT-\d+/.test(lastMsg);

if (score >= 3) {
  console.log("");
  console.log(`  ${colors.yellow}${colors.bold}[ORESHNIK DRIFT]${colors.reset} ${colors.yellow}Score ${score}/10 — ${count} uncommitted file(s) detected.${colors.reset}`);
  if (critCount > 0) console.log(`  ${colors.yellow}                 ${critCount} critical zone(s) touched.${colors.reset}`);
  console.log(`  ${colors.yellow}                 Register: npm run oreshnik:drift -- --operator Manuel --mode silent${colors.reset}`);
  console.log("");
} else if (score >= 1) {
  console.log("");
  console.log(`  [DRIFT] Minor changes (score ${score}/10) — below drift threshold.`);
  console.log("");
}

if (hasDrift) {
  console.log(`  [DRIFT ${colors.green}OK  ${colors.reset}] Drift registered in commit message.`);
} else if (score === 0) {
  console.log(`  [DRIFT ${colors.green}OK  ${colors.reset}] Clean tree — nothing to drift.`);
}

process.exit(0);
