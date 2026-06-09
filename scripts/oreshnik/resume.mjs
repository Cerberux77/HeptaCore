#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { currentBranch, getArg, readMother, resolveOperator } from "./lib.mjs";

const operator = resolveOperator(getArg("--operator"));
const candidate = getArg("--candidate", "S-HC-PUB-01");
const dryRun = process.argv.includes("--dry-run");
const mother = readMother();

function runNode(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe"
  });
  return {
    ok: result.status === 0,
    status: result.status,
    output: `${result.stdout || ""}${result.stderr || ""}`.trim()
  };
}

const sync = dryRun
  ? { ok: true, output: "Dry-run: sync-from-mother not executed." }
  : runNode("scripts/oreshnik/sync-from-mother.mjs", []);

const assignmentArgs = ["--candidate", candidate, "--dry-run"];
if (operator === "Jean") assignmentArgs.splice(2, 0, "--owner", "Jean");
const assignment = runNode("scripts/oreshnik/preflight-assignment.mjs", assignmentArgs);

let packet = null;
try {
  const match = assignment.output.match(/\{[\s\S]*\}\s*$/);
  packet = match ? JSON.parse(match[0]) : null;
} catch {}

console.log(JSON.stringify({
  ok: sync.ok && assignment.ok,
  mode: dryRun ? "dry-run" : "resume",
  operator,
  assignmentSource: "oreshnik",
  currentBranch: currentBranch(),
  mother: mother.current,
  docsSync: sync.ok ? "ok" : "blocked",
  syncOutput: sync.output,
  assignmentPacket: packet,
  recommendedSprint: packet?.sprint || candidate,
  recommendedOwner: packet?.recommendedOwner || null,
  branch: packet?.branch || null,
  publishAllowed: false,
  approvalRequired: true
}, null, 2));

process.exit(sync.ok && assignment.ok ? 0 : 1);
