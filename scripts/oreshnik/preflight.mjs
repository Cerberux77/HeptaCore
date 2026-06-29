#!/usr/bin/env node
// Oreshnik Preflight Wrapper (HeptaCore edition)
// Uses the repo-pinned oreshnik-cli from node_modules.

import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const heptaRoot = join(__dirname, "..", "..");

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

// Run oreshnik preflight from HeptaCore directory
try {
  execFileSync("npx", ["--no-install", "oreshnik", "preflight", "--sprint", sprint, "--operator", operator, "--desc", desc], {
    cwd: heptaRoot,
    encoding: "utf8",
    stdio: "inherit",
    timeout: 120000,
  });
} catch (e) {
  // preflight exits with 1 on blockers; preserve that behavior for callers
  process.exit(e?.status ?? 1);
}
