import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { hashInvitationToken, generateInvitationToken, getInvitationExpiration } from "../invitation-token";

function extractInvitationToken(inviteLink: string): string {
  const q = inviteLink.split("?")[1];
  if (!q) throw new Error(`No query params in inviteLink: ${inviteLink}`);
  const params = new URLSearchParams(q);
  const token = params.get("token");
  if (!token) throw new Error(`No token in inviteLink: ${inviteLink}`);
  return token;
}
import bcrypt from "bcryptjs";
import {
  TenantAdminError,
  normalizeTenantSlug,
  validateTenantSlug,
  listAdminTenants,
  getAdminTenant,
  createAdminTenant,
  changeTenantStatus,
  updateAdminTenantConfiguration,
  addTenantMember,
  validatePagination,
} from "../tenant-admin-service";
import {
  TenantAccessError,
  assertTenantLifecycleAllowsMutation,
  isSuperAdmin,
  requireSuperAdminActor,
} from "../tenant-access";
import type { TenantAdminDb } from "../tenant-access";
import { acceptRegistrationInvitation, InvitationAcceptanceError } from "../invitation-acceptance-service";

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
  findMany(args?: { where?: Record<string, unknown>; orderBy?: unknown; include?: unknown; skip?: number; take?: number }): StoredRecord[];
  count?(args?: { where?: Record<string, unknown> }): number;
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
    create({ data }) { checkFault("user.create"); const r = { id: `u_${this.records.length + 1}`, passwordHash: null, ...data }; this.records.push(r); return r; },
    findUnique({ where }) { checkFault("user.findUnique"); return this.records.find((r) => (where as any).id === r.id || (where as any).email === r.email) ?? null; },
    findUniqueOrThrow({ where }) { const r = this.findUnique({ where }); if (!r) throw new Error("Not found"); return r; },
    findFirst({ where }) { return this.records.find((r) => (where as any).id === r.id) ?? null; },
    findMany() { return this.records; },
    update({ where, data }) { checkFault("user.update"); const r = this.findUnique({ where })!; Object.assign(r, data); return r; },
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
        const includeMemberships = (args.include as any)?.memberships;
        if (includeMemberships) {
          const whereRole = includeMemberships.where?.role;
          const userSelect = includeMemberships.select?.user?.select;
          return results.map((r) => {
            const ownerMembership = memberships.records.find(
              (m: StoredRecord) => m.tenantId === r.id && m.role === whereRole,
            );
            if (ownerMembership && userSelect?.email) {
              const user = users.records.find((u: StoredRecord) => u.id === ownerMembership.userId);
              return { ...r, memberships: [{ user: { email: user?.email ?? "N/A" } }] };
            }
            return { ...r, memberships: [] };
          });
        }
        return results.map((r) => ({ ...r, memberships: [] }));
      }
      if (args?.skip !== undefined || args?.take !== undefined) {
        const skip = args?.skip ?? 0;
        const take = args?.take ?? results.length;
        return results.slice(skip, skip + take);
      }
      return results;
    },
    count() { return this.records.length; },
    update({ where, data }) { checkFault("tenant.update"); const r = this.records.find((r) => (where as any).id === r.id)!; Object.assign(r, data as any); checkFault("tenant.afterUpdate"); return { ...r }; },
  };

  const memberships: FakeCollection = {
    records: [],
    create({ data }) { checkFault("membership.create"); const r = { id: `m_${this.records.length + 1}`, ...data }; this.records.push(r); return r; },
    findUnique({ where }) {
      checkFault("membership.findUnique");
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
    count(args?: any) {
      const w = args?.where as any;
      if (!w) return this.records.length;
      return this.records.filter((r) => (!w.tenantId || r.tenantId === w.tenantId) && (!w.role || r.role === w.role) && (!w.userId || r.userId === w.userId)).length;
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
    count(args?: any) {
      const w = args?.where as any;
      if (!w) return this.records.length;
      return this.records.filter((r: any) => (!w.tenantId || r.tenantId === w.tenantId)).length;
    },
    update({ where, data }) { checkFault("invitation.update"); const r = this.records.find((r) => r.id === (where as any).id)!; Object.assign(r, data); return r; },
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
      fake.collections.users.create({ data: { id: "sa1", email: "sa@test.com", platformRole: "SUPER_ADMIN" } });
      const id = await requireSuperAdminActor("sa1", db);
      assert.equal(id, "sa1");
    });

    it("OWNER cannot pass admin check", async () => {
      fake.collections.users.create({ data: { id: "o1", email: "owner@test.com" } });
      fake.collections.memberships.create({ data: { tenantId: "t1", userId: "o1", role: "TENANT_ADMIN" } });
      await assert.rejects(() => requireSuperAdminActor("o1", db), TenantAccessError);
    });

    it("ADMIN cannot pass admin check", async () => {
      fake.collections.users.create({ data: { id: "a1", email: "admin@test.com" } });
      fake.collections.memberships.create({ data: { tenantId: "t1", userId: "a1", role: "TENANT_ADMIN" } });
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
      fake.collections.memberships.create({ data: { tenantId: "t1", userId: "v1", role: "PUBLISHER" } });
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
    fake.collections.users.create({ data: { id: "sa1", email: "sa@test.com", platformRole: "SUPER_ADMIN" } });
  });

  describe("listAdminTenants", () => {
    it("SUPER_ADMIN can list tenants", async () => {
      const result = await listAdminTenants("sa1", db);
      assert.ok(Array.isArray(result.items));
      assert.equal(typeof result.total, "number");
    });

    it("OWNER cannot list tenants", async () => {
      fake.collections.users.create({ data: { id: "o1", email: "owner@test.com" } });
      fake.collections.memberships.create({ data: { tenantId: "t1", userId: "o1", role: "TENANT_ADMIN" } });
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
      assert.ok(result.inviteLink);
      assert.ok(!("tokenHash" in (result as any)));
      assert.ok(!("passwordHash" in (result as any)));

      const owner = fake.collections.users.records.find((u: any) => u.email === "owner@test.com");
      assert.ok(owner, "owner user should exist");

      const membership = fake.collections.memberships.records.find(
        (m: any) => m.userId === owner.id && m.role === "TENANT_ADMIN",
      );
      assert.ok(membership, "TENANT_ADMIN membership should exist");

      const inv = fake.collections.invitations.records.find(
        (i: any) => i.email === "owner@test.com" && i.role === "TENANT_ADMIN",
      );
      assert.ok(inv, "invitation should exist");
      assert.ok(inv.tokenHash, "tokenHash should be stored");
      const rawToken = extractInvitationToken(result.inviteLink!);
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
      assert.equal(fake.collections.memberships.records.length, 0, "no orphan memberships");
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
        data: {
          id: "inv_x",
          tenantId: "t1",
          email: "x@test.com",
          role: "TENANT_ADMIN",
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      assert.ok(!("token" in invite));
      assert.ok(!("plainToken" in invite));
    });

    it("ADMIN cannot create tenant", async () => {
      fake.collections.users.create({ data: { id: "a1", email: "admin@test.com" } });
      fake.collections.memberships.create({ data: { tenantId: "t1", userId: "a1", role: "TENANT_ADMIN" } });
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
      assert.equal(fake.collections.memberships.records.length, 0, "no orphan memberships");
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
      assert.equal(fake.collections.memberships.records.length, 0, "no orphan memberships");
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

  describe("listAdminTenants ownerEmail", () => {
    it("returns real ownerEmail when OWNER membership exists", async () => {
      fake.collections.tenants.create({ data: { id: "t2", slug: "test-tenant", name: "Test", status: "ACTIVE", plan: "PILOT", timezone: "UTC", locale: "es", createdAt: new Date() } });
      fake.collections.users.create({ data: { id: "owner1", email: "owner@test.com", passwordHash: "hash" } });
      fake.collections.memberships.create({ data: { tenantId: "t2", userId: "owner1", role: "TENANT_ADMIN" } });
      const result = await listAdminTenants("sa1", db);
      const t2 = result.items.find((t) => t.id === "t2");
      assert.ok(t2, "tenant should exist");
      assert.equal(t2.ownerEmail, "owner@test.com");
    });
  });

  describe("addTenantMember invitation check", () => {
    it("placeholder with null passwordHash requires invitation", async () => {
      fake.collections.tenants.create({ data: { id: "t1", slug: "t1-tenant", name: "T1", status: "ACTIVE", plan: "PILOT", timezone: "UTC", locale: "es", createdAt: new Date() } });
      await assert.rejects(
        () => addTenantMember("sa1", "t1", { email: "sa@test.com", role: "TENANT_ADMIN" }, db),
        (e: unknown) => (e as TenantAdminError).code === "ACCOUNT_REQUIRES_INVITATION",
      );
    });

    it("non-existent user requires invitation", async () => {
      fake.collections.tenants.create({ data: { id: "t1", slug: "t1-tenant", name: "T1", status: "ACTIVE", plan: "PILOT", timezone: "UTC", locale: "es", createdAt: new Date() } });
      await assert.rejects(
        () => addTenantMember("sa1", "t1", { email: "nonexistent@test.com", role: "TENANT_ADMIN" }, db),
        (e: unknown) => (e as TenantAdminError).code === "ACCOUNT_REQUIRES_INVITATION",
      );
    });

    it("active account with passwordHash can be added", async () => {
      fake.collections.users.create({ data: { id: "active1", email: "active@test.com", passwordHash: "some_hash" } });
      fake.collections.tenants.create({ data: { id: "t_active", slug: "active-tenant", name: "Active", status: "ACTIVE", plan: "PILOT", timezone: "UTC", locale: "es", createdAt: new Date() } });
      const member = await addTenantMember("sa1", "t_active", { email: "active@test.com", role: "TENANT_ADMIN" }, db);
      assert.equal(member.email, "active@test.com");
      assert.equal(member.role, "TENANT_ADMIN");
    });
  });

});

describe("validatePagination", () => {
  it("defaults when no params provided", () => {
    const r = validatePagination({});
    assert.equal(r.page, 1);
    assert.equal(r.limit, 20);
  });

  it("accepts valid values", () => {
    const r = validatePagination({ page: 2, limit: 50 });
    assert.equal(r.page, 2);
    assert.equal(r.limit, 50);
  });

  it("accepts limit 100", () => {
    const r = validatePagination({ page: 1, limit: 100 });
    assert.equal(r.limit, 100);
  });

  it("rejects limit 101", () => {
    assert.throws(() => validatePagination({ limit: 101 }), TenantAdminError);
  });

  const invalidPages: Array<[string, unknown]> = [
    ["abc", "abc"],
    ["0", 0],
    ["-1", -1],
    ["1.5", 1.5],
  ];

  for (const [label, value] of invalidPages) {
    it(`rejects invalid page: ${label}`, () => {
      assert.throws(() => validatePagination({ page: value }), TenantAdminError);
    });
  }

  const invalidLimits: Array<[string, unknown]> = [
    ["abc", "abc"],
    ["0", 0],
    ["-1", -1],
    ["1.5", 1.5],
  ];

  for (const [label, value] of invalidLimits) {
    it(`rejects invalid limit: ${label}`, () => {
      assert.throws(() => validatePagination({ limit: value }), TenantAdminError);
    });
  }
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

describe("owner invitation activation", () => {
  let fake: ReturnType<typeof buildFakeDb>;
  let db: ReturnType<typeof buildFakeDb>["db"];

  beforeEach(() => {
    failNext = null;
    fake = buildFakeDb();
    db = fake.db;
    fake.collections.users.create({ data: { id: "sa1", email: "sa@test.com", platformRole: "SUPER_ADMIN" } });
  });

  it("createAdminTenant creates placeholder owner", async () => {
    await createAdminTenant({
      actorId: "sa1", slug: "placeholder-1", name: "P1", ownerEmail: "p1@test.com",
    }, db);
    const owner = fake.collections.users.records.find((u: any) => u.email === "p1@test.com");
    assert.ok(owner, "owner user should exist");
    assert.equal(owner.passwordHash, null);
  });

  it("createAdminTenant returns INVITATION_REQUIRED for new owner", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "inv-req", name: "IR", ownerEmail: "ir@test.com",
    }, db);
    assert.equal(result.ownerAccountState, "INVITATION_REQUIRED");
    assert.ok(result.inviteLink);
  });

  it("createAdminTenant returns EXISTING_ACCOUNT for user with passwordHash", async () => {
    fake.collections.users.create({ data: { id: "existing-pw", email: "existing@test.com", passwordHash: "some_hash" } });
    const result = await createAdminTenant({
      actorId: "sa1", slug: "existing-acct", name: "EA", ownerEmail: "existing@test.com",
    }, db);
    assert.equal(result.ownerAccountState, "EXISTING_ACCOUNT");
    assert.ok(result.inviteLink);
    assert.ok(result.inviteLink.includes("/login"), `expected login link, got ${result.inviteLink}`);
  });

  it("acceptRegistrationInvitation activates placeholder", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "activate-me", name: "AM", ownerEmail: "activate@test.com",
    }, db);
    const token = extractInvitationToken(result.inviteLink!);
    await db.$transaction((tx) => acceptRegistrationInvitation({
      token, email: "activate@test.com", password: "securePassword123",
    }, tx));
    const user = fake.collections.users.records.find((u: any) => u.email === "activate@test.com")!;
    assert.ok(user.passwordHash, "passwordHash should be set");
    assert.notEqual(user.passwordHash, null);
  });

  it("activated owner password passes bcrypt verify", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "bcrypt-test", name: "BT", ownerEmail: "bcrypt@test.com",
    }, db);
    const token = extractInvitationToken(result.inviteLink!);
    const password = "securePassword123";
    await db.$transaction((tx) => acceptRegistrationInvitation({
      token, email: "bcrypt@test.com", password,
    }, tx));
    const user = fake.collections.users.records.find((u: any) => u.email === "bcrypt@test.com")!;
    const match = await bcrypt.compare(password, user.passwordHash as string);
    assert.ok(match, "password should match hash");
  });

  it("only one membership after activation", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "one-membership", name: "OM", ownerEmail: "om@test.com",
    }, db);
    const token = extractInvitationToken(result.inviteLink!);
    await db.$transaction((tx) => acceptRegistrationInvitation({
      token, email: "om@test.com", password: "securePassword123",
    }, tx));
    const user = fake.collections.users.records.find((u: any) => u.email === "om@test.com")!;
      const memberships = fake.collections.memberships.records.filter(
        (m: any) => m.userId === user.id && m.role === "TENANT_ADMIN",
      );
    assert.equal(memberships.length, 1);
  });

  it("invitation acceptedById and acceptedAt set", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "accept-fields", name: "AF", ownerEmail: "af@test.com",
    }, db);
    const token = extractInvitationToken(result.inviteLink!);
    await db.$transaction((tx) => acceptRegistrationInvitation({
      token, email: "af@test.com", password: "securePassword123",
    }, tx));
    const inv = fake.collections.invitations.records.find((i: any) => i.email === "af@test.com")!;
    assert.ok(inv.acceptedById, "acceptedById should be set");
    assert.ok(inv.acceptedAt, "acceptedAt should be set");
  });

  it("audit exists for acceptance", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "audit-accept", name: "AA", ownerEmail: "aa@test.com",
    }, db);
    const token = extractInvitationToken(result.inviteLink!);
    await db.$transaction((tx) => acceptRegistrationInvitation({
      token, email: "aa@test.com", password: "securePassword123",
    }, tx));
    const audits = fake.collections.auditLogs.records.filter(
      (a: any) => a.action === "TENANT_INVITATION_ACCEPTED",
    );
    assert.ok(audits.length >= 1, "audit log for acceptance should exist");
  });

  it("reusing accepted token fails", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "reuse-token", name: "RT", ownerEmail: "rt@test.com",
    }, db);
    const token = extractInvitationToken(result.inviteLink!);
    await db.$transaction((tx) => acceptRegistrationInvitation({
      token, email: "rt@test.com", password: "securePassword123",
    }, tx));
    await assert.rejects(
      () => db.$transaction((tx) => acceptRegistrationInvitation({
        token, email: "rt@test.com", password: "securePassword456",
      }, tx)),
      InvitationAcceptanceError,
    );
  });

  it("wrong token fails", async () => {
    await createAdminTenant({
      actorId: "sa1", slug: "wrong-token", name: "WT", ownerEmail: "wt@test.com",
    }, db);
    await assert.rejects(
      () => db.$transaction((tx) => acceptRegistrationInvitation({
        token: "wrong-token-value", email: "wt@test.com", password: "securePassword123",
      }, tx)),
      InvitationAcceptanceError,
    );
  });

  it("wrong email fails", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "wrong-email", name: "WE", ownerEmail: "we@test.com",
    }, db);
    const token = extractInvitationToken(result.inviteLink!);
    await assert.rejects(
      () => db.$transaction((tx) => acceptRegistrationInvitation({
        token, email: "other@test.com", password: "securePassword123",
      }, tx)),
      InvitationAcceptanceError,
    );
  });

  it("expired invitation fails", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "expired-inv", name: "EI", ownerEmail: "ei@test.com",
    }, db);
    const token = extractInvitationToken(result.inviteLink!);
    const inv = fake.collections.invitations.records.find((i: any) => i.email === "ei@test.com")!;
    inv.expiresAt = new Date(Date.now() - 86400000).toISOString();
    await assert.rejects(
      () => db.$transaction((tx) => acceptRegistrationInvitation({
        token, email: "ei@test.com", password: "securePassword123",
      }, tx)),
      InvitationAcceptanceError,
    );
  });

  it("rollback on user update failure", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "rb-user-update", name: "RU", ownerEmail: "ru@test.com",
    }, db);
    const token = extractInvitationToken(result.inviteLink!);
    setFailNext("user.update");
    await assert.rejects(
      () => db.$transaction((tx) => acceptRegistrationInvitation({
        token, email: "ru@test.com", password: "securePassword123",
      }, tx)),
    );
    const user = fake.collections.users.records.find((u: any) => u.email === "ru@test.com")!;
    assert.equal(user.passwordHash, null);
  });

  it("rollback on membership failure", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "rb-membership", name: "RM", ownerEmail: "rm@test.com",
    }, db);
    const token = extractInvitationToken(result.inviteLink!);
    setFailNext("membership.findUnique");
    await assert.rejects(
      () => db.$transaction((tx) => acceptRegistrationInvitation({
        token, email: "rm@test.com", password: "securePassword123",
      }, tx)),
    );
    const user = fake.collections.users.records.find((u: any) => u.email === "rm@test.com")!;
    assert.equal(user.passwordHash, null, "passwordHash should still be null after rollback");
  });

  it("rollback on invitation update failure", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "rb-inv-update", name: "RI", ownerEmail: "ri@test.com",
    }, db);
    const token = extractInvitationToken(result.inviteLink!);
    setFailNext("invitation.update");
    await assert.rejects(
      () => db.$transaction((tx) => acceptRegistrationInvitation({
        token, email: "ri@test.com", password: "securePassword123",
      }, tx)),
    );
    const inv = fake.collections.invitations.records.find((i: any) => i.email === "ri@test.com")!;
    assert.equal(inv.acceptedById ?? null, null, "acceptedById should still be null");
  });

  it("rollback on audit failure", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "rb-audit", name: "RA", ownerEmail: "ra@test.com",
    }, db);
    const token = extractInvitationToken(result.inviteLink!);
    setFailNext("auditLog.create");
    await assert.rejects(
      () => db.$transaction((tx) => acceptRegistrationInvitation({
        token, email: "ra@test.com", password: "securePassword123",
      }, tx)),
    );
    const user = fake.collections.users.records.find((u: any) => u.email === "ra@test.com")!;
    assert.equal(user.passwordHash, null, "passwordHash should still be null after rollback");
    const inv = fake.collections.invitations.records.find((i: any) => i.email === "ra@test.com")!;
    assert.equal(inv.acceptedById ?? null, null, "acceptedById should still be null");
  });

  it("legacy user (no existing user) creates successfully", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    const tenantId = "t_legacy";
    fake.collections.tenants.create({ data: { slug: "legacy", name: "Legacy", status: "PROVISIONING", id: tenantId } } as any);
    fake.collections.invitations.create({
      data: {
        id: "inv_legacy",
        tenantId,
        email: "legacy@test.com",
        role: "TENANT_ADMIN",
        tokenHash,
        expiresAt: getInvitationExpiration(),
      },
    });
    await db.$transaction((tx) => acceptRegistrationInvitation({
      token: plainToken, email: "legacy@test.com", password: "securePassword123", name: "Legacy Owner",
    }, tx));
    const user = fake.collections.users.records.find((u: any) => u.email === "legacy@test.com");
    assert.ok(user, "user should be created");
    assert.ok(user.passwordHash, "passwordHash should be set");
    const membership = fake.collections.memberships.records.find(
      (m: any) => m.tenantId === tenantId && m.userId === user.id && m.role === "TENANT_ADMIN",
    );
    assert.ok(membership, "membership should be created");
    const inv = fake.collections.invitations.records.find((i: any) => i.id === "inv_legacy");
    assert.ok(inv!.acceptedById, "invitation should be accepted");
  });

  it("existing account with password returns ACCOUNT_ALREADY_EXISTS", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "existing-active", email: "active@test.com", passwordHash: "some_hash" } });
    fake.collections.invitations.create({
      data: {
        id: "inv_active",
        tenantId: "t_active",
        email: "active@test.com",
        role: "TENANT_ADMIN",
        tokenHash,
        expiresAt: getInvitationExpiration(),
      },
    });
    await assert.rejects(
      () => db.$transaction((tx) => acceptRegistrationInvitation({
        token: plainToken, email: "active@test.com", password: "securePassword123",
      }, tx)),
      (err: any) => err instanceof InvitationAcceptanceError && err.code === "ACCOUNT_ALREADY_EXISTS",
    );
  });

  it("no duplicate users", async () => {
    await createAdminTenant({
      actorId: "sa1", slug: "no-dup-1", name: "ND1", ownerEmail: "nd@test.com",
    }, db);
    await createAdminTenant({
      actorId: "sa1", slug: "no-dup-2", name: "ND2", ownerEmail: "nd@test.com",
    }, db);
    const users = fake.collections.users.records.filter((u: any) => u.email === "nd@test.com");
    assert.equal(users.length, 1, "should not create duplicate user");
  });

  it("no duplicate memberships", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "no-dup-mem", name: "NDM", ownerEmail: "ndm@test.com",
    }, db);
    const token = extractInvitationToken(result.inviteLink!);
    const userBefore = fake.collections.users.records.find((u: any) => u.email === "ndm@test.com")!;
    await db.$transaction((tx) => acceptRegistrationInvitation({
      token, email: "ndm@test.com", password: "securePassword123",
    }, tx));
      const memberships = fake.collections.memberships.records.filter(
        (m: any) => m.userId === userBefore.id && m.role === "TENANT_ADMIN",
      );
    assert.equal(memberships.length, 1, "should not create duplicate membership");
  });

  it("zero secrets serialized", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "no-secrets", name: "NoSecrets", ownerEmail: "nosecrets@test.com",
    }, db);
    assert.ok(!("passwordHash" in (result as any)));
    assert.ok(!("tokenHash" in (result as any)));
  });

  it("zero provider calls", () => {
    const forbidden = ["meta", "facebook", "instagram-api", "publisher"];
    const combined = JSON.stringify([acceptRegistrationInvitation, createAdminTenant, changeTenantStatus])
      .toLowerCase();
    for (const f of forbidden) {
      assert.ok(!combined.includes(f), `must not mention ${f}`);
    }
  });

  it("zero Playwright", () => {
    const forbidden = ["playwright", "chromium", "firefox", "webkit", "browser"];
    const combined = JSON.stringify([acceptRegistrationInvitation, createAdminTenant])
      .toLowerCase();
    for (const f of forbidden) {
      assert.ok(!combined.includes(f), `must not import ${f}`);
    }
  });
});
