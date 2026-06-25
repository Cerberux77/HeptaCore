#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveRoot,
  ALLOWED_STATUSES, TERMINAL_STATUSES, RESUMABLE_STATUSES, EVIDENCE_TYPES,
  GATE_CONFIGURABLE_STATUSES,
  generateGoalId, validateGoalId, validateNoPathTraversal,
  validateTransition, applyTransition,
  readLock, createLock, removeLock, removeLockForGoal, isLockStale,
  readIndex, reindex,
  readState, writeState, readValidation, writeValidation,
  validateEvidenceComplete, addEvidence,
  validateGateIds, normalizeGateList, setGates, runGates,
  validatePlanFile,
  writeHistoryEvent,
  currentBranch, currentHead,
  getActiveGoal, nowISO
} from "./lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function goalsPath(...parts) {
  return join(resolveRoot(), "var", "goal-runner", "goals", ...parts);
}

function usage() {
  console.log(`
Usage: node scripts/goal-runner/run.mjs <subcommand> [options]

Subcommands:
  create       --title "..." --owner <name> --sprintId <id> --evidenceRequired code|ui|integration [--branch <b>] [--gates "g1,g2"]
  plan-record  --goalId <id>
  activate     --goalId <id>
  gates-set    --goalId <id> --gates "g1,g2" [--clear]
  step-start   --goalId <id> --step "..."
  step-complete --goalId <id> --step "..." --result "..."
  finding-add  --goalId <id> --severity info|warn|blocker --content "..."
  evidence-add --goalId <id> --type code|ui|integration --path <relpath>
  validate     --goalId <id>
  pause        --goalId <id>
  block        --goalId <id> --reason "..."
  resume       --goalId <id>
  complete     --goalId <id>
  abort        --goalId <id> --reason "..."
  status       [--goalId <id>]
  reindex
`);
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] || null : null;
}

function requireArg(name, label) {
  const val = getArg(name);
  if (!val) {
    console.error(`Error: --${label || name} is required`);
    process.exit(2);
  }
  return val;
}

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function ok(label, detail) {
  console.log(`[OK] ${label}${detail ? `: ${detail}` : ""}`);
}

// ─── Subcommands ───

function cmdCreate() {
  const title = requireArg("--title", "title");
  const owner = requireArg("--owner", "owner");
  const sprintId = requireArg("--sprintId", "sprintId");
  const evidenceRequired = requireArg("--evidenceRequired", "evidenceRequired");
  let branch = getArg("--branch") || currentBranch();
  const gatesRaw = getArg("--gates");

  if (!EVIDENCE_TYPES.includes(evidenceRequired)) fail(`Invalid evidenceRequired: ${evidenceRequired}. Must be one of: ${EVIDENCE_TYPES.join(", ")}`);

  let validationGates = [];
  if (gatesRaw) {
    const gateIds = gatesRaw.split(",").map((s) => s.trim()).filter(Boolean);
    validateGateIds(gateIds);
    validationGates = normalizeGateList(gateIds);
  }

  let goalId;
  for (let attempt = 0; attempt < 10; attempt++) {
    goalId = generateGoalId(title);
    if (!validateGoalId(goalId)) fail(`Generated invalid goalId: ${goalId}`);
    if (!validateNoPathTraversal(goalId)) fail(`GoalId has path traversal risk: ${goalId}`);
    const dir = join(resolveRoot(), "var", "goal-runner", "goals", goalId);
    if (!existsSync(dir)) break;
    if (attempt === 9) fail(`Could not generate unique goal directory after 10 attempts`);
  }

  const dir = join(resolveRoot(), "var", "goal-runner", "goals", goalId);
  mkdirSync(dir, { recursive: true });

  const now = nowISO();
  const baseSha = currentHead();

  const state = {
    goalId,
    title,
    owner,
    sprintId,
    status: "DRAFT",
    branch,
    baseSha,
    evidenceRequired,
    validationGates,
    createdAt: now,
    updatedAt: now,
    transitions: []
  };

  writeState(goalId, state);

  const goalMd = join(dir, "goal.md");
  writeFileSync(goalMd, `# ${title}\n\n> Goal ID: ${goalId}\n> Owner: ${owner}\n> Sprint: ${sprintId}\n> Created: ${now}\n\n## Enunciado\n\n${title}\n`, "utf8");

  writeHistoryEvent(goalId, "created", { title, owner, sprintId });

  reindex();
  ok("Goal created", goalId);
  ok("Title", title);
  ok("Owner", owner);
  ok("Sprint", sprintId);
  ok("Branch", branch);
  ok("Status", "DRAFT");
}

