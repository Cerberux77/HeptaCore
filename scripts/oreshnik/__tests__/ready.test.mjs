import { after, before, describe, it } from "node:test";
import assert from "node:assert";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  READINESS_SCAN_EXCLUDES,
  collectTextFileMatches,
  collectRuntimeIssues,
  parsePinnedGitDependency,
  validateEvidenceGateCoverage,
  validateGitignoreContract,
  validateGoalContract,
  validateOreshnikContract,
  validatePackageContract
} from "../ready-lib.mjs";

let root;

describe("oreshnik readiness helpers", () => {
  before(() => {
    root = mkdtempSync(join(tmpdir(), "heptacore-ready-"));
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("accepts an exact git dependency pin", () => {
    const result = parsePinnedGitDependency("git+https://github.com/Cerberux77/oreshnik.git#dd97517bc83f3372c97d1778e953f36198f9fe59");
    assert.equal(result.ok, true);
    assert.equal(result.commit, "dd97517bc83f3372c97d1778e953f36198f9fe59");
  });

  it("accepts an exact vendored tarball pin", () => {
    const result = parsePinnedGitDependency("file:vendor/oreshnik/oreshnik-cli-0.2.0-alpha.8-dd97517bc83f3372c97d1778e953f36198f9fe59.tgz");
    assert.equal(result.ok, true);
    assert.equal(result.commit, "dd97517bc83f3372c97d1778e953f36198f9fe59");
  });

  it("rejects floating or aliased dependency specs", () => {
    assert.equal(parsePinnedGitDependency("npm:oreshnik-cli@0.2.0-alpha.0").ok, false);
    assert.equal(parsePinnedGitDependency("git+https://github.com/Cerberux77/oreshnik.git#main").ok, false);
  });

  it("fails when required evidence gate coverage is incomplete", () => {
    const issues = validateEvidenceGateCoverage(["typecheck", "build", "worker"]);
    assert.deepStrictEqual(issues, ["missing required gate 'tests'"]);
  });

  it("requires kilo in the Oreshnik operator registry and all mandatory gates", () => {
    const issues = validateOreshnikContract({
      operators: [{ id: "codex" }],
      validation: { gates: [{ name: "typecheck" }, { name: "build" }, { name: "worker" }] }
    });
    assert.ok(issues.includes("operator registry must include kilo"));
    assert.ok(issues.includes("missing required gate 'tests'"));
  });

  it("requires the autonomous /goal dispatch contract", () => {
    const issues = validateGoalContract("npm run oreshnik:ready\noreshnik dispatch resume --operator kilo --repo . --json");
    assert.ok(issues.some((issue) => issue.includes("dispatch next")));
  });

  it("detects duplicate active runs for the same task", () => {
    const runsDir = join(root, "var", "oreshnik", "runs", "T-01");
    mkdirSync(runsDir, { recursive: true });
    writeFileSync(join(runsDir, "run-a.json"), JSON.stringify({ taskId: "T-01", runId: "run-a", taskStatus: "validating", claimStatus: "claimed" }));
    writeFileSync(join(runsDir, "run-b.json"), JSON.stringify({ taskId: "T-01", runId: "run-b", taskStatus: "ready_for_integration", claimStatus: "claimed" }));
    const issues = collectRuntimeIssues(root);
    assert.deepStrictEqual(issues, ["task T-01 has multiple active runs: run-a, run-b"]);
  });

  it("skips readiness detector source files when scanning forbidden tokens", () => {
    const scriptsDir = join(root, "scripts", "oreshnik");
    mkdirSync(join(scriptsDir, "__tests__"), { recursive: true });
    writeFileSync(join(scriptsDir, "ready.mjs"), "const token = 'D:\\PROYECTOS\\SMOKE';\n");
    writeFileSync(join(scriptsDir, "ready-lib.mjs"), "const token = '../oreshnik';\n");
    writeFileSync(join(scriptsDir, "__tests__", "ready.test.mjs"), "const token = 'D:\\H1';\n");
    writeFileSync(join(root, "README.md"), "uses D:\\PROYECTOS\\SMOKE\n");
    const matches = collectTextFileMatches(root, ["D:\\H1", "D:\\PROYECTOS\\SMOKE", "../oreshnik"], {
      excludePaths: Array.from(READINESS_SCAN_EXCLUDES)
    });
    assert.deepStrictEqual(matches, [{ path: "README.md", token: "D:\\PROYECTOS\\SMOKE" }]);
  });

  it("validates package contract scripts and dependency pin", () => {
    const { issues, pinnedCommit } = validatePackageContract({
      scripts: { "oreshnik:ready": "node scripts/oreshnik/ready.mjs", "test:infra": "node --test" },
      dependencies: { "oreshnik-cli": "file:vendor/oreshnik/oreshnik-cli-0.2.0-alpha.8-dd97517bc83f3372c97d1778e953f36198f9fe59.tgz" }
    });
    assert.deepStrictEqual(issues, []);
    assert.equal(pinnedCommit, "dd97517bc83f3372c97d1778e953f36198f9fe59");
  });

  it("requires goal runner runtime artifacts to be gitignored", () => {
    assert.deepStrictEqual(validateGitignoreContract("node_modules/\nvar/goal-runner/\n"), []);
    assert.deepStrictEqual(validateGitignoreContract("node_modules/\n"), [".gitignore must ignore var/goal-runner/"]);
  });
});
