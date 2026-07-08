import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const seedAdmin = await import("../../../../scripts/seed-admin.mjs");
const { requireAdminBootstrapEnv, assertSuperAdminRole, upsertSuperAdmin } = seedAdmin as {
  requireAdminBootstrapEnv: (env: Record<string, string | undefined>) => {
    email: string;
    password: string;
    role: string;
    tenantSlug: string;
    name: string | null;
  };
  assertSuperAdminRole: (role: string) => void;
  upsertSuperAdmin: (args: {
    prisma: any;
    hashPassword: (plain: string) => Promise<string>;
    email: string;
    name: string | null;
    password: string;
    role: string;
    tenantSlug: string;
  }) => Promise<{
    userId: string;
    tenantId: string;
    userCreated: boolean;
    membershipAction: string;
    role: string;
    tenantSlug: string;
  }>;
};
const { resolveAppAccess } = await import("../access-routing.js");

const SEED_ADMIN_SOURCE = readFileSync(new URL("../../../../scripts/seed-admin.mjs", import.meta.url), "utf8");

type FakeState = {
  tenants: Array<{ id: string; slug: string; name: string }>;
  users: Array<Record<string, any>>;
  memberships: Array<Record<string, any>>;
};

function makeFakePrisma(initialTenants: Array<{ id?: string; slug: string; name?: string }>) {
  const state: FakeState = {
    tenants: initialTenants.map((t, i) => ({ id: t.id ?? `tenant-${i + 1}`, slug: t.slug, name: t.name ?? t.slug })),
    users: [],
    memberships: [],
  };
  let userSeq = 0;
  let memSeq = 0;
  const prisma = {
    tenant: {
      findFirst: async ({ where }: any) => state.tenants.find((t) => t.slug === where.slug) ?? null,
    },
    user: {
      findUnique: async ({ where }: any) => state.users.find((u) => u.email === where.email) ?? null,
      create: async ({ data }: any) => {
        const u = { id: `user-${++userSeq}`, ...data };
        state.users.push(u);
        return u;
      },
      update: async ({ where, data }: any) => {
        const u = state.users.find((x) => x.id === where.id);
        Object.assign(u as Record<string, any>, data);
        return u;
      },
    },
    membership: {
      findFirst: async ({ where }: any) =>
        state.memberships.find((m) => m.tenantId === where.tenantId && m.userId === where.userId) ?? null,
      create: async ({ data }: any) => {
        const m = { id: `mem-${++memSeq}`, ...data };
        state.memberships.push(m);
        return m;
      },
      update: async ({ where, data }: any) => {
        const m = state.memberships.find((x) => x.id === where.id);
        Object.assign(m as Record<string, any>, data);
        return m;
      },
    },
  };
  return { prisma, state };
}

const hashPassword = async (plain: string) => `hash(${plain})`;

describe("admin bootstrap: env + role guards", () => {
  it("aborts when any required variable is missing", () => {
    assert.throws(
      () => requireAdminBootstrapEnv({}),
      (err: any) => {
        assert.equal(err.code, "MISSING_ADMIN_ENV");
        assert.deepEqual(err.missing, [
          "HEPTACORE_ADMIN_EMAIL",
          "HEPTACORE_ADMIN_PASSWORD",
          "HEPTACORE_ADMIN_ROLE",
          "HEPTACORE_TENANT_SLUG",
        ]);
        return true;
      },
    );
  });

  it("does not leak the password value in the missing-env error", () => {
    assert.throws(
      () =>
        requireAdminBootstrapEnv({
          HEPTACORE_ADMIN_PASSWORD: "s3cr3t-value",
          HEPTACORE_ADMIN_ROLE: "SUPER_ADMIN",
          HEPTACORE_TENANT_SLUG: "turpial-sound",
        }),
      (err: any) => {
        assert.equal(err.code, "MISSING_ADMIN_ENV");
        assert.deepEqual(err.missing, ["HEPTACORE_ADMIN_EMAIL"]);
        assert.doesNotMatch(err.message, /s3cr3t-value/);
        return true;
      },
    );
  });

  it("returns trimmed config when all variables are present", () => {
    const cfg = requireAdminBootstrapEnv({
      HEPTACORE_ADMIN_EMAIL: " admin@example.test ",
      HEPTACORE_ADMIN_PASSWORD: "pw",
      HEPTACORE_ADMIN_ROLE: " SUPER_ADMIN ",
      HEPTACORE_TENANT_SLUG: " turpial-sound ",
    });
    assert.equal(cfg.email, "admin@example.test");
    assert.equal(cfg.role, "SUPER_ADMIN");
    assert.equal(cfg.tenantSlug, "turpial-sound");
  });

  it("rejects a role other than SUPER_ADMIN", () => {
    assert.throws(() => assertSuperAdminRole("ADMIN"), (err: any) => err.code === "INVALID_ADMIN_ROLE");
    assert.throws(() => assertSuperAdminRole("OWNER"), (err: any) => err.code === "INVALID_ADMIN_ROLE");
    assert.doesNotThrow(() => assertSuperAdminRole("SUPER_ADMIN"));
  });

  it("contains no hardcoded default credentials", () => {
    assert.doesNotMatch(SEED_ADMIN_SOURCE, /jean@heptacore\.dev/);
    assert.doesNotMatch(SEED_ADMIN_SOURCE, /admin123/);
    assert.doesNotMatch(SEED_ADMIN_SOURCE, /HEPTACORE_ADMIN_EMAIL\s*\|\|/);
    assert.doesNotMatch(SEED_ADMIN_SOURCE, /HEPTACORE_ADMIN_PASSWORD\s*\|\|/);
  });
});

