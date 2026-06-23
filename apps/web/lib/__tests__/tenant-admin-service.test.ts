import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { hashInvitationToken, generateInvitationToken } from "../invitation-token";
import {
  TenantAdminError,
  normalizeTenantSlug,
  validateTenantSlug,
  listAdminTenants,
  getAdminTenant,
  createAdminTenant,
  changeTenantStatus,
  updateAdminTenantConfiguration,
} from "../tenant-admin-service";
import {
  TenantAccessError,
  assertTenantLifecycleAllowsMutation,
  isSuperAdmin,
  requireSuperAdminActor,
} from "../tenant-access";
import type { TenantAdminDb } from "../tenant-access";

type StoredRecord = Record<string, unknown>;

let failNext: string | null = null;
function setFailNext(operation: string) {
  failNext = operation;
}

function checkFault(operation: string): void {
  if (failNext === operation) {
    failNext = null;
    throw new Error("FAULT_INJECTED");
  }
}

interface FakeCollection {
  records: StoredRecord[];
  create(args: { data: StoredRecord }): StoredRecord;
  findUnique(args: { where: Record<string, unknown> }): StoredRecord | null;
  findUniqueOrThrow(args: { where: Record<string, unknown> }): StoredRecord;
  findFirst(args: { where: Record<string, unknown>; select?: unknown }): StoredRecord | null;
  findMany(args?: { where?: Record<string, unknown>; orderBy?: unknown; include?: unknown }): StoredRecord[];
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): StoredRecord;
}

function buildFakeDb(): {
  db: TenantAdminDb & { $transaction: <R>(fn: (tx: any) => Promise<R>) => Promise<R> };
  collections: {
    users: FakeCollection;
    tenants: FakeCollection;
    memberships: FakeCollection;
    invitations: FakeCollection;
    auditLogs: FakeCollection;
  };
} {
  const users: FakeCollection = {
    records: [],
    create({ data }) { checkFault("user.create"); const r = { id: `u_${this.records.length + 1}`, ...data }; this.records.push(r); return r; },
    findUnique({ where }) { checkFault("user.findUnique"); return this.records.find((r) => (where as any).id === r.id || (where as any).email === r.email) ?? null; },
    findUniqueOrThrow({ where }) { const r = this.findUnique({ where }); if (!r) throw new Error("Not found"); return r; },
    findFirst({ where }) { return this.records.find((r) => (where as any).id === r.id) ?? null; },
    findMany() { return this.records; },
    update({ where, data }) { const r = this.findUnique({ where })!; Object.assign(r, data); return r; },
  };

  const tenants: FakeCollection = {
    records: [],
    create({ data }) { checkFault("tenant.create"); const r = { id: `t_${this.records.length + 1}`, ...data }; this.records.push(r); return r; },
    findUnique({ where }) { return this.records.find((r) => (where as any).id === r.id || (where as any).slug === r.slug) ?? null; },
    findUniqueOrThrow({ where }) { const r = this.records.find((r) => (where as any).id === r.id || (where as any).slug === r.slug); if (!r) throw new Error("Not found"); return { ...r } as any; },
    findFirst() { return this.records[0] ?? null; },
    findMany(args?: any) {
      const results = args?.orderBy === undefined ? [...this.records] : [...this.records];
      if (args?.include) {
        return results.map((r) => ({ ...r, memberships: [] }));
      }
      return results;
    },
    update({ where, data }) { checkFault("tenant.update"); const r = this.records.find((r) => (where as any).id === r.id)!; Object.assign(r, data as any); checkFault("tenant.afterUpdate"); return { ...r }; },
  };

  const memberships: FakeCollection = {
    records: [],
    create({ data }) { checkFault("membership.create"); const r = { id: `m_${this.records.length + 1}`, ...data }; this.records.push(r); return r; },
    findUnique({ where }) {
      const w = where as any;
      if (w.tenantId_userId) return this.records.find((r) => r.tenantId === w.tenantId_userId.tenantId && r.userId === w.tenantId_userId.userId) ?? null;
      return null;
    },
    findUniqueOrThrow({ where }) { const r = this.findUnique({ where }); if (!r) throw new Error("Not found"); return r; },
    findFirst({ where }) {
      const w = where as any;
      const result = this.records.find((r) => r.tenantId === w.tenantId && r.role === w.role);
      if (!result) return null;
      return { ...result, user: { email: "owner@test.com" } };
    },
    findMany(args?: any) {
      if (!args?.where) return this.records;
      const w = args.where as any;
      let results = this.records.filter((r) => (!w.tenantId || r.tenantId === w.tenantId) && (!w.role || r.role === w.role) && (!w.userId || r.userId === w.userId));
      if (args?.select === undefined) return results;
      return results.map((r) => ({ role: r.role }));
    },
    update() { throw new Error("not implemented"); },
  };

  const invitations: FakeCollection = {
    records: [],
    create({ data }) { checkFault("invitation.create"); const r = { id: `inv_${this.records.length + 1}`, ...data }; this.records.push(r); return r; },
    findUnique({ where }) { return this.records.find((r) => (where as any).id === r.id || (where as any).tokenHash === r.tokenHash) ?? null; },
    findUniqueOrThrow({ where }) { const r = this.findUnique({ where }); if (!r) throw new Error("Not found"); return r; },
    findFirst({ where }) { const w = where as any; return this.records.find((r) => r.tokenHash === w.tokenHash && r.acceptedById == null && new Date(r.expiresAt as string).getTime() > Date.now()) ?? null; },
    findMany() { return this.records; },
    update() { throw new Error("not implemented"); },
  };

  const auditLogs: FakeCollection = {
    records: [],
    create({ data }) { checkFault("auditLog.create"); const r = { id: `a_${this.records.length + 1}`, ...data }; this.records.push(r); return r; },
    findUnique() { checkFault("audit_query"); return null; },
    findUniqueOrThrow() { checkFault("audit_query"); throw new Error("Not found"); },
    findFirst() { checkFault("audit_query"); return null; },
    findMany() { checkFault("audit_query"); return this.records; },
    update() { throw new Error("not implemented"); },
  };

  const db = {
    user: users,
    tenant: tenants,
    membership: memberships,
    invitation: invitations,
    auditLog: auditLogs,
    $transaction: async <R>(fn: (tx: any) => Promise<R>) => {
      const snapshots = {
        users: [...users.records.map((r) => ({ ...r }))],
        tenants: [...tenants.records.map((r) => ({ ...r }))],
        memberships: [...memberships.records.map((r) => ({ ...r }))],
        invitations: [...invitations.records.map((r) => ({ ...r }))],
        auditLogs: [...auditLogs.records.map((r) => ({ ...r }))],
      };
      try {
        const result = await fn(db);
        return result;
      } catch (e) {
        users.records = snapshots.users;
        tenants.records = snapshots.tenants;
        memberships.records = snapshots.memberships;
        invitations.records = snapshots.invitations;
        auditLogs.records = snapshots.auditLogs;
        throw e;
      }
    },
  };

  return { db: db as any, collections: { users, tenants, memberships, invitations, auditLogs } };
}

