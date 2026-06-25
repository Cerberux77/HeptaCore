import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEMP = join(tmpdir(), `goal-runner-evidence-${Date.now()}`);
process.env.GOAL_RUNNER_TEST_ROOT = TEMP;

const GOALS_DIR = join(TEMP, "var", "goal-runner", "goals");

describe("Evidence and Gates", () => {
  before(() => {
    rmSync(TEMP, { recursive: true, force: true });
    mkdirSync(GOALS_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEMP, { recursive: true, force: true });
  });

  it("complete fails without evidence", async () => {
    const { validateEvidenceComplete } = await import("../lib.mjs");
    const result = validateEvidenceComplete("GR-nonexistent", "code");
    assert.equal(result.valid, false);
    assert.ok(result.reason.includes("No evidence"));
  });

  it("complete fails with wrong evidence type", async () => {
    const { writeValidation, validateEvidenceComplete } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2-evidence-type";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });
    writeFileSync(join(GOALS_DIR, goalId, "state.json"), JSON.stringify({
      goalId, title: "Test", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "test", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    }) + "\n", "utf8");

    writeValidation(goalId, {
      goalId, evidence: [{ type: "ui", path: "test.ts", hash: "sha256:abc", addedAt: "2026-01-01T00:00:00.000Z" }], gates: []
    });

    const result = validateEvidenceComplete(goalId, "code");
    assert.equal(result.valid, false);
    assert.ok(result.reason.includes("required type"));
  });

  it("evidence-add rejects sensitive paths", async () => {
    const { addEvidence } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2-sensitive";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });

    assert.throws(() => addEvidence(goalId, "code", join(TEMP, ".env")), /sensitive/);
    assert.throws(() => addEvidence(goalId, "code", join(TEMP, "secret-token.txt")), /sensitive/);
    assert.throws(() => addEvidence(goalId, "code", join(TEMP, "credentials.json")), /sensitive/);
  });

  it("evidence-add rejects non-existent file", async () => {
    const { addEvidence } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2-no-file";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });

    assert.throws(() => addEvidence(goalId, "code", join(TEMP, "does-not-exist.txt")), /does not exist/);
  });

  it("evidence-add rejects directory", async () => {
    const { addEvidence } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2-dir";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });
    const dir = join(TEMP, "test-dir");
    mkdirSync(dir, { recursive: true });

    assert.throws(() => addEvidence(goalId, "code", dir), /Directories cannot/);
  });

  it("evidence-add rejects path traversal", async () => {
    const { addEvidence } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2-traversal";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });
    writeFileSync(join(GOALS_DIR, goalId, "state.json"), JSON.stringify({
      goalId, title: "Test", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "test", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    }) + "\n", "utf8");

    assert.throws(() => addEvidence(goalId, "code", TEMP + "/../outside.txt"), /traversal/);
  });

  it("evidence-add accepts valid file and computes hash", async () => {
    const { addEvidence, readValidation } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2-valid-file";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });
    writeFileSync(join(GOALS_DIR, goalId, "state.json"), JSON.stringify({
      goalId, title: "Test", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "test", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    }) + "\n", "utf8");

    const testFile = join(TEMP, "test-evidence.ts");
    writeFileSync(testFile, "console.log('hello');", "utf8");

    const validation = addEvidence(goalId, "code", testFile);
    assert.ok(validation);
    assert.equal(validation.evidence.length, 1);
    assert.equal(validation.evidence[0].type, "code");
    assert.ok(validation.evidence[0].hash.startsWith("sha256:"));
  });

  it("validateGateIds rejects unknown gates", async () => {
    const { validateGateIds } = await import("../lib.mjs");
    assert.throws(() => validateGateIds(["rm-rf"]), /Unknown gate/);
    assert.throws(() => validateGateIds(["not-a-gate"]), /Unknown gate/);
    assert.doesNotThrow(() => validateGateIds(["typecheck", "build"]));
    assert.doesNotThrow(() => validateGateIds([]));
  });

  it("validateGateIds rejects non-array input", async () => {
    const { validateGateIds } = await import("../lib.mjs");
    assert.throws(() => validateGateIds("typecheck"), /must be an array/);
    assert.throws(() => validateGateIds(null), /must be an array/);
  });
});