describe("admin bootstrap: idempotent super admin upsert", () => {
  it("creates the user and SUPER_ADMIN membership when none exist", async () => {
    const { prisma, state } = makeFakePrisma([{ slug: "turpial-sound" }]);
    const result = await upsertSuperAdmin({
      prisma,
      hashPassword,
      email: "admin@example.test",
      name: null,
      password: "pw",
      role: "SUPER_ADMIN",
      tenantSlug: "turpial-sound",
    });
    assert.equal(result.userCreated, true);
    assert.equal(result.membershipAction, "created");
    assert.equal(result.role, "SUPER_ADMIN");
    assert.equal(state.users.length, 1);
    assert.equal(state.memberships.length, 1);
    assert.equal(state.memberships[0].role, "SUPER_ADMIN");
  });

  it("promotes an existing non-super membership to SUPER_ADMIN", async () => {
    const { prisma, state } = makeFakePrisma([{ id: "t1", slug: "turpial-sound" }]);
    state.users.push({ id: "user-1", email: "admin@example.test", name: "Existing", passwordHash: "old" });
    state.memberships.push({ id: "mem-1", tenantId: "t1", userId: "user-1", role: "VIEWER" });
    const result = await upsertSuperAdmin({
      prisma,
      hashPassword,
      email: "admin@example.test",
      name: null,
      password: "pw",
      role: "SUPER_ADMIN",
      tenantSlug: "turpial-sound",
    });
    assert.equal(result.userCreated, false);
    assert.equal(result.membershipAction, "updated");
    assert.equal(state.memberships[0].role, "SUPER_ADMIN");
    assert.equal(state.users[0].name, "Existing", "unrelated user data preserved");
    assert.equal(state.users.length, 1);
    assert.equal(state.memberships.length, 1);
  });

  it("is idempotent (no duplicate users or memberships)", async () => {
    const { prisma, state } = makeFakePrisma([{ slug: "turpial-sound" }]);
    const args = {
      prisma,
      hashPassword,
      email: "admin@example.test",
      name: null,
      password: "pw",
      role: "SUPER_ADMIN",
      tenantSlug: "turpial-sound",
    };
    await upsertSuperAdmin(args);
    const second = await upsertSuperAdmin(args);
    assert.equal(second.userCreated, false);
    assert.equal(second.membershipAction, "unchanged");
    assert.equal(state.users.length, 1);
    assert.equal(state.memberships.length, 1);
  });

  it("aborts with an actionable error when the tenant does not exist", async () => {
    const { prisma } = makeFakePrisma([{ slug: "other-tenant" }]);
    await assert.rejects(
      () =>
        upsertSuperAdmin({
          prisma,
          hashPassword,
          email: "admin@example.test",
          name: null,
          password: "pw",
          role: "SUPER_ADMIN",
          tenantSlug: "missing-tenant",
        }),
      (err: any) => {
        assert.equal(err.code, "TENANT_NOT_FOUND");
        assert.match(err.message, /HEPTACORE_TENANT_SLUG/);
        return true;
      },
    );
  });
});

describe("admin bootstrap: access routing outcome (semantics unchanged)", () => {
  it("routes a SUPER_ADMIN to /admin", () => {
    const resolved = resolveAppAccess([
      { tenantId: "t1", role: "SUPER_ADMIN", tenant: { slug: "turpial-sound", name: "Turpial" } },
    ]);
    assert.deepEqual(resolved, { kind: "admin", href: "/admin" });
  });

  it("keeps a normal single-tenant user isolated in their tenant", () => {
    const resolved = resolveAppAccess([
      { tenantId: "t2", role: "OWNER", tenant: { slug: "turpial-sound", name: "Turpial" } },
    ]);
    assert.equal(resolved.kind, "tenant");
    if (resolved.kind === "tenant") assert.equal(resolved.href, "/tenant/turpial-sound");
  });
});
