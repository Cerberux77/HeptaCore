#!/usr/bin/env node
// Oreshnik Preflight Wrapper (HeptaCore edition)
// Calls the Oreshnik CLI from the sibling oreshnik repo
// Usage: node scripts/oreshnik/preflight.mjs --operator Jean [--sprint S-XX] [--desc "..."]

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const heptaRoot = join(__dirname, "..", "..");
const oreshnikRoot = join(heptaRoot, "..", "oreshnik");
const oreshnikCli = join(oreshnikRoot, "dist", "cli.js");

const args = process.argv.slice(2);
let operator = "";
let sprint = "";
let desc = "";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--operator" && args[i + 1]) operator = args[++i];
  else if (args[i] === "--sprint" && args[i + 1]) sprint = args[++i];
  else if (args[i] === "--desc" && args[i + 1]) desc = args[++i];
}

if (!operator) {
  console.error("Error: --operator is required.");
  process.exit(1);
}

const now = new Date().toISOString().slice(0, 10);
if (!sprint) sprint = `S-HC-${operator.toUpperCase()}-${now}`;
if (!desc) desc = "sprint desde preflight wrapper";

console.log("");
console.log("ORESHNIK PREFLIGHT (HeptaCore)");
console.log(`Operator: ${operator} | Sprint: ${sprint}`);

// Build oreshnik if needed
if (!existsSync(oreshnikCli)) {
  console.log("Building oreshnik CLI...");
  try {
    execSync("npm run build", { cwd: oreshnikRoot, encoding: "utf8", stdio: "inherit", timeout: 60000 });
  } catch (e) {
    console.error("Failed to build oreshnik CLI:", e.message);
    process.exit(1);
  }
}

// Run oreshnik preflight from HeptaCore directory
try {
  execSync(`node "${oreshnikCli}" preflight --sprint "${sprint}" --operator "${operator}" --desc "${desc}"`, {
    cwd: heptaRoot,
    encoding: "utf8",
    stdio: "inherit",
    timeout: 120000,
  });
} catch (e) {
  // preflight exits with 1 on blockers — that's expected and informative
}
