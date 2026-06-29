import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEMP = join(tmpdir(), `goal-runner-lock-excl-${Date.now()}`);
process.env.GOAL_RUNNER_TEST_ROOT = TEMP;

const MOCK_GR = join(TEMP, "var", "goal-runner");
const MOCK_LOCK = join(MOCK_GR, ".active-worktree.json");
const GOALS = join(MOCK_GR, "goals");

describe("Lock Exclusivity", () => {
  let lib;

  before(async () => {
    rmSync(TEMP, { recursive: true, force: true });
    mkdirSync(GOALS, { recursive: true });
    lib = await import("../lib.mjs");
  });

  after(() => {
    rmSync(TEMP, { recursive: true, force: true });
  });

  function writeLock(data) {
    mkdirSync(MOCK_GR, { recursive: true });
    writeFileSync(MOCK_LOCK, JSON.stringify(data) + "\n", "utf8");
  }

  it("readLock returns null when no lock exists", () => {
    try { rmSync(MOCK_LOCK, { force: true }); } catch {}
    assert.equal(lib.readLock(), null);
  });

  it("stale lock on wrong worktreeRoot", () => {
    writeLock({
      goalId: "GR-20260625T192236Z-a1b2c3d4-test-goal",
      branch: "test-branch", worktreeRoot: "/nowhere",
      owner: "Test", startedAt: "2026-06-25T19:00:00.000Z", pid: 99999
    });
    assert.ok(lib.readLock());
    assert.equal(lib.isLockStale({ goalId: "GR-20260625T192236Z-a1b2c3d4-test-goal", worktreeRoot: "/nowhere" }), true);
  });

  it("stale lock on different branch", () => {
    writeLock({
      goalId: "GR-20260625T192236Z-a1b2c3d4-branch-test",
      branch: "different-branch", worktreeRoot: TEMP,
      owner: "Test", startedAt: "2026-06-25T19:00:00.000Z", pid: 99999
    });
    const lock = { goalId: "GR-20260625T192236Z-a1b2c3d4-branch-test", worktreeRoot: TEMP, branch: "different-branch" };
    assert.equal(lib.isLockStale(lock), true);
  });

  it("non-existent goal state makes lock stale", () => {
    writeLock({
      goalId: "GR-20260625T192236Z-a1b2c3d4-no-state", branch: "test-branch",
      worktreeRoot: TEMP, owner: "Test",
      startedAt: "2026-06-25T19:00:00.000Z", pid: 99999
    });
    const lock = { goalId: "GR-20260625T192236Z-a1b2c3d4-no-state", worktreeRoot: TEMP, branch: "test-branch" };
    assert.equal(lib.isLockStale(lock), true);
  });

  it("stale lock has invalid goalId format", () => {
    writeLock({
      goalId: "not-a-valid-goal-id", branch: "test-branch",
      worktreeRoot: TEMP, owner: "Test",
      startedAt: "2026-06-25T19:00:00.000Z", pid: 99999
    });
    const lock = { goalId: "not-a-valid-goal-id", worktreeRoot: TEMP, branch: "test-branch" };
    assert.equal(lib.isLockStale(lock), true);
  });

  it("removeLockForGoal removes only matching lock", () => {
    lib.removeLock();
    const goalId1 = "GR-20260625T192236Z-a1b2c3d4-lock-a";
    const goalDir1 = join(GOALS, goalId1);
    mkdirSync(goalDir1, { recursive: true });
    writeFileSync(join(goalDir1, "state.json"), JSON.stringify({
      goalId: goalId1, title: "A", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "UNKNOWN", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    }) + "\n", "utf8");

    lib.createLock(goalId1, "UNKNOWN", TEMP, "Manuel");
    assert.ok(lib.readLock());

    lib.removeLockForGoal("GR-20260625T192236Z-b5c6d7e8-other-goal");
    assert.ok(lib.readLock(), "Lock should still exist for goalId1");

    lib.removeLockForGoal(goalId1);
    assert.equal(lib.readLock(), null, "Lock should be removed for goalId1");
  });

  it("abort doesn't remove lock from another goal", () => {
    lib.removeLock();
    const goalId1 = "GR-20260625T192236Z-a1b2c3d4-keep-lock";
    const goalDir1 = join(GOALS, goalId1);
    mkdirSync(goalDir1, { recursive: true });
    writeFileSync(join(goalDir1, "state.json"), JSON.stringify({
      goalId: goalId1, title: "Keep", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "UNKNOWN", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    }) + "\n", "utf8");

    lib.createLock(goalId1, "UNKNOWN", TEMP, "Manuel");
    assert.ok(lib.readLock());

    lib.removeLockForGoal("GR-20260625T192236Z-b5c6d7e8-other");
    assert.ok(lib.readLock(), "Lock for goalId1 should remain");
  });
});
