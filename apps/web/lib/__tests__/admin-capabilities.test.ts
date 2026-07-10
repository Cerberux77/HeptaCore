import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { resolveAdminCapabilities } from "../admin-capabilities";
import { Permission } from "../permissions";
import type { UserRole, TenantStatus } from "@prisma/client";

type StoredRecord = Record<string, unknown>;

function buildFakeDb() {
  const users: StoredRecord[] = [];
  const memberships: StoredRecord[] = [];
  const tenants: StoredRecord[] = [];

  const db = {
    user: {
      async findUnique(args: { where: { id: string }; select: any }) {
        const u = users.find((r) => r.id === args.where.id);
        if (!u) return null;
        const result: Record<string, unknown> = {};
        if (args.select.id) result.id = u.id;
        if (args.select.email) result.email = u.email;
        if (args.select.name) result.name = u.name;
        if (args.select.platformRole) result.platformRole = u.platformRole ?? null;
        return result as any;
      },
    },
    membership: {
      async findMany(args: { where: { userId: string }; select: any }) {
        return memberships
          .filter((m) => (args.where as any).userId === m.userId)
          .map((m) => {
            const r: Record<string, unknown> = {};
            if ((args.select as any).tenantId) r.tenantId = m.tenantId;
            if ((args.select as any).role) r.role = m.role;
            return r;
          }) as any;
      },
    },
    tenant: {
      async findUnique(args: { where: { slug: string }; select: any }) {
        const t = tenants.find((r) => r.slug === args.where.slug);
        if (!t) return null;
        const result: Record<string, unknown> = {};
        if (args.select.id) result.id = t.id;
        if (args.select.slug) result.slug = t.slug;
        if (args.select.name) result.name = t.name;
        if (args.select.status) result.status = t.status;
        return result as any;
      },
    },
  };

  return { db, users, memberships, tenants };
}