function cmdPlanRecord() {
  const goalId = requireArg("--goalId", "goalId");
  if (!validateGoalId(goalId)) fail(`Invalid goalId: ${goalId}`);

  const state = readState(goalId);
  if (!state) fail(`Goal not found: ${goalId}`);

  const planRelPath = join("var", "goal-runner", "goals", goalId, "plan.md").replace(/\\/g, "/");
  const planCheck = validatePlanFile(goalId, planRelPath);
  if (!planCheck.valid) fail(`Plan file invalid: ${planCheck.reason}`);

  applyTransition(state, "READY", state.owner);

  writeState(goalId, state);
  writeHistoryEvent(goalId, "draft-to-ready", { by: state.owner });
  reindex();

  ok("Plan recorded", goalId);
  ok("Status", "READY");
}

function cmdActivate() {
  const goalId = requireArg("--goalId", "goalId");
  if (!validateGoalId(goalId)) fail(`Invalid goalId: ${goalId}`);

  const state = readState(goalId);
  if (!state) fail(`Goal not found: ${goalId}`);

  if (state.status === "ACTIVE") fail("Goal is already ACTIVE");

  const branch = currentBranch();
  if (state.branch && state.branch !== branch) {
    fail(`Goal was created on branch "${state.branch}" but current branch is "${branch}". Switch branches or create a new goal.`);
  }

  const lock = readLock();
  if (lock && !isLockStale(lock)) fail(`Worktree already locked by active goal: ${lock.goalId}`);
  if (lock && isLockStale(lock)) { removeLock(); ok("Removed stale lock", lock.goalId); }

  state.branch = branch;
  applyTransition(state, "ACTIVE", state.owner);
  createLock(goalId, branch, resolveRoot(), state.owner);

  writeState(goalId, state);
  writeHistoryEvent(goalId, `${state.previousStatus.toLowerCase()}-to-active`, { by: state.owner, branch });
  reindex();

  ok("Goal activated", goalId);
  ok("Branch", branch);
  ok("Status", "ACTIVE");
}

function cmdGatesSet() {
  const goalId = requireArg("--goalId", "goalId");
  const gatesRaw = getArg("--gates");
  const clear = process.argv.includes("--clear");
  if (!validateGoalId(goalId)) fail(`Invalid goalId: ${goalId}`);

  const state = readState(goalId);
  if (!state) fail(`Goal not found: ${goalId}`);

  if (clear && (!gatesRaw || gatesRaw === "")) {
    if (!GATE_CONFIGURABLE_STATUSES.includes(state.status)) fail(`Gates can only be set in ${GATE_CONFIGURABLE_STATUSES.join(" or ")} (current: ${state.status})`);
    state.validationGates = [];
    state.updatedAt = nowISO();
    writeState(goalId, state);
    writeHistoryEvent(goalId, "gates-cleared", { by: state.owner });
    reindex();
    ok("Gates cleared", goalId);
    return;
  }

  if (!gatesRaw) fail("--gates is required (comma-separated gate IDs) or use --clear");

  const gateIds = gatesRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (gateIds.length === 0) fail("--gates list is empty");

  setGates(goalId, gateIds);
  writeHistoryEvent(goalId, "gates-set", { gates: state.validationGates, by: state.owner });
  reindex();

  ok("Gates set", goalId);
  ok("Gates", state.validationGates.join(", ") || "(none)");
}

function cmdStepStart() {
  const goalId = requireArg("--goalId", "goalId");
  const step = requireArg("--step", "step");
  if (!validateGoalId(goalId)) fail(`Invalid goalId: ${goalId}`);

  const state = readState(goalId);
  if (!state) fail(`Goal not found: ${goalId}`);
  if (state.status !== "ACTIVE") fail(`Goal is not ACTIVE (current: ${state.status})`);

  const now = nowISO();
  const progressPath = goalsPath(goalId, "progress.md");
  mkdirSync(dirname(progressPath), { recursive: true });
  const entry = `\n## ${now}\n\n- **${step}** — IN PROGRESS\n`;
  if (existsSync(progressPath)) writeFileSync(progressPath, readFileSync(progressPath, "utf8") + entry, "utf8");
  else writeFileSync(progressPath, `# Progress — ${goalId}\n${entry}`, "utf8");

  writeHistoryEvent(goalId, `step-start-${sanitize(step)}`, { step });
  ok("Step started", step);
}

