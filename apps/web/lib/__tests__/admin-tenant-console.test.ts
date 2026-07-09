import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  TenantAdminError,
  listAdminTenants,
  getAdminTenant,
  createAdminTenant,
} from "../tenant-admin-service";

type StoredRecord = Record<string, unknown>;

function buildFakeDb() {
  const tenants: StoredRecord[] = [];
  const users: StoredRecord[] = [];
  const memberships: StoredRecord[] = [];
  const invitations: StoredRecord[] = [];
  const auditLogs: StoredRecord[] = [];

  function applyWhere(results: StoredRecord[], w: any): StoredRecord[] {
    let filtered = [...results];
    if (w.status) filtered = filtered.filter((r) => r.status === w.status);
    if (w.OR) {
      const firstCond = (w.OR as any[])[0] as any;
      const nameContains = firstCond?.name?.contains?.toLowerCase?.();
      const slugContains = ((w.OR as any[])[1] as any)?.slug?.contains?.toLowerCase?.();
      const search = (nameContains ?? slugContains ?? "").toLowerCase?.() ?? "";
      if (search) {
        filtered = filtered.filter((r) =>
          String(r.name ?? "").toLowerCase().includes(search) ||
          String(r.slug ?? "").toLowerCase().includes(search)
        );
      }
    }
    return filtered;
  }

  function applyInclude(results: StoredRecord[]): StoredRecord[] {
    return results.map((r) => {
      const m = memberships.find((m: StoredRecord) => m.tenantId === r.id && m.role === "TENANT_ADMIN");
      if (m) {
        const u = users.find((u: StoredRecord) => u.id === m.userId);
        return { ...r, memberships: u?.email ? [{ user: { email: u.email } }] : [] };
      }
      return { ...r, memberships: [] };
    });
  }

  function reset() {
    tenants.length = 0;
    users.length = 0;
    memberships.length = 0;
    invitations.length = 0;
    auditLogs.length = 0;
  }

  const db: any = {
    tenant: {
      records: tenants,
      findUnique(args?: any) {
        const where = args?.where ?? {};
        const key = Object.keys(where)[0] ?? "id";
        const r = this.records.find((r: StoredRecord) => r[key] === where[key]) ?? null;
        if (!r) return null;
        if (args?.include) return applyInclude([r])[0];
        return { ...r };
      },
      findUniqueOrThrow(args?: any) {
        const r = this.findUnique(args);
        if (!r) throw new Error("Not found");
        return r;
      },
      findMany(args?: any) {
        let results = [...this.records];
        if (args?.where) results = applyWhere(results, args.where);
        const totalFiltered = results.length;
        if (args?.skip !== undefined || args?.take !== undefined) {
          const skip = args?.skip ?? 0;
          const take = args?.take ?? results.length;
          results = results.slice(skip, skip + take);
        }
        if (args?.include) return applyInclude(results);
        return results;
      },
      count(args?: any) {
        if (args?.where) return applyWhere([...this.records], args.where).length;
        return this.records.length;
      },
      create(args?: any) {
        const r = { id: `t_${tenants.length + 1}`, plan: "PILOT", createdAt: new Date(), ...(args?.data ?? {}) };
        tenants.push(r);
        return r;
      },
    },
    user: {
      records: users,
      findUnique(args?: any) {
        const where = args?.where ?? {};
        const key = Object.keys(where)[0] ?? "email";
        const val = where[key];
        const r = this.records.find((r: StoredRecord) => r[key] === val);
        if (!r) return null;
        if (args?.select) {
          const sel: StoredRecord = {};
          for (const k of Object.keys(args.select)) {
            if (args.select[k]) sel[k] = r[k];
          }
          return sel;
        }
        return { ...r };
      },
      create(args?: any) {
        const r = { id: `u_${users.length + 1}`, name: null, passwordHash: null, ...(args?.data ?? {}) };
        users.push(r);
        return r;
      },
    },
    membership: {
      records: memberships,
      findUnique(args?: any) {
        const w = args?.where as any;
        if (w?.tenantId_userId) {
          return this.records.find((r: StoredRecord) => r.tenantId === w.tenantId_userId.tenantId && r.userId === w.tenantId_userId.userId) ?? null;
        }
        return this.records.find((r: StoredRecord) => r.id === w?.id) ?? null;
      },
      findFirst(args?: any) {
        const w = args?.where ?? {};
        const r = this.records.find((r: StoredRecord) => Object.keys(w).every((k) => r[k] === w[k]));
        if (!r) return null;
        if ((args?.select as any)?.user?.select?.email) {
          const u = users.find((u: StoredRecord) => u.id === r.userId);
          return { ...r, user: { email: u?.email ?? null } };
        }
        return { ...r };
      },
      findMany(args?: any) {
        let results = [...this.records];
        if (args?.where?.tenantId) results = results.filter((r) => r.tenantId === args.where.tenantId);
        if (args?.include) {
          return results.map((r) => {
            const u = users.find((u: StoredRecord) => u.id === r.userId);
            return { ...r, user: { email: u?.email ?? null, name: u?.name ?? null } };
          });
        }
        const skip = args?.skip ?? 0;
        const take = args?.take ?? results.length;
        return results.slice(skip, skip + take);
      },
      count(args?: any) {
        let results = [...this.records];
        if (args?.where?.tenantId) results = results.filter((r) => r.tenantId === args.where.tenantId);
        return results.length;
      },
      create(args?: any) {
        const r = { id: `m_${memberships.length + 1}`, createdAt: new Date(), ...(args?.data ?? {}) };
        memberships.push(r);
        return r;
      },
    },
    invitation: {
      records: invitations,
      create(args?: any) {
        const r = { id: `inv_${invitations.length + 1}`, acceptedById: null, expiresAt: new Date(Date.now() + 86400000), createdAt: new Date(), ...(args?.data ?? {}) };
        invitations.push(r);
        return r;
      },
    },
    auditLog: {
      create(args?: any) {
        auditLogs.push({ ...(args?.data ?? {}), createdAt: new Date() });
        return auditLogs[auditLogs.length - 1];
      },
    },
    $transaction<R>(fn: (tx: any) => Promise<R>): Promise<R> {
      return fn(db);
    },
  };

  return { db, reset };
}

