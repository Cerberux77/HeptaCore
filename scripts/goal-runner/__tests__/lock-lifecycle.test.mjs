import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { mkdirSync, rmSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEMP = join(tmpdir(), `goal-runner-lock-lifecycle-${Date.now()}`);
process.env.GOAL_RUNNER_TEST_ROOT = TEMP;

const GR_DIR = join(TEMP, "var", "goal-runner");
const GOALS_DIR = join(GR_DIR, "goals");
const LOCK_FILE = join(GR_DIR, ".active-worktree.json");

async function setup() {
  rmSync(TEMP, { recursive: true, force: true });
  mkdirSync(GOALS_DIR, { recursive: true });
}

async function teardown() {
  rmSync(TEMP, { recursive: true, force: true });
  delete process.env.GOAL_RUNNER_TEST_ROOT;
}

function freshImport() {
  // Clear module cache to re-read env var
  const cacheKey = Object.keys(require.cache || {}).find((k) => k.includes("goal-runner") && k.includes("lib.mjs"));
  // ESM doesn't have require.cache easily. Use dynamic import with timestamp.
  return null;
}

describe("Lock Lifecycle", () => {
  let lib;

  before(async () => {
    await setup();
  });

  after(async () => {
    await teardown();
  });

  it("createLock writes a valid lock file when worktree is clean", async () => {
    const { createLock, readLock, writeState } = await import("../lib.mjs");

    const goalId = "GR-20260625T192236Z-a1b2-lifecycle";
    const goalDir = join(GOALS_DIR, goalId);
    mkdirSync(goalDir, { recursive: true });

    const state = {
      goalId, title: "Test lifecycle", owner: "Test",
      sprintId: "S-HC-TEST", status: "ACTIVE", branch: "test-branch",
      baseSha: "abc123", evidenceRequired: "code", validationGates: [],
      createdAt: "2026-06-25T19:00:00.000Z", updatedAt: "2026-06-25T19:00:00.000Z",
      transitions: []
    };
    writeFileSync(join(goalDir, "state.json"), JSON.stringify(state) + "\n", "utf8");

    if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE);

    const lock = createLock(goalId, "test-branch", TEMP, "Test");
    assert.ok(lock);
    assert.equal(lock.goalId, goalId);
    assert.equal(lock.branch, "test-branch");
    assert.equal(lock.worktreeRoot, TEMP);

    const reread = readLock();
    assert.ok(reread);
    assert.equal(reread.goalId, goalId);
  });

  it("removeLock removes the lock file", async () => {
    const { readLock, removeLock } = await import("../lib.mjs");
    removeLock();
    const lock = readLock();
    assert.equal(lock, null);
  });

  it("isLockStale returns true for null lock", async () => {
    const { isLockStale } = await import("../lib.mjs");
    assert.equal(isLockStale(null), true);
  });

  it("isLockStale returns true for lock with non-existent goal state", async () => {
    const { isLockStale, writeJson } = await import("../lib.mjs");
    writeJson(LOCK_FILE, {
      goalId: "GR-20260625T192236Z-a1b2-fake-goal",
      branch: "test-branch", worktreeRoot: TEMP, owner: "Test",
      startedAt: "2026-06-25T19:00:00.000Z", pid: 99999
    });
    const lock = { goalId: "GR-20260625T192236Z-a1b2-fake-goal", worktreeRoot: TEMP, branch: "test-branch" };
    assert.equal(isLockStale(lock), true);
  });

  it("isLockStale returns true for wrong worktreeRoot", async () => {
    const { isLockStale } = await import("../lib.mjs");
    const lock = { goalId: "GR-20260625T192236Z-a1b2-any", worktreeRoot: "/nowhere", branch: "test" };
    assert.equal(isLockStale(lock), true);
  });

  it("second createLock with valid lock throws", async () => {
    const { createLock, writeState, isLockStale, readLock, removeLock } = await import("../lib.mjs");

    removeLock();

    const goalId1 = "GR-20260625T192236Z-a1b2-lock-1";
    const goalDir1 = join(GOALS_DIR, goalId1);
    mkdirSync(goalDir1, { recursive: true });
    writeState(goalId1, {
      goalId: goalId1, title: "Lock 1", owner: "Test", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "test-branch", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-06-25T19:00:00.000Z", updatedAt: "2026-06-25T19:00:00.000Z", transitions: []
    });

    createLock(goalId1, "test-branch", TEMP, "Test");
    assert.ok(existsSync(LOCK_FILE));

    assert.throws(() => {
      createLock("GR-20260625T192236Z-b2c3-lock-2", "other-branch", TEMP, "Test");
    }, /already locked/);
  });
});