function sanitize(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "step";
}

function cmdStepComplete() {
  const goalId = requireArg("--goalId", "goalId");
  const step = requireArg("--step", "step");
  const result = requireArg("--result", "result");
  if (!validateGoalId(goalId)) fail(`Invalid goalId: ${goalId}`);

  const state = readState(goalId);
  if (!state) fail(`Goal not found: ${goalId}`);
  if (state.status !== "ACTIVE") fail(`Goal is not ACTIVE (current: ${state.status})`);

  const now = nowISO();
  const progressPath = goalsPath(goalId, "progress.md");
  mkdirSync(dirname(progressPath), { recursive: true });
  const entry = `\n## ${now}\n\n- **${step}** — DONE\n  Result: ${result}\n`;
  if (existsSync(progressPath)) writeFileSync(progressPath, readFileSync(progressPath, "utf8") + entry, "utf8");
  else writeFileSync(progressPath, `# Progress — ${goalId}\n${entry}`, "utf8");

  writeHistoryEvent(goalId, `step-complete-${sanitize(step)}`, { step, result });
  ok("Step completed", step);
}

function cmdFindingAdd() {
  const goalId = requireArg("--goalId", "goalId");
  const severity = requireArg("--severity", "severity");
  const content = requireArg("--content", "content");
  if (!validateGoalId(goalId)) fail(`Invalid goalId: ${goalId}`);
  if (!["info", "warn", "blocker"].includes(severity)) fail(`Invalid severity: ${severity}. Must be info, warn, or blocker`);

  const state = readState(goalId);
  if (!state) fail(`Goal not found: ${goalId}`);

  const now = nowISO();
  const findingsPath = goalsPath(goalId, "findings.md");
  mkdirSync(dirname(findingsPath), { recursive: true });
  const entry = `\n## ${now} — ${severity.toUpperCase()}\n\n${content}\n`;
  if (existsSync(findingsPath)) writeFileSync(findingsPath, readFileSync(findingsPath, "utf8") + entry, "utf8");
  else writeFileSync(findingsPath, `# Findings — ${goalId}\n${entry}`, "utf8");

  writeHistoryEvent(goalId, `finding-${severity}`, { severity, content: content.slice(0, 200) });
  ok(`Finding recorded (${severity})`);
}

function cmdEvidenceAdd() {
  const goalId = requireArg("--goalId", "goalId");
  const evidenceType = requireArg("--type", "type");
  const evidencePath = requireArg("--path", "path");
  if (!validateGoalId(goalId)) fail(`Invalid goalId: ${goalId}`);

  const state = readState(goalId);
  if (!state) fail(`Goal not found: ${goalId}`);

  try {
    addEvidence(goalId, evidenceType, evidencePath);
  } catch (err) {
    fail(err.message);
  }

  writeHistoryEvent(goalId, `evidence-added-${sanitize(evidenceType)}`, { type: evidenceType, path: evidencePath });
  ok("Evidence added", `${evidenceType}: ${evidencePath}`);
}

function cmdValidate() {
  const goalId = requireArg("--goalId", "goalId");
  if (!validateGoalId(goalId)) fail(`Invalid goalId: ${goalId}`);

  const state = readState(goalId);
  if (!state) fail(`Goal not found: ${goalId}`);

  if (!state.validationGates || state.validationGates.length === 0) {
    console.log("No validation gates configured.");
    process.exit(0);
  }

  console.log(`Running ${state.validationGates.length} gate(s)...`);
  const results = runGates(goalId, state.validationGates);

  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? "PASS" : "FAIL";
    console.log(`  [${icon}] ${r.gate} (${r.durationMs}ms) ${r.summary || ""}`);
    if (!r.passed) allPassed = false;
  }

  if (!allPassed) process.exit(1);
  ok("All gates passed");
}