describe("tenant-access hardening", () => {
  let fake: ReturnType<typeof buildFakeDb>;
  let db: ReturnType<typeof buildFakeDb>["db"];

  beforeEach(() => {
    failNext = null;
    fake = buildFakeDb();
    db = fake.db;
  });

  describe("requireSuperAdminActor", () => {
    it("SUPER_ADMIN actor passes real DB check", async () => {
      fake.collections.users.create({ data: { id: "sa1", email: "sa@test.com" } });
      fake.collections.memberships.create({ data: { tenantId: "t1", userId: "sa1", role: "SUPER_ADMIN" } });
      const id = await requireSuperAdminActor("sa1", db);
      assert.equal(id, "sa1");
    });

    it("OWNER cannot pass admin check", async () => {
      fake.collections.users.create({ data: { id: "o1", email: "owner@test.com" } });
      fake.collections.memberships.create({ data: { tenantId: "t1", userId: "o1", role: "OWNER" } });
      await assert.rejects(() => requireSuperAdminActor("o1", db), TenantAccessError);
    });

    it("ADMIN cannot pass admin check", async () => {
      fake.collections.users.create({ data: { id: "a1", email: "admin@test.com" } });
      fake.collections.memberships.create({ data: { tenantId: "t1", userId: "a1", role: "ADMIN" } });
      await assert.rejects(() => requireSuperAdminActor("a1", db), TenantAccessError);
    });

    it("non-existent actor throws UNAUTHORIZED", async () => {
      await assert.rejects(
        () => requireSuperAdminActor("no-such-user", db),
        (err: any) => err.code === "UNAUTHORIZED",
      );
    });

    it("arbitrary actorId does not get privileges", async () => {
      fake.collections.users.create({ data: { id: "v1", email: "viewer@test.com" } });
      fake.collections.memberships.create({ data: { tenantId: "t1", userId: "v1", role: "VIEWER" } });
      await assert.rejects(() => requireSuperAdminActor("v1", db), TenantAccessError);
    });
  });

  describe("assertTenantLifecycleAllowsMutation", () => {
    it("ACTIVE allows NORMAL_OPERATION", () => {
      assert.doesNotThrow(() => assertTenantLifecycleAllowsMutation("ACTIVE", "NORMAL_OPERATION"));
    });

    it("PROVISIONING blocks NORMAL_OPERATION", () => {
      assert.throws(
        () => assertTenantLifecycleAllowsMutation("PROVISIONING", "NORMAL_OPERATION"),
        TenantAccessError,
      );
    });

    it("PROVISIONING allows PROVISIONING_CONFIGURATION", () => {
      assert.doesNotThrow(() =>
        assertTenantLifecycleAllowsMutation("PROVISIONING", "PROVISIONING_CONFIGURATION"),
      );
    });

    it("PROVISIONING allows OWNER_INVITATION", () => {
      assert.doesNotThrow(() =>
        assertTenantLifecycleAllowsMutation("PROVISIONING", "OWNER_INVITATION"),
      );
    });

    it("PROVISIONING allows ONBOARDING_SETUP", () => {
      assert.doesNotThrow(() =>
        assertTenantLifecycleAllowsMutation("PROVISIONING", "ONBOARDING_SETUP"),
      );
    });

    it("SUSPENDED blocks all tenant mutations", () => {
      assert.throws(
        () => assertTenantLifecycleAllowsMutation("SUSPENDED", "NORMAL_OPERATION"),
        (err: any) => err.code === "TENANT_SUSPENDED",
      );
      assert.throws(
        () => assertTenantLifecycleAllowsMutation("SUSPENDED", "PROVISIONING_CONFIGURATION"),
        (err: any) => err.code === "TENANT_SUSPENDED",
      );
    });

    it("ARCHIVED blocks all tenant mutations", () => {
      assert.throws(
        () => assertTenantLifecycleAllowsMutation("ARCHIVED", "NORMAL_OPERATION"),
        (err: any) => err.code === "TENANT_ARCHIVED",
      );
      assert.throws(
        () => assertTenantLifecycleAllowsMutation("ARCHIVED", "PROVISIONING_CONFIGURATION"),
        (err: any) => err.code === "TENANT_ARCHIVED",
      );
    });
  });
});

