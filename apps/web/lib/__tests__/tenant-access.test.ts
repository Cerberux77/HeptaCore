import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import {
  Permission,
  hasRolePermission,
  getPermissionsForRole,
  hasTenantPermission,
  requireTenantPermission,
} from "../permissions";
import {
  assertTenantLifecycleAllowsMutation,
  resolveTenantAccess,
  resolveTenantAccessWithLifecycle,
  resolveSuperAdminAccess,
  requireSuperAdminActor,
  requireTenantMembership,
  requireActiveTenant,
  TenantAccessError,
  isSuperAdmin,
} from "../tenant-access";
import type { UserRole, TenantStatus } from "@prisma/client";

function fakeDb(superAdmin: boolean = false, role: UserRole | null = null, status: TenantStatus = "ACTIVE", userExists: boolean = true) {
  return {
    user: {
      findUnique: async (args: { where: { id: string }; select: { id: true } }) => {
        if (!userExists) return null;
        return { id: args.where.id };
      },
    },
    membership: {
      findMany: async (_args: { where: { userId: string }; select: { role: true } }) => {
        return superAdmin ? [{ role: "SUPER_ADMIN" as UserRole }] : [];
      },
      findUnique: async (args: { where: { tenantId_userId: { tenantId: string; userId: string } }; select: { role: true } }) => {
        if (!role) return null;
        return { role };
      },
    },
    tenant: {
      findUnique: async (_args: { where: { id: string }; select: { id: true; status: true } }) => {
        return { id: "tid", status };
      },
    },
  };
}

const ALL_ROLES: UserRole[] = ["OWNER", "ADMIN", "STRATEGIST", "EDITOR", "ANALYST", "APPROVER", "VIEWER", "SUPER_ADMIN", "TENANT_ADMIN", "PUBLISHER"];

describe("Permission Matrix", () => {
  it("SUPER_ADMIN has all permissions", () => {
    const perms = getPermissionsForRole("SUPER_ADMIN");
    for (const p of Object.values(Permission)) {
      assert.equal(perms.has(p), true, `SUPER_ADMIN should have ${p}`);
    }
  });

  it("OWNER has tenant admin permissions", () => {
    assert.equal(hasRolePermission("OWNER", Permission.TENANT_READ), true);
    assert.equal(hasRolePermission("OWNER", Permission.TENANT_CONFIG_UPDATE), true);
    assert.equal(hasRolePermission("OWNER", Permission.TENANT_STATUS_CHANGE), true);
    assert.equal(hasRolePermission("OWNER", Permission.MEMBERS_READ), true);
    assert.equal(hasRolePermission("OWNER", Permission.MEMBERS_ADD), true);
    assert.equal(hasRolePermission("OWNER", Permission.MEMBERS_ROLE_UPDATE), true);
    assert.equal(hasRolePermission("OWNER", Permission.MEMBERS_REMOVE), true);
    assert.equal(hasRolePermission("OWNER", Permission.CONTENT_PUBLISH), true);
  });

  it("TENANT_ADMIN has member and invitation permissions", () => {
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.MEMBERS_ADD), true);
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.MEMBERS_REMOVE), true);
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.INVITATIONS_CREATE), true);
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.INVITATIONS_REVOKE), true);
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.INTEGRATIONS_MANAGE), true);
  });

  it("TENANT_ADMIN does NOT have tenant status change", () => {
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.TENANT_STATUS_CHANGE), false);
  });

  it("ADMIN can write content and approve", () => {
    assert.equal(hasRolePermission("ADMIN", Permission.CONTENT_WRITE), true);
    assert.equal(hasRolePermission("ADMIN", Permission.CONTENT_APPROVE), true);
    assert.equal(hasRolePermission("ADMIN", Permission.CONTENT_PUBLISH), true);
    assert.equal(hasRolePermission("ADMIN", Permission.MEMBERS_ADD), false);
    assert.equal(hasRolePermission("ADMIN", Permission.MEMBERS_REMOVE), false);
  });

  it("EDITOR can write content but not approve or publish", () => {
    assert.equal(hasRolePermission("EDITOR", Permission.CONTENT_WRITE), true);
    assert.equal(hasRolePermission("EDITOR", Permission.CONTENT_APPROVE), false);
    assert.equal(hasRolePermission("EDITOR", Permission.CONTENT_PUBLISH), false);
  });

  it("APPROVER can approve but not write or publish", () => {
    assert.equal(hasRolePermission("APPROVER", Permission.CONTENT_WRITE), false);
    assert.equal(hasRolePermission("APPROVER", Permission.CONTENT_APPROVE), true);
    assert.equal(hasRolePermission("APPROVER", Permission.CONTENT_PUBLISH), false);
  });

  it("PUBLISHER can publish but not write or approve", () => {
    assert.equal(hasRolePermission("PUBLISHER", Permission.CONTENT_WRITE), false);
    assert.equal(hasRolePermission("PUBLISHER", Permission.CONTENT_APPROVE), false);
    assert.equal(hasRolePermission("PUBLISHER", Permission.CONTENT_PUBLISH), true);
  });

  it("ANALYST can read analytics but not mutate", () => {
    assert.equal(hasRolePermission("ANALYST", Permission.ANALYTICS_READ), true);
    assert.equal(hasRolePermission("ANALYST", Permission.CONTENT_WRITE), false);
    assert.equal(hasRolePermission("ANALYST", Permission.CONTENT_PUBLISH), false);
  });

  it("VIEWER can only read tenant", () => {
    assert.equal(hasRolePermission("VIEWER", Permission.TENANT_READ), true);
    assert.equal(hasRolePermission("VIEWER", Permission.CONTENT_WRITE), false);
    assert.equal(hasRolePermission("VIEWER", Permission.ANALYTICS_READ), false);
  });

  it("STRATEGIST can write projects and read analytics", () => {
    assert.equal(hasRolePermission("STRATEGIST", Permission.PROJECTS_WRITE), true);
    assert.equal(hasRolePermission("STRATEGIST", Permission.CONTENT_WRITE), true);
    assert.equal(hasRolePermission("STRATEGIST", Permission.ANALYTICS_READ), true);
    assert.equal(hasRolePermission("STRATEGIST", Permission.CONTENT_PUBLISH), false);
  });

  it("default denial for unknown roles", () => {
    assert.equal(hasRolePermission("VIEWER", Permission.MEMBERS_ADD), false);
    assert.equal(hasRolePermission("VIEWER", Permission.CONTENT_PUBLISH), false);
    assert.equal(hasRolePermission("EDITOR", Permission.MEMBERS_ADD), false);
  });
});

