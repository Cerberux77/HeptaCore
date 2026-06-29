import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { mkdirSync, rmSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEMP = join(tmpdir(), `goal-runner-doctor-${Date.now()}`);
process.env.GOAL_RUNNER_TEST_ROOT = TEMP;

const GR_DIR = join(TEMP, "var", "goal-runner");
const GOALS_DIR = join(GR_DIR, "goals");
const HISTORY_DIR = join(GR_DIR, "history");
const LOCK_FILE = join(GR_DIR, ".active-worktree.json");
const INDEX_FILE = join(GR_DIR, "index.json");
const SCHEMA_FILE = join(TEMP, "scripts", "goal-runner", "schema.json");

describe("Doctor Command", () => {
  let lib;

  before(async () => {
    rmSync(TEMP, { recursive: true, force: true });
    mkdirSync(GOALS_DIR, { recursive: true });
    mkdirSync(HISTORY_DIR, { recursive: true });
    mkdirSync(join(TEMP, "scripts", "goal-runner"), { recursive: true });
    writeFileSync(SCHEMA_FILE, JSON.stringify({}), "utf8");
    writeFileSync(INDEX_FILE, JSON.stringify({ version: 1, generatedFromStateUpdatedAt: null, contentHash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", goals: [] }) + "\n", "utf8");
    lib = await import("../lib.mjs");
  });

  after(() => {
    rmSync(TEMP, { recursive: true, force: true });
    delete process.env.GOAL_RUNNER_TEST_ROOT;
  });

  it("reports healthy for empty clean worktree", () => {
    const result = lib.doctorCheck();
    assert.ok(result);
    assert.equal(result.healthy, true);
    assert.equal(result.errors.length, 0);
    const infoCodes = result.info.map((i) => i.code);
    assert.ok(infoCodes.includes("DOCTOR-I001"), `Expected DOCTOR-I001, got: ${infoCodes.join(", ")}`);
  });

  it("detects stale lock when state status is not ACTIVE", () => {
    const goalId = "GR-20260625T192236Z-a1b2c3d4-doctor-stale";
    const goalDir = join(GOALS_DIR, goalId);
    mkdirSync(goalDir, { recursive: true });
    lib.writeState(goalId, {
      goalId, title: "Stale lock test", owner: "Test", sprintId: "S-HC-TEST",
      status: "PAUSED", branch: "UNKNOWN", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-06-25T19:00:00.000Z", updatedAt: "2026-06-25T19:00:00.000Z", transitions: []
    });
    lib.writeJson(LOCK_FILE, {
      goalId, branch: "UNKNOWN",
      worktreeRoot: TEMP, owner: "Test",
      startedAt: "2026-06-25T19:00:00.000Z", pid: 99999
    });

    const result = lib.doctorCheck();
    assert.equal(result.healthy, false);
    const staleErr = result.errors.find((e) => e.code === "DOCTOR-001");
    assert.ok(staleErr, `Expected DOCTOR-001, got errors: ${JSON.stringify(result.errors)}`);
    assert.ok(staleErr.message.includes("PAUSED") || staleErr.message.includes("not ACTIVE"), staleErr.message);
  });

  it("detects stale lock when state file is missing", () => {
    const fakeId = "GR-20260625T192236Z-b5c6d7e8-fake-goal";
    lib.writeJson(LOCK_FILE, {
      goalId: fakeId, branch: "UNKNOWN",
      worktreeRoot: TEMP, owner: "Test",
      startedAt: "2026-06-25T19:00:00.000Z", pid: 99999
    });

    const result = lib.doctorCheck();
    assert.equal(result.healthy, false);
    const staleErr = result.errors.find((e) => e.code === "DOCTOR-001" && e.message.includes("state file not found"));
    assert.ok(staleErr, `Expected DOCTOR-001 for missing state, got: ${JSON.stringify(result.errors)}`);
  });

  it("reports DOCTOR-I002 for valid lock and ACTIVE state", () => {
    lib.removeLock();
    if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE);

    const goalId = "GR-20260625T192236Z-c1d2e3f4-doctor-valid";
    const goalDir = join(GOALS_DIR, goalId);
    mkdirSync(goalDir, { recursive: true });
    lib.writeState(goalId, {
      goalId, title: "Valid lock test", owner: "Test", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "UNKNOWN", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-06-25T19:00:00.000Z", updatedAt: "2026-06-25T19:00:00.000Z", transitions: []
    });
    lib.createLock(goalId, "UNKNOWN", TEMP, "Test");

    const result = lib.doctorCheck();
    assert.equal(result.healthy, true);
    const infoCodes = result.info.map((i) => i.code);
    assert.ok(infoCodes.includes("DOCTOR-I002"), `Expected DOCTOR-I002, got: ${infoCodes.join(", ")}`);
  });

  it("detects state validation failure (corrupt state)", () => {
    const goalId = "GR-20260625T192236Z-d4e5f6a7-doctor-invalid";
    const goalDir = join(GOALS_DIR, goalId);
    mkdirSync(goalDir, { recursive: true });
    writeFileSync(join(goalDir, "state.json"), JSON.stringify({ goalId, title: "Broken", status: "INVALID_STATUS" }) + "\n", "utf8");
    lib.reindex();

    const result = lib.doctorCheck();
    const invalidErr = result.errors.find((e) => e.code === "DOCTOR-007");
    assert.ok(invalidErr, `Expected DOCTOR-007, got errors: ${JSON.stringify(result.errors)}`);
  });

  it("detects index inconsistency (stale content hash)", () => {
    const goalId = "GR-20260625T192236Z-e7f8a9b0-doctor-idx";
    const goalDir = join(GOALS_DIR, goalId);
    mkdirSync(goalDir, { recursive: true });
    lib.writeState(goalId, {
      goalId, title: "Index inconsistency test", owner: "Test", sprintId: "S-HC-TEST",
      status: "PAUSED", branch: "UNKNOWN", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-06-25T19:00:00.000Z", updatedAt: "2026-06-25T19:00:00.000Z", transitions: []
    });
    lib.reindex();

    lib.writeJson(INDEX_FILE, {
      version: 1, generatedFromStateUpdatedAt: null,
      contentHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      goals: [{ goalId, title: "Index inconsistency test", owner: "Test", sprintId: "S-HC-TEST", status: "PAUSED", branch: "UNKNOWN", createdAt: "2026-06-25T19:00:00.000Z", updatedAt: "2026-06-25T19:00:00.000Z" }]
    });

    const result = lib.doctorCheck();
    const staleWarn = result.warnings.find((w) => w.code === "DOCTOR-W003" && w.message.includes("stale"));
    assert.ok(staleWarn, `Expected DOCTOR-W003 stale hash warning, got warnings: ${JSON.stringify(result.warnings)}`);
  });

  it("detects index entry with no goal directory", () => {
    lib.writeJson(INDEX_FILE, {
      version: 1, generatedFromStateUpdatedAt: null,
      contentHash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      goals: [{ goalId: "GR-20260625T192236Z-ffff0000-ghost", title: "Ghost goal", owner: "Test", sprintId: "S-HC-TEST", status: "PAUSED", branch: "UNKNOWN", createdAt: "2026-06-25T19:00:00.000Z", updatedAt: "2026-06-25T19:00:00.000Z" }]
    });

    const result = lib.doctorCheck();
    const ghostWarn = result.warnings.find((w) => w.code === "DOCTOR-005");
    assert.ok(ghostWarn, `Expected DOCTOR-005 for ghost goal, got warnings: ${JSON.stringify(result.warnings)}`);
  });

  it("detects resumable goals when no lock exists", () => {
    lib.removeLock();
    if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE);

    const goalId = "GR-20260625T192236Z-f1a2b3c4-doctor-resum";
    const goalDir = join(GOALS_DIR, goalId);
    mkdirSync(goalDir, { recursive: true });
    lib.writeState(goalId, {
      goalId, title: "Resumable goal", owner: "Test", sprintId: "S-HC-TEST",
      status: "PAUSED", branch: "UNKNOWN", baseSha: "abc",
      evidenceRequired: "code", validationGates: [],
      createdAt: "2026-06-25T19:00:00.000Z", updatedAt: "2026-06-25T19:00:00.000Z", transitions: []
    });
    lib.reindex();

    const result = lib.doctorCheck();
    const resumWarn = result.warnings.find((w) => w.code === "DOCTOR-W001");
    assert.ok(resumWarn, `Expected DOCTOR-W001 for resumable goals, got warnings: ${JSON.stringify(result.warnings)}`);
  });

  it("reports missing history directory as warning", () => {
    lib.removeLock();
    if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE);
    if (existsSync(HISTORY_DIR)) rmSync(HISTORY_DIR, { recursive: true });

    writeFileSync(INDEX_FILE, JSON.stringify({ version: 1, generatedFromStateUpdatedAt: null, contentHash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", goals: [] }) + "\n", "utf8");

    const result = lib.doctorCheck();
    const histWarn = result.warnings.find((w) => w.code === "DOCTOR-W002");
    assert.ok(histWarn, `Expected DOCTOR-W002 for missing history dir, got warnings: ${JSON.stringify(result.warnings)}`);
  });

  it("reports missing schema file as error", () => {
    if (existsSync(SCHEMA_FILE)) unlinkSync(SCHEMA_FILE);
    if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE);
    lib.removeLock();

    const result = lib.doctorCheck();
    const schemaErr = result.errors.find((e) => e.code === "DOCTOR-009");
    assert.ok(schemaErr, `Expected DOCTOR-009 for missing schema, got errors: ${JSON.stringify(result.errors)}`);
  });

  it("resolveGateSpawn wraps npm in cmd.exe /c on Windows", () => {
    assert.equal(typeof lib.resolveGateSpawn, "function");
    assert.ok(lib.CMD_ALIASES, "CMD_ALIASES should be exported");
    assert.equal(lib.CMD_ALIASES.npm, true);
    assert.equal(lib.CMD_ALIASES.npx, true);
  });

  it("resolveGateSpawn preserves non-aliased commands unchanged", () => {
    const gitResult = lib.resolveGateSpawn("git", ["--version"]);
    assert.equal(gitResult.command, "git");
    assert.deepStrictEqual(gitResult.args, ["--version"]);

    const nodeResult = lib.resolveGateSpawn("node", ["-e", "1"]);
    assert.equal(nodeResult.command, "node");
    assert.deepStrictEqual(nodeResult.args, ["-e", "1"]);

    const unknownResult = lib.resolveGateSpawn("unknown", ["arg"]);
    assert.equal(unknownResult.command, "unknown");
  });

  it("resolveGateSpawn wraps aliased commands via cmd.exe /c on Windows", () => {
    if (process.platform === "win32") {
      const npmResult = lib.resolveGateSpawn("npm", ["run", "typecheck"]);
      assert.ok(npmResult.command.endsWith("cmd.exe") || npmResult.command.endsWith("cmd"), `Expected cmd.exe, got ${npmResult.command}`);
      assert.deepStrictEqual(npmResult.args, ["/c", "npm", "run", "typecheck"]);

      const npxResult = lib.resolveGateSpawn("npx", ["tsc", "--noEmit"]);
      assert.deepStrictEqual(npxResult.args, ["/c", "npx", "tsc", "--noEmit"]);
    } else {
      const npmResult = lib.resolveGateSpawn("npm", ["run", "typecheck"]);
      assert.equal(npmResult.command, "npm");
      assert.deepStrictEqual(npmResult.args, ["run", "typecheck"]);
    }
  });
});
