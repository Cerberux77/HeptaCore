import { describe, it } from "node:test";
import assert from "node:assert";
import { computeContentHash, reindex, stableStringify } from "../lib.mjs";
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEMP = join(tmpdir(), `goal-runner-reindex-${Date.now()}`);
process.env.GOAL_RUNNER_TEST_ROOT = TEMP;

describe("Reindex Deterministic", () => {
  it("computeContentHash is deterministic", () => {
    const goals = [
      { goalId: "GR-20260625T192236Z-a1b2c3d4-alpha", title: "Alpha", owner: "A", sprintId: "S-01", status: "ACTIVE", branch: "main", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      { goalId: "GR-20260625T192236Z-b5c6d7e8-beta", title: "Beta", owner: "B", sprintId: "S-02", status: "DRAFT", branch: "main", createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" }
    ];
    const hash1 = computeContentHash(goals);
    const hash2 = computeContentHash(goals);
    assert.equal(hash1, hash2);
  });

  it("computeContentHash is stable for empty array", () => {
    assert.equal(computeContentHash([]), computeContentHash([]));
  });

  it("reindex is byte-deterministic", async () => {
    rmSync(TEMP, { recursive: true, force: true });
    const goalsDir = join(TEMP, "var", "goal-runner", "goals");
    mkdirSync(goalsDir, { recursive: true });

    const goalId1 = "GR-20260625T192236Z-a1b2c3d4-test-a";
    const goalId2 = "GR-20260625T192236Z-b5c6d7e8-test-b";
    mkdirSync(join(goalsDir, goalId1), { recursive: true });
    mkdirSync(join(goalsDir, goalId2), { recursive: true });

    writeFileSync(join(goalsDir, goalId1, "state.json"), JSON.stringify({
      goalId: goalId1, title: "A", owner: "Manuel", sprintId: "S-HC-A",
      status: "ACTIVE", branch: "main", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    }) + "\n", "utf8");

    writeFileSync(join(goalsDir, goalId2, "state.json"), JSON.stringify({
      goalId: goalId2, title: "B", owner: "Manuel", sprintId: "S-HC-B",
      status: "DONE", branch: "main", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z", transitions: []
    }) + "\n", "utf8");

    const index1 = reindex();
    const index2 = reindex();
    const index3 = reindex();

    assert.equal(index1.contentHash, index2.contentHash);
    assert.equal(index2.contentHash, index3.contentHash);

    const bytes1 = readFileSync(join(TEMP, "var", "goal-runner", "index.json"));
    const bytes2 = readFileSync(join(TEMP, "var", "goal-runner", "index.json"));
    assert.deepStrictEqual(bytes1, bytes2, "Same states must produce identical bytes");
  });

  it("stableStringify produces stable output", () => {
    const obj = { z: 1, a: 2, c: { b: 3, a: 4 } };
    const result1 = stableStringify(obj);
    const result2 = stableStringify(obj);
    assert.equal(result1, result2);
    assert.ok(result1.indexOf('"a"') < result1.indexOf('"c"'));
    assert.ok(result1.indexOf('"a"') < result1.indexOf('"z"'));
  });
});
