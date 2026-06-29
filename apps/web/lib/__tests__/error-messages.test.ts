import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { translateError } from "../error-messages";

describe("error-messages", () => {
  it("translates LAST_OWNER", () => {
    const msg = translateError("LAST_OWNER", "fallback");
    assert.ok(msg.includes("ultimo OWNER"));
    assert.ok(msg.includes("cambiar el rol"));
  });

  it("translates ACCOUNT_REQUIRES_INVITATION", () => {
    const msg = translateError("ACCOUNT_REQUIRES_INVITATION", "fallback");
    assert.ok(msg.includes("invitacion"));
    assert.ok(!msg.includes("fallback"));
  });

  it("translates FORBIDDEN", () => {
    const msg = translateError("FORBIDDEN", "fallback");
    assert.ok(msg.includes("permisos"));
    assert.ok(!msg.includes("fallback"));
  });

  it("translates TENANT_SUSPENDED", () => {
    const msg = translateError("TENANT_SUSPENDED", "fallback");
    assert.ok(msg.includes("suspendido"));
  });

  it("translates TENANT_ARCHIVED", () => {
    const msg = translateError("TENANT_ARCHIVED", "fallback");
    assert.ok(msg.includes("archivado"));
  });

  it("translates TENANT_PROVISIONING", () => {
    const msg = translateError("TENANT_PROVISIONING", "fallback");
    assert.ok(msg.includes("provisionamiento"));
  });

  it("returns fallback for unknown code", () => {
    const msg = translateError("UNKNOWN_CODE", "mensaje por defecto");
    assert.equal(msg, "mensaje por defecto");
  });

  it("returns fallback for empty code", () => {
    const msg = translateError("", "mensaje por defecto");
    assert.equal(msg, "mensaje por defecto");
  });

  it("all known codes produce non-empty strings", () => {
    const codes = [
      "LAST_OWNER", "ACCOUNT_REQUIRES_INVITATION", "FORBIDDEN",
      "UNAUTHORIZED", "NOT_MEMBER", "NOT_FOUND",
      "TENANT_SUSPENDED", "TENANT_ARCHIVED", "TENANT_PROVISIONING",
      "SLUG_TAKEN", "INVALID_SLUG", "INVALID_OWNER_EMAIL",
      "INVALID_EMAIL", "INVALID_ROLE", "INVALID_TRANSITION",
      "DUPLICATE_MEMBERSHIP", "DUPLICATE_INVITATION", "ALREADY_ACCEPTED",
      "INVALID_PAGINATION",
    ];
    for (const code of codes) {
      const msg = translateError(code, "");
      assert.ok(msg.length > 0, `code ${code} should have a message`);
    }
  });

  it("zero secrets in error messages", () => {
    const all = translateError("LAST_OWNER", "")
      + translateError("FORBIDDEN", "")
      + translateError("UNAUTHORIZED", "");
    assert.ok(!all.includes("password"));
    assert.ok(!all.includes("token"));
    assert.ok(!all.includes("secret"));
    assert.ok(!all.includes("credential"));
  });
});
