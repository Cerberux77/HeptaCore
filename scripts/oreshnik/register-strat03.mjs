import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const boardPath = path.join(root, "var", "oreshnik", "task-board.json");
const taskId = "S-HC-STRAT-03-INTAKE-TO-ACTIVE-STRATEGY";
const now = new Date().toISOString();

const board = JSON.parse(fs.readFileSync(boardPath, "utf8").replace(/^\uFEFF/, ""));

const task = {
  id: taskId,
  title: "End-to-end intake, generated strategy persistence, approval and calendar materialization",
  owner: "Manuel",
  backupOwner: "Manuel",
  status: "ready",
  track: "strategy",
  zone: [
    "apps/web/components/dashboard-console.tsx",
    "apps/web/app/api/strategy/**",
    "apps/web/lib/**strategy**",
    "apps/web/lib/dashboard.ts",
    "packages/agents/src/**",
    "packages/core/src/**strategy**",
    "docs/oreshnik/**",
    "docs/07_handoffs/**",
    "apps/web/lib/__tests__/**",
    "packages/agents/src/**/*.test.*"
  ],
  readZones: [
    "packages/db/prisma/schema.prisma",
    "apps/web/lib/auth*",
    "apps/web/app/api/auth/**",
    "publishing provider adapters"
  ],
  writeZones: [
    "apps/web/components/dashboard-console.tsx",
    "apps/web/app/api/strategy/**",
    "apps/web/lib/**strategy**",
    "apps/web/lib/dashboard.ts",
    "packages/agents/src/**",
    "packages/core/src/**strategy**",
    "docs/oreshnik/**",
    "docs/07_handoffs/**",
    "apps/web/lib/__tests__/**",
    "packages/agents/src/**/*.test.*"
  ],
  resources: [
    "docs/oreshnik/S-HC-STRAT-03-INTAKE-TO-ACTIVE-STRATEGY.md",
    "docs/oreshnik/S-HC-STRAT-03-OPERATOR-AUTHORIZATION.md",
    "var/oreshnik/cloud/requests/S-HC-STRAT-03-INTAKE-TO-ACTIVE-STRATEGY.json",
    "GitHub issue #16"
  ],
  capabilities: [
    "codex",
    "typescript",
    "nextjs",
    "multi-tenant",
    "strategy-generation",
    "transactional-activation",
    "timezone-scheduling",
    "testing"
  ],
  gates: [
    "npm run oreshnik:ready",
    "npm run typecheck",
    "npm run build",
    "npm run test",
    "npm run worker:validate",
    "oreshnik reconcile --check --json",
    "git diff --check"
  ],
  priority: "critical",
  validationExpectations: [
    "Exact current intake is used by generation",
    "Generated strategy persists and is versioned",
    "Approval and activation are explicit, transactional and idempotent",
    "Local IANA schedules are converted to correct UTC instants",
    "Provider/model/fallback state is unambiguous",
    "No live publisher call, campaign spend or production deployment occurs",
    "Tenant isolation and canonical role checks are preserved",
    "Focused tests and all repository gates pass"
  ],
  evidenceType: "integration",
  dependsOn: [],
  acceptance: [
    "A tenant can enter a structured intake without pasting a completed strategy",
    "Generation uses the exact current form values, networks, timezone and start date",
    "A strict four-week platform-specific strategy includes exact times, copy, scripts, assets, KPI and hypotheses",
    "Draft strategy persists across reload and successive generations create identifiable versions",
    "Human review, approval and activation lifecycle exists",
    "Activation transactionally materializes pillars, calendar-ready drafts and asset requirements",
    "Repeated activation creates no duplicate pillars or drafts",
    "Deterministic fallback is visibly distinct from real LLM generation",
    "No live social publication or campaign spend occurs",
    "Prisma, authentication and authorization remain unchanged unless an Oreshnik double lock is acquired",
    "Focused tests, full gates, evidence and canonical handoff pass",
    "Terminal state is READY_FOR_MANUAL_QA pending Manuel validation in Preview"
  ],
  handoff: "docs/07_handoffs/S-HC-STRAT-03-INTAKE-TO-ACTIVE-STRATEGY.md",
  attempts: 0,
  executionRecommendation: {
    requiredCapabilities: [
      "typescript",
      "nextjs",
      "multi-tenant",
      "transactional-workflows",
      "timezone-scheduling",
      "test-engineering"
    ],
    preferredHarnesses: ["codex"],
    modelClass: "gpt-5.6-sol",
    reasoningClass: "maximum",
    rationale: [
      "Critical cross-cutting correction spanning UX, APIs, structured LLM output, persistence, transactions, scheduling and tenant isolation",
      "Requires autonomous implementation plus focused and terminal validation",
      "Human owner authorized official Oreshnik control-plane recovery operations"
    ]
  },
  taskExecutionPolicy: {
    riskLevel: "critical",
    recommendedReasoning: "max",
    reviewMode: "strict",
    requiredCapabilities: [
      "typescript",
      "nextjs",
      "multi-tenant",
      "transactional-workflows",
      "timezone-scheduling",
      "test-engineering"
    ],
    independentReviewRequired: false,
    requiredReviewRoles: ["validator"],
    humanApprovalRequired: true,
    maxCorrectionCycles: 3,
    requiredGates: [
      "oreshnik:ready",
      "focused-strategy-tests",
      "typecheck",
      "build",
      "test",
      "worker:validate",
      "reconcile",
      "git-diff-check"
    ],
    evidenceRequirements: ["code", "integration", "ui", "canonical-handoff"]
  },
  history: [
    {
      at: now,
      action: "canonically_registered",
      operator: "manuel",
      description: "Owner-authorized versioned task-board registration because alpha.16 inject only derives lowercase IDs from note text and cannot preserve the approved canonical Task ID. Registration is followed by Oreshnik reconcile and dispatch control-plane reconciliation."
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
  board.currentExecutionOrder.push(taskId);
}
board.updatedAt = now;

fs.writeFileSync(boardPath, `${JSON.stringify(board, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ changed: true, taskId, status: "ready", boardPath }, null, 2));
