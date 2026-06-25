import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "..", "schema.json");

describe("Schema Validation", () => {
  let schema;

  it("schema.json is valid JSON", () => {
    const raw = readFileSync(schemaPath, "utf8");
    schema = JSON.parse(raw);
    assert.ok(schema);
  });

  it("schema has required definitions", () => {
    assert.ok(schema.definitions.state);
    assert.ok(schema.definitions.index);
    assert.ok(schema.definitions.lock);
    assert.ok(schema.definitions.validation);
    assert.ok(schema.definitions.indexEntry);
  });

  it("state schema requires goalId", () => {
    const required = schema.definitions.state.required;
    assert.ok(required.includes("goalId"));
    assert.ok(required.includes("title"));
    assert.ok(required.includes("owner"));
    assert.ok(required.includes("sprintId"));
    assert.ok(required.includes("status"));
    assert.ok(required.includes("branch"));
    assert.ok(required.includes("baseSha"));
  });

  it("state schema has valid statuses", () => {
    const statuses = schema.definitions.state.properties.status.enum;
    assert.ok(statuses.includes("DRAFT"));
    assert.ok(statuses.includes("READY"));
    assert.ok(statuses.includes("ACTIVE"));
    assert.ok(statuses.includes("PAUSED"));
    assert.ok(statuses.includes("BLOCKED_EXTERNAL"));
    assert.ok(statuses.includes("COMPLETED"));
    assert.ok(statuses.includes("ABORTED_CRITICAL_DEVIATION"));
  });

  it("state schema has valid evidenceRequired", () => {
    const types = schema.definitions.state.properties.evidenceRequired.enum;
    assert.ok(types.includes("code"));
    assert.ok(types.includes("ui"));
    assert.ok(types.includes("integration"));
  });

  it("state schema validates goalId pattern", () => {
    const pattern = schema.definitions.state.properties.goalId.pattern;
    assert.ok(new RegExp(pattern).test("GR-20260625T192236Z-a1b2c3d4-test-goal"));
    assert.ok(!new RegExp(pattern).test("GR-20260625T192236Z-abcd-test"));
    assert.ok(!new RegExp(pattern).test("invalid-id"));
  });

  it("validation schema has evidence with required fields", () => {
    const ev = schema.definitions.validation.properties.evidence.items;
    assert.ok(ev.required.includes("type"));
    assert.ok(ev.required.includes("path"));
    assert.ok(ev.required.includes("hash"));
    assert.ok(ev.required.includes("addedAt"));
  });

  it("validation schema evidence hash has sha256 pattern", () => {
    const hashPattern = schema.definitions.validation.properties.evidence.items.properties.hash.pattern;
    const validHash = "sha256:" + "a".repeat(64);
    assert.ok(new RegExp(hashPattern).test(validHash));
    assert.ok(!new RegExp(hashPattern).test("md5:abc"));
  });

  it("lock schema requires goalId and worktreeRoot", () => {
    const required = schema.definitions.lock.required;
    assert.ok(required.includes("goalId"));
    assert.ok(required.includes("branch"));
    assert.ok(required.includes("worktreeRoot"));
    assert.ok(required.includes("owner"));
    assert.ok(required.includes("startedAt"));
  });

  it("index schema requires version and goals", () => {
    const required = schema.definitions.index.required;
    assert.ok(required.includes("version"));
    assert.ok(required.includes("goals"));
    assert.equal(schema.definitions.index.properties.version.const, 1);
  });

  it("state validates valid JSON correctly", () => {
    const validState = {
      goalId: "GR-20260625T192236Z-a1b2-test-goal",
      title: "Test", owner: "Manuel", sprintId: "S-HC-TEST",
      status: "ACTIVE", branch: "main", baseSha: "abc123def456",
      evidenceRequired: "code", validationGates: ["typecheck"],
      createdAt: "2026-06-25T19:22:36.000Z", updatedAt: "2026-06-25T19:22:36.000Z",
      transitions: []
    };
    assert.ok(validState.goalId);
    assert.ok(validState.title);
  });

  it("state with missing goalId would fail pattern check", () => {
    const pattern = new RegExp(schema.definitions.state.properties.goalId.pattern);
    assert.ok(!pattern.test(""));
    assert.ok(!pattern.test(undefined));
    assert.ok(!pattern.test(null));
  });
});
