import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import {
  Permission,
  hasRolePermission,
  getPermissionsForRole,
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
  invitationCapabilityForLifecycle,
} from "../tenant-access";
import type { UserRole, TenantStatus } from "@prisma/client";

function fakeDb(
  superAdmin: boolean = false,
  role: UserRole | null = null,
  status: TenantStatus = "ACTIVE",
  userExists: boolean = true,
  tenantExists: boolean = true,
) {
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
      findUnique: async (_args: { where: { tenantId_userId: { tenantId: string; userId: string } }; select: { role: true } }) => {
        if (!role) return null;
        return { role };
      },
    },
    tenant: {
      findUnique: async (_args: { where: { id: string }; select: { id: true; status: true } }) => {
        if (!tenantExists) return null;
        return { id: "tid", status };
      },
      count: async () => 1,
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
    assert.equal(hasRolePermission("OWNER", Permission.MEMBERS_ADD), true);
    assert.equal(hasRolePermission("OWNER", Permission.MEMBERS_REMOVE), true);
    assert.equal(hasRolePermission("OWNER", Permission.CONTENT_PUBLISH), true);
  });

  it("TENANT_ADMIN has canonical ADMIN permissions", () => {
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.MEMBERS_ADD), true);
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.MEMBERS_REMOVE), true);
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.INVITATIONS_CREATE), true);
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.INVITATIONS_REVOKE), true);
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.INTEGRATIONS_MANAGE), true);
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.TENANT_CONFIG_UPDATE), true);
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.CONTENT_WRITE), true);
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.CONTENT_PUBLISH), true);
  });

  it("TENANT_ADMIN lacks SECURITY_MANAGE and TENANT_STATUS_CHANGE (owner-only)", () => {
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.SECURITY_MANAGE), false);
    assert.equal(hasRolePermission("TENANT_ADMIN", Permission.TENANT_STATUS_CHANGE), false);
  });

  it("VIEWER has only read and analytics permissions", () => {
    assert.equal(hasRolePermission("VIEWER", Permission.TENANT_READ), true);
    assert.equal(hasRolePermission("VIEWER", Permission.ANALYTICS_READ), true);
    assert.equal(hasRolePermission("VIEWER", Permission.MEMBERS_ADD), false);
    assert.equal(hasRolePermission("VIEWER", Permission.CONTENT_PUBLISH), false);
    assert.equal(hasRolePermission("VIEWER", Permission.SECURITY_MANAGE), false);
  });

  it("legacy roles produce canonical permissions", () => {
    assert.equal(hasRolePermission("STRATEGIST", Permission.MEMBERS_ADD), true);
    assert.equal(hasRolePermission("STRATEGIST", Permission.CONTENT_WRITE), true);
    assert.equal(hasRolePermission("EDITOR", Permission.INVITATIONS_CREATE), true);
    assert.equal(hasRolePermission("EDITOR", Permission.CONTENT_PUBLISH), true);
    assert.equal(hasRolePermission("APPROVER", Permission.MEMBERS_READ), true);
    assert.equal(hasRolePermission("PUBLISHER", Permission.TENANT_CONFIG_UPDATE), true);
    assert.equal(hasRolePermission("ANALYST", Permission.TENANT_READ), true);
    assert.equal(hasRolePermission("ANALYST", Permission.ANALYTICS_READ), true);
    assert.equal(hasRolePermission("ANALYST", Permission.MEMBERS_ADD), false);
    assert.equal(hasRolePermission("ANALYST", Permission.CONTENT_PUBLISH), false);
  });

  it("OWNER has all tenant permissions", () => {
    for (const p of Object.values(Permission)) {
      assert.equal(hasRolePermission("OWNER", p as any), true, `OWNER should have ${p}`);
    }
  });

  it("ADMIN (canonical) has operational permissions but not security", () => {
    assert.equal(hasRolePermission("ADMIN", Permission.MEMBERS_READ), true);
    assert.equal(hasRolePermission("ADMIN", Permission.MEMBERS_ROLE_UPDATE), true);
    assert.equal(hasRolePermission("ADMIN", Permission.INVITATIONS_CREATE), true);
    assert.equal(hasRolePermission("ADMIN", Permission.INTEGRATIONS_MANAGE), true);
    assert.equal(hasRolePermission("ADMIN", Permission.TENANT_CONFIG_UPDATE), true);
    assert.equal(hasRolePermission("ADMIN", Permission.PROJECTS_WRITE), true);
    assert.equal(hasRolePermission("ADMIN", Permission.CONTENT_WRITE), true);
    assert.equal(hasRolePermission("ADMIN", Permission.CONTENT_APPROVE), true);
    assert.equal(hasRolePermission("ADMIN", Permission.CONTENT_PUBLISH), true);
    assert.equal(hasRolePermission("ADMIN", Permission.ANALYTICS_READ), true);
    assert.equal(hasRolePermission("ADMIN", Permission.SECURITY_MANAGE), false);
    assert.equal(hasRolePermission("ADMIN", Permission.TENANT_STATUS_CHANGE), false);
  });
});

