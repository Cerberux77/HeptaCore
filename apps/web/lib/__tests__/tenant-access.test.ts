import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  Permission,
  getPermissionsForRole,
  hasRolePermission,
} from "../permissions";
import {
  assertTenantLifecycleAllowsMutation,
  invitationCapabilityForLifecycle,
  isSuperAdmin,
  requireActiveTenant,
  requireSuperAdminActor,
  requireTenantMembership,
  resolveSuperAdminAccess,
  resolveTenantAccess,
  resolveTenantAccessWithLifecycle,
  TenantAccessError,
} from "../tenant-access";
import type { PlatformRole, TenantStatus, UserRole } from "@prisma/client";

function fakeDb(
  platformRole: PlatformRole | null = null,
  role: UserRole | null = null,
  status: TenantStatus = "ACTIVE",
  userExists: boolean = true,
  tenantExists: boolean = true,
) {
  return {
    user: {
      findUnique: async (args: { where: { id: string }; select: { id: true; platformRole: true } }) => {
        if (!userExists) return null;
        return { id: args.where.id, platformRole };
      },
    },
    membership: {
      findMany: async () => [],
      findUnique: async () => {
        if (!role) return null;
        return { role };
      },
    },
    tenant: {
      findUnique: async () => {
        if (!tenantExists) return null;
        return { id: "tid", status };
      },
      count: async () => 1,
      findMany: async () => [],
      findUniqueOrThrow: async () => ({ status }),
    },
  };
}

describe("permission matrix", () => {
  it("SUPER_ADMIN has all permissions", () => {
    const perms = getPermissionsForRole("SUPER_ADMIN");
    for (const p of Object.values(Permission)) {
      assert.equal(perms.has(p), true, `SUPER_ADMIN should have ${p}`);
    }
  });

  it("TENANT_ADMIN can manage members and tenant config", () => {
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.MEMBERS_ADD), true);
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.MEMBERS_ROLE_UPDATE), true);
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.TENANT_CONFIG_UPDATE), true);
  });

  it("TENANT_ADMIN cannot use global-only or suspended lifecycle powers", () => {
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.TENANT_STATUS_CHANGE), false);
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.SECURITY_MANAGE), false);
  });

  it("PUBLISHER can work on content but cannot manage members or config", () => {
    assert.equal(hasRolePermission("PUBLISHER", Permission.CONTENT_WRITE), true);
    assert.equal(hasRolePermission("PUBLISHER", Permission.CONTENT_APPROVE), true);
    assert.equal(hasRolePermission("PUBLISHER", Permission.CONTENT_PUBLISH), true);
    assert.equal(hasRolePermission("PUBLISHER", Permission.MEMBERS_ADD), false);
    assert.equal(hasRolePermission("PUBLISHER", Permission.TENANT_CONFIG_UPDATE), false);
  });
});

describe("platform super admin", () => {
  it("is derived from platformRole, not memberships", () => {
    assert.equal(isSuperAdmin("SUPER_ADMIN"), true);
    assert.equal(isSuperAdmin(null), false);
  });

  it("requireSuperAdminActor accepts a user with platformRole SUPER_ADMIN", async () => {
    const tx = {
      user: {
        findUnique: async () => ({ id: "uid", platformRole: "SUPER_ADMIN" as PlatformRole }),
      },
    };
    assert.equal(await requireSuperAdminActor("uid", tx), "uid");
  });

  it("requireSuperAdminActor rejects a non-super-admin user", async () => {
    const tx = {
      user: {
        findUnique: async () => ({ id: "uid", platformRole: null }),
      },
    };
    await assert.rejects(() => requireSuperAdminActor("uid", tx), (e: unknown) => (e as TenantAccessError).code === "FORBIDDEN");
  });

  it("resolveSuperAdminAccess accepts a platform super admin without membership", async () => {
    const db = {
      user: {
        findUnique: async () => ({ id: "uid", platformRole: "SUPER_ADMIN" as PlatformRole }),
      },
    };
    assert.equal(await resolveSuperAdminAccess("uid", db), "uid");
  });
});