describe("tenant console — list with search/filter", () => {
  const { db, reset } = buildFakeDb();

  beforeEach(() => {
    reset();
    db.user.create({ data: { id: "sa1", email: "sa@test.com", passwordHash: "hash", platformRole: "SUPER_ADMIN" } });
    db.tenant.create({ data: { id: "global", slug: "global", name: "Global", status: "ACTIVE", timezone: "UTC", locale: "es", createdAt: new Date() } });
    db.tenant.create({ data: { slug: "alpha-corp", name: "Alpha Corp", status: "ACTIVE", timezone: "America/New_York", locale: "en", createdAt: new Date("2024-01-01") } });
    db.tenant.create({ data: { slug: "beta-lab", name: "Beta Lab", status: "PROVISIONING", timezone: "UTC", locale: "es", createdAt: new Date("2024-06-01") } });
    db.user.create({ data: { id: "u1", email: "alpha@corp.com", passwordHash: "hash" } });
    db.user.create({ data: { id: "u2", email: "beta@lab.com", passwordHash: null } });
    db.membership.create({ data: { tenantId: "t_1", userId: "u1", role: "TENANT_ADMIN" } });
    db.membership.create({ data: { tenantId: "t_3", userId: "u2", role: "TENANT_ADMIN" } });
  });

  it("search finds tenants by name (case insensitive)", async () => {
    const result = await listAdminTenants("sa1", db, { page: 1, limit: 20 }, { search: "alpha" });
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].slug, "alpha-corp");
    assert.equal(result.total, 1);
  });

  it("search finds tenants by slug (case insensitive)", async () => {
    const result = await listAdminTenants("sa1", db, { page: 1, limit: 20 }, { search: "BETA" });
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].slug, "beta-lab");
    assert.equal(result.total, 1);
  });

  it("status filter returns only matching tenants", async () => {
    const result = await listAdminTenants("sa1", db, { page: 1, limit: 20 }, { status: "PROVISIONING" });
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].slug, "beta-lab");
    assert.equal(result.total, 1);
  });

  it("invalid status filter throws 400", async () => {
    await assert.rejects(
      () => listAdminTenants("sa1", db, { page: 1, limit: 20 }, { status: "INVALID" }),
      (e: unknown) => (e as TenantAdminError).code === "INVALID_STATUS" && (e as TenantAdminError).status === 400,
    );
  });

  it("combined search + status filters correctly", async () => {
    const result = await listAdminTenants("sa1", db, { page: 1, limit: 20 }, { search: "alpha", status: "ACTIVE" });
    assert.equal(result.items.length, 1);
    assert.equal(result.total, 1);
  });

  it("search with no results returns empty", async () => {
    const result = await listAdminTenants("sa1", db, { page: 1, limit: 20 }, { search: "nonexistent" });
    assert.equal(result.items.length, 0);
    assert.equal(result.total, 0);
  });
});

describe("tenant console — create with timezone/locale", () => {
  const { db, reset } = buildFakeDb();

  beforeEach(() => {
    reset();
    db.user.create({ data: { id: "sa1", email: "sa@test.com", passwordHash: "hash", platformRole: "SUPER_ADMIN" } });
    db.tenant.create({ data: { id: "global", slug: "global", name: "Global", status: "ACTIVE", timezone: "UTC", locale: "es", createdAt: new Date() } });
  });

  it("persists timezone and locale when provided", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "test-tenant", name: "Test", ownerEmail: "new@test.com", timezone: "Europe/Madrid", locale: "fr",
    }, db);
    assert.equal(result.timezone, "Europe/Madrid");
    assert.equal(result.locale, "fr");
  });

  it("defaults to UTC/es when not provided", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "test-2", name: "Test 2", ownerEmail: "new2@test.com",
    }, db);
    assert.equal(result.timezone, "UTC");
    assert.equal(result.locale, "es");
  });

  it("returns INVITATION_REQUIRED when user has no passwordHash", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "test-3", name: "Test 3", ownerEmail: "fresh@test.com",
    }, db);
    assert.equal(result.ownerAccountState, "INVITATION_REQUIRED");
    assert.ok(result.inviteLink);
  });

  it("returns EXISTING_ACCOUNT when user has passwordHash", async () => {
    db.user.create({ data: { id: "existing-user", email: "exists@test.com", passwordHash: "somehash" } });
    const result = await createAdminTenant({
      actorId: "sa1", slug: "test-4", name: "Test 4", ownerEmail: "exists@test.com",
    }, db);
    assert.equal(result.ownerAccountState, "EXISTING_ACCOUNT");
    assert.ok(result.inviteLink);
  });

  it("serializes without exposing passwordHash or tokenHash", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "test-5", name: "Test 5", ownerEmail: "safe@test.com",
    }, db);
    const json = JSON.stringify(result);
    assert.doesNotMatch(json, /passwordHash/);
    assert.doesNotMatch(json, /tokenHash/);
  });
});