describe("isSuperAdmin", () => {
  it("returns true when SUPER_ADMIN membership exists", () => {
    assert.equal(isSuperAdmin([{ role: "SUPER_ADMIN" }]), true);
  });

  it("returns false when no SUPER_ADMIN membership", () => {
    assert.equal(isSuperAdmin([{ role: "OWNER" }]), false);
    assert.equal(isSuperAdmin([]), false);
  });
});

describe("requireSuperAdminActor", () => {
  it("returns user id when SUPER_ADMIN", async () => {
    const tx = {
      user: { findUnique: async () => ({ id: "uid" }) },
      membership: { findMany: async () => [{ role: "SUPER_ADMIN" as UserRole }] },
    };
    assert.equal(await requireSuperAdminActor("uid", tx), "uid");
  });

  it("throws FORBIDDEN when not SUPER_ADMIN", async () => {
    const tx = {
      user: { findUnique: async () => ({ id: "uid" }) },
      membership: { findMany: async () => [{ role: "OWNER" as UserRole }] },
    };
    await assert.rejects(() => requireSuperAdminActor("uid", tx), (e: unknown) => (e as TenantAccessError).code === "FORBIDDEN");
  });
});

describe("requireTenantMembership", () => {
  it("returns role when member", async () => {
    const db: any = fakeDb(false, "OWNER");
    const result = await requireTenantMembership("uid", "tid", db);
    assert.equal(result.role, "OWNER");
  });

  it("throws NOT_MEMBER when not a member", async () => {
    const db: any = fakeDb(false, null);
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
    assert.throws(() => assertTenantLifecycleAllowsMutation("SUSPENDED", "NORMAL_OPERATION"), (e: unknown) => (e as TenantAccessError).code === "TENANT_SUSPENDED");
  });

  it("blocks NORMAL_OPERATION on ARCHIVED", () => {
    assert.throws(() => assertTenantLifecycleAllowsMutation("ARCHIVED", "NORMAL_OPERATION"), (e: unknown) => (e as TenantAccessError).code === "TENANT_ARCHIVED");
  });

  it("allows OWNER_INVITATION on PROVISIONING", () => {
    assert.doesNotThrow(() => assertTenantLifecycleAllowsMutation("PROVISIONING", "OWNER_INVITATION"));
  });

  it("blocks NORMAL_OPERATION on PROVISIONING", () => {
    assert.throws(() => assertTenantLifecycleAllowsMutation("PROVISIONING", "NORMAL_OPERATION"), (e: unknown) => (e as TenantAccessError).code === "TENANT_PROVISIONING");
  });
});

