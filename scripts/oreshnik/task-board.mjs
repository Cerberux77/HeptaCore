#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { colors, ROOT } from "./lib.mjs";

const boardPath = join(ROOT, "var", "oreshnik", "task-board.json");

if (!existsSync(boardPath)) {
  console.error("Task board not found: var/oreshnik/task-board.json");
  process.exit(1);
}

const board = JSON.parse(readFileSync(boardPath, "utf8"));
const statusOrder = ["active", "ready", "blocked", "pending", "done"];

console.log("");
console.log(`${colors.bold}HeptaCore Parallel Task Board${colors.reset}`);
console.log("");
console.log(`Updated: ${board.updatedAt}`);
console.log(`Policy:  ${board.resiliencePolicy}`);
console.log("");

for (const status of statusOrder) {
  const tasks = board.tasks.filter((task) => task.status === status);
  if (tasks.length === 0) continue;
  console.log(`${colors.bold}${status.toUpperCase()}${colors.reset}`);
  for (const task of tasks) {
    const owner = `${task.owner}${task.backupOwner ? ` / backup ${task.backupOwner}` : ""}`;
    const deps = task.dependsOn.length ? ` deps=${task.dependsOn.join(",")}` : "";
    console.log(`  ${task.id.padEnd(8)} ${owner.padEnd(24)} ${task.title}${deps}`);
  }
  console.log("");
}
