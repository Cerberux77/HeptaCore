import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEMP = join(tmpdir(), `goal-runner-terminal-${Date.now()}`);
process.env.GOAL_RUNNER_TEST_ROOT = TEMP;

const GOALS_DIR = join(TEMP, "var", "goal-runner", "goals");

describe("Terminal State Immutability", () => {
  before(() => {
    rmSync(TEMP, { recursive: true, force: true });
    mkdirSync(GOALS_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEMP, { recursive: true, force: true });
  });

  function createGoal(goalId, status) {
    const goalDir = join(GOALS_DIR, goalId);
    mkdirSync(goalDir, { recursive: true });
    const state = {
      goalId, title: "Terminal Test", owner: "Manuel", sprintId: "S-HC-TEST",
      status, branch: "test", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
      transitions: [{ from: "ACTIVE", to: status, at: "2026-01-01T00:00:00.000Z", by: "Manuel" }]
    };
    writeFileSync(join(goalDir, "state.json"), JSON.stringify(state) + "\n", "utf8");
    return state;
  }

  it("COMPLETED rejects all transitions", async () => {
    const { validateTransition } = await import("../lib.mjs");
    const states = ["ACTIVE", "PAUSED", "DRAFT", "READY", "BLOCKED_EXTERNAL", "COMPLETED", "ABORTED_CRITICAL_DEVIATION"];
    for (const to of states) {
      const result = validateTransition("COMPLETED", to);
      assert.equal(result.valid, false, `COMPLETED -> ${to} should be rejected`);
    }
  });

  it("ABORTED_CRITICAL_DEVIATION rejects all transitions", async () => {
    const { validateTransition } = await import("../lib.mjs");
    const states = ["ACTIVE", "PAUSED", "DRAFT", "READY", "BLOCKED_EXTERNAL", "COMPLETED", "ABORTED_CRITICAL_DEVIATION"];
    for (const to of states) {
      const result = validateTransition("ABORTED_CRITICAL_DEVIATION", to);
      assert.equal(result.valid, false, `ABORTED -> ${to} should be rejected`);
    }
  });

  it("applyTransition throws on terminal state", async () => {
    const { applyTransition, readState } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2-completed";
    createGoal(goalId, "COMPLETED");

    const state = readState(goalId);
    assert.throws(() => applyTransition(state, "ACTIVE", "Manuel"), /terminal/);
    assert.throws(() => applyTransition(state, "PAUSED", "Manuel"), /terminal/);
  });

  it("applyTransition throws on aborted state", async () => {
    const { applyTransition, readState } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2-aborted";
    createGoal(goalId, "ABORTED_CRITICAL_DEVIATION");

    const state = readState(goalId);
    assert.throws(() => applyTransition(state, "ACTIVE", "Manuel"), /terminal/);
    assert.throws(() => applyTransition(state, "DRAFT", "Manuel"), /terminal/);
  });

  it("applyTransition works on non-terminal states", async () => {
    const { applyTransition, readState } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2-active";
    createGoal(goalId, "ACTIVE");

    const state = readState(goalId);
    applyTransition(state, "PAUSED", "Manuel");
    assert.equal(state.status, "PAUSED");
  });
});