describe("requireActiveTenant", () => {
  it("returns status when ACTIVE", async () => {
    const db: any = {
      user: { findUnique: async () => ({ id: "uid" }) },
      membership: { findUnique: async () => null, findMany: async () => [] as Array<{ role: UserRole }> },
      tenant: { findUnique: async () => ({ status: "ACTIVE" as TenantStatus }), findMany: async () => [] as Array<Record<string, unknown>>, findUniqueOrThrow: async () => ({}) as Record<string, unknown> },
    };
    assert.equal((await requireActiveTenant("tid", db)).status, "ACTIVE");
  });

  it("throws TENANT_SUSPENDED for SUSPENDED tenant", async () => {
    const db: any = {
      user: { findUnique: async () => ({ id: "uid" }) },
      membership: { findUnique: async () => null, findMany: async () => [] as Array<{ role: UserRole }> },
      tenant: { findUnique: async () => ({ status: "SUSPENDED" as TenantStatus }), findMany: async () => [], findUniqueOrThrow: async () => ({}) },
    };
    await assert.rejects(() => requireActiveTenant("tid", db), (e: unknown) => (e as TenantAccessError).code === "TENANT_SUSPENDED");
  });
});

describe("SUPER_ADMIN global access (correction #1)", () => {
  it("SUPER_ADMIN accesses any tenant without membership", async () => {
    const db = fakeDb(true, null, "ACTIVE");
    const result = await resolveTenantAccess("uid", "tid", Permission.MEMBERS_ADD, db);
    assert.equal(result.role, "SUPER_ADMIN");
    assert.equal(result.superAdminBypass, true);
    assert.equal(result.status, "ACTIVE");
  });

  it("SUPER_ADMIN can read SUSPENDED tenant", async () => {
    const db = fakeDb(true, null, "SUSPENDED");
    const result = await resolveTenantAccess("uid", "tid", Permission.MEMBERS_READ, db);
    assert.equal(result.status, "SUSPENDED");
    assert.equal(result.superAdminBypass, true);
  });

  it("SUPER_ADMIN can read PROVISIONING tenant", async () => {
    const db = fakeDb(true, null, "PROVISIONING");
    const result = await resolveTenantAccess("uid", "tid", Permission.TENANT_READ, db);
    assert.equal(result.status, "PROVISIONING");
  });

  it("SUPER_ADMIN mutation on SUSPENDED throws lifecycle error", async () => {
    const db = fakeDb(true, null, "SUSPENDED");
    await assert.rejects(
      () => resolveTenantAccessWithLifecycle("uid", "tid", Permission.MEMBERS_ADD, "NORMAL_OPERATION", db),
      (e: unknown) => (e as TenantAccessError).code === "TENANT_SUSPENDED",
    );
  });

  it("normal member without membership is rejected", async () => {
    const db = fakeDb(false, null, "ACTIVE");
    await assert.rejects(
      () => resolveTenantAccess("uid", "tid", Permission.MEMBERS_READ, db),
      (e: unknown) => (e as TenantAccessError).code === "NOT_MEMBER",
    );
  });
});

describe("Read/Mutation separation (correction #2)", () => {
  it("reads allowed on ACTIVE", async () => {
    const db = fakeDb(false, "OWNER", "ACTIVE");
    const result = await resolveTenantAccess("uid", "tid", Permission.MEMBERS_READ, db);
    assert.equal(result.role, "OWNER");
  });

  it("reads allowed on PROVISIONING", async () => {
    const db = fakeDb(false, "OWNER", "PROVISIONING");
    const result = await resolveTenantAccess("uid", "tid", Permission.INVITATIONS_READ, db);
    assert.equal(result.role, "OWNER");
  });

  it("reads allowed on SUSPENDED", async () => {
    const db = fakeDb(false, "OWNER", "SUSPENDED");
    const result = await resolveTenantAccess("uid", "tid", Permission.MEMBERS_READ, db);
    assert.equal(result.role, "OWNER");
  });

  it("reads allowed on ARCHIVED", async () => {
    const db = fakeDb(false, "OWNER", "ARCHIVED");
    const result = await resolveTenantAccess("uid", "tid", Permission.TENANT_READ, db);
    assert.equal(result.role, "OWNER");
  });

  it("mutations blocked on SUSPENDED", async () => {
    const db = fakeDb(false, "OWNER", "SUSPENDED");
    await assert.rejects(
      () => resolveTenantAccessWithLifecycle("uid", "tid", Permission.MEMBERS_ADD, "NORMAL_OPERATION", db),
      (e: unknown) => (e as TenantAccessError).code === "TENANT_SUSPENDED",
    );
  });

  it("mutations blocked on ARCHIVED", async () => {
    const db = fakeDb(false, "OWNER", "ARCHIVED");
    await assert.rejects(
      () => resolveTenantAccessWithLifecycle("uid", "tid", Permission.MEMBERS_ADD, "NORMAL_OPERATION", db),
      (e: unknown) => (e as TenantAccessError).code === "TENANT_ARCHIVED",
    );
  });
});

