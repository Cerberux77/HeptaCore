import { describe, it } from "node:test";
import assert from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateTransition } from "../lib.mjs";

const TEMP = join(tmpdir(), `goal-runner-test-state-${Date.now()}`);
mkdirSync(TEMP, { recursive: true });

process.on("exit", () => { try { rmSync(TEMP, { recursive: true, force: true }); } catch {} });

describe("State Machine Transitions", () => {
  const validPairs = [
    ["DRAFT", "READY"],
    ["DRAFT", "ABORTED_CRITICAL_DEVIATION"],
    ["READY", "ACTIVE"],
    ["READY", "ABORTED_CRITICAL_DEVIATION"],
    ["ACTIVE", "PAUSED"],
    ["ACTIVE", "BLOCKED_EXTERNAL"],
    ["ACTIVE", "COMPLETED"],
    ["ACTIVE", "ABORTED_CRITICAL_DEVIATION"],
    ["PAUSED", "ACTIVE"],
    ["PAUSED", "ABORTED_CRITICAL_DEVIATION"],
    ["BLOCKED_EXTERNAL", "ACTIVE"],
    ["BLOCKED_EXTERNAL", "ABORTED_CRITICAL_DEVIATION"],
  ];

  for (const [from, to] of validPairs) {
    it(`${from} -> ${to} is valid`, () => {
      const result = validateTransition(from, to);
      assert.equal(result.valid, true, `${from} -> ${to} should be valid`);
    });
  }

  const allStatuses = ["DRAFT", "READY", "ACTIVE", "PAUSED", "BLOCKED_EXTERNAL", "COMPLETED", "ABORTED_CRITICAL_DEVIATION"];

  for (const from of allStatuses) {
    for (const to of allStatuses) {
      if (validPairs.some(([f, t]) => f === from && t === to)) continue;
      it(`${from} -> ${to} is INVALID`, () => {
        const result = validateTransition(from, to);
        assert.equal(result.valid, false, `${from} -> ${to} should be rejected`);
      });
    }
  }

  it("COMPLETED is immutable", () => {
    for (const to of ["ACTIVE", "PAUSED", "DRAFT", "READY", "BLOCKED_EXTERNAL", "ABORTED_CRITICAL_DEVIATION", "COMPLETED"]) {
      const result = validateTransition("COMPLETED", to);
      assert.equal(result.valid, false, `COMPLETED -> ${to} should be rejected`);
    }
  });

  it("ABORTED_CRITICAL_DEVIATION is immutable", () => {
    for (const to of ["ACTIVE", "PAUSED", "DRAFT", "READY", "BLOCKED_EXTERNAL", "COMPLETED", "ABORTED_CRITICAL_DEVIATION"]) {
      const result = validateTransition("ABORTED_CRITICAL_DEVIATION", to);
      assert.equal(result.valid, false, `ABORTED -> ${to} should be rejected`);
    }
  });

  it("unknown status is rejected", () => {
    const result = validateTransition("INVALID_STATUS", "ACTIVE");
    assert.equal(result.valid, false);
  });

  it("transition to unknown status is rejected", () => {
    const result = validateTransition("DRAFT", "INVALID_STATUS");
    assert.equal(result.valid, false);
  });
});