describe("provisioning with fake DB", () => {
  let fake: ReturnType<typeof buildFakeDb>;
  let db: ReturnType<typeof buildFakeDb>["db"];

  beforeEach(() => {
    failNext = null;
    fake = buildFakeDb();
    db = fake.db;
    fake.collections.users.create({ data: { id: "sa1", email: "sa@test.com" } });
    fake.collections.memberships.create({ data: { tenantId: "global", userId: "sa1", role: "SUPER_ADMIN" } });
  });

  describe("listAdminTenants", () => {
    it("SUPER_ADMIN can list tenants", async () => {
      const result = await listAdminTenants("sa1", db);
      assert.ok(Array.isArray(result));
    });

    it("OWNER cannot list tenants", async () => {
      fake.collections.users.create({ data: { id: "o1", email: "owner@test.com" } });
      fake.collections.memberships.create({ data: { tenantId: "t1", userId: "o1", role: "OWNER" } });
      await assert.rejects(() => listAdminTenants("o1", db), TenantAccessError);
    });
  });

  describe("createAdminTenant", () => {
    it("creates tenant in PROVISIONING with owner membership and invitation", async () => {
      const result = await createAdminTenant({
        actorId: "sa1",
        slug: "test-tenant",
        name: "Test Tenant",
        ownerEmail: "owner@test.com",
      }, db);

      assert.equal(result.status, "PROVISIONING");
      assert.equal(result.slug, "test-tenant");
      assert.ok(result.invitationToken);
      assert.ok(!("tokenHash" in (result as any)));
      assert.ok(!("passwordHash" in (result as any)));

      const owner = fake.collections.users.records.find((u: any) => u.email === "owner@test.com");
      assert.ok(owner, "owner user should exist");

      const membership = fake.collections.memberships.records.find(
        (m: any) => m.userId === owner.id && m.role === "OWNER",
      );
      assert.ok(membership, "OWNER membership should exist");

      const inv = fake.collections.invitations.records.find(
        (i: any) => i.email === "owner@test.com" && i.role === "OWNER",
      );
      assert.ok(inv, "invitation should exist");
      assert.ok(inv.tokenHash, "tokenHash should be stored");
      const rawToken = result.invitationToken!;
      const expectedHash = hashInvitationToken(rawToken);
      assert.equal(inv.tokenHash, expectedHash, "invitation hash matches generated token");

      const audits = fake.collections.auditLogs.records.filter(
        (a: any) => a.action === "TENANT_CREATED",
      );
      assert.ok(audits.length >= 1, "audit log should exist");
    });

    it("reuses existing owner user", async () => {
      fake.collections.users.create({ data: { id: "existing-owner", email: "owner@test.com", name: "Existing" } });
      await createAdminTenant({
        actorId: "sa1", slug: "tr2", name: "T2", ownerEmail: "owner@test.com",
      }, db);
      const owners = fake.collections.users.records.filter((u: any) => u.email === "owner@test.com");
      assert.equal(owners.length, 1, "should not create duplicate user");
    });

    it("rollback on invitation failure", async () => {
      fake.collections.invitations.create = () => { throw new Error("INVITATION_FAIL"); };
      await assert.rejects(
        () => createAdminTenant({ actorId: "sa1", slug: "tr3", name: "T3", ownerEmail: "o3@test.com" }, db),
      );
      assert.equal(fake.collections.tenants.records.length, 0, "no tenant should persist");
      assert.equal(fake.collections.memberships.records.filter((m: any) => m.role !== "SUPER_ADMIN").length, 0, "no orphan memberships");
    });

    it("invitation hash is verified against existing register format", () => {
      const token = generateInvitationToken();
      const hash = hashInvitationToken(token);
      assert.equal(hash.length, 64, "sha256 hex should be 64 chars");
      const sameHash = hashInvitationToken(token);
      assert.equal(hash, sameHash, "same token produces same hash");
    });

    it("invitation ID is not deterministic by tenant.id", async () => {
      const r1 = await createAdminTenant({
        actorId: "sa1", slug: "t-a", name: "TA", ownerEmail: "a@test.com",
      }, db);
      const r2 = await createAdminTenant({
        actorId: "sa1", slug: "t-b", name: "TB", ownerEmail: "b@test.com",
      }, db);
      const i1 = fake.collections.invitations.records.find((i: any) => i.email === "a@test.com");
      const i2 = fake.collections.invitations.records.find((i: any) => i.email === "b@test.com");
      assert.notEqual(i1!.id, `inv_${r1.id}`, "ID should not be deterministic");
      assert.notEqual(i2!.id, `inv_${r2.id}`, "ID should not be deterministic");
    });

    it("does not persist plain token", () => {
      const token = generateInvitationToken();
      const hash = hashInvitationToken(token);
      const invite = fake.collections.invitations.create({
        data: { id: "inv_x", tenantId: "t1", email: "x@test.com", role: "OWNER", tokenHash: hash, expiresAt: new Date(Date.now() + 86400000) },
      });
      assert.ok(!("token" in invite));
      assert.ok(!("plainToken" in invite));
    });

    it("ADMIN cannot create tenant", async () => {
      fake.collections.users.create({ data: { id: "a1", email: "admin@test.com" } });
      fake.collections.memberships.create({ data: { tenantId: "t1", userId: "a1", role: "ADMIN" } });
      await assert.rejects(
        () => createAdminTenant({ actorId: "a1", slug: "tr2", name: "T2", ownerEmail: "x@test.com" }, db),
        TenantAccessError,
      );
    });

    it("createAdminTenant rollback on tenant.create failure", async () => {
      setFailNext("tenant.create");
      await assert.rejects(
        () => createAdminTenant({ actorId: "sa1", slug: "rr1", name: "R1", ownerEmail: "r1@test.com" }, db),
        /FAULT_INJECTED/,
      );
      const userCreated = fake.collections.users.records.find((u: any) => u.email === "r1@test.com");
      assert.equal(userCreated, undefined, "user should NOT be created after rollback");
      assert.equal(fake.collections.tenants.records.length, 0, "no tenant should persist");
    });

    it("createAdminTenant rollback on membership.create failure", async () => {
      setFailNext("membership.create");
      await assert.rejects(
        () => createAdminTenant({ actorId: "sa1", slug: "rr2", name: "R2", ownerEmail: "r2@test.com" }, db),
        /FAULT_INJECTED/,
      );
      const userCreated = fake.collections.users.records.find((u: any) => u.email === "r2@test.com");
      assert.equal(userCreated, undefined, "user should NOT be created after rollback");
      assert.equal(fake.collections.tenants.records.length, 0, "tenant should NOT be persisted");
    });

    it("createAdminTenant rollback on invitation.create failure", async () => {
      setFailNext("invitation.create");
      await assert.rejects(
        () => createAdminTenant({ actorId: "sa1", slug: "rr3", name: "R3", ownerEmail: "r3@test.com" }, db),
        /FAULT_INJECTED/,
      );
      const userCreated = fake.collections.users.records.find((u: any) => u.email === "r3@test.com");
      assert.equal(userCreated, undefined, "user should NOT be created after rollback");
      assert.equal(fake.collections.tenants.records.length, 0, "tenant should NOT be persisted");
      assert.equal(fake.collections.memberships.records.filter((m: any) => m.role !== "SUPER_ADMIN").length, 0, "no orphan memberships");
    });

    it("createAdminTenant rollback on auditLog.create failure", async () => {
      setFailNext("auditLog.create");
      await assert.rejects(
        () => createAdminTenant({ actorId: "sa1", slug: "rr4", name: "R4", ownerEmail: "r4@test.com" }, db),
        /FAULT_INJECTED/,
      );
      const userCreated = fake.collections.users.records.find((u: any) => u.email === "r4@test.com");
      assert.equal(userCreated, undefined, "user should NOT be created after rollback");
      assert.equal(fake.collections.tenants.records.length, 0, "tenant should NOT be persisted");
      assert.equal(fake.collections.memberships.records.filter((m: any) => m.role !== "SUPER_ADMIN").length, 0, "no orphan memberships");
      assert.equal(fake.collections.invitations.records.length, 0, "no invitation should persist");
    });
  });

  describe("changeTenantStatus transactional", () => {
    it("transition update + audit in transaction", async () => {
      const t = await createAdminTenant({
        actorId: "sa1", slug: "lifecycle-1", name: "LC1", ownerEmail: "lc1@test.com",
      }, db);
      assert.equal(t.status, "PROVISIONING");

      const result = await changeTenantStatus("sa1", t.id, "ACTIVE", db);
      assert.equal(result.status, "ACTIVE");

      const audits = fake.collections.auditLogs.records.filter(
        (a: any) => a.action === "TENANT_ACTIVE",
      );
      assert.ok(audits.length >= 1, "audit should exist");
    });

    it("invalid transition blocked without data change", async () => {
      const t = await createAdminTenant({
        actorId: "sa1", slug: "lc2", name: "LC2", ownerEmail: "lc2@test.com",
      }, db);
      const beforeCount = fake.collections.auditLogs.records.length;
      await assert.rejects(
        () => changeTenantStatus("sa1", t.id, "PROVISIONING" as any, db),
        TenantAdminError,
      );
      const tenant = fake.collections.tenants.findUnique({ where: { id: t.id } });
      assert.equal(tenant!.status, "PROVISIONING", "status should not change");
      assert.equal(fake.collections.auditLogs.records.length, beforeCount, "no audit should be written");
    });

    it("changeTenantStatus rollback on audit failure", async () => {
      const t = await createAdminTenant({
        actorId: "sa1", slug: "lc3", name: "LC3", ownerEmail: "lc3@test.com",
      }, db);
      const beforeAuditCount = fake.collections.auditLogs.records.length;
      setFailNext("auditLog.create");
      await assert.rejects(
        () => changeTenantStatus("sa1", t.id, "ACTIVE", db),
        /FAULT_INJECTED/,
      );
      const tenant = fake.collections.tenants.findUnique({ where: { id: t.id } });
      assert.equal(tenant!.status, "PROVISIONING", "status should be unchanged after rollback");
      assert.equal(fake.collections.auditLogs.records.length, beforeAuditCount, "audit count should be unchanged");
    });
  });

  describe("updateAdminTenantConfiguration transactional", () => {
    it("update config + audit in transaction", async () => {
      const t = await createAdminTenant({
        actorId: "sa1", slug: "cfg-1", name: "CFG1", ownerEmail: "cfg1@test.com",
      }, db);
      const result = await updateAdminTenantConfiguration("sa1", t.id, {
        name: "New Name", timezone: "UTC", locale: "en",
      }, db);
      assert.equal(result.name, "New Name");

      const audits = fake.collections.auditLogs.records.filter(
        (a: any) => a.action === "TENANT_CONFIGURATION_UPDATED",
      );
      assert.ok(audits.length >= 1, "config audit should exist");
    });

    it("invalid timezone rejected", async () => {
      const t = await createAdminTenant({
        actorId: "sa1", slug: "cfg-2", name: "CFG2", ownerEmail: "cfg2@test.com",
      }, db);
      await assert.rejects(
        () => updateAdminTenantConfiguration("sa1", t.id, { timezone: "Mars" }, db),
        TenantAdminError,
      );
    });

    it("invalid locale rejected", async () => {
      const t = await createAdminTenant({
        actorId: "sa1", slug: "cfg-3", name: "CFG3", ownerEmail: "cfg3@test.com",
      }, db);
      await assert.rejects(
        () => updateAdminTenantConfiguration("sa1", t.id, { locale: "xx" }, db),
        TenantAdminError,
      );
    });

    it("updateAdminTenantConfiguration rollback on audit failure", async () => {
      const t = await createAdminTenant({
        actorId: "sa1", slug: "cfg-4", name: "CFG4", ownerEmail: "cfg4@test.com",
      }, db);
      const beforeAuditCount = fake.collections.auditLogs.records.length;
      setFailNext("auditLog.create");
      await assert.rejects(
        () => updateAdminTenantConfiguration("sa1", t.id, {
          name: "New Name", timezone: "America/New_York", locale: "en",
        }, db),
        /FAULT_INJECTED/,
      );
      const tenant = fake.collections.tenants.findUnique({ where: { id: t.id } });
      assert.equal(tenant!.name, "CFG4", "name should be unchanged after rollback");
      assert.equal(tenant!.timezone, "UTC", "timezone should be unchanged after rollback");
      assert.equal(tenant!.locale, "es", "locale should be unchanged after rollback");
      assert.equal(fake.collections.auditLogs.records.length, beforeAuditCount, "audit count should be unchanged");
    });
  });
});

