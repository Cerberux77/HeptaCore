import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEMP = join(tmpdir(), `goal-runner-pause-resume-${Date.now()}`);
process.env.GOAL_RUNNER_TEST_ROOT = TEMP;

const GOALS_DIR = join(TEMP, "var", "goal-runner", "goals");

describe("Pause and Resume", () => {
  let lib;

  before(async () => {
    rmSync(TEMP, { recursive: true, force: true });
    mkdirSync(GOALS_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEMP, { recursive: true, force: true });
  });

  async function createActiveGoal(goalId, title) {
    lib = await import("../lib.mjs");
    const goalDir = join(GOALS_DIR, goalId);
    mkdirSync(goalDir, { recursive: true });
    const state = {
      goalId, title, owner: "Manuel", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "test-branch", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      previousStatus: "READY",
      createdAt: "2026-06-25T19:00:00.000Z", updatedAt: "2026-06-25T19:00:00.000Z",
      transitions: [{ from: "READY", to: "ACTIVE", at: "2026-06-25T19:00:00.000Z", by: "Manuel" }]
    };
    writeFileSync(join(goalDir, "state.json"), JSON.stringify(state) + "\n", "utf8");
    lib.createLock(goalId, "test-branch", TEMP, "Manuel");
    return state;
  }

  it("pause: ACTIVE -> PAUSED, lock removed", async () => {
    const goalId = "GR-20260625T192236Z-a1b2c3d4-pause-test";
    await createActiveGoal(goalId, "Pause Test");

    const state = lib.readState(goalId);
    assert.ok(state);
    assert.equal(state.status, "ACTIVE");
    assert.ok(lib.readLock());

    lib.applyTransition(state, "PAUSED", "Manuel");
    lib.writeState(goalId, state);
    lib.removeLockForGoal(goalId);

    const updated = lib.readState(goalId);
    assert.equal(updated.status, "PAUSED");
    assert.equal(lib.readLock(), null);
  });

  it("resume: PAUSED -> ACTIVE, lock created", async () => {
    const goalId = "GR-20260625T192236Z-b5c6d7e8-resume-test";
    await createActiveGoal(goalId, "Resume Test");

    let state = lib.readState(goalId);
    lib.applyTransition(state, "PAUSED", "Manuel");
    lib.writeState(goalId, state);
    lib.removeLockForGoal(goalId);

    state = lib.readState(goalId);
    assert.equal(state.status, "PAUSED");

    lib.applyTransition(state, "ACTIVE", "Manuel");
    state.branch = "test-branch";
    lib.writeState(goalId, state);
    lib.createLock(goalId, "test-branch", TEMP, "Manuel");

    state = lib.readState(goalId);
    assert.equal(state.status, "ACTIVE");
    assert.ok(lib.readLock());
    lib.removeLockForGoal(goalId);
  });

  it("resume: BLOCKED_EXTERNAL -> ACTIVE", async () => {
    const goalId = "GR-20260625T192236Z-c9d0e1f2-block-resume";
    lib.removeLock();
    await createActiveGoal(goalId, "Block Resume Test");

    let state = lib.readState(goalId);
    lib.applyTransition(state, "BLOCKED_EXTERNAL", "Manuel");
    lib.writeState(goalId, state);
    lib.removeLockForGoal(goalId);

    state = lib.readState(goalId);
    assert.equal(state.status, "BLOCKED_EXTERNAL");

    lib.applyTransition(state, "ACTIVE", "Manuel");
    state.branch = "test-branch";
    lib.writeState(goalId, state);
    lib.createLock(goalId, "test-branch", TEMP, "Manuel");

    state = lib.readState(goalId);
    assert.equal(state.status, "ACTIVE");
    lib.removeLockForGoal(goalId);
  });

  it("cannot resume from COMPLETED", async () => {
    const goalId = "GR-20260625T192236Z-d3e4f5a6-done-resume";
    lib.removeLock();
    await createActiveGoal(goalId, "Done Resume");

    let state = lib.readState(goalId);
    lib.applyTransition(state, "COMPLETED", "Manuel");
    lib.writeState(goalId, state);
    lib.removeLockForGoal(goalId);

    assert.throws(() => {
      lib.applyTransition(state, "ACTIVE", "Manuel");
    }, /terminal/);
  });
});
