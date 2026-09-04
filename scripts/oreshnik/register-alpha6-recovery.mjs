import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const boardPath = path.join(root, "var", "oreshnik", "task-board.json");
const taskId = "HC-ORESHNIK-RECOVERY-ALPHA6";
const now = new Date().toISOString();

const board = JSON.parse(fs.readFileSync(boardPath, "utf8").replace(/^\uFEFF/, ""));

const task = {
  id: taskId,
  title: "Upgrade HeptaCore governance to Oreshnik 0.3.0-alpha.6 and reconcile control plane",
  owner: "Manuel",
  backupOwner: "Manuel",
  status: "ready",
  track: "governance-recovery",
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
  evidenceType: "governance-recovery",
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
  executionRecommendation: {
    requiredCapabilities: [
      "oreshnik-governance",
      "git",
      "nodejs",
      "supply-chain-verification",
      "control-plane-recovery"
    ],
    preferredHarnesses: ["chatgpt"],
    modelClass: "gpt-5.6-sol",
    reasoningClass: "maximum",
    rationale: [
      "Owner explicitly authorized operator manuel with ChatGPT harness",
      "Governance recovery must precede every further HeptaCore product task"
    ]
  },
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
      description: "Owner-authorized versioned bootstrap registration under pinned alpha.16. This compatibility exception exists only because alpha.16 predates canonical `task register`; registration must be followed immediately by Oreshnik reconcile and remote dispatch before any implementation mutation."
    }
  ]
};

const existingIndex = board.tasks.findIndex((entry) => entry.id === taskId);
if (existingIndex >= 0) {
  const existing = board.tasks[existingIndex];
  if (["claimed", "active", "validating", "ready_for_integration", "integrated", "done"].includes(existing.status)) {
    console.log(JSON.stringify({ changed: false, reason: `existing task preserved in status ${existing.status}`, taskId }, null, 2));
    process.exit(0);
  }
  board.tasks[existingIndex] = {
    ...existing,
    ...task,
    history: [...(existing.history || []), ...task.history]
  };
} else {
  board.tasks.push(task);
}

if (!board.currentExecutionOrder.includes(taskId)) {
  board.currentExecutionOrder.unshift(taskId);
}
board.updatedAt = now;

fs.writeFileSync(boardPath, `${JSON.stringify(board, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ changed: true, taskId, status: "ready", boardPath }, null, 2));