describe("tenant console — getAdminTenant with owner email", () => {
  const { db, reset } = buildFakeDb();

  beforeEach(() => {
    reset();
    db.user.create({ data: { id: "sa1", email: "sa@test.com", passwordHash: "hash", platformRole: "SUPER_ADMIN" } });
    db.tenant.create({ data: { id: "global", slug: "global", name: "Global", status: "ACTIVE", timezone: "UTC", locale: "es", createdAt: new Date() } });
    db.tenant.create({ data: { id: "t1", slug: "test-tenant", name: "Test", status: "ACTIVE", timezone: "UTC", locale: "es", createdAt: new Date() } });
    db.user.create({ data: { id: "owner1", email: "owner@test.com", passwordHash: "hash" } });
    db.membership.create({ data: { tenantId: "t1", userId: "owner1", role: "TENANT_ADMIN" } });
  });

  it("returns real owner email from membership", async () => {
    const result = await getAdminTenant("sa1", "t1", db);
    assert.equal(result.ownerEmail, "owner@test.com");
  });

  it("does not expose sensitive fields", async () => {
    const result = await getAdminTenant("sa1", "t1", db);
    const json = JSON.stringify(result);
    assert.doesNotMatch(json, /passwordHash/);
    assert.doesNotMatch(json, /tokenHash/);
    assert.doesNotMatch(json, /"[Tt]oken":/);
  });
});

describe("tenant console — pagination", () => {
  it("listAdminTenants paginates correctly", async () => {
    const { db, reset } = buildFakeDb();
    reset();
    db.user.create({ data: { id: "sa1", email: "sa@test.com", passwordHash: "hash", platformRole: "SUPER_ADMIN" } });
    db.tenant.create({ data: { id: "global", slug: "global", name: "Global", status: "ACTIVE", timezone: "UTC", locale: "es", createdAt: new Date() } });
    for (let i = 1; i <= 25; i++) {
      db.tenant.create({ data: { slug: `t-${i}`, name: `Tenant ${i}`, status: "ACTIVE", timezone: "UTC", locale: "es", createdAt: new Date() } });
      db.user.create({ data: { id: `u${i}`, email: `u${i}@test.com`, passwordHash: "hash" } });
      db.membership.create({ data: { tenantId: `t_${i + 1}`, userId: `u${i}`, role: "TENANT_ADMIN" } });
    }
    const page1 = await listAdminTenants("sa1", db, { page: 1, limit: 10 });
    assert.equal(page1.items.length, 10);
    assert.equal(page1.page, 1);
    assert.equal(page1.totalPages, 3);
    const page3 = await listAdminTenants("sa1", db, { page: 3, limit: 10 });
    assert.equal(page3.items.length, 6);
    assert.equal(page3.totalPages, 3);
  });
});

describe("tenant console — SUPER_ADMIN guard via DB", () => {
  it("rejects non-SUPER_ADMIN actors", async () => {
    const { db, reset } = buildFakeDb();
    reset();
    db.user.create({ data: { id: "normal", email: "normal@test.com", passwordHash: "hash" } });
    db.tenant.create({ data: { id: "t1", slug: "t1", name: "T1", status: "ACTIVE", timezone: "UTC", locale: "es", createdAt: new Date() } });
    db.membership.create({ data: { tenantId: "t1", userId: "normal", role: "TENANT_ADMIN" } });
    await assert.rejects(
      () => listAdminTenants("normal", db),
      (e: unknown) => {
        const err = e as { code?: string; status?: number };
        return err.code === "FORBIDDEN" && err.status === 403;
      },
    );
  });

  it("allows SUPER_ADMIN actors", async () => {
    const { db, reset } = buildFakeDb();
    reset();
    db.user.create({ data: { id: "sa1", email: "sa@test.com", passwordHash: "hash", platformRole: "SUPER_ADMIN" } });
    db.tenant.create({ data: { id: "global", slug: "global", name: "Global", status: "ACTIVE", timezone: "UTC", locale: "es", createdAt: new Date() } });
    const result = await listAdminTenants("sa1", db);
    assert.ok(result.items !== undefined);
    assert.ok(result.total >= 0);
  });
});
