import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { resolveSessionCapabilities, SessionCapabilityError } from "../session-capabilities";
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

describe("resolveSessionCapabilities", () => {
  let fake: ReturnType<typeof buildFakeDb>;

  beforeEach(() => {
    fake = buildFakeDb();
  });

  it("throws UNAUTHORIZED when user does not exist", async () => {
    await assert.rejects(
      () => resolveSessionCapabilities("nonexistent", null, fake.db),
      (e: unknown) => (e as SessionCapabilityError).code === "UNAUTHORIZED",
    );
  });

  it("returns empty permissions when no tenant slug", async () => {
    fake.users.push({ id: "u1", email: "user@test.com", name: "Test User" });

    const result = await resolveSessionCapabilities("u1", null, fake.db);

    assert.equal(result.user.email, "user@test.com");
    assert.equal(result.user.globalRole, null);
    assert.equal(result.user.emailIsValid, true);
    assert.equal(result.effectivePermissions.every((p) => !p.granted), true);
  });

  it("identifies SUPER_ADMIN global role", async () => {
    fake.users.push({ id: "sa1", email: "sa@test.com", name: "Super", platformRole: "SUPER_ADMIN" });

    const result = await resolveSessionCapabilities("sa1", null, fake.db);

    assert.equal(result.user.globalRole, "SUPER_ADMIN");
    assert.equal(result.effectivePermissions.every((p) => !p.granted), true);
  });

  it("rejects non-member accessing tenant without SUPER_ADMIN", async () => {
    fake.users.push({ id: "u1", email: "user@test.com", name: "User" });
    fake.tenants.push({ id: "t1", slug: "my-tenant", name: "My Tenant", status: "ACTIVE" });

    await assert.rejects(
      () => resolveSessionCapabilities("u1", "my-tenant", fake.db),
      (e: unknown) => (e as SessionCapabilityError).code === "FORBIDDEN",
    );
  });

  it("allows SUPER_ADMIN access to any tenant without membership", async () => {
    fake.users.push({ id: "sa1", email: "sa@test.com", name: "SA", platformRole: "SUPER_ADMIN" });
    fake.tenants.push({ id: "t1", slug: "my-tenant", name: "My Tenant", status: "ACTIVE" });

    const result = await resolveSessionCapabilities("sa1", "my-tenant", fake.db);

    assert.equal(result.tenant.tenantSlug, "my-tenant");
    assert.equal(result.tenant.tenantName, "My Tenant");
    assert.ok(result.tenant.tenantPermissions!.some((p) => p.granted));
  });

  it("returns tenant data with canonical role for tenant admin member", async () => {
    fake.users.push({ id: "u1", email: "user@test.com", name: "User" });
    fake.tenants.push({ id: "t1", slug: "my-tenant", name: "My Tenant", status: "ACTIVE" });
    fake.memberships.push({ userId: "u1", tenantId: "t1", role: "TENANT_ADMIN" });

    const result = await resolveSessionCapabilities("u1", "my-tenant", fake.db);

    assert.equal(result.tenant.tenantRole, "TENANT_ADMIN");
    assert.equal(result.tenant.canonicalTenantRole, "TENANT_ADMIN");
    assert.equal(result.tenant.tenantStatus, "ACTIVE");
    assert.equal(result.tenant.tenantPermissions!.some((p) => p.granted), true);
  });

  it("shows canonical PUBLISHER role for publisher member", async () => {
    fake.users.push({ id: "u1", email: "user@test.com", name: "User" });
    fake.tenants.push({ id: "t1", slug: "my-tenant", name: "My Tenant", status: "ACTIVE" });
    fake.memberships.push({ userId: "u1", tenantId: "t1", role: "PUBLISHER" });

    const result = await resolveSessionCapabilities("u1", "my-tenant", fake.db);

    assert.equal(result.tenant.canonicalTenantRole, "PUBLISHER");
    assert.ok(result.tenant.tenantPermissions!.filter((p) => p.granted).length > 0);
  });

  it("PUBLISHER has content access but no member/config access", async () => {
    fake.users.push({ id: "u1", email: "publisher@test.com", name: "Publisher" });
    fake.tenants.push({ id: "t1", slug: "my-tenant", name: "My Tenant", status: "ACTIVE" });
    fake.memberships.push({ userId: "u1", tenantId: "t1", role: "PUBLISHER" });

    const result = await resolveSessionCapabilities("u1", "my-tenant", fake.db);

    const granted = result.tenant.tenantPermissions!.filter((p) => p.granted);
    assert.ok(granted.some((p) => p.permission === "TENANT_READ"));
    assert.ok(granted.some((p) => p.permission === "ANALYTICS_READ"));
    assert.ok(!granted.some((p) => p.permission === "MEMBERS_ADD"));
    assert.ok(!granted.some((p) => p.permission === "TENANT_CONFIG_UPDATE"));
  });

  it("TENANT_ADMIN has tenant administrative permissions without global-only powers", async () => {
    fake.users.push({ id: "u1", email: "owner@test.com", name: "Owner" });
    fake.tenants.push({ id: "t1", slug: "my-tenant", name: "My Tenant", status: "ACTIVE" });
    fake.memberships.push({ userId: "u1", tenantId: "t1", role: "TENANT_ADMIN" });

    const result = await resolveSessionCapabilities("u1", "my-tenant", fake.db);

    assert.equal(result.tenant.tenantPermissions!.find((p) => p.permission === "MEMBERS_ADD")!.granted, true);
    assert.equal(result.tenant.tenantPermissions!.find((p) => p.permission === "TENANT_STATUS_CHANGE")!.granted, false);
  });

  it("TENANT_ADMIN has TENANT_READ and lacks SECURITY_MANAGE", async () => {
    fake.users.push({ id: "u1", email: "admin@test.com", name: "Admin" });
    fake.tenants.push({ id: "t1", slug: "my-tenant", name: "My Tenant", status: "ACTIVE" });
    fake.memberships.push({ userId: "u1", tenantId: "t1", role: "TENANT_ADMIN" });

    const result = await resolveSessionCapabilities("u1", "my-tenant", fake.db);

    const tenantRead = result.tenant.tenantPermissions!.find((p) => p.permission === "TENANT_READ");
    assert.equal(tenantRead!.granted, true);
    const security = result.tenant.tenantPermissions!.find((p) => p.permission === "SECURITY_MANAGE");
    assert.equal(security!.granted, false);
    const statusChange = result.tenant.tenantPermissions!.find((p) => p.permission === "TENANT_STATUS_CHANGE");
    assert.equal(statusChange!.granted, false);
  });

  it("does not expose tokens, hashes, or secrets in response", async () => {
    fake.users.push({ id: "u1", email: "user@test.com", name: "User" });
    fake.tenants.push({ id: "t1", slug: "my-tenant", name: "My Tenant", status: "ACTIVE" });
    fake.memberships.push({ userId: "u1", tenantId: "t1", role: "TENANT_ADMIN" });

    const result = await resolveSessionCapabilities("u1", "my-tenant", fake.db);
    const json = JSON.stringify(result);

    assert.ok(!json.includes("passwordHash"));
    assert.ok(!json.includes("tokenHash"));
    assert.ok(!json.includes("accessToken"));
    assert.ok(!json.includes("secret"));
    assert.ok(!json.includes("apiKey"));
  });

  it("handles legacy accounts (email without @)", async () => {
    fake.users.push({ id: "u1", email: "legacy_identifier", name: "Legacy" });

    const result = await resolveSessionCapabilities("u1", null, fake.db);

    assert.equal(result.user.emailIsValid, false);
    assert.equal(result.user.identifier, "Cuenta con identificador heredado.");
  });

  it("includes lifecycle block reason for SUSPENDED tenant", async () => {
    fake.users.push({ id: "u1", email: "user@test.com", name: "User" });
    fake.tenants.push({ id: "t1", slug: "my-tenant", name: "My Tenant", status: "SUSPENDED" });
    fake.memberships.push({ userId: "u1", tenantId: "t1", role: "TENANT_ADMIN" });

    const result = await resolveSessionCapabilities("u1", "my-tenant", fake.db);

    assert.ok(result.tenant.lifecycleBlockedReason!.includes("SUSPENDED"));
  });

  it("rejects cross-tenant access", async () => {
    fake.users.push({ id: "u1", email: "user@test.com", name: "User" });
    fake.tenants.push({ id: "t1", slug: "tenant-a", name: "Tenant A", status: "ACTIVE" });
    fake.tenants.push({ id: "t2", slug: "tenant-b", name: "Tenant B", status: "ACTIVE" });
    fake.memberships.push({ userId: "u1", tenantId: "t1", role: "TENANT_ADMIN" });

    await assert.rejects(
      () => resolveSessionCapabilities("u1", "tenant-b", fake.db),
      (e: unknown) => (e as SessionCapabilityError).code === "FORBIDDEN",
    );
  });

  it("TENANT_ADMIN has ADMIN canonical permissions in tenant", async () => {
    fake.users.push({ id: "u1", email: "ta@test.com", name: "TA" });
    fake.tenants.push({ id: "t1", slug: "my-tenant", name: "My Tenant", status: "ACTIVE" });
    fake.memberships.push({ userId: "u1", tenantId: "t1", role: "TENANT_ADMIN" });

    const result = await resolveSessionCapabilities("u1", "my-tenant", fake.db);

    assert.equal(result.tenant.canonicalTenantRole, "TENANT_ADMIN");
    assert.equal(result.tenant.tenantPermissions!.find((p) => p.permission === "CONTENT_WRITE")!.granted, true);
    assert.equal(result.tenant.tenantPermissions!.find((p) => p.permission === "SECURITY_MANAGE")!.granted, false);
  });
});