describe("hasTenantPermission", () => {
  it("returns true when user exists and has matching role permission", async () => {
    const db = fakeDb(false, "OWNER");
    const ok = await hasTenantPermission("uid", "tid", Permission.MEMBERS_ADD, db);
    assert.equal(ok, true);
  });

  it("returns false when user does not exist", async () => {
    const db = fakeDb(false, "OWNER", "ACTIVE", false);
    const ok = await hasTenantPermission("uid", "tid", Permission.MEMBERS_ADD, db);
    assert.equal(ok, false);
  });

  it("returns false when user is not a member", async () => {
    const db = fakeDb(false, null);
    const ok = await hasTenantPermission("uid", "tid", Permission.MEMBERS_ADD, db);
    assert.equal(ok, false);
  });

  it("returns false when role lacks permission", async () => {
    const db = fakeDb(false, "VIEWER");
    const ok = await hasTenantPermission("uid", "tid", Permission.MEMBERS_ADD, db);
    assert.equal(ok, false);
  });
});

describe("requireTenantPermission", () => {
  it("returns role when authorized", async () => {
    const db = fakeDb(false, "OWNER");
    const result = await requireTenantPermission("uid", "tid", Permission.MEMBERS_ADD, db);
    assert.equal(result.role, "OWNER");
  });

  it("throws UNAUTHORIZED when user does not exist", async () => {
    const db = fakeDb(false, "OWNER", "ACTIVE", false);
    await assert.rejects(
      () => requireTenantPermission("uid", "tid", Permission.MEMBERS_ADD, db),
      (e: unknown) => (e as TenantAccessError).code === "UNAUTHORIZED",
    );
  });

  it("throws NOT_MEMBER when user is not a member", async () => {
    const db = fakeDb(false, null);
    await assert.rejects(
      () => requireTenantPermission("uid", "tid", Permission.MEMBERS_ADD, db),
      (e: unknown) => (e as TenantAccessError).code === "NOT_MEMBER",
    );
  });

  it("throws FORBIDDEN when role lacks permission", async () => {
    const db = fakeDb(false, "VIEWER");
    await assert.rejects(
      () => requireTenantPermission("uid", "tid", Permission.MEMBERS_ADD, db),
      (e: unknown) => (e as TenantAccessError).code === "FORBIDDEN",
    );
  });
});

