import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..", "..");
const RUN = join(REPO, "scripts", "goal-runner", "run.mjs");

const TEMP = join(tmpdir(), `goal-runner-integration-${Date.now()}`);
process.env.GOAL_RUNNER_TEST_ROOT = TEMP;

function run(args) {
  try {
    const result = execFileSync("node", [RUN, ...args], {
      cwd: TEMP,
      encoding: "utf8",
      timeout: 30000,
      env: { ...process.env, GOAL_RUNNER_TEST_ROOT: TEMP }
    });
    return { ok: true, output: result };
  } catch (err) {
    return { ok: false, output: (err.stdout || "") + "\n" + (err.stderr || "") };
  }
}

describe("Goal Runner CLI Integration", () => {
  before(() => {
    rmSync(TEMP, { recursive: true, force: true });
    mkdirSync(join(TEMP, "var", "goal-runner", "goals"), { recursive: true });
    mkdirSync(join(TEMP, "var", "goal-runner", "history"), { recursive: true });
    writeFileSync(join(TEMP, "var", "goal-runner", "index.json"), JSON.stringify({ version: 1, generatedFromStateUpdatedAt: null, contentHash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", goals: [] }) + "\n", "utf8");
  });

  after(() => {
    rmSync(TEMP, { recursive: true, force: true });
  });

  let goalId;

  it("1. create", () => {
    const result = run(["create", "--title", "Integration smoke test", "--owner", "Manuel", "--sprintId", "S-HC-TEST", "--evidenceRequired", "code"]);
    assert.ok(result.ok, `create failed:\n${result.output}`);
    result.output.includes("[OK] Goal created") || assert.fail(result.output);
    const match = result.output.match(/Goal created:\s*(GR-\S+)/);
    assert.ok(match, "No goalId found in output");
    goalId = match[1];
  });

  it("2. plan-record", () => {
    assert.ok(goalId, "No goalId from create step");
    const planPath = join(TEMP, "var", "goal-runner", "goals", goalId, "plan.md");
    writeFileSync(planPath, `# Plan — ${goalId}\n\n## Steps\n\n1. Verify CLI works\n2. Add evidence\n3. Complete`, "utf8");
    const result = run(["plan-record", "--goalId", goalId]);
    assert.ok(result.ok, `plan-record failed:\n${result.output}`);
    assert.ok(result.output.includes("[OK] Plan recorded"), result.output);
  });

  it("3. gates-set", () => {
    assert.ok(goalId);
    const result = run(["gates-set", "--goalId", goalId, "--gates", "diff-check"]);
    assert.ok(result.ok, `gates-set failed:\n${result.output}`);
    assert.ok(result.output.includes("[OK] Gates set"), result.output);
    // Clear gates so complete doesn't fail in non-git temp dir
    const clearResult = run(["gates-set", "--goalId", goalId, "--clear"]);
    assert.ok(clearResult.ok, `gates-set clear failed:\n${clearResult.output}`);
  });

  it("4. activate", () => {
    assert.ok(goalId);
    const result = run(["activate", "--goalId", goalId]);
    assert.ok(result.ok, `activate failed:\n${result.output}`);
    assert.ok(result.output.includes("[OK] Goal activated"), result.output);

    const statePath = join(TEMP, "var", "goal-runner", "goals", goalId, "state.json");
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    assert.equal(state.status, "ACTIVE");
    assert.deepStrictEqual(state.validationGates, []);
  });

  it("5. step-start and step-complete", () => {
    assert.ok(goalId);

    const r1 = run(["step-start", "--goalId", goalId, "--step", "Write integration test"]);
    assert.ok(r1.ok, `step-start failed:\n${r1.output}`);

    const r2 = run(["step-complete", "--goalId", goalId, "--step", "Write integration test", "--result", "Created test file"]);
    assert.ok(r2.ok, `step-complete failed:\n${r2.output}`);

    const progressPath = join(TEMP, "var", "goal-runner", "goals", goalId, "progress.md");
    assert.ok(existsSync(progressPath));
    const content = readFileSync(progressPath, "utf8");
    assert.ok(content.includes("DONE"));
    assert.ok(content.includes("Write integration test"));
  });

  it("6. finding-add", () => {
    assert.ok(goalId);
    const result = run(["finding-add", "--goalId", goalId, "--severity", "info", "--content", "Integration smoke test running successfully"]);
    assert.ok(result.ok, `finding-add failed:\n${result.output}`);

    const findingsPath = join(TEMP, "var", "goal-runner", "goals", goalId, "findings.md");
    assert.ok(existsSync(findingsPath));
  });

  it("7. evidence-add", () => {
    assert.ok(goalId);
    const evidenceFile = join(TEMP, "test-output.txt");
    writeFileSync(evidenceFile, "Integration test evidence", "utf8");
    const result = run(["evidence-add", "--goalId", goalId, "--type", "code", "--path", "test-output.txt"]);
    assert.ok(result.ok, `evidence-add failed:\n${result.output}`);

    const validationPath = join(TEMP, "var", "goal-runner", "goals", goalId, "validation.json");
    const validation = JSON.parse(readFileSync(validationPath, "utf8"));
    assert.equal(validation.evidence.length, 1);
    assert.equal(validation.evidence[0].type, "code");
    assert.ok(validation.evidence[0].hash.startsWith("sha256:"));
  });

  it("8. complete", () => {
    assert.ok(goalId);
    const result = run(["complete", "--goalId", goalId]);
    assert.ok(result.ok, `complete failed:\n${result.output}`);
    assert.ok(result.output.includes("[OK] Goal completed"), result.output);

    const statePath = join(TEMP, "var", "goal-runner", "goals", goalId, "state.json");
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    assert.equal(state.status, "COMPLETED");

    const reportPath = join(TEMP, "var", "goal-runner", "goals", goalId, "final-report.md");
    assert.ok(existsSync(reportPath));

    const lockPath = join(TEMP, "var", "goal-runner", ".active-worktree.json");
    assert.ok(!existsSync(lockPath), "Lock should be removed after complete");
  });

  it("9. resume from PAUSED", () => {
    // Create second goal, activate, pause, then resume
    const r1 = run(["create", "--title", "Pause-resume integration", "--owner", "Manuel", "--sprintId", "S-HC-TEST", "--evidenceRequired", "code"]);
    assert.ok(r1.ok, r1.output);
    const g2Match = r1.output.match(/Goal created:\s*(GR-\S+)/);
    assert.ok(g2Match);
    const g2Id = g2Match[1];

    const planPath = join(TEMP, "var", "goal-runner", "goals", g2Id, "plan.md");
    writeFileSync(planPath, `# Plan — ${g2Id}\n\nPause-resume test`, "utf8");
    run(["plan-record", "--goalId", g2Id]);
    run(["activate", "--goalId", g2Id]);

    const pause = run(["pause", "--goalId", g2Id]);
    assert.ok(pause.ok, pause.output);

    const statePath = join(TEMP, "var", "goal-runner", "goals", g2Id, "state.json");
    const pausedState = JSON.parse(readFileSync(statePath, "utf8"));
    assert.equal(pausedState.status, "PAUSED");

    const lockPath = join(TEMP, "var", "goal-runner", ".active-worktree.json");
    assert.ok(!existsSync(lockPath), "Lock should be removed after pause");

    const resume = run(["resume", "--goalId", g2Id]);
    assert.ok(resume.ok, resume.output);

    const resumedState = JSON.parse(readFileSync(statePath, "utf8"));
    assert.equal(resumedState.status, "ACTIVE");
    assert.ok(existsSync(lockPath), "Lock should exist after resume");

    // Clean up
    run(["abort", "--goalId", g2Id, "--reason", "Integration test cleanup"]);
  });

  it("10. second ACTIVE goal is rejected", () => {
    const r1 = run(["create", "--title", "First active goal", "--owner", "Manuel", "--sprintId", "S-HC-TEST", "--evidenceRequired", "code"]);
    const g1Match = r1.output.match(/Goal created:\s*(GR-\S+)/);
    assert.ok(g1Match);
    const id1 = g1Match[1];
    const planPath1 = join(TEMP, "var", "goal-runner", "goals", id1, "plan.md");
    writeFileSync(planPath1, "# Plan", "utf8");
    run(["plan-record", "--goalId", id1]);
    run(["activate", "--goalId", id1]);

    const r2 = run(["create", "--title", "Second active goal", "--owner", "Manuel", "--sprintId", "S-HC-TEST", "--evidenceRequired", "code"]);
    const g2Match = r2.output.match(/Goal created:\s*(GR-\S+)/);
    assert.ok(g2Match);
    const id2 = g2Match[1];
    const planPath2 = join(TEMP, "var", "goal-runner", "goals", id2, "plan.md");
    writeFileSync(planPath2, "# Plan", "utf8");
    run(["plan-record", "--goalId", id2]);

    const activate = run(["activate", "--goalId", id2]);
    assert.ok(!activate.ok, "Second activate should fail");
    assert.ok(activate.output.includes("already locked"), `Expected 'already locked' but got: ${activate.output}`);

    // Clean up
    run(["abort", "--goalId", id1, "--reason", "Integration test"]);
  });

  it("11. stale lock detection", () => {
    // Create a goal but corrupt the state so the lock becomes stale
    const r1 = run(["create", "--title", "Stale lock test", "--owner", "Manuel", "--sprintId", "S-HC-TEST", "--evidenceRequired", "code"]);
    const gMatch = r1.output.match(/Goal created:\s*(GR-\S+)/);
    assert.ok(gMatch);
    const gId = gMatch[1];
    const planPath = join(TEMP, "var", "goal-runner", "goals", gId, "plan.md");
    writeFileSync(planPath, "# Plan", "utf8");
    run(["plan-record", "--goalId", gId]);
    run(["activate", "--goalId", gId]);

    // Corrupt the state to make the lock stale (change status away from ACTIVE)
    const statePath = join(TEMP, "var", "goal-runner", "goals", gId, "state.json");
    let state = JSON.parse(readFileSync(statePath, "utf8"));
    state.status = "COMPLETED";
    writeFileSync(statePath, JSON.stringify(state) + "\n", "utf8");

    // Try to create a new goal — should succeed because lock is stale
    const r2 = run(["create", "--title", "After stale lock", "--owner", "Manuel", "--sprintId", "S-HC-TEST", "--evidenceRequired", "code"]);
    assert.ok(r2.ok, `Create after stale lock should succeed: ${r2.output}`);
  });

  it("12. complete is rejected without evidence", () => {
    const r1 = run(["create", "--title", "No evidence test", "--owner", "Manuel", "--sprintId", "S-HC-TEST", "--evidenceRequired", "code"]);
    const gMatch = r1.output.match(/Goal created:\s*(GR-\S+)/);
    assert.ok(gMatch);
    const gId = gMatch[1];
    const planPath = join(TEMP, "var", "goal-runner", "goals", gId, "plan.md");
    writeFileSync(planPath, "# Plan", "utf8");
    run(["plan-record", "--goalId", gId]);
    run(["activate", "--goalId", gId]);

    const complete = run(["complete", "--goalId", gId]);
    assert.ok(!complete.ok, "Complete should fail without evidence");
    assert.ok(complete.output.includes("No evidence"), complete.output);

    run(["abort", "--goalId", gId, "--reason", "Test cleanup"]);
  });

  it("13. terminal state is immutable after complete", () => {
    assert.ok(goalId, "Need goalId from first test");
    const statePath = join(TEMP, "var", "goal-runner", "goals", goalId, "state.json");
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    assert.equal(state.status, "COMPLETED");

    const activate = run(["activate", "--goalId", goalId]);
    assert.ok(!activate.ok);
    assert.ok(activate.output.includes("terminal") || activate.output.includes("not allowed"), activate.output);

    const pause = run(["pause", "--goalId", goalId]);
    assert.ok(!pause.ok);
  });
});
