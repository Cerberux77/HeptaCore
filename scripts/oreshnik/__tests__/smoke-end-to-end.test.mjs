import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const REPO_ROOT = join(__dirname, "..", "..", "..");
const ORESHNIK_PACKAGE = require.resolve("oreshnik-cli/package.json");
const ORESHNIK_CLI = join(dirname(ORESHNIK_PACKAGE), "dist", "cli.js");
const GOAL_RUNNER = join(REPO_ROOT, "scripts", "goal-runner", "run.mjs");
const GOAL_RUNNER_SCHEMA = readFileSync(join(REPO_ROOT, "scripts", "goal-runner", "schema.json"), "utf8");
const tempRoots = [];

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function removeTreeWithRetry(path) {
  const attempts = 8;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      rmSync(path, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error)) throw error;
      const code = error.code;
      if ((code !== "EPERM" && code !== "EBUSY" && code !== "ENOTEMPTY") || attempt === attempts - 1) {
        throw error;
      }
      sleep(150 * (attempt + 1));
    }
  }
}

describe("Oreshnik synthetic end-to-end smoke", () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const path = tempRoots.pop();
      if (!path) continue;
      removeTreeWithRetry(path);
    }
  });

  it("drives a supervised synthetic task from dispatch to integrated without duplicates", { timeout: 300000 }, () => {
    const env = createFixtureRepository();

    const init = runJson("node", [ORESHNIK_CLI, "dispatch", "init", "--mother", "master", "--worktree-root", env.worktreeRoot, "--repo", env.repoRoot, "--json"], env.repoRoot);
    assert.equal(init.controlBranch, "oreshnik/control");

    const assignment = runJson("node", [ORESHNIK_CLI, "dispatch", "next", "--operator", "kilo", "--repo", env.repoRoot, "--json"], env.repoRoot);
    assert.equal(assignment.result, "assigned");
    assert.equal(assignment.taskId, env.taskId);
    assert.equal(assignment.operator, "kilo");
    assert.ok(existsSync(assignment.worktreePath), `expected worktree ${assignment.worktreePath}`);

    const worktreePath = assignment.worktreePath;
    const handoffPath = join(worktreePath, "docs", "07_handoffs", `${env.taskId}.md`);

    const createGoal = runText("node", [GOAL_RUNNER, "create", "--title", "Synthetic dispatcher smoke", "--owner", "Kilo Agent", "--sprintId", env.sprintId, "--evidenceRequired", "code", "--gates", "typecheck,build,worker,tests"], worktreePath, {
      GOAL_RUNNER_TEST_ROOT: worktreePath,
    });
    const goalIdMatch = createGoal.match(/Goal created:\s*(GR-\S+)/);
    assert.ok(goalIdMatch, `missing goal id in output:\n${createGoal}`);
    const goalId = goalIdMatch[1];

    const planPath = join(worktreePath, "var", "goal-runner", "goals", goalId, "plan.md");
    writeFileSync(planPath, `# Plan\n\n1. Claim\n2. Implement\n3. Validate\n`, "utf8");
    runText("node", [GOAL_RUNNER, "plan-record", "--goalId", goalId], worktreePath, {
      GOAL_RUNNER_TEST_ROOT: worktreePath,
    });
    runText("node", [GOAL_RUNNER, "activate", "--goalId", goalId], worktreePath, {
      GOAL_RUNNER_TEST_ROOT: worktreePath,
    });

    writeFileSync(join(worktreePath, "tracked.txt"), "base\nsmoke change\n", "utf8");
    writeFileSync(handoffPath, `# ${env.taskId}\n\nSynthetic handoff\n`, "utf8");

    runText("node", [GOAL_RUNNER, "step-start", "--goalId", goalId, "--step", "Apply synthetic implementation"], worktreePath, {
      GOAL_RUNNER_TEST_ROOT: worktreePath,
    });
    runText("node", [GOAL_RUNNER, "step-complete", "--goalId", goalId, "--step", "Apply synthetic implementation", "--result", "Updated tracked fixture file"], worktreePath, {
      GOAL_RUNNER_TEST_ROOT: worktreePath,
    });
    runText("node", [GOAL_RUNNER, "finding-add", "--goalId", goalId, "--severity", "info", "--content", "Synthetic smoke path completed"], worktreePath, {
      GOAL_RUNNER_TEST_ROOT: worktreePath,
    });
    runText("node", [GOAL_RUNNER, "evidence-add", "--goalId", goalId, "--type", "code", "--path", "tracked.txt"], worktreePath, {
      GOAL_RUNNER_TEST_ROOT: worktreePath,
    });

    runText("node", [GOAL_RUNNER, "validate", "--goalId", goalId], worktreePath, {
      GOAL_RUNNER_TEST_ROOT: worktreePath,
    });
    runText("node", [GOAL_RUNNER, "complete", "--goalId", goalId], worktreePath, {
      GOAL_RUNNER_TEST_ROOT: worktreePath,
    });
    assert.equal(existsSync(join(worktreePath, "var", "goal-runner", ".active-worktree.json")), false);

    runGit(worktreePath, ["add", "tracked.txt", `docs/07_handoffs/${env.taskId}.md`]);
    runGit(worktreePath, ["commit", "-m", "feat: synthetic smoke task"]);

    runText("node", [ORESHNIK_CLI, "evidence", "--task", env.taskId, "--run", assignment.runId, "--operator", "kilo", "--start-validation"], worktreePath);
    runText("node", [ORESHNIK_CLI, "evidence", "--task", env.taskId, "--run", assignment.runId, "--operator", "kilo", "--ready-for-integration", "--handoff", `docs/07_handoffs/${env.taskId}.md`], worktreePath);

    let board = readJson(join(worktreePath, "var", "oreshnik", "task-board.json"));
    assert.equal(board.tasks[0].status, "ready_for_integration");
    assert.equal(board.tasks[0].activeRun, undefined);

    const runManifestPath = join(worktreePath, "var", "oreshnik", "runs", env.taskId, `${assignment.runId}.json`);
    let runManifest = readJson(runManifestPath);
    assert.equal(runManifest.taskStatus, "ready_for_integration");
    assert.equal(runManifest.claimStatus, "released");
    assert.deepEqual(runManifest.validationGateResults.map((entry) => entry.gateId), ["typecheck", "build", "worker", "tests"]);

    runText("node", [ORESHNIK_CLI, "close", "--sprint", env.sprintId, "--operator", "kilo", "--desc", "smoke"], worktreePath);

    const closeCommit = runGit(worktreePath, ["rev-parse", "HEAD"]);
    const previousCommit = runGit(worktreePath, ["rev-parse", "HEAD~1"]);
    const motherBranch = singleRef(worktreePath, "branch", "MADRE/");
    const tagName = singleRef(worktreePath, "tag", "oreshnik/");
    let queueManifest = readJson(join(worktreePath, "var", "oreshnik", "integration", `${env.sprintId}.json`));
    assert.equal(queueManifest.queue.length, 1);
    assert.equal(queueManifest.queue[0].status, "queued");

    runGit(worktreePath, ["tag", "-f", tagName, previousCommit]);
    assert.notEqual(runGit(worktreePath, ["rev-parse", `${tagName}^{}`]), closeCommit);

    runText("node", [ORESHNIK_CLI, "close", "--sprint", env.sprintId, "--operator", "kilo", "--desc", "smoke"], worktreePath);
    assert.equal(runGit(worktreePath, ["rev-parse", `${tagName}^{}`]), closeCommit);

    runText("node", [ORESHNIK_CLI, "integrate", "--from", assignment.functionalBranch, "--to", motherBranch, "--operator", "kilo"], worktreePath);

    board = readJson(join(worktreePath, "var", "oreshnik", "task-board.json"));
    runManifest = readJson(runManifestPath);
    queueManifest = readJson(join(worktreePath, "var", "oreshnik", "integration", `${env.sprintId}.json`));
    assert.equal(board.tasks[0].status, "integrated");
    assert.equal(runManifest.taskStatus, "integrated");
    assert.equal(queueManifest.queue.length, 1);
    assert.equal(queueManifest.queue[0].status, "integrated");

    const firstIntegratedState = JSON.stringify({
      boardStatus: board.tasks[0].status,
      runStatus: runManifest.taskStatus,
      queueStatus: queueManifest.queue[0].status,
      queueLength: queueManifest.queue.length,
    });

    runText("node", [ORESHNIK_CLI, "integrate", "--from", assignment.functionalBranch, "--to", motherBranch, "--operator", "kilo"], worktreePath);

    board = readJson(join(worktreePath, "var", "oreshnik", "task-board.json"));
    runManifest = readJson(runManifestPath);
    queueManifest = readJson(join(worktreePath, "var", "oreshnik", "integration", `${env.sprintId}.json`));
    assert.equal(
      JSON.stringify({
        boardStatus: board.tasks[0].status,
        runStatus: runManifest.taskStatus,
        queueStatus: queueManifest.queue[0].status,
        queueLength: queueManifest.queue.length,
      }),
      firstIntegratedState,
    );

    const runFiles = readdirSync(join(worktreePath, "var", "oreshnik", "runs", env.taskId)).filter((entry) => entry.endsWith(".json"));
    assert.equal(runFiles.length, 1);
    assert.equal(runGit(worktreePath, ["ls-remote", "origin", `refs/heads/${motherBranch}`]).trim().length > 0, true);
    assert.equal(runGit(worktreePath, ["ls-remote", "origin", `refs/tags/${tagName}^{}`]).trim().includes(closeCommit), true);

    const released = runJson("node", [ORESHNIK_CLI, "dispatch", "release", "--operator", "kilo", "--run", assignment.runId, "--repo", env.repoRoot, "--json"], env.repoRoot);
    assert.equal(released.assignmentId, assignment.assignmentId);

    const status = runJson("node", [ORESHNIK_CLI, "dispatch", "status", "--repo", env.repoRoot, "--json"], env.repoRoot);
    assert.equal(status.claims.every((entry) => entry.status !== "active"), true);
    assert.equal(status.zones.every((entry) => entry.status !== "reserved"), true);

    runGit(env.repoRoot, ["worktree", "remove", assignment.worktreePath, "--force"]);
    runGit(env.repoRoot, ["worktree", "prune"]);
    assert.equal(existsSync(assignment.worktreePath), false);
  });
});