describe("isSuperAdmin", () => {
  it("returns true when SUPER_ADMIN membership exists", () => {
    assert.equal(isSuperAdmin([{ role: "SUPER_ADMIN" }]), true);
    assert.equal(isSuperAdmin([{ role: "OWNER" }, { role: "SUPER_ADMIN" }]), true);
  });

  it("returns false when no SUPER_ADMIN membership", () => {
    assert.equal(isSuperAdmin([{ role: "OWNER" }]), false);
    assert.equal(isSuperAdmin([]), false);
  });
});

describe("requireSuperAdminActor", () => {
  it("returns user id when SUPER_ADMIN", async () => {
    const tx = {
      user: {
        findUnique: async () => ({ id: "uid" }),
      },
      membership: {
        findMany: async () => [{ role: "SUPER_ADMIN" as UserRole }],
      },
    };
    const result = await requireSuperAdminActor("uid", tx);
    assert.equal(result, "uid");
  });

  it("throws UNAUTHORIZED when user not found", async () => {
    const tx = {
      user: { findUnique: async () => null },
      membership: { findMany: async () => [] as Array<{ role: UserRole }> },
    };
    await assert.rejects(
      () => requireSuperAdminActor("uid", tx),
      (e: unknown) => (e as TenantAccessError).code === "UNAUTHORIZED",
    );
  });

  it("throws FORBIDDEN when not SUPER_ADMIN", async () => {
    const tx = {
      user: { findUnique: async () => ({ id: "uid" }) },
      membership: { findMany: async () => [{ role: "OWNER" as UserRole }] },
    };
    await assert.rejects(
      () => requireSuperAdminActor("uid", tx),
      (e: unknown) => (e as TenantAccessError).code === "FORBIDDEN",
    );
  });
});

describe("requireTenantMembership", () => {
  it("returns role when member", async () => {
    const db = fakeDb(false, "OWNER");
    const result = await requireTenantMembership("uid", "tid", db);
    assert.equal(result.role, "OWNER");
  });

  it("throws NOT_MEMBER when not a member", async () => {
    const db = fakeDb(false, null);
    await assert.rejects(
      () => requireTenantMembership("uid", "tid", db),
      (e: unknown) => (e as TenantAccessError).code === "NOT_MEMBER",
    );
  });
});

describe("assertTenantLifecycleAllowsMutation", () => {
  it("allows NORMAL_OPERATION on ACTIVE", () => {
    assert.doesNotThrow(() => assertTenantLifecycleAllowsMutation("ACTIVE", "NORMAL_OPERATION"));
  });

  it("blocks NORMAL_OPERATION on SUSPENDED", () => {
    assert.throws(
      () => assertTenantLifecycleAllowsMutation("SUSPENDED", "NORMAL_OPERATION"),
      (e: unknown) => (e as TenantAccessError).code === "TENANT_SUSPENDED",
    );
  });

  it("blocks NORMAL_OPERATION on ARCHIVED", () => {
    assert.throws(
      () => assertTenantLifecycleAllowsMutation("ARCHIVED", "NORMAL_OPERATION"),
      (e: unknown) => (e as TenantAccessError).code === "TENANT_ARCHIVED",
    );
  });

  it("allows PROVISIONING_CONFIGURATION on PROVISIONING", () => {
    assert.doesNotThrow(() => assertTenantLifecycleAllowsMutation("PROVISIONING", "PROVISIONING_CONFIGURATION"));
  });

  it("allows OWNER_INVITATION on PROVISIONING", () => {
    assert.doesNotThrow(() => assertTenantLifecycleAllowsMutation("PROVISIONING", "OWNER_INVITATION"));
  });

  it("blocks NORMAL_OPERATION on PROVISIONING", () => {
    assert.throws(
      () => assertTenantLifecycleAllowsMutation("PROVISIONING", "NORMAL_OPERATION"),
      (e: unknown) => (e as TenantAccessError).code === "TENANT_PROVISIONING",
    );
  });
});

