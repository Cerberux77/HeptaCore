import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const boardPath = path.join(root, "var", "oreshnik", "task-board.json");
const tasksDir = path.join(root, "var", "oreshnik", "tasks");
const taskId = "HC-ORESHNIK-RECOVERY-ALPHA6";
const taskArtifactPath = path.join(tasksDir, `${taskId}.json`);
const goalDir = path.join(root, "docs", "goals");
const goalPath = path.join(goalDir, `${taskId}.md`);
const now = new Date().toISOString();

const board = JSON.parse(fs.readFileSync(boardPath, "utf8").replace(/^\uFEFF/, ""));

const task = {
  id: taskId,
  title: "Upgrade HeptaCore governance to Oreshnik 0.3.0-alpha.6 and reconcile control plane",
  owner: "Manuel",
  backupOwner: "Manuel",
  status: "ready",
  track: "recovery",
  zone: [
    "package.json",
    "package-lock.json",
    "vendor/oreshnik/**",
    "scripts/oreshnik/**",
    ".kilo/commands/**",
    ".kilo/command/**",
    "docs/oreshnik/**",
    "docs/operations/oreshnik-command-catalog.json",
    "docs/07_handoffs/**"
  ],
  readZones: [
    ".oreshnik.json",
    "var/oreshnik/**",
    "docs/07_handoffs/zone-map.json",
    ".github/workflows/oreshnik-digital-twin.yml"
  ],
  writeZones: [
    "package.json",
    "package-lock.json",
    "vendor/oreshnik/**",
    "scripts/oreshnik/**",
    ".kilo/commands/**",
    ".kilo/command/**",
    "docs/oreshnik/**",
    "docs/operations/oreshnik-command-catalog.json",
    "docs/07_handoffs/**"
  ],
  resources: [
    "GitHub issue #22",
    "docs/oreshnik/ORESHNIK_CONSUMER_ADOPTION.md",
    "docs/goals/HC-ORESHNIK-RECOVERY-ALPHA6.md",
    "Oreshnik release v0.3.0-alpha.6",
    "release commit 3e4345b76238e18da8e4d259f537f0e9c64ce099",
    "release SHA-256 66E0E6683CDF9587A873B27F20DD8C8538199EB511068E9C40B682CEADB176E8"
  ],
  capabilities: [
    "oreshnik-governance",
    "git",
    "nodejs",
    "supply-chain-verification",
    "control-plane-recovery",
    "release-adoption"
  ],
  gates: [
    "npm run oreshnik:ready",
    "node node_modules/oreshnik-cli/dist/cli.js --version",
    "npm run typecheck",
    "npm run build",
    "npm run test",
    "npm run worker:validate",
    "oreshnik reconcile --check --json",
    "git diff --check"
  ],
  priority: "critical",
  validationExpectations: [
    "Exact Oreshnik 0.3.0-alpha.6 release identity and SHA-256 are verified before adoption",
    "No floating or latest dependency is introduced",
    "Current alpha.16 vendored package remains available as rollback",
    "Remote oreshnik/control is reconciled through Oreshnik commands rather than manual JSON edits",
    "Installed CLI reports exactly 0.3.0-alpha.6",
    "Consumer readiness and full HeptaCore gates pass after adoption",
    "Command catalog is regenerated from the exact installed alpha6 CLI",
    "No product feature, production deployment, live publication, spend, credential or env mutation occurs"
  ],
  evidenceType: "integration",
  dependsOn: [],
  acceptance: [
    "Vendored alpha6 release asset matches SHA-256 66E0E6683CDF9587A873B27F20DD8C8538199EB511068E9C40B682CEADB176E8",
    "package.json and package-lock.json resolve the exact vendored alpha6 package",
    "node node_modules/oreshnik-cli/dist/cli.js --version returns 0.3.0-alpha.6",
    "npm run oreshnik:ready passes with the alpha6 contract",
    "Remote oreshnik/control has no stale active ownership blocking operator manuel",
    "Oreshnik command catalog is regenerated from alpha6",
    "npm run typecheck, npm run build, npm run test and npm run worker:validate pass",
    "Rollback to the retained alpha16 vendored package is documented and verified",
    "Canonical evidence and handoff freeze the new HeptaCore governance baseline",
    "No product feature or production mutation is mixed into this Run"
  ],
  handoff: "docs/07_handoffs/HC-ORESHNIK-RECOVERY-ALPHA6.md",
  attempts: 0,
  taskExecutionPolicy: {
    riskLevel: "critical",
    recommendedReasoning: "max",
    reviewMode: "strict",
    requiredCapabilities: [
      "oreshnik-governance",
      "git",
      "supply-chain-verification",
      "control-plane-recovery"
    ],
    independentReviewRequired: false,
    requiredReviewRoles: ["validator"],
    humanApprovalRequired: false,
    maxCorrectionCycles: 3,
    requiredGates: [
      "oreshnik:ready",
      "oreshnik-version",
      "typecheck",
      "build",
      "test",
      "worker:validate",
      "reconcile",
      "git-diff-check"
    ],
    evidenceRequirements: ["release-digest", "governance", "gates", "rollback", "canonical-handoff"]
  },
  history: [
    {
      at: now,
      action: "canonically_registered",
      operator: "manuel",
      description: "Owner-authorized durable bootstrap registration under pinned alpha.16. Alpha.16 predates canonical `task register`; HeptaCore already uses durable per-Task artifacts, so this compatibility bootstrap writes the Task artifact plus Goal and then delegates all projection/control-plane mutation back to Oreshnik reconcile and dispatch."
    }
  ]
};

