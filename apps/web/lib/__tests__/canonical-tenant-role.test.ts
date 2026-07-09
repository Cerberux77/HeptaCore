import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANONICAL_TENANT_ROLES,
  normalizeTenantRole,
  isAssignableTenantRole,
  isLegacyTenantRole,
  getCanonicalRoleLabel,
} from "../../lib/canonical-tenant-role";
import {
  AMBIGUOUS_LEGACY_TENANT_ROLES,
  PLATFORM_ROLE_SUPER_ADMIN,
  TENANT_FUNCTIONAL_ROLES,
  getTenantRoleLabel,
  isAmbiguousLegacyTenantRole,
  isCanonicalTenantRole,
  isPlatformSuperAdmin,
  normalizeFunctionalTenantRole,
} from "../../lib/role-model";

describe("canonical tenant roles", () => {
  it("has exactly the two canonical tenant roles", () => {
    assert.deepEqual(CANONICAL_TENANT_ROLES, ["TENANT_ADMIN", "PUBLISHER"]);
    assert.deepEqual(TENANT_FUNCTIONAL_ROLES, ["TENANT_ADMIN", "PUBLISHER"]);
  });

  it("normalizes canonical tenant roles without aliases", () => {
    assert.equal(normalizeTenantRole("TENANT_ADMIN"), "TENANT_ADMIN");
    assert.equal(normalizeTenantRole("PUBLISHER"), "PUBLISHER");
  });

  it("maps safe legacy tenant roles to canonical roles", () => {
    assert.equal(normalizeFunctionalTenantRole("OWNER"), "TENANT_ADMIN");
    assert.equal(normalizeFunctionalTenantRole("ADMIN"), "TENANT_ADMIN");
    assert.equal(normalizeFunctionalTenantRole("TENANT_ADMIN"), "TENANT_ADMIN");
    assert.equal(normalizeFunctionalTenantRole("PUBLISHER"), "PUBLISHER");
  });

  it("does not normalize SUPER_ADMIN as a tenant role", () => {
    assert.equal(normalizeFunctionalTenantRole("SUPER_ADMIN"), null);
    assert.equal(normalizeTenantRole("SUPER_ADMIN" as never), null);
  });

  it("does not auto-convert ambiguous legacy roles", () => {
    for (const role of AMBIGUOUS_LEGACY_TENANT_ROLES) {
      assert.equal(normalizeFunctionalTenantRole(role), null, `${role} must require manual migration`);
      assert.equal(isAmbiguousLegacyTenantRole(role), true);
    }
  });

  it("recognizes assignable and legacy roles correctly", () => {
    assert.equal(isAssignableTenantRole("TENANT_ADMIN"), true);
    assert.equal(isAssignableTenantRole("PUBLISHER"), true);
    assert.equal(isAssignableTenantRole("OWNER"), false);
    assert.equal(isAssignableTenantRole("ADMIN"), false);
    assert.equal(isAssignableTenantRole("SUPER_ADMIN"), false);

    assert.equal(isLegacyTenantRole("OWNER"), true);
    assert.equal(isLegacyTenantRole("ADMIN"), true);
    assert.equal(isLegacyTenantRole("VIEWER"), true);
    assert.equal(isLegacyTenantRole("SUPER_ADMIN"), true);
    assert.equal(isLegacyTenantRole("TENANT_ADMIN"), false);
    assert.equal(isLegacyTenantRole("PUBLISHER"), false);
  });

  it("labels the canonical roles without old aliases", () => {
    assert.equal(getCanonicalRoleLabel("TENANT_ADMIN"), "Tenant Admin");
    assert.equal(getCanonicalRoleLabel("PUBLISHER"), "Publisher");
    assert.equal(getCanonicalRoleLabel(PLATFORM_ROLE_SUPER_ADMIN), "Super Admin");
    assert.equal(getTenantRoleLabel("TENANT_ADMIN"), "Tenant Admin");
  });

  it("recognizes global platform super admin only from platformRole", () => {
    assert.equal(isPlatformSuperAdmin(PLATFORM_ROLE_SUPER_ADMIN), true);
    assert.equal(isPlatformSuperAdmin(null), false);
  });

  it("recognizes canonical tenant roles only for the supported pair", () => {
    assert.equal(isCanonicalTenantRole("TENANT_ADMIN"), true);
    assert.equal(isCanonicalTenantRole("PUBLISHER"), true);
    assert.equal(isCanonicalTenantRole("OWNER"), false);
    assert.equal(isCanonicalTenantRole("ADMIN"), false);
  });
});
