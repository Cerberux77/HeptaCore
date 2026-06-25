import { describe, it } from "node:test";
import assert from "node:assert";
import { generateGoalId, validateGoalId, validateNoPathTraversal, sanitizeSlug, ID_PATTERN } from "../lib.mjs";

describe("ID Generation", () => {
  it("generates valid goal IDs", () => {
    for (let i = 0; i < 100; i++) {
      const id = generateGoalId("Test Goal " + String.fromCharCode(65 + (i % 26)));
      assert.ok(ID_PATTERN.test(id), `ID ${id} should match pattern`);
      assert.ok(validateGoalId(id), `ID ${id} should validate`);
    }
  });

  it("generates 1000 IDs without collisions", () => {
    const ids = new Set();
    for (let i = 0; i < 1000; i++) {
      const id = generateGoalId(`Goal ${i}`);
      assert.ok(!ids.has(id), `Collision detected: ${id}`);
      ids.add(id);
    }
    assert.equal(ids.size, 1000);
  });

  it("rejects path traversal in IDs", () => {
    assert.equal(validateNoPathTraversal("GR-20260625T192236Z-a1b2-../../etc"), false);
    assert.equal(validateNoPathTraversal("GR-20260625T192236Z-a1b2-..\\windows"), false);
  });

  it("rejects Windows reserved characters", () => {
    assert.equal(validateNoPathTraversal("GR-20260625T192236Z-a1b2-test<goal"), false);
    assert.equal(validateNoPathTraversal("GR-20260625T192236Z-a1b2-test>goal"), false);
    assert.equal(validateNoPathTraversal("GR-20260625T192236Z-a1b2-test:goal"), false);
    assert.equal(validateNoPathTraversal('GR-20260625T192236Z-a1b2-test"goal'), false);
    assert.equal(validateNoPathTraversal("GR-20260625T192236Z-a1b2-test|goal"), false);
    assert.equal(validateNoPathTraversal("GR-20260625T192236Z-a1b2-test?goal"), false);
    assert.equal(validateNoPathTraversal("GR-20260625T192236Z-a1b2-test*goal"), false);
    assert.equal(validateNoPathTraversal("GR-20260625T192236Z-a1b2-test\\goal"), false);
    assert.equal(validateNoPathTraversal("GR-20260625T192236Z-a1b2-test/goal"), false);
    assert.equal(validateNoPathTraversal("GR-20260625T192236Z-a1b2-test%goal"), false);
  });

  it("rejects control characters", () => {
    assert.equal(validateNoPathTraversal("GR-20260625T192236Z-a1b2-test\x00goal"), false);
    assert.equal(validateNoPathTraversal("GR-20260625T192236Z-a1b2-test\x1fgoal"), false);
  });

  it("rejects invalid goal ID format", () => {
    assert.equal(validateGoalId("not-a-valid-id"), false);
    assert.equal(validateGoalId(""), false);
    assert.equal(validateGoalId(null), false);
    assert.equal(validateGoalId("GR-20260625T192236Z-a1b2"), false);
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
});