const terminalOrOwned = new Set(["claimed", "active", "validating", "ready_for_integration", "integrated", "done"]);
if (fs.existsSync(taskArtifactPath)) {
  const existingArtifact = JSON.parse(fs.readFileSync(taskArtifactPath, "utf8").replace(/^\uFEFF/, ""));
  if (terminalOrOwned.has(existingArtifact.status)) {
    console.log(JSON.stringify({ changed: false, reason: `existing durable task preserved in status ${existingArtifact.status}`, taskId }, null, 2));
    process.exit(0);
  }
}

const sprintOrderIndex = Math.max(0, board.currentExecutionOrder.indexOf(task.track));
const existingIndex = board.tasks.findIndex((entry) => entry.id === taskId);
const taskOrderIndex = existingIndex >= 0 ? existingIndex : board.tasks.length;

const artifact = {
  project: board.project,
  taskId,
  sprint: task.track,
  sprintOrderIndex,
  taskOrderIndex,
  title: task.title,
  owner: task.owner,
  backupOwner: task.backupOwner,
  status: task.status,
  taskBoardPath: "var/oreshnik/task-board.json",
  zone: task.zone,
  readZones: task.readZones,
  writeZones: task.writeZones,
  resources: task.resources,
  capabilities: task.capabilities,
  gates: task.gates,
  priority: task.priority,
  validationExpectations: task.validationExpectations,
  evidenceType: task.evidenceType,
  dependsOn: task.dependsOn,
  acceptance: task.acceptance,
  handoff: task.handoff,
  attempts: 0,
  taskExecutionPolicy: task.taskExecutionPolicy,
  history: task.history,
  updatedAt: now,
  runs: []
};

const goalMarkdown = `# ${taskId}\n\n## Objective\n\nRecover HeptaCore governance before further product development by adopting the exact Oreshnik \`0.3.0-alpha.6\` release, reconciling the remote control plane, preserving alpha16 rollback, and freezing a clean governed baseline.\n\n## Operator and harness\n\n- Operator: \`manuel\`\n- Harness: \`chatgpt\`\n- Mother: \`master\`\n- Control plane: \`oreshnik/control\`\n\n## Release identity\n\n- Version: \`0.3.0-alpha.6\`\n- Commit: \`3e4345b76238e18da8e4d259f537f0e9c64ce099\`\n- SHA-256: \`66E0E6683CDF9587A873B27F20DD8C8538199EB511068E9C40B682CEADB176E8\`\n- Rollback: retained vendored \`0.2.0-alpha.16\`\n\n## Hard stops\n\n- No product features.\n- No production deployment.\n- No live social publication or campaign spend.\n- No credentials, passwords, tokens or env contents in Git/evidence.\n- No floating dependency and no manual edits to remote control-plane JSON.\n\n## Terminal acceptance\n\nThe Run may advance only after exact release verification, alpha6 consumer readiness, control-plane reconciliation, command-catalog regeneration, full HeptaCore gates, rollback evidence, and canonical handoff all pass.\n`;

fs.mkdirSync(tasksDir, { recursive: true });
fs.mkdirSync(goalDir, { recursive: true });
fs.writeFileSync(taskArtifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
fs.writeFileSync(goalPath, goalMarkdown, "utf8");

if (existingIndex >= 0) board.tasks[existingIndex] = task;
else board.tasks.push(task);
if (!board.currentExecutionOrder.includes(taskId)) board.currentExecutionOrder.push(taskId);
board.updatedAt = now;
fs.writeFileSync(boardPath, `${JSON.stringify(board, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  changed: true,
  taskId,
  status: "ready",
  taskArtifactPath,
  goalPath,
  boardPath,
  bootstrapMode: "alpha16-durable-task-compatibility"
}, null, 2));