describe("requireActiveTenant", () => {
  it("returns status when ACTIVE", async () => {
    const db = {
      user: { findUnique: async () => ({ id: "uid" }) },
      membership: {
        findUnique: async () => null,
        findMany: async () => [] as Array<{ role: UserRole }>,
      },
      tenant: {
        findUnique: async () => ({ status: "ACTIVE" as TenantStatus }),
        findMany: async () => [] as Array<Record<string, unknown>>,
        findUniqueOrThrow: async () => ({}) as Record<string, unknown>,
      },
    };
    const result = await requireActiveTenant("tid", db);
    assert.equal(result.status, "ACTIVE");
  });

  it("throws NOT_FOUND when tenant missing", async () => {
    const db = {
      user: { findUnique: async () => ({ id: "uid" }) },
      membership: {
        findUnique: async () => null,
        findMany: async () => [] as Array<{ role: UserRole }>,
      },
      tenant: {
        findUnique: async () => null,
        findMany: async () => [] as Array<Record<string, unknown>>,
        findUniqueOrThrow: async () => ({}) as Record<string, unknown>,
      },
    };
    await assert.rejects(
      () => requireActiveTenant("tid", db),
      (e: unknown) => (e as TenantAccessError).code === "NOT_FOUND",
    );
  });

  it("throws TENANT_SUSPENDED for SUSPENDED tenant", async () => {
    const db = {
      user: { findUnique: async () => ({ id: "uid" }) },
      membership: {
        findUnique: async () => null,
        findMany: async () => [] as Array<{ role: UserRole }>,
      },
      tenant: {
        findUnique: async () => ({ status: "SUSPENDED" as TenantStatus }),
        findMany: async () => [] as Array<Record<string, unknown>>,
        findUniqueOrThrow: async () => ({}) as Record<string, unknown>,
      },
    };
    await assert.rejects(
      () => requireActiveTenant("tid", db),
      (e: unknown) => (e as TenantAccessError).code === "TENANT_SUSPENDED",
    );
  });
});

describe("resolveTenantAccess (combined resolution)", () => {
  it("returns role and status when authorized", async () => {
    const db = fakeDb(false, "OWNER", "ACTIVE");
    const result = await resolveTenantAccess("uid", "tid", Permission.MEMBERS_ADD, db);
    assert.equal(result.role, "OWNER");
    assert.equal(result.status, "ACTIVE");
  });

  it("throws UNAUTHORIZED when user not found", async () => {
    const db = fakeDb(false, "OWNER", "ACTIVE", false);
    await assert.rejects(
      () => resolveTenantAccess("uid", "tid", Permission.MEMBERS_ADD, db),
      (e: unknown) => (e as TenantAccessError).code === "UNAUTHORIZED",
    );
  });

  it("throws NOT_MEMBER when not a member", async () => {
    const db = fakeDb(false, null);
    await assert.rejects(
      () => resolveTenantAccess("uid", "tid", Permission.MEMBERS_ADD, db),
      (e: unknown) => (e as TenantAccessError).code === "NOT_MEMBER",
    );
  });

  it("throws FORBIDDEN when role lacks permission", async () => {
    const db = fakeDb(false, "VIEWER", "ACTIVE");
    await assert.rejects(
      () => resolveTenantAccess("uid", "tid", Permission.MEMBERS_ADD, db),
      (e: unknown) => (e as TenantAccessError).code === "FORBIDDEN",
    );
  });

  it("throws NOT_FOUND when tenant missing", async () => {
    const db = {
      user: { findUnique: async () => ({ id: "uid" }) },
      membership: {
        findUnique: async () => ({ role: "OWNER" as UserRole }),
        findMany: async () => [] as Array<{ role: UserRole }>,
      },
      tenant: {
        findUnique: async () => null,
      },
    };
    await assert.rejects(
      () => resolveTenantAccess("uid", "tid", Permission.MEMBERS_ADD, db),
      (e: unknown) => (e as TenantAccessError).code === "NOT_FOUND",
    );
  });

  it("cross-tenant isolation: OWNER of tenant A can't manage tenant B", async () => {
    const noMembershipDb = fakeDb(false, null, "ACTIVE");
    await assert.rejects(
      () => resolveTenantAccess("uid", "tid-B", Permission.MEMBERS_ADD, noMembershipDb),
      (e: unknown) => (e as TenantAccessError).code === "NOT_MEMBER",
    );
  });
});