describe("Invitations in PROVISIONING (correction #3)", () => {
  it("OWNER_INVITATION capability for OWNER role in PROVISIONING", () => {
    assert.equal(invitationCapabilityForLifecycle("PROVISIONING", "OWNER"), "OWNER_INVITATION");
  });

  it("NORMAL_OPERATION capability for non-OWNER role in PROVISIONING", () => {
    assert.equal(invitationCapabilityForLifecycle("PROVISIONING", "ADMIN"), "NORMAL_OPERATION");
    assert.equal(invitationCapabilityForLifecycle("PROVISIONING", "EDITOR"), "NORMAL_OPERATION");
  });

  it("NORMAL_OPERATION capability for all roles in ACTIVE", () => {
    assert.equal(invitationCapabilityForLifecycle("ACTIVE", "OWNER"), "NORMAL_OPERATION");
    assert.equal(invitationCapabilityForLifecycle("ACTIVE", "ADMIN"), "NORMAL_OPERATION");
  });

  it("OWNER invitation allowed in PROVISIONING", () => {
    assert.doesNotThrow(() => assertTenantLifecycleAllowsMutation("PROVISIONING", "OWNER_INVITATION"));
  });

  it("non-OWNER invitation blocked in PROVISIONING via NORMAL_OPERATION", () => {
    assert.throws(
      () => assertTenantLifecycleAllowsMutation("PROVISIONING", "NORMAL_OPERATION"),
      (e: unknown) => (e as TenantAccessError).code === "TENANT_PROVISIONING",
    );
  });
});

describe("Cross-tenant isolation (correction #9)", () => {
  it("OWNER of tenant A cannot manage tenant B", async () => {
    const db = fakeDb(false, null, "ACTIVE");
    await assert.rejects(
      () => resolveTenantAccess("uid", "tid-B", Permission.MEMBERS_ADD, db),
      (e: unknown) => (e as TenantAccessError).code === "NOT_MEMBER",
    );
  });

  it("SUPER_ADMIN can manage any tenant", async () => {
    const db = fakeDb(true, null, "ACTIVE");
    const result = await resolveTenantAccess("uid", "tid-any", Permission.MEMBERS_ADD, db);
    assert.equal(result.superAdminBypass, true);
  });

  it("tenant not found returns NOT_FOUND", async () => {
    const db = fakeDb(false, "OWNER", "ACTIVE", true, false);
    await assert.rejects(
      () => resolveTenantAccess("uid", "tid", Permission.MEMBERS_READ, db),
      (e: unknown) => (e as TenantAccessError).code === "NOT_FOUND",
    );
  });
});

describe("resolveSuperAdminAccess", () => {
  it("returns user id when SUPER_ADMIN", async () => {
    const db = {
      user: { findUnique: async () => ({ id: "uid" }) },
      membership: { findMany: async () => [{ role: "SUPER_ADMIN" as UserRole }], findUnique: async () => null as { role: UserRole } | null },
    };
    assert.equal(await resolveSuperAdminAccess("uid", db), "uid");
  });

  it("throws FORBIDDEN when not SUPER_ADMIN", async () => {
    const db = {
      user: { findUnique: async () => ({ id: "uid" }) },
      membership: { findMany: async () => [{ role: "OWNER" as UserRole }], findUnique: async () => null as { role: UserRole } | null },
    };
    await assert.rejects(() => resolveSuperAdminAccess("uid", db), (e: unknown) => (e as TenantAccessError).code === "FORBIDDEN");
  });
});

