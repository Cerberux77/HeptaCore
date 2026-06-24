import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANONICAL_TENANT_ROLES,
  normalizeTenantRole,
  isAssignableTenantRole,
  isLegacyTenantRole,
  getCanonicalRoleLabel,
} from "../../lib/canonical-tenant-role";

describe("canonical tenant roles", () => {
  it("has exactly three canonical roles", () => {
    assert.equal(CANONICAL_TENANT_ROLES.length, 3);
    assert.ok(CANONICAL_TENANT_ROLES.includes("OWNER"));
    assert.ok(CANONICAL_TENANT_ROLES.includes("ADMIN"));
    assert.ok(CANONICAL_TENANT_ROLES.includes("VIEWER"));
  });

  it("normalizeTenantRole maps OWNER to OWNER", () => {
    assert.equal(normalizeTenantRole("OWNER"), "OWNER");
  });

  it("normalizeTenantRole maps TENANT_ADMIN to ADMIN", () => {
    assert.equal(normalizeTenantRole("TENANT_ADMIN"), "ADMIN");
  });

  it("normalizeTenantRole maps ADMIN to ADMIN", () => {
    assert.equal(normalizeTenantRole("ADMIN"), "ADMIN");
  });

  it("normalizeTenantRole maps STRATEGIST to ADMIN", () => {
    assert.equal(normalizeTenantRole("STRATEGIST"), "ADMIN");
  });

  it("normalizeTenantRole maps EDITOR to ADMIN", () => {
    assert.equal(normalizeTenantRole("EDITOR"), "ADMIN");
  });

  it("normalizeTenantRole maps APPROVER to ADMIN", () => {
    assert.equal(normalizeTenantRole("APPROVER"), "ADMIN");
  });

  it("normalizeTenantRole maps PUBLISHER to ADMIN", () => {
    assert.equal(normalizeTenantRole("PUBLISHER"), "ADMIN");
  });

  it("normalizeTenantRole maps ANALYST to VIEWER", () => {
    assert.equal(normalizeTenantRole("ANALYST"), "VIEWER");
  });

  it("normalizeTenantRole maps VIEWER to VIEWER", () => {
    assert.equal(normalizeTenantRole("VIEWER"), "VIEWER");
  });

  it("normalizeTenantRole returns null for SUPER_ADMIN", () => {
    assert.equal(normalizeTenantRole("SUPER_ADMIN"), null);
  });

  it("normalizeTenantRole returns null for unknown role", () => {
    assert.equal(normalizeTenantRole("UNKNOWN" as any), null);
  });

  it("TENANT_ADMIN canonical is ADMIN not null", () => {
    const result = normalizeTenantRole("TENANT_ADMIN");
    assert.equal(result, "ADMIN");
    assert.notEqual(result, null);
  });

  it("EDITOR canonical is ADMIN not null", () => {
    const result = normalizeTenantRole("EDITOR");
    assert.equal(result, "ADMIN");
    assert.notEqual(result, null);
  });

  it("ANALYST canonical is VIEWER not null", () => {
    const result = normalizeTenantRole("ANALYST");
    assert.equal(result, "VIEWER");
    assert.notEqual(result, null);
  });

  it("isAssignableTenantRole accepts OWNER", () => {
    assert.equal(isAssignableTenantRole("OWNER"), true);
  });

  it("isAssignableTenantRole accepts ADMIN", () => {
    assert.equal(isAssignableTenantRole("ADMIN"), true);
  });

  it("isAssignableTenantRole accepts VIEWER", () => {
    assert.equal(isAssignableTenantRole("VIEWER"), true);
  });

  it("isAssignableTenantRole rejects SUPER_ADMIN", () => {
    assert.equal(isAssignableTenantRole("SUPER_ADMIN"), false);
  });

  it("isAssignableTenantRole rejects EDITOR", () => {
    assert.equal(isAssignableTenantRole("EDITOR"), false);
  });

  it("isAssignableTenantRole rejects TENANT_ADMIN", () => {
    assert.equal(isAssignableTenantRole("TENANT_ADMIN"), false);
  });

  it("isAssignableTenantRole rejects STRATEGIST", () => {
    assert.equal(isAssignableTenantRole("STRATEGIST"), false);
  });

  it("isAssignableTenantRole rejects APPROVER", () => {
    assert.equal(isAssignableTenantRole("APPROVER"), false);
  });

  it("isAssignableTenantRole rejects PUBLISHER", () => {
    assert.equal(isAssignableTenantRole("PUBLISHER"), false);
  });

  it("isAssignableTenantRole rejects ANALYST", () => {
    assert.equal(isAssignableTenantRole("ANALYST"), false);
  });

  it("isLegacyTenantRole identifies TENANT_ADMIN as legacy", () => {
    assert.equal(isLegacyTenantRole("TENANT_ADMIN"), true);
  });

  it("isLegacyTenantRole identifies EDITOR as legacy", () => {
    assert.equal(isLegacyTenantRole("EDITOR"), true);
  });

  it("isLegacyTenantRole identifies STRATEGIST as legacy", () => {
    assert.equal(isLegacyTenantRole("STRATEGIST"), true);
  });

  it("isLegacyTenantRole identifies PUBLISHER as legacy", () => {
    assert.equal(isLegacyTenantRole("PUBLISHER"), true);
  });

  it("isLegacyTenantRole identifies APPROVER as legacy", () => {
    assert.equal(isLegacyTenantRole("APPROVER"), true);
  });

  it("isLegacyTenantRole identifies ANALYST as legacy", () => {
    assert.equal(isLegacyTenantRole("ANALYST"), true);
  });

  it("isLegacyTenantRole returns false for OWNER", () => {
    assert.equal(isLegacyTenantRole("OWNER"), false);
  });

  it("isLegacyTenantRole returns false for ADMIN", () => {
    assert.equal(isLegacyTenantRole("ADMIN"), false);
  });

  it("isLegacyTenantRole returns false for VIEWER", () => {
    assert.equal(isLegacyTenantRole("VIEWER"), false);
  });

  it("isLegacyTenantRole returns false for SUPER_ADMIN", () => {
    assert.equal(isLegacyTenantRole("SUPER_ADMIN"), false);
  });

  it("getCanonicalRoleLabel returns Spanish label for OWNER", () => {
    assert.equal(getCanonicalRoleLabel("OWNER"), "Propietario");
  });

  it("getCanonicalRoleLabel returns Spanish label for ADMIN", () => {
    assert.equal(getCanonicalRoleLabel("ADMIN"), "Administrador");
  });

  it("getCanonicalRoleLabel returns Spanish label for VIEWER", () => {
    assert.equal(getCanonicalRoleLabel("VIEWER"), "Consulta");
  });

  it("getCanonicalRoleLabel returns raw string for unknown role", () => {
    assert.equal(getCanonicalRoleLabel("UNKNOWN"), "UNKNOWN");
  });

  it("all tenant roles normalize to a canonical value or null", () => {
    const allTenantRoles = [
      "OWNER", "TENANT_ADMIN", "ADMIN", "STRATEGIST", "EDITOR",
      "APPROVER", "PUBLISHER", "ANALYST", "VIEWER",
    ];
    for (const role of allTenantRoles) {
      const canonical = normalizeTenantRole(role as any);
      assert.ok(canonical !== undefined, `${role} should not be undefined`);
      if (role === "SUPER_ADMIN") {
        assert.equal(canonical, null);
      } else {
        assert.ok(canonical === "OWNER" || canonical === "ADMIN" || canonical === "VIEWER",
          `${role} mapped to ${canonical}`);
      }
    }
  });

  it("SUPER_ADMIN does not normalize to OWNER", () => {
    assert.notEqual(normalizeTenantRole("SUPER_ADMIN"), "OWNER");
    assert.equal(normalizeTenantRole("SUPER_ADMIN"), null);
  });
});