function cmdPause() {
  const goalId = requireArg("--goalId", "goalId");
  if (!validateGoalId(goalId)) fail(`Invalid goalId: ${goalId}`);

  const state = readState(goalId);
  if (!state) fail(`Goal not found: ${goalId}`);
  if (state.status !== "ACTIVE") fail(`Goal is not ACTIVE (current: ${state.status})`);

  applyTransition(state, "PAUSED", state.owner);
  writeState(goalId, state);
  removeLockForGoal(goalId);
  writeHistoryEvent(goalId, "active-to-paused", { by: state.owner });
  reindex();

  ok("Goal paused", goalId);
}

function cmdBlock() {
  const goalId = requireArg("--goalId", "goalId");
  const reason = requireArg("--reason", "reason");
  if (!validateGoalId(goalId)) fail(`Invalid goalId: ${goalId}`);

  const state = readState(goalId);
  if (!state) fail(`Goal not found: ${goalId}`);
  if (state.status !== "ACTIVE") fail(`Goal is not ACTIVE (current: ${state.status})`);

  applyTransition(state, "BLOCKED_EXTERNAL", state.owner);
  writeState(goalId, state);
  removeLockForGoal(goalId);

  const findingsPath = goalsPath(goalId, "findings.md");
  mkdirSync(dirname(findingsPath), { recursive: true });
  const entry = `\n## ${nowISO()} — BLOCKER\n\nReason: ${reason}\n`;
  if (existsSync(findingsPath)) writeFileSync(findingsPath, readFileSync(findingsPath, "utf8") + entry, "utf8");
  else writeFileSync(findingsPath, `# Findings — ${goalId}\n${entry}`, "utf8");

  writeHistoryEvent(goalId, "active-to-blocked", { reason, by: state.owner });
  reindex();

  ok("Goal blocked", goalId);
  ok("Reason", reason);
}

function cmdResume() {
  const goalId = requireArg("--goalId", "goalId");
  if (!validateGoalId(goalId)) fail(`Invalid goalId: ${goalId}`);

  const state = readState(goalId);
  if (!state) fail(`Goal not found: ${goalId}`);
  if (!RESUMABLE_STATUSES.includes(state.status)) fail(`Goal is not resumable (current: ${state.status})`);

  const branch = currentBranch();
  if (state.branch && state.branch !== branch) {
    fail(`Goal was created on branch "${state.branch}" but current branch is "${branch}". Switch branches or abort.`);
  }

  const lock = readLock();
  if (lock && !isLockStale(lock)) fail(`Worktree already locked by active goal: ${lock.goalId}`);
  if (lock && isLockStale(lock)) { removeLock(); }

  applyTransition(state, "ACTIVE", state.owner);
  state.branch = branch;
  writeState(goalId, state);
  createLock(goalId, branch, resolveRoot(), state.owner);
  writeHistoryEvent(goalId, `${state.previousStatus.toLowerCase()}-to-active`, { by: state.owner, branch });
  reindex();

  ok("Goal resumed", goalId);
  ok("Status", "ACTIVE");
}

function cmdComplete() {
  const goalId = requireArg("--goalId", "goalId");
  if (!validateGoalId(goalId)) fail(`Invalid goalId: ${goalId}`);

  const state = readState(goalId);
  if (!state) fail(`Goal not found: ${goalId}`);
  if (state.status !== "ACTIVE") fail(`Goal is not ACTIVE (current: ${state.status})`);

  const evCheck = validateEvidenceComplete(goalId, state.evidenceRequired);
  if (!evCheck.valid) fail(`Cannot complete: ${evCheck.reason}`);

  if (state.validationGates && state.validationGates.length > 0) {
    console.log(`Running ${state.validationGates.length} validation gate(s)...`);
    const results = runGates(goalId, state.validationGates);
    let allPassed = true;
    for (const r of results) {
      const icon = r.passed ? "PASS" : "FAIL";
      console.log(`  [${icon}] ${r.gate} (${r.durationMs}ms) ${r.summary || ""}`);
      if (!r.passed) allPassed = false;
    }
    if (!allPassed) fail("Validation gates failed");
  }

  applyTransition(state, "COMPLETED", state.owner);
  writeState(goalId, state);
  removeLockForGoal(goalId);

  const reportPath = goalsPath(goalId, "final-report.md");
  const validation = readValidation(goalId);
  const evidenceCount = validation?.evidence?.length || 0;
  const reportContent = `# Final Report — ${goalId}\n\n> Goal: ${state.title}\n> Owner: ${state.owner}\n> Sprint: ${state.sprintId}\n> Status: COMPLETED\n> Closed: ${nowISO()}\n\n## Evidencia\n\n- ${evidenceCount} evidence item(s) submitted\n- Required type: ${state.evidenceRequired}\n`;
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, reportContent, "utf8");

  writeHistoryEvent(goalId, "active-to-completed", { by: state.owner });
  reindex();

  ok("Goal completed", goalId);
  ok("Evidence", `${evidenceCount} item(s)`);
}