describe("Error codes", () => {
  it("UNAUTHORIZED has status 401", () => assert.equal(new TenantAccessError("m", "UNAUTHORIZED", 401).status, 401));
  it("FORBIDDEN has status 403", () => assert.equal(new TenantAccessError("m", "FORBIDDEN", 403).status, 403));
  it("NOT_MEMBER has status 403", () => assert.equal(new TenantAccessError("m", "NOT_MEMBER", 403).status, 403));
  it("NOT_FOUND has status 404", () => assert.equal(new TenantAccessError("m", "NOT_FOUND", 404).status, 404));
  it("TENANT_SUSPENDED has status 403", () => assert.equal(new TenantAccessError("m", "TENANT_SUSPENDED", 403).status, 403));
  it("TENANT_ARCHIVED has status 403", () => assert.equal(new TenantAccessError("m", "TENANT_ARCHIVED", 403).status, 403));
  it("TENANT_PROVISIONING has status 403", () => assert.equal(new TenantAccessError("m", "TENANT_PROVISIONING", 403).status, 403));
});

describe("Asset permissions (correction #2)", () => {
  it("TENANT_READ allows asset reads", async () => {
    const db = fakeDb(false, "VIEWER", "ACTIVE");
    const result = await resolveTenantAccess("uid", "tid", Permission.TENANT_READ, db);
    assert.equal(result.role, "VIEWER");
  });

  it("CONTENT_WRITE allows asset mutations by EDITOR", async () => {
    const db = fakeDb(false, "EDITOR", "ACTIVE");
    const result = await resolveTenantAccess("uid", "tid", Permission.CONTENT_WRITE, db);
    assert.equal(result.role, "EDITOR");
  });

  it("TENANT_ADMIN has CONTENT_WRITE (canonical ADMIN role)", async () => {
    const db = fakeDb(false, "TENANT_ADMIN", "ACTIVE");
    const result = await resolveTenantAccess("uid", "tid", Permission.CONTENT_WRITE, db);
    assert.equal(result.role, "TENANT_ADMIN");
  });

  it("SUPER_ADMIN global accesses assets without membership", async () => {
    const db = fakeDb(true, null, "ACTIVE");
    const result = await resolveTenantAccess("uid", "tid", Permission.CONTENT_WRITE, db);
    assert.equal(result.superAdminBypass, true);
  });

  it("assets mutation blocked on SUSPENDED tenant", async () => {
    const db = fakeDb(false, "EDITOR", "SUSPENDED");
    await assert.rejects(
      () => resolveTenantAccessWithLifecycle("uid", "tid", Permission.CONTENT_WRITE, "NORMAL_OPERATION", db),
      (e: unknown) => (e as TenantAccessError).code === "TENANT_SUSPENDED",
    );
  });
});

describe("Publishing permission (correction #1)", () => {
  it("SUPER_ADMIN global publishes without membership", async () => {
    const db = fakeDb(true, null, "ACTIVE");
    const result = await resolveTenantAccessWithLifecycle("uid", "tid", Permission.CONTENT_PUBLISH, "NORMAL_OPERATION", db);
    assert.equal(result.role, "SUPER_ADMIN");
  });

  it("non-member cannot publish", async () => {
    const db = fakeDb(false, null, "ACTIVE");
    await assert.rejects(
      () => resolveTenantAccess("uid", "tid", Permission.CONTENT_PUBLISH, db),
      (e: unknown) => (e as TenantAccessError).code === "NOT_MEMBER",
    );
  });

  it("TENANT_ADMIN can publish (canonical ADMIN role)", async () => {
    const db = fakeDb(false, "TENANT_ADMIN", "ACTIVE");
    const result = await resolveTenantAccess("uid", "tid", Permission.CONTENT_PUBLISH, db);
    assert.equal(result.role, "TENANT_ADMIN");
  });

  it("tenant SUSPENDED blocks publishing", async () => {
    const db = fakeDb(false, "PUBLISHER", "SUSPENDED");
    await assert.rejects(
      () => resolveTenantAccessWithLifecycle("uid", "tid", Permission.CONTENT_PUBLISH, "NORMAL_OPERATION", db),
      (e: unknown) => (e as TenantAccessError).code === "TENANT_SUSPENDED",
    );
  });
});
