import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEMP = join(tmpdir(), `goal-runner-evidence-${Date.now()}`);
process.env.GOAL_RUNNER_TEST_ROOT = TEMP;
const GOALS_DIR = join(TEMP, "var", "goal-runner", "goals");

describe("Evidence and Gates", () => {
  before(() => { rmSync(TEMP, { recursive: true, force: true }); mkdirSync(GOALS_DIR, { recursive: true }); });
  after(() => { rmSync(TEMP, { recursive: true, force: true }); });

  it("complete fails without evidence", async () => {
    const { validateEvidenceComplete } = await import("../lib.mjs");
    const result = validateEvidenceComplete("GR-nonexistent", "code");
    assert.equal(result.valid, false);
    assert.ok(result.reason.includes("No evidence"));
  });

  it("complete fails with wrong evidence type", async () => {
    const { writeValidation, validateEvidenceComplete } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2c3d4-evidence-type";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });
    writeFileSync(join(GOALS_DIR, goalId, "state.json"), JSON.stringify({
      goalId, title: "Test", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "test", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    }) + "\n", "utf8");
    writeValidation(goalId, { goalId, evidence: [{ type: "ui", path: "test.ts", hash: "sha256:abc", addedAt: "2026-01-01T00:00:00.000Z" }], gates: [] });
    const result = validateEvidenceComplete(goalId, "code");
    assert.equal(result.valid, false);
  });

  it("evidence-add rejects sensitive paths", async () => {
    const { addEvidence } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2c3d4-sensitive";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });
    writeFileSync(join(GOALS_DIR, goalId, "state.json"), JSON.stringify({
      goalId, title: "Test", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "test", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    }) + "\n", "utf8");
    assert.throws(() => addEvidence(goalId, "code", ".env"), /sensitive/);
    assert.throws(() => addEvidence(goalId, "code", "secret-token.txt"), /sensitive/);
    assert.throws(() => addEvidence(goalId, "code", "credentials.json"), /sensitive/);
  });

  it("evidence-add rejects absolute paths", async () => {
    const { addEvidence } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2c3d4-absolute";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });
    writeFileSync(join(GOALS_DIR, goalId, "state.json"), JSON.stringify({
      goalId, title: "Test", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "test", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    }) + "\n", "utf8");
    assert.throws(() => addEvidence(goalId, "code", TEMP + "/somefile.txt"), /Absolute/);
  });

  it("evidence-add rejects non-existent file", async () => {
    const { addEvidence } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2c3d4-no-file";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });
    assert.throws(() => addEvidence(goalId, "code", "does-not-exist.txt"), /does not exist/);
  });

  it("evidence-add rejects directory", async () => {
    const { addEvidence } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2c3d4-dir";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });
    const dir = join(TEMP, "test-dir");
    mkdirSync(dir, { recursive: true });
    assert.throws(() => addEvidence(goalId, "code", "test-dir"), /Directories/);
  });

  it("evidence-add rejects path traversal", async () => {
    const { addEvidence } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2c3d4-traversal";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });
    writeFileSync(join(GOALS_DIR, goalId, "state.json"), JSON.stringify({
      goalId, title: "Test", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "test", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    }) + "\n", "utf8");
    assert.throws(() => addEvidence(goalId, "code", "../outside.txt"), /traversal/);
  });

  it("evidence-add accepts valid relative path and computes hash", async () => {
    const { addEvidence, readValidation } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2c3d4-valid";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });
    writeFileSync(join(GOALS_DIR, goalId, "state.json"), JSON.stringify({
      goalId, title: "Test", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "test", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    }) + "\n", "utf8");
    const testFile = join(TEMP, "test-evidence.ts");
    writeFileSync(testFile, "console.log('hello');", "utf8");
    const validation = addEvidence(goalId, "code", "test-evidence.ts");
    assert.ok(validation);
    assert.equal(validation.evidence.length, 1);
    assert.equal(validation.evidence[0].type, "code");
    assert.ok(validation.evidence[0].hash.startsWith("sha256:"));
  });

  it("validateGateIds rejects unknown gates", async () => {
    const { validateGateIds } = await import("../lib.mjs");
    assert.throws(() => validateGateIds(["rm-rf"]), /Unknown/);
    assert.throws(() => validateGateIds(["not-a-gate"]), /Unknown/);
    assert.doesNotThrow(() => validateGateIds(["typecheck", "build"]));
    assert.doesNotThrow(() => validateGateIds(["worker", "tests"]));
    assert.doesNotThrow(() => validateGateIds([]));
  });

  it("validateGateIds rejects non-array", async () => {
    const { validateGateIds } = await import("../lib.mjs");
    assert.throws(() => validateGateIds("typecheck"), /must be an array/);
    assert.throws(() => validateGateIds(null), /must be an array/);
  });

  it("setGates works for DRAFT and READY statuses", async () => {
    const { setGates, writeState } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2c3d4-gates-draft";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });
    writeState(goalId, {
      goalId, title: "Gates", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "DRAFT", branch: "test", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    });
    setGates(goalId, ["typecheck", "build"]);
    const updated = (await import("../lib.mjs")).readState(goalId);
    assert.deepStrictEqual(updated.validationGates, ["typecheck", "build"]);
  });

  it("setGates rejects after ACTIVE", async () => {
    const { setGates, writeState } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2c3d4-gates-active";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });
    writeState(goalId, {
      goalId, title: "Gates", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "test", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    });
    assert.throws(() => setGates(goalId, ["typecheck"]), /DRAFT or READY/);
  });

  it("setGates rejects unknown gate IDs", async () => {
    const { setGates, writeState } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2c3d4-gates-bad";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });
    writeState(goalId, {
      goalId, title: "Gates", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "DRAFT", branch: "test", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    });
    assert.throws(() => setGates(goalId, ["playwright-focused"]), /Unknown/);
  });

  it("setGates deduplicates while preserving order", async () => {
    const { setGates, writeState } = await import("../lib.mjs");
    const goalId = "GR-20260625T192236Z-a1b2c3d4-gates-dup";
    mkdirSync(join(GOALS_DIR, goalId), { recursive: true });
    writeState(goalId, {
      goalId, title: "Gates", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "DRAFT", branch: "test", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", transitions: []
    });
    setGates(goalId, ["typecheck", "build", "typecheck"]);
    const updated = (await import("../lib.mjs")).readState(goalId);
    assert.deepStrictEqual(updated.validationGates, ["typecheck", "build"]);
  });

  it("validateEvidencePath rejects absolute paths", async () => {
    const { validateEvidencePath } = await import("../lib.mjs");
    const result = validateEvidencePath("/absolute/path/to/file.ts");
    assert.equal(result.valid, false);
    assert.ok(result.reason.includes("Absolute"));
  });
});
