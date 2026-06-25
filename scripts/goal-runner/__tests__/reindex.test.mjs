import { describe, it } from "node:test";
import assert from "node:assert";
import { computeContentHash, reindex } from "../lib.mjs";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEMP = join(tmpdir(), `goal-runner-reindex-${Date.now()}`);
process.env.GOAL_RUNNER_TEST_ROOT = TEMP;

describe("Reindex Deterministic", () => {
  it("computeContentHash is deterministic", () => {
    const goals = [
      { goalId: "GR-20260625T192236Z-a1b2-alpha", title: "Alpha", owner: "A", sprintId: "S-01", status: "ACTIVE", branch: "main", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      { goalId: "GR-20260625T192236Z-b3c4-beta", title: "Beta", owner: "B", sprintId: "S-02", status: "DRAFT", branch: "main", createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" }
    ];
    const hash1 = computeContentHash(goals);
    const hash2 = computeContentHash(goals);
    assert.equal(hash1, hash2, "Same inputs should produce same hash");
  });

  it("computeContentHash produces different hash for different data", () => {
    const goals1 = [{ goalId: "GR-20260625T192236Z-a1b2-one", title: "One", owner: "A", sprintId: "S-01", status: "ACTIVE", branch: "main", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }];
    const goals2 = [{ goalId: "GR-20260625T192236Z-a1b2-two", title: "Two", owner: "A", sprintId: "S-01", status: "ACTIVE", branch: "main", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }];
    assert.notEqual(computeContentHash(goals1), computeContentHash(goals2));
  });

  it("computeContentHash is stable for empty array", () => {
    assert.equal(computeContentHash([]), computeContentHash([]));
  });

  it("reindex on empty goals produces empty index", async () => {
    rmSync(TEMP, { recursive: true, force: true });
    mkdirSync(join(TEMP, "var", "goal-runner", "goals"), { recursive: true });
    mkdirSync(join(TEMP, "var", "goal-runner", "history"), { recursive: true });

    const index = reindex();
    assert.equal(index.goals.length, 0);
    assert.equal(index.version, 1);
  });

  it("reindex is byte-deterministic with same state files", async () => {
    rmSync(TEMP, { recursive: true, force: true });
    const goalsDir = join(TEMP, "var", "goal-runner", "goals");
    mkdirSync(join(goalsDir, "GR-20260625T192236Z-a1b2-test-goal"), { recursive: true });

    const state = {
      goalId: "GR-20260625T192236Z-a1b2-test-goal",
      title: "Test", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "main", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-06-25T19:00:00.000Z", updatedAt: "2026-06-25T19:00:00.000Z",
      transitions: []
    };
    writeFileSync(join(goalsDir, "GR-20260625T192236Z-a1b2-test-goal", "state.json"), JSON.stringify(state) + "\n", "utf8");

    const index1 = reindex();
    const index2 = reindex();
    const index3 = reindex();

    assert.equal(index1.contentHash, index2.contentHash);
    assert.equal(index2.contentHash, index3.contentHash);
    assert.equal(index1.goals.length, 1);
  });

  it("reindex handles git conflict: preserve goals, regenerate index", async () => {
    rmSync(TEMP, { recursive: true, force: true });
    const goalsDir = join(TEMP, "var", "goal-runner", "goals");
    mkdirSync(join(goalsDir, "GR-20260625T192236Z-a1b2-goal-a"), { recursive: true });
    mkdirSync(join(goalsDir, "GR-20260625T192236Z-b3c4-goal-b"), { recursive: true });

    const stateA = {
      goalId: "GR-20260625T192236Z-a1b2-goal-a", title: "A", owner: "Manuel",
      sprintId: "S-HC-A", status: "DONE", branch: "main", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    };
    const stateB = {
      goalId: "GR-20260625T192236Z-b3c4-goal-b", title: "B", owner: "Manuel",
      sprintId: "S-HC-B", status: "ACTIVE", branch: "main", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z", transitions: []
    };
    writeFileSync(join(goalsDir, "GR-20260625T192236Z-a1b2-goal-a", "state.json"), JSON.stringify(stateA) + "\n", "utf8");
    writeFileSync(join(goalsDir, "GR-20260625T192236Z-b3c4-goal-b", "state.json"), JSON.stringify(stateB) + "\n", "utf8");

    const index1 = reindex();
    assert.equal(index1.goals.length, 2);

    rmSync(join(goalsDir, "GR-20260625T192236Z-b3c4-goal-b"), { recursive: true });
    const index2 = reindex();
    assert.equal(index2.goals.length, 1);
    assert.equal(index2.goals[0].goalId, "GR-20260625T192236Z-a1b2-goal-a");
  });
});