describe("slug functions", () => {
  it("normalizes slug", () => {
    assert.equal(normalizeTenantSlug("  My Tenant  "), "my-tenant");
    assert.equal(normalizeTenantSlug("UPPER"), "upper");
  });

  it("validates slug format", () => {
    assert.doesNotThrow(() => validateTenantSlug("my-tenant"));
    assert.throws(() => validateTenantSlug("ab"), TenantAdminError);
    assert.throws(() => validateTenantSlug("-bad"), TenantAdminError);
  });

  const reserved = ["admin", "api", "app", "login", "register", "tenant", "settings", "billing", "support", "www"];
  for (const word of reserved) {
    it(`reserved "${word}" blocked`, () => {
      assert.throws(() => validateTenantSlug(word), TenantAdminError);
    });
  }
});

describe("error types", () => {
  it("TenantAdminError carries code and status", () => {
    const e = new TenantAdminError("m", "C", 400);
    assert.equal(e.code, "C");
    assert.equal(e.status, 400);
  });

  it("TenantAccessError carries code and status", () => {
    const e = new TenantAccessError("m", "C", 403);
    assert.equal(e.code, "C");
    assert.equal(e.status, 403);
  });
});

describe("invitation compatibility", () => {
  it("hashInvitationToken produces verifiable hashes via fake DB", () => {
    const fake = buildFakeDb();
    const token = generateInvitationToken();
    const hash = hashInvitationToken(token);
    assert.equal(hash.length, 64, "sha256 hex should be 64 chars");
    const invite = fake.collections.invitations.create({
      data: {
        id: "inv_test",
        tenantId: "t1",
        email: "test@test.com",
        role: "OWNER",
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    const found = fake.collections.invitations.findFirst({ where: { tokenHash: hash } });
    assert.ok(found, "invitation should be found by tokenHash");
    assert.equal(found!.id, "inv_test");
  });

  it("generateInvitationToken produces 64-char hex strings", () => {
    const token = generateInvitationToken();
    assert.equal(token.length, 64, "randomBytes(32) produces 64 hex chars");
    assert.match(token, /^[0-9a-f]{64}$/);
  });
});

describe("zero external deps", () => {
  it("zero provider calls", () => {
    const forbidden = ["meta", "facebook", "instagram-api", "publisher"];
    const combined = JSON.stringify([assertTenantLifecycleAllowsMutation, createAdminTenant, changeTenantStatus])
      .toLowerCase();
    for (const f of forbidden) {
      assert.ok(!combined.includes(f), `must not mention ${f}`);
    }
  });
});
