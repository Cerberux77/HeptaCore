#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CENTRAL_DOC, colors, currentBranch, git, readMother, ROOT, statusPorcelain } from "./lib.mjs";

const mother = readMother();
const branch = currentBranch();
const status = statusPorcelain();

console.log("");
console.log(`${colors.bold}HeptaCore Oreshnik Status${colors.reset}`);
console.log("");
console.log(`Branch:        ${branch}`);
console.log(`Mother:        ${mother.current} (v${mother.version})`);
console.log(`Working tree:  ${status.length} changed file(s)`);
console.log(`HEAD:          ${git(["rev-parse", "--short", "HEAD"], { allowFail: true }).output || "no commits yet"}`);
console.log("");

if (existsSync(CENTRAL_DOC)) {
  const central = readFileSync(CENTRAL_DOC, "utf8");
  const updated = central.match(/last_updated:\s*"([^"]+)"/)?.[1] || "unknown";
  const phase = central.match(/phase:\s*"([^"]+)"/)?.[1] || "unknown";
  console.log(`Vault central: ${CENTRAL_DOC.replace(ROOT, "").replace(/^[/\\]/, "")}`);
  console.log(`Last updated:  ${updated}`);
  console.log(`Phase:         ${phase}`);
}

const eventsDir = join(ROOT, "var", "sprint-events");
if (existsSync(eventsDir)) {
  const events = git(["ls-files", "var/sprint-events/*.json"], { allowFail: true }).output.split(/\r?\n/).filter(Boolean);
  console.log(`Sprint events: ${events.length}`);
  events.slice(-5).forEach((event) => console.log(`  - ${event}`));
}
console.log("");