function createFixtureRepository() {
  const base = mkdtempSync(join(tmpdir(), "heptacore-oreshnik-smoke-"));
  tempRoots.push(base);
  const bareRemote = join(base, "remote.git");
  const repoRoot = join(base, "subject");
  const worktreeRoot = join(base, "worktrees");
  const sprintId = "S-SMOKE-01";
  const taskId = "TASK-SMOKE-01";

  mkdirSync(bareRemote, { recursive: true });
  mkdirSync(join(repoRoot, "docs", "07_handoffs"), { recursive: true });
  mkdirSync(join(repoRoot, "docs", "obsidian-vault"), { recursive: true });
  mkdirSync(join(repoRoot, "scripts"), { recursive: true });
  mkdirSync(join(repoRoot, "scripts", "goal-runner"), { recursive: true });
  mkdirSync(join(repoRoot, "src"), { recursive: true });
  mkdirSync(join(repoRoot, "var", "oreshnik"), { recursive: true });
  mkdirSync(worktreeRoot, { recursive: true });

  writeFileSync(join(repoRoot, ".gitignore"), "var/goal-runner/\n", "utf8");
  writeFileSync(join(repoRoot, "docs", "obsidian-vault", "00_CENTRAL_ORESHNIK.md"), "# Fixture\n", "utf8");
  writeFileSync(join(repoRoot, "scripts", "goal-runner", "schema.json"), GOAL_RUNNER_SCHEMA, "utf8");
  writeFileSync(join(repoRoot, "tracked.txt"), "base\n", "utf8");
  writeFileSync(join(repoRoot, "src", "index.js"), "export const fixture = true;\n", "utf8");
  writeFileSync(join(repoRoot, "package.json"), `${JSON.stringify({
    name: "heptacore-oreshnik-smoke-fixture",
    private: true,
    type: "module",
    scripts: {
      typecheck: "node scripts/typecheck.js",
      build: "node scripts/build.js",
      test: "node scripts/test.js",
      "worker:validate": "node scripts/worker-validate.js",
    },
  }, null, 2)}\n`, "utf8");
  writeFileSync(join(repoRoot, "scripts", "typecheck.js"), "console.log('typecheck ok');\n", "utf8");
  writeFileSync(join(repoRoot, "scripts", "build.js"), "console.log('Compiled successfully');\n", "utf8");
  writeFileSync(join(repoRoot, "scripts", "test.js"), "console.log('tests ok');\n", "utf8");
  writeFileSync(join(repoRoot, "scripts", "worker-validate.js"), "console.log('worker ok');\n", "utf8");
  writeFileSync(join(repoRoot, ".oreshnik.json"), `${JSON.stringify({
    version: 1,
    project: { name: "fixture", mainBranch: "master" },
    operators: [
      { id: "manuel", name: "Manuel", displayName: "Manuel", projectRole: "owner", status: "active" },
      { id: "kilo", name: "Kilo", displayName: "Kilo", projectRole: "operator", status: "active" },
    ],
    branching: { motherPrefix: "MADRE", childFormat: "{operator}/{sprint}-{desc}-{date}", integrationPrefix: "integration" },
    validation: {
      gates: [
        { name: "typecheck", command: "npm", args: ["run", "typecheck"], timeoutSeconds: 60 },
        { name: "build", command: "npm", args: ["run", "build"], timeoutSeconds: 60 },
        { name: "worker", command: "npm", args: ["run", "worker:validate"], timeoutSeconds: 60 },
        { name: "tests", command: "npm", args: ["run", "test"], timeoutSeconds: 60 },
      ],
    },
    hardStops: { forbiddenPatterns: [], doubleLockPatterns: [] },
    vault: { enabled: true, path: "docs/obsidian-vault", centralDoc: "00_CENTRAL_ORESHNIK.md" },
    checkpoints: { autoOnClose: true, autoPreRollback: true, snapshotDir: "var/oreshnik/checkpoints" },
    security: { requireCleanTree: true, secretScanning: false, blockEnvDiffs: true },
  }, null, 2)}\n`, "utf8");
  writeFileSync(join(repoRoot, "var", "oreshnik", "task-board.json"), `${JSON.stringify({
    project: "fixture",
    updatedAt: new Date().toISOString(),
    currentExecutionOrder: [sprintId],
    tasks: [
      {
        id: taskId,
        title: "Synthetic supervised dispatcher smoke",
        owner: "manuel",
        status: "ready",
        track: sprintId,
        priority: "high",
        zone: ["src/**"],
        acceptance: ["changed files diff", "typecheck passed", "tests passed"],
        handoff: `docs/07_handoffs/${taskId}.md`,
      },
    ],
  }, null, 2)}\n`, "utf8");
  writeFileSync(join(repoRoot, "docs", "07_handoffs", "zone-map.json"), `${JSON.stringify({
    zones: {
      "src/**": { owner: "shared", lock: "shared", sprints: [sprintId] },
      "docs/**": { owner: "shared", lock: "shared", sprints: ["*"] },
      "var/oreshnik/**": { owner: "shared", lock: "shared", sprints: ["*"] },
    },
  }, null, 2)}\n`, "utf8");

  runGit(base, ["init", "--bare", bareRemote]);
  runGit(repoRoot, ["init"]);
  runGit(repoRoot, ["checkout", "-b", "master"]);
  runGit(repoRoot, ["config", "core.longpaths", "true"]);
  runGit(repoRoot, ["config", "user.email", "kilo@example.com"]);
  runGit(repoRoot, ["config", "user.name", "Kilo"]);
  runGit(repoRoot, ["add", "."]);
  runGit(repoRoot, ["commit", "-m", "seed fixture"]);
  runGit(repoRoot, ["remote", "add", "origin", bareRemote]);
  runGit(repoRoot, ["push", "-u", "origin", "master"]);

  return { base, bareRemote, repoRoot, worktreeRoot, sprintId, taskId };
}

function runGit(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: 120000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  }).trim();
}

function runText(command, args, cwd, extraEnv = {}) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 120000,
    env: { ...process.env, ...extraEnv, GIT_TERMINAL_PROMPT: "0" },
  }).trim();
}

function runJson(command, args, cwd, extraEnv = {}) {
  return JSON.parse(runText(command, args, cwd, extraEnv));
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

function singleRef(cwd, mode, prefix) {
  const args = mode === "branch"
    ? ["for-each-ref", "--format=%(refname:short)", "refs/heads"]
    : ["tag", "--list"];
  const refs = runGit(cwd, args).split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean).filter((entry) => entry.startsWith(prefix));
  assert.equal(refs.length, 1, `expected one ${mode} ref with prefix ${prefix}, got ${refs.join(", ")}`);
  return refs[0];
}
