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
  });

  after(() => {
    rmSync(TEMP, { recursive: true, force: true });
  });

  function writeLock(data) {
    mkdirSync(MOCK_GR, { recursive: true });
    writeFileSync(MOCK_LOCK, JSON.stringify(data) + "\n", "utf8");
  }

  it("readLock returns null when no lock exists", async () => {
    lib = await import("../lib.mjs");
    try { rmSync(MOCK_LOCK, { force: true }); } catch {}
    const lock = lib.readLock();
    assert.equal(lock, null);
  });

  it("stale lock on wrong worktreeRoot", async () => {
    writeLock({
      goalId: "GR-20260625T192236Z-a1b2-test-goal",
      branch: "test-branch",
      worktreeRoot: "/nonexistent/path",
      owner: "Test",
      startedAt: "2026-06-25T19:00:00.000Z",
      pid: 99999
    });
    const lock = lib.readLock();
    assert.ok(lock);
    assert.equal(lib.isLockStale(lock), true);
  });

  it("non-existent goal state makes lock stale", async () => {
    writeLock({
      goalId: "GR-20260625T192236Z-a1b2-no-state",
      branch: "test-branch",
      worktreeRoot: TEMP,
      owner: "Test",
      startedAt: "2026-06-25T19:00:00.000Z",
      pid: 99999
    });
    const lock = lib.readLock();
    assert.ok(lock);
    assert.equal(lib.isLockStale(lock), true);
  });

  it("stale lock has invalid goalId format", async () => {
    writeLock({
      goalId: "not-a-valid-goal-id",
      branch: "test-branch",
      worktreeRoot: TEMP,
      owner: "Test",
      startedAt: "2026-06-25T19:00:00.000Z",
      pid: 99999
    });
    const lock = lib.readLock();
    assert.ok(lock);
    assert.equal(lib.isLockStale(lock), true);
  });
});