describe("resolveAdminCapabilities", () => {
  let fake: ReturnType<typeof buildFakeDb>;

  beforeEach(() => {
    fake = buildFakeDb();
  });

  it("throws UNAUTHORIZED when user does not exist", async () => {
    await assert.rejects(
      () => resolveAdminCapabilities("nonexistent", null, fake.db),
      /UNAUTHORIZED/,
    );
  });

  it("returns SUPER_ADMIN capabilities with all permissions", async () => {
    fake.users.push({ id: "sa1", email: "sa@test.com", name: "Super Admin", platformRole: "SUPER_ADMIN" });

    const result = await resolveAdminCapabilities("sa1", null, fake.db);

    assert.equal(result.user.globalRole, "SUPER_ADMIN");
    assert.equal(result.user.email, "sa@test.com");
    assert.equal(result.user.name, "Super Admin");

    const allPerms = Object.values(Permission);
    for (const perm of allPerms) {
      const entry = result.effectivePermissions.find((p) => p.permission === perm);
      assert.ok(entry, `permission ${perm} should exist`);
      assert.ok(entry!.granted, `permission ${perm} should be granted`);
    }
  });

  it("returns empty tenant context when no tenant slug", async () => {
    fake.users.push({ id: "sa1", email: "sa@test.com", name: "SA", platformRole: "SUPER_ADMIN" });

    const result = await resolveAdminCapabilities("sa1", null, fake.db);

    assert.equal(result.tenant.tenantId, undefined);
    assert.equal(result.tenant.tenantSlug, undefined);
  });

  it("throws NOT_FOUND for non-existent tenant slug", async () => {
    fake.users.push({ id: "sa1", email: "sa@test.com", name: "SA", platformRole: "SUPER_ADMIN" });

    await assert.rejects(
      () => resolveAdminCapabilities("sa1", "no-such-tenant", fake.db),
      /NOT_FOUND/,
    );
  });

  it("returns tenant context with lifecycle status for ACTIVE", async () => {
    fake.users.push({ id: "sa1", email: "sa@test.com", name: "SA", platformRole: "SUPER_ADMIN" });
    fake.tenants.push({ id: "t1", slug: "active-tenant", name: "Active Corp", status: "ACTIVE" });

    const result = await resolveAdminCapabilities("sa1", "active-tenant", fake.db);

    assert.ok(result.tenant.tenantId);
    assert.equal(result.tenant.tenantSlug, "active-tenant");
    assert.equal(result.tenant.tenantStatus, "ACTIVE");
    assert.equal(result.tenant.lifecycleBlockedReason, null);
  });

  it("returns lifecycle block reason for PROVISIONING", async () => {
    fake.users.push({ id: "sa1", email: "sa@test.com", name: "SA", platformRole: "SUPER_ADMIN" });
    fake.tenants.push({ id: "t1", slug: "prov-tenant", name: "Prov Corp", status: "PROVISIONING" });

    const result = await resolveAdminCapabilities("sa1", "prov-tenant", fake.db);

    assert.equal(result.tenant.tenantStatus, "PROVISIONING");
    assert.ok(result.tenant.lifecycleBlockedReason, "should have lifecycle block reason");
    assert.ok(result.tenant.lifecycleBlockedReason!.includes("PROVISIONING"));
  });

  it("returns lifecycle block reason for SUSPENDED", async () => {
    fake.users.push({ id: "sa1", email: "sa@test.com", name: "SA", platformRole: "SUPER_ADMIN" });
    fake.tenants.push({ id: "t1", slug: "susp-tenant", name: "Susp Corp", status: "SUSPENDED" });

    const result = await resolveAdminCapabilities("sa1", "susp-tenant", fake.db);

    assert.equal(result.tenant.tenantStatus, "SUSPENDED");
    assert.ok(result.tenant.lifecycleBlockedReason!.includes("SUSPENDED"));
  });

  it("returns lifecycle block reason for ARCHIVED", async () => {
    fake.users.push({ id: "sa1", email: "sa@test.com", name: "SA", platformRole: "SUPER_ADMIN" });
    fake.tenants.push({ id: "t1", slug: "arch-tenant", name: "Arch Corp", status: "ARCHIVED" });

    const result = await resolveAdminCapabilities("sa1", "arch-tenant", fake.db);

    assert.equal(result.tenant.tenantStatus, "ARCHIVED");
    assert.ok(result.tenant.lifecycleBlockedReason!.includes("ARCHIVED"));
  });

  it("includes tenant role when user is member", async () => {
    fake.users.push({ id: "sa1", email: "sa@test.com", name: "SA", platformRole: "SUPER_ADMIN" });
    fake.tenants.push({ id: "t1", slug: "my-tenant", name: "My Corp", status: "ACTIVE" });
    fake.memberships.push({ userId: "sa1", tenantId: "t1", role: "TENANT_ADMIN" });

    const result = await resolveAdminCapabilities("sa1", "my-tenant", fake.db);

    assert.equal(result.tenant.tenantRole, "TENANT_ADMIN");
  });

  it("response has zero secrets", async () => {
    fake.users.push({ id: "sa1", email: "sa@test.com", name: "SA", platformRole: "SUPER_ADMIN" });
    fake.tenants.push({ id: "t1", slug: "t", name: "T", status: "ACTIVE" });

    const result = await resolveAdminCapabilities("sa1", "t", fake.db);
    const json = JSON.stringify(result);

    assert.ok(!json.includes("passwordHash"));
    assert.ok(!json.includes("tokenHash"));
    assert.ok(!json.includes("password"));
    assert.ok(!json.includes("secret"));
    assert.ok(!json.includes("credential"));
  });

  it("tenant permissions for SUPER_ADMIN in tenant show full access", async () => {
    fake.users.push({ id: "sa1", email: "sa@test.com", name: "SA", platformRole: "SUPER_ADMIN" });
    fake.tenants.push({ id: "t1", slug: "t", name: "T", status: "ACTIVE" });
    const result = await resolveAdminCapabilities("sa1", "t", fake.db);
    const tenantPerms = result.tenant.tenantPermissions!;
    for (const p of tenantPerms) {
      assert.ok(p.granted, `SUPER_ADMIN should have ${p.permission} in tenant context`);
    }
  });

  it("switch tenant slug returns different tenant data", async () => {
    fake.users.push({ id: "sa1", email: "sa@test.com", name: "SA", platformRole: "SUPER_ADMIN" });
    fake.tenants.push({ id: "t1", slug: "tenant-a", name: "Tenant A", status: "ACTIVE" });
    fake.tenants.push({ id: "t2", slug: "tenant-b", name: "Tenant B", status: "SUSPENDED" });

    const r1 = await resolveAdminCapabilities("sa1", "tenant-a", fake.db);
    assert.equal(r1.tenant.tenantName, "Tenant A");
    assert.equal(r1.tenant.tenantStatus, "ACTIVE");

    const r2 = await resolveAdminCapabilities("sa1", "tenant-b", fake.db);
    assert.equal(r2.tenant.tenantName, "Tenant B");
    assert.equal(r2.tenant.tenantStatus, "SUSPENDED");
    assert.ok(r2.tenant.lifecycleBlockedReason);
  });

  it("no tenant slug returns full global permissions without tenant context", async () => {
    fake.users.push({ id: "sa1", email: "sa@test.com", name: "SA", platformRole: "SUPER_ADMIN" });

    const result = await resolveAdminCapabilities("sa1", null, fake.db);

    assert.equal(result.user.globalRole, "SUPER_ADMIN");
    assert.equal(result.tenant.tenantId, undefined);
    assert.ok(result.effectivePermissions.length > 0);
  });
});
