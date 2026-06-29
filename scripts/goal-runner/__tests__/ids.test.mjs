import { describe, it } from "node:test";
import assert from "node:assert";
import { generateGoalId, generateGoalIdWithTime, validateGoalId, validateNoPathTraversal, sanitizeSlug, ID_PATTERN } from "../lib.mjs";

describe("ID Generation", () => {
  it("generates valid goal IDs", () => {
    for (let i = 0; i < 100; i++) {
      const id = generateGoalId("Test Goal " + String.fromCharCode(65 + (i % 26)));
      assert.ok(ID_PATTERN.test(id), `ID ${id} should match pattern`);
      assert.ok(validateGoalId(id), `ID ${id} should validate`);
    }
  });

  it("generates 5000 IDs with same title without collisions", () => {
    const ids = new Set();
    const title = "Collision Test Goal";
    for (let i = 0; i < 5000; i++) {
      const id = generateGoalId(title);
      assert.ok(!ids.has(id), `Collision detected: ${id}`);
      ids.add(id);
    }
    assert.equal(ids.size, 5000);
  });

  it("generates 5000 IDs with fixed timestamp without collisions", () => {
    const ids = new Set();
    const title = "Same Second Test";
    const fixedTime = "2026-06-25T19:22:36.000Z";
    for (let i = 0; i < 5000; i++) {
      const id = generateGoalIdWithTime(title, fixedTime);
      assert.ok(!ids.has(id), `Collision detected with fixed time: ${id}`);
      ids.add(id);
    }
    assert.equal(ids.size, 5000);
  });

  it("rejects path traversal in IDs", () => {
    assert.equal(validateNoPathTraversal("GR-20260625T192236Z-a1b2c3d4-../../etc"), false);
    assert.equal(validateNoPathTraversal("GR-20260625T192236Z-a1b2c3d4-..\\windows"), false);
  });

  it("rejects Windows reserved characters", () => {
    assert.equal(validateNoPathTraversal("test<goal"), false);
    assert.equal(validateNoPathTraversal("test>goal"), false);
    assert.equal(validateNoPathTraversal("test:goal"), false);
    assert.equal(validateNoPathTraversal('test"goal'), false);
    assert.equal(validateNoPathTraversal("test|goal"), false);
    assert.equal(validateNoPathTraversal("test?goal"), false);
    assert.equal(validateNoPathTraversal("test*goal"), false);
    assert.equal(validateNoPathTraversal("test\\goal"), false);
    assert.equal(validateNoPathTraversal("test/goal"), false);
    assert.equal(validateNoPathTraversal("test%goal"), false);
  });

  it("rejects control characters", () => {
    assert.equal(validateNoPathTraversal("test\x00goal"), false);
    assert.equal(validateNoPathTraversal("test\x1fgoal"), false);
  });

  it("rejects invalid goal ID format", () => {
    assert.equal(validateGoalId("not-a-valid-id"), false);
    assert.equal(validateGoalId(""), false);
    assert.equal(validateGoalId(null), false);
    assert.equal(validateGoalId("GR-20260625T192236Z-a1b2c3d4"), false);
    assert.equal(validateGoalId("GR-20260625T192236Z-abcd-slug"), false);
  });

  it("sanitizeSlug handles edge cases", () => {
    assert.equal(sanitizeSlug("Hello World"), "hello-world");
    assert.equal(sanitizeSlug("test!@#$%"), "test");
    assert.equal(sanitizeSlug("a".repeat(100)), "a".repeat(48));
    assert.equal(sanitizeSlug(""), "goal");
    assert.equal(sanitizeSlug(null), "goal");
    assert.equal(sanitizeSlug(undefined), "goal");
  });

  it("generated IDs contain no Windows-problematic chars", () => {
    for (let i = 0; i < 500; i++) {
      const id = generateGoalId(`Test ${i}`);
      assert.equal(validateNoPathTraversal(id), true, `ID ${id} should pass path traversal check`);
    }
  });

  it("goal ID has 8 hex chars of entropy suffix", () => {
    for (let i = 0; i < 100; i++) {
      const id = generateGoalId(`Test ${i}`);
      const match = id.match(/^GR-\d{8}T\d{6}Z-([a-f0-9]{8})-/);
      assert.ok(match, `ID ${id} should have 8-char hex suffix`);
      assert.equal(match[1].length, 8);
    }
  });
});