function cmdAbort() {
  const goalId = requireArg("--goalId", "goalId");
  const reason = requireArg("--reason", "reason");
  if (!validateGoalId(goalId)) fail(`Invalid goalId: ${goalId}`);

  const state = readState(goalId);
  if (!state) fail(`Goal not found: ${goalId}`);
  if (TERMINAL_STATUSES.includes(state.status)) fail(`Goal is already in terminal state: ${state.status}`);

  applyTransition(state, "ABORTED_CRITICAL_DEVIATION", state.owner);
  writeState(goalId, state);

  if (readLock()) {
    removeLockForGoal(goalId);
  }

  const reportPath = goalsPath(goalId, "final-report.md");
  const reportContent = `# Final Report — ${goalId}\n\n> Goal: ${state.title}\n> Owner: ${state.owner}\n> Sprint: ${state.sprintId}\n> Status: ABORTED_CRITICAL_DEVIATION\n> Closed: ${nowISO()}\n\n## Reason\n\n${reason}\n`;
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, reportContent, "utf8");

  writeHistoryEvent(goalId, "aborted", { reason, by: state.owner });
  reindex();

  ok("Goal aborted", goalId);
  ok("Reason", reason);
}

function cmdStatus() {
  const goalId = getArg("--goalId");
  if (goalId) {
    if (!validateGoalId(goalId)) fail(`Invalid goalId: ${goalId}`);
    const state = readState(goalId);
    if (!state) fail(`Goal not found: ${goalId}`);
    console.log(JSON.stringify(state, null, 2));
  } else {
    const index = reindex();
    const lock = readLock();

    if (lock && !isLockStale(lock)) {
      console.log(`Active lock: ${lock.goalId} (by ${lock.owner}, started ${lock.startedAt})`);
    }

    if (!index.goals || index.goals.length === 0) {
      console.log("No goals found.");
    } else {
      for (const g of index.goals) {
        const marker = g.status === "ACTIVE" ? " *" : g.status === "PAUSED" ? " !" : g.status === "BLOCKED_EXTERNAL" ? " B" : "";
        console.log(`  ${g.goalId.padEnd(52)} ${g.status.padEnd(22)} ${g.owner.padEnd(10)} ${g.title}${marker}`);
      }
    }
  }
}

function cmdReindex() {
  const index = reindex();
  ok("Index regenerated", `${index.goals.length} goal(s)`);
}

// ─── Main ───

const subcommand = process.argv[2];

if (!subcommand || subcommand === "--help" || subcommand === "-h") {
  usage();
  process.exit(0);
}

switch (subcommand) {
  case "create": cmdCreate(); break;
  case "plan-record": cmdPlanRecord(); break;
  case "activate": cmdActivate(); break;
  case "gates-set": cmdGatesSet(); break;
  case "step-start": cmdStepStart(); break;
  case "step-complete": cmdStepComplete(); break;
  case "finding-add": cmdFindingAdd(); break;
  case "evidence-add": cmdEvidenceAdd(); break;
  case "validate": cmdValidate(); break;
  case "pause": cmdPause(); break;
  case "block": cmdBlock(); break;
  case "resume": cmdResume(); break;
  case "complete": cmdComplete(); break;
  case "abort": cmdAbort(); break;
  case "status": cmdStatus(); break;
  case "reindex": cmdReindex(); break;
  default:
    console.error(`Unknown subcommand: ${subcommand}`);
    usage();
    process.exit(2);
}
