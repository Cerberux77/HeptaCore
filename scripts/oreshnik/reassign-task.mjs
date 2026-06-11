#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getArg, nowVet, ROOT, sh, writeJson } from "./lib.mjs";

const taskId = getArg("--task");
const to = getArg("--to");
const reason = getArg("--reason", "reassignment");
const boardPath = join(ROOT, "var", "oreshnik", "task-board.json");

if (!taskId || !to) {
  console.error('Usage: npm run oreshnik:reassign -- --task S-HC-02 --to Manuel --reason "Jean unavailable"');
  process.exit(2);
}

if (!existsSync(boardPath)) {
  console.error("Task board not found: var/oreshnik/task-board.json");
  process.exit(1);
}

const board = JSON.parse(readFileSync(boardPath, "utf8"));
const task = board.tasks.find((item) => item.id === taskId);
if (!task) {
  console.error(`Task not found: ${taskId}`);
  process.exit(1);
}

const vet = nowVet();
const previousOwner = task.owner;
task.owner = to;
task.status = task.status === "blocked" ? "ready" : task.status;
task.history = task.history || [];
task.history.push({
  at: vet.iso,
  action: "reassigned",
  from: previousOwner,
  to,
  reason
});
board.updatedAt = vet.iso;
board.reassignments = board.reassignments || [];
board.reassignments.push({
  at: vet.iso,
  task: taskId,
  from: previousOwner,
  to,
  reason
});

writeJson(boardPath, board);
sh(`node scripts/oreshnik/canonical-check.mjs --fix --sprint ${taskId} --operator ${to}`, { fatal: true });
console.log(`Reassigned ${taskId}: ${previousOwner} -> ${to}`);
