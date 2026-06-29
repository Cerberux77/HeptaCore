import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { mkdirSync, rmSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEMP = join(tmpdir(), `goal-runner-lock-lifecycle-${Date.now()}`);
process.env.GOAL_RUNNER_TEST_ROOT = TEMP;

const GR_DIR = join(TEMP, "var", "goal-runner");
const GOALS_DIR = join(GR_DIR, "goals");
const LOCK_FILE = join(GR_DIR, ".active-worktree.json");

describe("Lock Lifecycle", () => {
  let lib;

  before(async () => {
    rmSync(TEMP, { recursive: true, force: true });
    mkdirSync(GOALS_DIR, { recursive: true });
    lib = await import("../lib.mjs");
  });

  after(() => {
    rmSync(TEMP, { recursive: true, force: true });
    delete process.env.GOAL_RUNNER_TEST_ROOT;
  });

  it("createLock writes a valid lock file when worktree is clean", () => {
    const goalId = "GR-20260625T192236Z-a1b2c3d4-lifecycle";
    const goalDir = join(GOALS_DIR, goalId);
    mkdirSync(goalDir, { recursive: true });
    writeFileSync(join(goalDir, "state.json"), JSON.stringify({
      goalId, title: "Test", owner: "Test", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "UNKNOWN", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-06-25T19:00:00.000Z", updatedAt: "2026-06-25T19:00:00.000Z", transitions: []
    }) + "\n", "utf8");

    if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE);

    const lock = lib.createLock(goalId, "UNKNOWN", TEMP, "Test");
    assert.ok(lock);
    assert.equal(lock.goalId, goalId);
    assert.equal(lock.branch, "UNKNOWN");
    assert.equal(lock.worktreeRoot, TEMP);
    assert.ok(lib.readLock());
  });

  it("removeLockForGoal removes the lock file", () => {
    lib.removeLockForGoal("GR-20260625T192236Z-a1b2c3d4-lifecycle");
    assert.equal(lib.readLock(), null);
  });

  it("isLockStale returns true for null lock", () => {
    assert.equal(lib.isLockStale(null), true);
  });

  it("isLockStale returns true for lock with non-existent goal state", () => {
    lib.removeLock();
    lib.writeJson(LOCK_FILE, {
      goalId: "GR-20260625T192236Z-a1b2c3d4-fake", branch: "test-branch",
      worktreeRoot: TEMP, owner: "Test",
      startedAt: "2026-06-25T19:00:00.000Z", pid: 99999
    });
    const lock = lib.readLock();
    assert.ok(lock);
    assert.equal(lib.isLockStale(lock), true);
  });

  it("isLockStale returns true for wrong worktreeRoot", () => {
    assert.equal(lib.isLockStale({ goalId: "GR-20260625T192236Z-a1b2c3d4-any", worktreeRoot: "/nowhere", branch: "test" }), true);
  });

  it("second createLock with valid lock throws", () => {
    lib.removeLock();
    const goalId1 = "GR-20260625T192236Z-a1b2c3d4-lock-1";
    const goalDir1 = join(GOALS_DIR, goalId1);
    mkdirSync(goalDir1, { recursive: true });
    lib.writeState(goalId1, {
      goalId: goalId1, title: "Lock 1", owner: "Test", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "UNKNOWN", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-06-25T19:00:00.000Z", updatedAt: "2026-06-25T19:00:00.000Z", transitions: []
    });
    lib.createLock(goalId1, "UNKNOWN", TEMP, "Test");
    assert.ok(existsSync(LOCK_FILE));
    assert.throws(() => {
      lib.createLock("GR-20260625T192236Z-b5c6d7e8-lock-2", "UNKNOWN", TEMP, "Test");
    }, /already locked/);
  });
});