describe("tenant membership access", () => {
  it("requireTenantMembership returns canonical membership roles", async () => {
    const db = fakeDb(null, "TENANT_ADMIN");
    const result = await requireTenantMembership("uid", "tid", db as any);
    assert.equal(result.role, "TENANT_ADMIN");
  });

  it("throws NOT_MEMBER when the user is not assigned to the tenant", async () => {
    const db = fakeDb(null, null);
    await assert.rejects(() => requireTenantMembership("uid", "tid", db as any), (e: unknown) => (e as TenantAccessError).code === "NOT_MEMBER");
  });

  it("SUPER_ADMIN can access any tenant as context without membership", async () => {
    const db = fakeDb("SUPER_ADMIN", null, "ACTIVE");
    const result = await resolveTenantAccess("uid", "tid", Permission.MEMBERS_ADD, db as any);
    assert.equal(result.role, "SUPER_ADMIN");
    assert.equal(result.superAdminBypass, true);
  });

  it("TENANT_ADMIN can manage only its assigned tenant", async () => {
    const db = fakeDb(null, "TENANT_ADMIN", "ACTIVE");
    const result = await resolveTenantAccess("uid", "tid", Permission.MEMBERS_ADD, db as any);
    assert.equal(result.role, "TENANT_ADMIN");
    assert.equal(result.superAdminBypass, false);
  });

  it("PUBLISHER cannot manage members", async () => {
    const db = fakeDb(null, "PUBLISHER", "ACTIVE");
    await assert.rejects(
      () => resolveTenantAccess("uid", "tid", Permission.MEMBERS_ADD, db as any),
      (e: unknown) => (e as TenantAccessError).code === "FORBIDDEN",
    );
  });

  it("tenant not found returns NOT_FOUND", async () => {
    const db = fakeDb(null, "TENANT_ADMIN", "ACTIVE", true, false);
    await assert.rejects(
      () => resolveTenantAccess("uid", "tid", Permission.MEMBERS_READ, db as any),
      (e: unknown) => (e as TenantAccessError).code === "NOT_FOUND",
    );
  });
});

describe("tenant lifecycle", () => {
  it("requireActiveTenant accepts ACTIVE tenant", async () => {
    const db = fakeDb(null, null, "ACTIVE");
    const result = await requireActiveTenant("tid", db as any);
    assert.equal(result.status, "ACTIVE");
  });

  it("blocks normal mutations on SUSPENDED and ARCHIVED tenants", () => {
    assert.throws(() => assertTenantLifecycleAllowsMutation("SUSPENDED", "NORMAL_OPERATION"), (e: unknown) => (e as TenantAccessError).code === "TENANT_SUSPENDED");
    assert.throws(() => assertTenantLifecycleAllowsMutation("ARCHIVED", "NORMAL_OPERATION"), (e: unknown) => (e as TenantAccessError).code === "TENANT_ARCHIVED");
  });

  it("allows provisioning invitation setup only for TENANT_ADMIN capability", () => {
    assert.equal(invitationCapabilityForLifecycle("PROVISIONING", "TENANT_ADMIN"), "OWNER_INVITATION");
    assert.equal(invitationCapabilityForLifecycle("PROVISIONING", "PUBLISHER"), "NORMAL_OPERATION");
    assert.doesNotThrow(() => assertTenantLifecycleAllowsMutation("PROVISIONING", "OWNER_INVITATION"));
  });

  it("blocks publisher mutation when tenant is suspended", async () => {
    const db = fakeDb(null, "PUBLISHER", "SUSPENDED");
    await assert.rejects(
      () => resolveTenantAccessWithLifecycle("uid", "tid", Permission.CONTENT_PUBLISH, "NORMAL_OPERATION", db as any),
      (e: unknown) => (e as TenantAccessError).code === "TENANT_SUSPENDED",
    );
  });
});

describe("error codes", () => {
  it("keeps deterministic HTTP semantics", () => {
    assert.equal(new TenantAccessError("m", "UNAUTHORIZED", 401).status, 401);
    assert.equal(new TenantAccessError("m", "FORBIDDEN", 403).status, 403);
    assert.equal(new TenantAccessError("m", "NOT_MEMBER", 403).status, 403);
    assert.equal(new TenantAccessError("m", "NOT_FOUND", 404).status, 404);
  });
});
