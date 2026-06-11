#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { colors, getArg, hasFlag, log, nowVet, readJson, ROOT } from "./lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const taskBoardPath = join(ROOT, "var", "oreshnik", "task-board.json");
const centralPath = join(ROOT, "docs", "obsidian-vault", "00_CENTRAL_HEPTACORE.md");
const jeanPath = join(ROOT, "docs", "obsidian-vault", "COLABORADORES", "ESTADO_JEAN.md");
const manuelPath = join(ROOT, "docs", "obsidian-vault", "COLABORADORES", "ESTADO_MANUEL.md");
const statusPath = join(ROOT, "docs", "obsidian-vault", "PRODUCT", "STATUS_BOARD.md");

const fix = hasFlag("--fix");
const operator = getArg("--operator", "");
const sprint = getArg("--sprint", "");
const board = readJson(taskBoardPath, null);

if (!board?.tasks) {
  log("FAIL", `Canonical task board missing or invalid: ${taskBoardPath}`);
  process.exit(1);
}

const tasks = board.tasks;
const taskById = new Map(tasks.map((task) => [task.id, task]));
const openTasks = tasks.filter((task) => task.status !== "done");
const readyTasks = openTasks.filter((task) => task.status === "ready");
const pendingTasks = openTasks.filter((task) => task.status === "pending");
const vet = nowVet();