describe("resolveTenantAccessWithLifecycle", () => {
  it("allows access when tenant is ACTIVE", async () => {
    const db = fakeDb(false, "OWNER", "ACTIVE");
    const result = await resolveTenantAccessWithLifecycle("uid", "tid", Permission.MEMBERS_ADD, "NORMAL_OPERATION", db);
    assert.equal(result.role, "OWNER");
  });

  it("blocked when tenant is SUSPENDED", async () => {
    const db = fakeDb(false, "OWNER", "SUSPENDED");
    await assert.rejects(
      () => resolveTenantAccessWithLifecycle("uid", "tid", Permission.MEMBERS_ADD, "NORMAL_OPERATION", db),
      (e: unknown) => (e as TenantAccessError).code === "TENANT_SUSPENDED",
    );
  });

  it("blocked when tenant is ARCHIVED", async () => {
    const db = fakeDb(false, "OWNER", "ARCHIVED");
    await assert.rejects(
      () => resolveTenantAccessWithLifecycle("uid", "tid", Permission.MEMBERS_ADD, "NORMAL_OPERATION", db),
      (e: unknown) => (e as TenantAccessError).code === "TENANT_ARCHIVED",
    );
  });

  it("SUPER_ADMIN is blocked by lifecycle gates for NORMAL_OPERATION", async () => {
    const db = fakeDb(true, "OWNER", "SUSPENDED");
    await assert.rejects(
      () => resolveTenantAccessWithLifecycle("uid", "tid", Permission.MEMBERS_ADD, "NORMAL_OPERATION", db),
      (e: unknown) => (e as TenantAccessError).code === "TENANT_SUSPENDED",
    );
  });
});

describe("resolveSuperAdminAccess", () => {
  it("returns user id when SUPER_ADMIN", async () => {
    const db = {
      user: { findUnique: async () => ({ id: "uid" }) },
      membership: {
        findMany: async () => [{ role: "SUPER_ADMIN" as UserRole }],
        findUnique: async () => null as { role: UserRole } | null,
      },
    };
    const result = await resolveSuperAdminAccess("uid", db);
    assert.equal(result, "uid");
  });

  it("throws UNAUTHORIZED when user not found", async () => {
    const db = {
      user: { findUnique: async () => null },
      membership: {
        findMany: async () => [] as Array<{ role: UserRole }>,
        findUnique: async () => null as { role: UserRole } | null,
      },
    };
    await assert.rejects(
      () => resolveSuperAdminAccess("uid", db),
      (e: unknown) => (e as TenantAccessError).code === "UNAUTHORIZED",
    );
  });

  it("throws FORBIDDEN when not SUPER_ADMIN", async () => {
    const db = {
      user: { findUnique: async () => ({ id: "uid" }) },
      membership: {
        findMany: async () => [{ role: "OWNER" as UserRole }],
        findUnique: async () => null as { role: UserRole } | null,
      },
    };
    await assert.rejects(
      () => resolveSuperAdminAccess("uid", db),
      (e: unknown) => (e as TenantAccessError).code === "FORBIDDEN",
    );
  });
});

describe("Error codes", () => {
  it("UNAUTHORIZED has status 401", () => {
    const e = new TenantAccessError("msg", "UNAUTHORIZED", 401);
    assert.equal(e.status, 401);
    assert.equal(e.code, "UNAUTHORIZED");
  });

  it("FORBIDDEN has status 403", () => {
    const e = new TenantAccessError("msg", "FORBIDDEN", 403);
    assert.equal(e.status, 403);
  });

  it("NOT_MEMBER has status 403", () => {
    const e = new TenantAccessError("msg", "NOT_MEMBER", 403);
    assert.equal(e.status, 403);
  });

  it("NOT_FOUND has status 404", () => {
    const e = new TenantAccessError("msg", "NOT_FOUND", 404);
    assert.equal(e.status, 404);
  });

  it("TENANT_SUSPENDED has status 403", () => {
    const e = new TenantAccessError("msg", "TENANT_SUSPENDED", 403);
    assert.equal(e.status, 403);
  });

  it("TENANT_ARCHIVED has status 403", () => {
    const e = new TenantAccessError("msg", "TENANT_ARCHIVED", 403);
    assert.equal(e.status, 403);
  });

  it("TENANT_PROVISIONING has status 403", () => {
    const e = new TenantAccessError("msg", "TENANT_PROVISIONING", 403);
    assert.equal(e.status, 403);
  });
});
