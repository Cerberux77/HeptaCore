#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI_PATH = join(ROOT, "node_modules", "oreshnik-cli", "dist", "cli.js");
const extraArgs = process.argv.slice(2);

function run(command, args) {
  execFileSync(command, args, {
    cwd: ROOT,
    stdio: "inherit"
  });
}

run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "oreshnik:ready"]);
run("node", [CLI_PATH, "goal", "--harness", "kilo", "--repo", ".", "--json", ...extraArgs]);