function rel(path) {
  return path.replace(ROOT, "").replace(/^[/\\]/, "").replaceAll("\\", "/");
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function ownerTasks(owner) {
  return openTasks.filter((task) => task.owner === owner || String(task.owner).includes(`${owner}+`) || String(task.owner).includes(`+${owner}`));
}

function rowsFor(taskList) {
  if (taskList.length === 0) return "| Ninguno | - | - | - |\n";
  return taskList
    .map((task) => `| ${task.id} | ${task.status} | ${task.title} | ${task.dependsOn?.join(", ") || "-"} |`)
    .join("\n");
}

function acceptanceRows(task) {
  return (task.acceptance || []).map((item) => `- ${item}`).join("\n");
}

function generatedStatusBoard() {
  return `---\ntype: status-board\nproject: "HeptaCore"\nlast_updated: "${vet.iso}"\ngenerated_by: "Oreshnik canonical-check"\nsource: "var/oreshnik/task-board.json"\n---\n\n# STATUS BOARD - Realidad Canonica del Repositorio\n\n> Fuente operativa: \`var/oreshnik/task-board.json\`. Si este documento contradice el task board, el preflight debe bloquear.\n\n## Orden de Ejecucion Actual\n\n${board.currentExecutionOrder.map((item) => `- ${item}`).join("\n")}\n\n## Tareas Ready/Pending\n\n| Sprint | Estado | Owner | Scope | Depende de |\n|---|---|---|---|---|\n${openTasks.map((task) => `| ${task.id} | ${task.status} | ${task.owner} | ${task.title} | ${task.dependsOn?.join(", ") || "-"} |`).join("\n")}\n\n## Asignacion Manuel\n\n| Sprint | Estado | Scope | Depende de |\n|---|---|---|---|\n${rowsFor(ownerTasks("Manuel"))}\n\n## Asignacion Jean\n\n| Sprint | Estado | Scope | Depende de |\n|---|---|---|---|\n${rowsFor(ownerTasks("Jean"))}\n\n## Hard Stops Vigentes\n\n- No real RRSS publishing sin desbloqueo explicito.\n- No campaign spend.\n- No real scraping.\n- No credenciales en git.\n- No Prisma/schema/auth/security changes sin doble lock cuando aplique.\n- No sprint closure sin vault, handoff y validaciones.\n\n## Sprints Cerrados Segun Task Board\n\n| Sprint | Owner | Scope |\n|---|---|---|\n${tasks.filter((task) => task.status === "done").map((task) => `| ${task.id} | ${task.owner} | ${task.title} |`).join("\n")}\n`;
}

function generatedCollaborator(owner) {
  const assigned = ownerTasks(owner);
  const ready = assigned.filter((task) => task.status === "ready");
  const pending = assigned.filter((task) => task.status === "pending");
  return `---\ntype: collaborator-status\nproject: "HeptaCore"\noperator: "${owner}"\nlast_updated: "${vet.iso}"\ngenerated_by: "Oreshnik canonical-check"\nsource: "var/oreshnik/task-board.json"\n---\n\n# Estado ${owner}\n\n> Documento derivado. La fuente operativa es \`var/oreshnik/task-board.json\`.\n\n## Ready\n\n| Sprint | Scope | Depende de |\n|---|---|---|\n${ready.length ? ready.map((task) => `| ${task.id} | ${task.title} | ${task.dependsOn?.join(", ") || "-"} |`).join("\n") : "| Ninguno | - | - |"}\n\n## Pending\n\n| Sprint | Scope | Depende de |\n|---|---|---|\n${pending.length ? pending.map((task) => `| ${task.id} | ${task.title} | ${task.dependsOn?.join(", ") || "-"} |`).join("\n") : "| Ninguno | - | - |"}\n\n## Detalle de Aceptacion\n\n${assigned.map((task) => `### ${task.id} - ${task.title}\n\nEstado: \`${task.status}\`\n\n${acceptanceRows(task)}\n\nZonas: ${(task.zone || []).map((zone) => `\`${zone}\``).join(", ") || "-"}\n`).join("\n") || "Sin tareas abiertas asignadas."}\n`;
}

function generatedCentral() {
  return `---\ntype: master-dashboard\nproject: "HeptaCore"\nstatus: active-production\nphase: "Canonical Oreshnik task board governs current assignments"\nlast_updated: "${vet.iso}"\nmother_branch: "${readJson(join(ROOT, "var", "oreshnik", ".mother-version.json"), {}).current || "unknown"}"\ntags:\n  - "#central"\n  - "#status/live-source"\n  - "#manuel"\n  - "#jean"\n  - "#heptacore"\n---\n\n# HeptaCore - Dashboard Canonico\n\n> Fuente operativa: \`var/oreshnik/task-board.json\`. Los documentos de colaborador y status son derivados y deben ser regenerados si cambian las asignaciones.\n\n## Estado Actual\n\n| Campo | Valor |\n|---|---|\n| Task board actualizado | ${board.updatedAt || "unknown"} |\n| Rama madre | ${readJson(join(ROOT, "var", "oreshnik", ".mother-version.json"), {}).current || "unknown"} |\n| Publicacion RRSS real | Bloqueada hasta aprobacion explicita |\n| Campaign spend | Bloqueado |\n| Real scraping | Bloqueado |\n\n## Orden de Ejecucion\n\n${board.currentExecutionOrder.map((item) => `- ${item}`).join("\n")}\n\n## Tareas Abiertas\n\n| Sprint | Estado | Owner | Scope | Depende de |\n|---|---|---|---|---|\n${openTasks.map((task) => `| ${task.id} | ${task.status} | ${task.owner} | ${task.title} | ${task.dependsOn?.join(", ") || "-"} |`).join("\n")}\n\n## Ready Ahora\n\n| Sprint | Owner | Scope |\n|---|---|---|\n${readyTasks.length ? readyTasks.map((task) => `| ${task.id} | ${task.owner} | ${task.title} |`).join("\n") : "| Ninguno | - | - |"}\n\n## Pendientes Bloqueados por Dependencias\n\n| Sprint | Owner | Scope | Depende de |\n|---|---|---|---|\n${pendingTasks.length ? pendingTasks.map((task) => `| ${task.id} | ${task.owner} | ${task.title} | ${task.dependsOn?.join(", ") || "-"} |`).join("\n") : "| Ninguno | - | - |"}\n\n## Reglas Activas\n\n- No publicar en redes reales desde HeptaCore sin aprobacion explicita.\n- No pedir ni commitear credenciales reales.\n- No ejecutar scraping real.\n- No gastar en campanas.\n- No cerrar sprint sin actualizar vault, handoff y validaciones.\n- No pisar trabajo del otro operador: usar preflight, zone check y canonical check.\n`;
}

function hasLegacyClosureConflict(path, content, taskId) {
  const task = taskById.get(taskId);
  if (task?.status !== "done") return false;
  const windowMatch = new RegExp(`${taskId}[\\s\\S]{0,700}(SIN CLOSURE|sin closure|NO EXISTE|CERO commits|sin codigo visible|sin c[oó]digo visible)`, "i");
  return windowMatch.test(content);
}

function hasAssignmentConflict(path, content, taskId) {
  const task = taskById.get(taskId);
  if (!task || task.status === "done") return false;
  const oldOwner = task.owner === "Manuel" ? "Jean" : "Manuel";
  const windowMatch = new RegExp(`${taskId}[\\s\\S]{0,300}${oldOwner}`, "i");
  return windowMatch.test(content) && !new RegExp(`${taskId}[\\s\\S]{0,300}${task.owner}`, "i").test(content);
}

if (fix) {
  writeFileSync(statusPath, generatedStatusBoard(), "utf8");
  writeFileSync(jeanPath, generatedCollaborator("Jean"), "utf8");
  writeFileSync(manuelPath, generatedCollaborator("Manuel"), "utf8");
  writeFileSync(centralPath, generatedCentral(), "utf8");
  log("OK", "Regenerated canonical derived docs from var/oreshnik/task-board.json.");
}

const files = [centralPath, jeanPath, manuelPath, statusPath];
const issues = [];

for (const file of files) {
  const content = readText(file);
  if (!content) {
    issues.push(`${rel(file)} is missing or empty.`);
    continue;
  }

  for (const taskId of ["S-HC-02", "S-HC-04"]) {
    if (hasLegacyClosureConflict(file, content, taskId)) {
      issues.push(`${rel(file)} still reports stale ${taskId} no-closure/no-code state, but task-board marks it done.`);
    }
  }

  for (const taskId of ["S-HC-PROD-02", "S-HC-PROD-03", "S-HC-PROD-04", "S-HC-PROD-05", "S-HC-PROD-06"]) {
    if (hasAssignmentConflict(file, content, taskId)) {
      const task = taskById.get(taskId);
      issues.push(`${rel(file)} appears to assign ${taskId} away from canonical owner ${task.owner}.`);
    }
  }
}

const status = readText(statusPath);
for (const task of openTasks) {
  if (!status.includes(task.id) || !status.includes(task.title)) {
    issues.push(`${rel(statusPath)} does not include open canonical task ${task.id}: ${task.title}.`);
  }
}

console.log("");
console.log(`${colors.bold}ORESHNIK CANONICAL CHECK${colors.reset}`);
console.log(`  Board:     ${rel(taskBoardPath)}`);
console.log(`  Updated:   ${board.updatedAt || "unknown"}`);
console.log(`  Operator:  ${operator || "not specified"}`);
console.log(`  Sprint:    ${sprint || "not specified"}`);
console.log("");

if (issues.length > 0) {
  issues.forEach((issue) => log("FAIL", issue));
  console.log("");
  console.log(`${colors.red}${colors.bold}[ORESHNIK] CANONICAL DRIFT${colors.reset}`);
  console.log("Run: node scripts/oreshnik/canonical-check.mjs --fix");
  process.exit(1);
}

log("OK", "Derived docs are aligned with the canonical task board.");
