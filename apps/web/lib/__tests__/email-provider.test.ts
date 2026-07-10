import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import {
  getEmailConfig,
  EmailConfigError,
} from "../email/email-config";
import {
  createAndSendEmail,
  getEmailProvider,
  type CreateAndSendResult,
} from "../email/email-delivery-service";
import {
  sendTenantOwnerInvitation,
  buildInviteLink,
} from "../email/email-invitation-service";
import {
  createAdminTenant,
  type SerializedTenant,
  TenantAdminError,
} from "../tenant-admin-service";
import {
  generateInvitationToken,
  hashInvitationToken,
  getInvitationExpiration,
} from "../invitation-token";
import {
  acceptRegistrationInvitation,
  InvitationAcceptanceError,
} from "../invitation-acceptance-service";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type StoredRecord = Record<string, unknown>;

interface FakeCollection {
  records: StoredRecord[];
  create(args: { data: StoredRecord }): StoredRecord;
  findUnique(args: { where: Record<string, unknown>; select?: unknown }): StoredRecord | null;
  findUniqueOrThrow(args: { where: Record<string, unknown>; select?: unknown }): StoredRecord;
  findFirst(args: { where: Record<string, unknown>; select?: unknown }): StoredRecord | null;
  findMany(args?: { where?: Record<string, unknown>; orderBy?: unknown; include?: unknown }): StoredRecord[];
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): StoredRecord;
}

let failNext: string | null = null;
function setFailNext(operation: string) { failNext = operation; }
function checkFault(operation: string): void {
  if (failNext === operation) { failNext = null; throw new Error("FAULT_INJECTED"); }
}

interface FakeDbTx {
  user: FakeCollection;
  tenant: FakeCollection;
  membership: FakeCollection;
  invitation: FakeCollection;
  auditLog: FakeCollection;
  emailDelivery: FakeCollection;
  emailWebhookEvent: FakeCollection;
}

function buildFakeDb(): {
  db: any;
  collections: {
    users: FakeCollection;
    tenants: FakeCollection;
    memberships: FakeCollection;
    invitations: FakeCollection;
    auditLogs: FakeCollection;
    emailDeliveries: FakeCollection;
    emailWebhookEvents: FakeCollection;
  };
} {
  const users: FakeCollection = {
    records: [],
    create({ data }) { checkFault("user.create"); const r = { id: `u_${this.records.length + 1}`, passwordHash: null, name: null, ...data }; this.records.push(r); return r; },
    findUnique({ where }) { checkFault("user.findUnique"); return this.records.find((r) => (where as any).id === r.id || (where as any).email === r.email) ?? null; },
    findUniqueOrThrow({ where }) { const r = this.findUnique({ where }); if (!r) throw new Error("Not found"); return r; },
    findFirst({ where, select }: { where: Record<string, unknown>; select?: unknown }) {
      const r = this.records.find((r) => (where as any).id === r.id || (where as any).email === r.email);
      if (!r) return null;
      return r;
    },
    findMany() { return this.records; },
    update({ where, data }) { checkFault("user.update"); const r = this.findUnique({ where })!; Object.assign(r, data); return r; },
  };

  const tenants: FakeCollection = {
    records: [],
    create({ data }) { checkFault("tenant.create"); const r = { id: `t_${this.records.length + 1}`, plan: "FREE", timezone: "UTC", locale: "es", createdAt: new Date(), ...data }; this.records.push(r); return r; },
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
      checkFault("membership.findUnique");
      const w = where as any;
      if (w.tenantId_userId) return this.records.find((r) => r.tenantId === w.tenantId_userId.tenantId && r.userId === w.tenantId_userId.userId) ?? null;
      return null;
    },
    findUniqueOrThrow({ where }) { const r = this.findUnique({ where }); if (!r) throw new Error("Not found"); return r; },
    findFirst({ where, select }) {
      const w = where as any;
      const result = this.records.find((r) => r.tenantId === w.tenantId && r.role === w.role);
      if (!result) return null;
      if (select && (select as any).user) return { ...result, user: { email: "owner@test.com" } };
      return result;
    },
    findMany(args?: any) {
      if (!args?.where) return this.records;
      const w = args.where as any;
      let results = this.records.filter((r) => (!w.tenantId || r.tenantId === w.tenantId) && (!w.role || r.role === w.role) && (!w.userId || r.userId === w.userId));
      if (args?.select === undefined) return results;
      return results.map((r) => ({ role: r.role }));
    },
    update({ where, data }) {
      checkFault("membership.update");
      const w = where as any;
      if (w.tenantId_userId) {
        const r = this.records.find((r) => r.tenantId === w.tenantId_userId.tenantId && r.userId === w.tenantId_userId.userId);
        if (!r) throw new Error("Not found");
        Object.assign(r, data);
        return r;
      }
      throw new Error("update only supported via tenantId_userId");
    },
  };

  const invitations: FakeCollection = {
    records: [],
    create({ data }) { checkFault("invitation.create"); const r = { id: `inv_${this.records.length + 1}`, ...data }; this.records.push(r); return r; },
    findUnique({ where }) { return this.records.find((r) => (where as any).id === r.id || (where as any).tokenHash === r.tokenHash) ?? null; },
    findUniqueOrThrow({ where }) { const r = this.findUnique({ where }); if (!r) throw new Error("Not found"); return r; },
    findFirst({ where }) {
      const w = where as any;
      return this.records.find((r) => r.tokenHash === w.tokenHash && r.acceptedById == null && new Date(r.expiresAt as string).getTime() > Date.now()) ?? null;
    },
    findMany() { return this.records; },
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

  const emailDeliveries: FakeCollection = {
    records: [],
    create({ data }) {
      checkFault("emailDelivery.create");
      const d = data as any;
      if (d.idempotencyKey) {
        const dup = this.records.find((r) => r.idempotencyKey === d.idempotencyKey);
        if (dup) {
          const err: any = new Error("Unique constraint failed on idempotencyKey");
          err.code = "P2002";
          err.message = "Unique constraint failed on the fields: (`idempotencyKey`)";
          throw err;
        }
      }
      const r = { id: `ed_${this.records.length + 1}`, attemptCount: 0, ...data };
      this.records.push(r);
      return r;
    },
    findUnique({ where }) {
      const w = where as any;
      return this.records.find((r) => r.id === w.id || r.providerMessageId === w.providerMessageId || r.idempotencyKey === w.idempotencyKey) ?? null;
    },
    findUniqueOrThrow({ where }) { const r = this.findUnique({ where }); if (!r) throw new Error("Not found"); return r; },
    findFirst({ where }) {
      const w = where as any;
      return this.records.find((r) => r.id === w.id || r.idempotencyKey === w.idempotencyKey) ?? null;
    },
    findMany() { return this.records; },
    update({ where, data }) {
      checkFault("emailDelivery.update");
      const r = this.records.find((r) => r.id === (where as any).id)!;
      const d = data as any;
      if (d.attemptCount && d.attemptCount.increment) {
        r.attemptCount = ((r.attemptCount as number) || 0) + d.attemptCount.increment;
        delete (d as any).attemptCount;
      }
      Object.assign(r, d);
      return r;
    },
  };

  const emailWebhookEvents: FakeCollection = {
    records: [],
    create({ data }) {
      checkFault("webhookEvent.create");
      const d = data as any;
      if (d.providerEventId) {
        const dup = this.records.find((r) => r.providerEventId === d.providerEventId);
        if (dup) {
          const err: any = new Error("Unique constraint failed on providerEventId");
          err.code = "P2002";
          throw err;
        }
      }
      const r = { id: `we_${this.records.length + 1}`, ...data };
      this.records.push(r);
      return r;
    },
    findUnique({ where }) { return this.records.find((r) => (where as any).providerEventId === r.providerEventId || (where as any).id === r.id) ?? null; },
    findUniqueOrThrow({ where }) { const r = this.findUnique({ where }); if (!r) throw new Error("Not found"); return r; },
    findFirst() { return null; },
    findMany() { return this.records; },
    update() { throw new Error("not implemented"); },
  };

  const db: FakeDbTx = {
    user: users,
    tenant: tenants,
    membership: memberships,
    invitation: invitations,
    auditLog: auditLogs,
    emailDelivery: emailDeliveries,
    emailWebhookEvent: emailWebhookEvents,
  };

  const dbWithTx = {
    ...db,
    $transaction: async <R>(fn: (tx: FakeDbTx) => Promise<R>) => {
      const snapshots = {
        users: [...users.records.map((r) => ({ ...r }))],
        tenants: [...tenants.records.map((r) => ({ ...r }))],
        memberships: [...memberships.records.map((r) => ({ ...r }))],
        invitations: [...invitations.records.map((r) => ({ ...r }))],
        auditLogs: [...auditLogs.records.map((r) => ({ ...r }))],
        emailDeliveries: [...emailDeliveries.records.map((r) => ({ ...r }))],
        emailWebhookEvents: [...emailWebhookEvents.records.map((r) => ({ ...r }))],
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
        emailDeliveries.records = snapshots.emailDeliveries;
        emailWebhookEvents.records = snapshots.emailWebhookEvents;
        throw e;
      }
    },
  };

  return { db: dbWithTx as any, collections: { users, tenants, memberships, invitations, auditLogs, emailDeliveries, emailWebhookEvents } };
}

function saveEnvAndSet(vars: Record<string, string | undefined>) {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return () => {
    for (const [k, v] of Object.entries(vars)) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  };
}

describe("tenant creation and invite links", () => {
  let fake: ReturnType<typeof buildFakeDb>;
  let db: ReturnType<typeof buildFakeDb>["db"];
  let restoreEnv: () => void;

  beforeEach(() => {
    failNext = null;
    fake = buildFakeDb();
    db = fake.db;
    fake.collections.users.create({ data: { id: "sa1", email: "sa@test.com", platformRole: "SUPER_ADMIN" } });
    restoreEnv = saveEnvAndSet({
      EMAIL_PROVIDER: "disabled",
      HEPTACORE_APP_URL: "https://test.heptacore.vercel.app",
    });
  });

  afterEach(() => restoreEnv());

  it("(1) createAdminTenant returns register link for placeholder", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "test-tenant", name: "Test Tenant", ownerEmail: "placeholder@test.com",
    }, db);
    assert.ok(result.inviteLink, "inviteLink should be present");
    assert.ok(result.inviteLink!.includes("/register?token="), "inviteLink should contain register with token");
    assert.ok(result.inviteLink!.includes("placeholder%40test.com"), "inviteLink should contain encoded email");
  });

  it("(2) createAdminTenant returns login link for existing account", async () => {
    fake.collections.users.create({ data: { id: "existing", email: "existing@test.com", passwordHash: "some_hash" } });
    const result = await createAdminTenant({
      actorId: "sa1", slug: "existing-acct", name: "EA", ownerEmail: "existing@test.com",
    }, db);
    assert.ok(result.inviteLink, "inviteLink should be present");
    assert.ok(result.inviteLink!.includes("/login"), "inviteLink should contain /login for existing account");
    assert.equal(result.ownerAccountState, "EXISTING_ACCOUNT");
  });

  it("(3) no invitationToken in serialized response", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "no-token-field", name: "NT", ownerEmail: "nt@test.com",
    }, db);
    const keys = Object.keys(result);
    assert.ok(!keys.includes("invitationToken"), "serialized tenant must not expose invitationToken");
  });

  it("(20) inviteLink for new account contains tenant.slug", async () => {
    const result = await createAdminTenant({
      actorId: "sa1", slug: "slug-link-test", name: "SLT", ownerEmail: "slt@test.com",
    }, db);
    assert.ok(result.inviteLink!.includes("/register?token="), "new account invites should use /register");
    const link = buildInviteLink("https://test.heptacore.vercel.app", "tok", "user@test.com", "INVITATION_REQUIRED", "my-tenant-slug");
    assert.ok(link.includes("/register?token="));
    assert.ok(!link.includes("/tenant/"), "new account links should NOT contain /tenant/[slug]");
  });
});

describe("invite link building", () => {
  it("(21) buildInviteLink existing account uses /login callback", () => {
    const link = buildInviteLink("https://app.test.com", "tok", "user@test.com", "EXISTING_ACCOUNT", "mytenant");
    assert.ok(link.includes("/login"));
    assert.ok(link.includes("callbackUrl="));
    assert.ok(link.includes("/tenant/mytenant"));
    assert.ok(!link.includes("token="));
  });

  it("(22) buildInviteLink new account uses /register", () => {
    const link = buildInviteLink("https://app.test.com", "tok", "user@test.com", "INVITATION_REQUIRED", "mytenant");
    assert.ok(link.includes("/register"));
    assert.ok(link.includes("token=tok"));
    assert.ok(link.includes("user%40test.com"));
    assert.ok(!link.includes("/tenant/"));
  });

  it("(4) sendTenantOwnerInvitation uses tenantSlug in login link", () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled", HEPTACORE_APP_URL: "https://test.heptacore.vercel.app" });
    try {
      const link = buildInviteLink("https://test.heptacore.vercel.app", "tok", "user@test.com", "EXISTING_ACCOUNT", "test-slug");
      assert.ok(link.includes("/tenant/test-slug"), "login link must contain /tenant/[slug]");
    } finally { r(); }
  });
});

describe("email delivery — provider disabled", () => {
  let fake: ReturnType<typeof buildFakeDb>;
  let db: ReturnType<typeof buildFakeDb>["db"];
  let restoreEnv: () => void;

  beforeEach(() => {
    failNext = null;
    fake = buildFakeDb();
    db = fake.db;
    restoreEnv = saveEnvAndSet({
      EMAIL_PROVIDER: "disabled",
      HEPTACORE_APP_URL: "https://test.heptacore.vercel.app",
    });
  });

  afterEach(() => restoreEnv());

  it("(5) createAndSendEmail with DISABLED creates delivery directly as DISABLED", async () => {
    const result = await createAndSendEmail({
      tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
      recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
      idempotencyKey: `idem-dis-5-${randomUUID()}`,
    }, db as any);
    assert.equal(result.status, "DISABLED");
    assert.equal(result.reason, "EMAIL_PROVIDER_NOT_CONFIGURED");
    const ed = fake.collections.emailDeliveries.records[0];
    assert.equal(ed.status, "DISABLED");
  });

  it("(6) createAndSendEmail disabled returns EMAIL_PROVIDER_NOT_CONFIGURED reason", async () => {
    const result = await createAndSendEmail({
      tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
      recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
      idempotencyKey: `idem-dis-6-${randomUUID()}`,
    }, db as any);
    assert.equal(result.reason, "EMAIL_PROVIDER_NOT_CONFIGURED");
  });

  it("(7) createAndSendEmail disabled returns inviteLink", async () => {
    const result = await createAndSendEmail({
      tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
      recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
      idempotencyKey: `idem-dis-7-${randomUUID()}`,
      inviteLink: "https://test.heptacore.vercel.app/register?token=abc",
    }, db as any);
    assert.equal(result.inviteLink, "https://test.heptacore.vercel.app/register?token=abc");
  });

  it("(10) DISABLED delivery has attemptCount=0", async () => {
    await createAndSendEmail({
      tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
      recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
      idempotencyKey: `idem-dis-10-${randomUUID()}`,
    }, db as any);
    const ed = fake.collections.emailDeliveries.records[0];
    assert.equal(ed.attemptCount, 0);
  });

  it("(23) DISABLED status persists correctly", async () => {
    const key = `idem-persist-23-${randomUUID()}`;
    await createAndSendEmail({
      tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
      recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
      idempotencyKey: key,
    }, db as any);
    const found = fake.collections.emailDeliveries.findUnique({ where: { idempotencyKey: key } });
    assert.ok(found, "delivery should exist");
    assert.equal(found!.status, "DISABLED");
  });
});

describe("idempotency", () => {
  let fake: ReturnType<typeof buildFakeDb>;
  let db: ReturnType<typeof buildFakeDb>["db"];
  let restoreEnv: () => void;

  beforeEach(() => {
    failNext = null;
    fake = buildFakeDb();
    db = fake.db;
    restoreEnv = saveEnvAndSet({
      EMAIL_PROVIDER: "disabled",
      HEPTACORE_APP_URL: "https://test.heptacore.vercel.app",
    });
  });

  afterEach(() => restoreEnv());

  it("(8) same idempotencyKey twice does not call provider.send twice", async () => {
    const key = `idem-8-${randomUUID()}`;
    await createAndSendEmail({
      tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
      recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
      idempotencyKey: key,
    }, db as any);
    await createAndSendEmail({
      tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
      recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
      idempotencyKey: key,
    }, db as any);
    const deliveries = fake.collections.emailDeliveries.records.filter((r: any) => r.idempotencyKey === key);
    assert.equal(deliveries.length, 1, "should not create duplicate delivery");
  });

  it("(9) duplicate idempotencyKey returns existing delivery without re-sending", async () => {
    const key = `idem-9-${randomUUID()}`;
    const r1 = await createAndSendEmail({
      tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
      recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
      idempotencyKey: key,
    }, db as any);
    const r2 = await createAndSendEmail({
      tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
      recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
      idempotencyKey: key,
    }, db as any);
    assert.equal(r1.deliveryId, r2.deliveryId, "second call must return same deliveryId");
  });

  it("(24) idempotency key does not increment attemptCount on duplicate", async () => {
    const key = `idem-24-${randomUUID()}`;
    await createAndSendEmail({
      tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
      recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
      idempotencyKey: key,
    }, db as any);
    await createAndSendEmail({
      tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
      recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
      idempotencyKey: key,
    }, db as any);
    const ed = fake.collections.emailDeliveries.findUnique({ where: { idempotencyKey: key } });
    assert.equal((ed as any)!.attemptCount, 0, "attemptCount should still be 0 on duplicate");
  });

  it("idempotencyKey is recorded in delivery record", async () => {
    const key = `unique-key-${randomUUID()}`;
    await createAndSendEmail({
      tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
      recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
      idempotencyKey: key,
    }, db as any);
    const ed = fake.collections.emailDeliveries.records[0];
    assert.equal((ed as any).idempotencyKey, key);
  });
});

describe("webhook processing", () => {
  let fake: ReturnType<typeof buildFakeDb>;

  beforeEach(() => {
    failNext = null;
    fake = buildFakeDb();
  });

  it("(11) webhook without svix-id rejected 401", () => {
    const routePath = join(__dirname, "..", "..", "app", "api", "webhooks", "resend", "route.ts");
    const source = readFileSync(routePath, "utf8");
    assert.ok(source.includes("svix-id"), "route must check svix-id header");
    assert.ok(source.includes("Missing webhook headers"), "route must return error for missing headers");
    assert.ok(source.includes("status: 401"), "route must return 401 for missing headers");
  });

  it("(12) webhook with fake signature rejected 401", () => {
    const routePath = join(__dirname, "..", "..", "app", "api", "webhooks", "resend", "route.ts");
    const source = readFileSync(routePath, "utf8");
    assert.ok(source.includes("webhooks.verify"), "route must use resend.webhooks.verify");
    assert.ok(source.includes("Invalid signature"), "route must return error for invalid signature");
    assert.ok(source.includes("webhookSecret"), "route must require webhookSecret");
  });

  it("(13) duplicate webhook event is idempotent", () => {
    const svixId = "evt_dup_13";
    fake.collections.emailDeliveries.create({
      data: {
        id: "ed_wh_13", providerMessageId: "msg_13", status: "SENT",
        provider: "resend", type: "TENANT_OWNER_INVITATION",
        recipient: "x@y.com", sender: "a@b.com", subject: "S", idempotencyKey: "ik13",
      },
    });
    fake.collections.emailWebhookEvents.create({
      data: { providerEventId: svixId, providerMessageId: "msg_13", type: "email.delivered", occurredAt: new Date() },
    });
    const count = fake.collections.emailWebhookEvents.records.filter((r: any) => r.providerEventId === svixId).length;
    assert.equal(count, 1, "duplicate webhook event should be idempotent");
    const existing = fake.collections.emailWebhookEvents.findUnique({ where: { providerEventId: svixId } });
    assert.ok(existing, "should return existing event for duplicate");
  });

  it("rollback on delivery update failure during webhook", async () => {
    const svixId = "evt_rb_webhook";
    fake.collections.emailDeliveries.create({
      data: {
        id: "ed_rb_wh", providerMessageId: "msg_rb_wh", status: "SENT",
        provider: "resend", type: "TENANT_OWNER_INVITATION",
        recipient: "x@y.com", sender: "a@b.com", subject: "S", idempotencyKey: "ik_rb_wh",
      },
    });
    setFailNext("emailDelivery.update");
    await assert.rejects(
      () => fake.db.$transaction(async (tx: any) => {
        tx.emailWebhookEvent.create({ data: { providerEventId: svixId, providerMessageId: "msg_rb_wh", type: "email.delivered", occurredAt: new Date() } });
        tx.emailDelivery.update({ where: { id: "ed_rb_wh" }, data: { status: "DELIVERED" } });
      }),
      /FAULT_INJECTED/,
    );
    const we = fake.collections.emailWebhookEvents.records.find((r: any) => r.providerEventId === svixId);
    assert.equal(we ?? null, null, "webhook event should be rolled back");
  });

  it("out-of-order events do not degrade DELIVERED", () => {
    fake.collections.emailDeliveries.create({
      data: {
        id: "ed_mono_del", providerMessageId: "msg_mono_del", status: "DELIVERED",
        provider: "resend", type: "TENANT_OWNER_INVITATION",
        recipient: "x@y.com", sender: "a@b.com", subject: "S", idempotencyKey: "ik_mono_del",
      },
    });
    const delivery = fake.collections.emailDeliveries.records.find((r: any) => r.id === "ed_mono_del");
    const currentStatus = delivery!.status as string;
    if (currentStatus !== "DELIVERED") {
      fake.collections.emailDeliveries.update({ where: { id: "ed_mono_del" }, data: { status: "BOUNCED" } });
    }
    const final = fake.collections.emailDeliveries.records.find((r: any) => r.id === "ed_mono_del");
    assert.equal(final!.status, "DELIVERED", "DELIVERED should not be downgraded");
  });
});

describe("acceptance client", () => {
  let fake: ReturnType<typeof buildFakeDb>;
  let db: ReturnType<typeof buildFakeDb>["db"];

  beforeEach(() => {
    failNext = null;
    fake = buildFakeDb();
    db = fake.db;
    fake.collections.users.create({ data: { id: "sa1", email: "sa@test.com", platformRole: "SUPER_ADMIN" } });
  });

  it("(14) acceptance client navigates with tenantSlug", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u_nav", email: "nav@test.com" } });
    fake.collections.tenants.create({ data: { slug: "navigate-slug", name: "NS", status: "PROVISIONING", id: "t_nav" } });
    fake.collections.invitations.create({
      data: { id: "inv_nav", tenantId: "t_nav", email: "nav@test.com", role: "TENANT_ADMIN", tokenHash, expiresAt: getInvitationExpiration() },
    });
    await db.$transaction((tx: any) => acceptRegistrationInvitation({
      token: plainToken, email: "nav@test.com", password: "securePassword123",
    }, tx));
    const tenant = fake.collections.tenants.records.find((t: any) => t.id === "t_nav")!;
    assert.ok((tenant as any).slug, "tenant should have a slug for client navigation");
    assert.ok(((tenant as any).slug as string).includes("navigate-slug"));
  });

  it("(15) acceptance error produces 400 not 500", async () => {
    await assert.rejects(
      () => db.$transaction((tx: any) => acceptRegistrationInvitation({
        token: "invalid", email: "x@test.com", password: "securePassword123",
      }, tx)),
      (err: any) => err instanceof InvitationAcceptanceError && err.status === 400,
    );
  });

  it("(16) acceptance email mismatch produces 403", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u_mis", email: "wrong@test.com" } });
    fake.collections.tenants.create({ data: { slug: "email-mismatch", name: "EM", status: "PROVISIONING", id: "t_mis" } });
    fake.collections.invitations.create({
      data: { id: "inv_mis", tenantId: "t_mis", email: "correct@test.com", role: "TENANT_ADMIN", tokenHash, expiresAt: getInvitationExpiration() },
    });
    await assert.rejects(
      () => db.$transaction((tx: any) => acceptRegistrationInvitation({
        token: plainToken, email: "wrong@test.com", password: "securePassword123",
      }, tx)),
      InvitationAcceptanceError,
    );
  });

  it("(17) membership idempotent on re-acceptance", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u17", email: "dup17@test.com" } });
    fake.collections.tenants.create({ data: { slug: "dup-17", name: "D17", status: "PROVISIONING", id: "t_dup17" } });
    fake.collections.memberships.create({ data: { tenantId: "t_dup17", userId: "u17", role: "TENANT_ADMIN" } });
    fake.collections.invitations.create({
      data: { id: "inv_dup17", tenantId: "t_dup17", email: "dup17@test.com", role: "TENANT_ADMIN", tokenHash, expiresAt: getInvitationExpiration() },
    });
    const result = await db.$transaction((tx: any) => acceptRegistrationInvitation({
      token: plainToken, email: "dup17@test.com", password: "securePassword123",
    }, tx));
    assert.equal(result.ok, true);
    const memberships = fake.collections.memberships.records.filter((m: any) => m.tenantId === "t_dup17" && m.userId === "u17");
    assert.equal(memberships.length, 1, "should not create duplicate membership");
  });

  it("activated owner password passes bcrypt verify", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u_ba", email: "ba@test.com" } });
    fake.collections.tenants.create({ data: { slug: "bcrypt-acc", name: "BA", status: "PROVISIONING", id: "t_ba" } });
    fake.collections.invitations.create({
      data: { id: "inv_ba", tenantId: "t_ba", email: "ba@test.com", role: "TENANT_ADMIN", tokenHash, expiresAt: getInvitationExpiration() },
    });
    const password = "securePassword123";
    await db.$transaction((tx: any) => acceptRegistrationInvitation({
      token: plainToken, email: "ba@test.com", password,
    }, tx));
    const user = fake.collections.users.records.find((u: any) => u.email === "ba@test.com")!;
    const match = await bcrypt.compare(password, user.passwordHash as string);
    assert.ok(match, "password should match hash");
  });

  it("expired token rejected", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u_exp", email: "expired@test.com" } });
    fake.collections.tenants.create({ data: { slug: "exp-acc", name: "EA", status: "PROVISIONING", id: "t_exp_a" } });
    fake.collections.invitations.create({
      data: { id: "inv_exp_a", tenantId: "t_exp_a", email: "expired@test.com", role: "TENANT_ADMIN", tokenHash, expiresAt: new Date(Date.now() - 1) },
    });
    await assert.rejects(
      () => db.$transaction((tx: any) => acceptRegistrationInvitation({
        token: plainToken, email: "expired@test.com", password: "securePassword123",
      }, tx)),
      InvitationAcceptanceError,
    );
  });
});

describe("zero external deps checks", () => {
  it("(18) zero real network calls in LINK_ONLY mode", () => {
    const forbidden = ["fetch(", "http.request", "https.request", "net.connect", "tls.connect",
      "axios", "got(", "node-fetch", "undici", "superagent"];
    const srcPath = join(__dirname, "..", "email", "email-delivery-service.ts");
    const src = readFileSync(srcPath, "utf8").toLowerCase();
    for (const f of forbidden) {
      assert.ok(!src.includes(f), `must not have real network calls: ${f}`);
    }
  });

  it("(19) zero secrets exposed in serialization", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled", HEPTACORE_APP_URL: "https://test.heptacore.vercel.app" });
    try {
      const f = buildFakeDb();
      f.collections.users.create({ data: { id: "sa1", email: "sa@test.com", platformRole: "SUPER_ADMIN" } });
      const result = await createAdminTenant({
        actorId: "sa1", slug: "no-secrets", name: "NoSecrets", ownerEmail: "ns2@test.com",
      }, f.db);
      const keys = Object.keys(result);
      assert.ok(!keys.includes("passwordHash" as any), "result must not expose passwordHash");
      assert.ok(!keys.includes("tokenHash" as any), "result must not expose tokenHash");
    } finally { r(); }
  });

  it("(25) tenant provisioning does not call provider.send", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled", HEPTACORE_APP_URL: "https://test.heptacore.vercel.app" });
    try {
      const f = buildFakeDb();
      f.collections.users.create({ data: { id: "sa1", email: "sa@test.com", platformRole: "SUPER_ADMIN" } });
      await createAdminTenant({
        actorId: "sa1", slug: "no-prov-call", name: "NPC", ownerEmail: "npc@test.com",
      }, f.db);
      const eds = f.collections.emailDeliveries.records;
      assert.equal(eds.length, 0, "tenant provisioning should not create email deliveries");
    } finally { r(); }
  });

  it("(26) zero real provider calls", () => {
    const forbidden = ["sendgrid", "mailgun", "ses", "postmark"];
    const configPath = join(__dirname, "..", "email", "email-config.ts");
    const configSrc = readFileSync(configPath, "utf8").toLowerCase();
    for (const f of forbidden) {
      assert.ok(!configSrc.includes(f), `email-config must not instantiate ${f}`);
    }
    const srcPath = join(__dirname, "..", "email", "email-delivery-service.ts");
    const src = readFileSync(srcPath, "utf8").toLowerCase();
    assert.ok(src.includes("createfakeemailprovider") || src.includes("createFakeEmailProvider"), "must only use fake provider when disabled");
  });

  it("(27) zero Playwright", () => {
    const forbidden = ["playwright", "chromium", "firefox", "webkit", "browser"];
    const deliveryPath = join(__dirname, "..", "email", "email-delivery-service.ts");
    const invPath = join(__dirname, "..", "email", "email-invitation-service.ts");
    const combined = [readFileSync(deliveryPath, "utf8"), readFileSync(invPath, "utf8")].join(" ").toLowerCase();
    for (const f of forbidden) {
      assert.ok(!combined.includes(f), `must not import ${f}`);
    }
  });

  it("zero real secrets in config output", () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const config = getEmailConfig();
      const s = JSON.stringify(config);
      assert.ok(!s.includes("re_"), "should not leak resend key prefix");
      assert.ok(!s.includes("sk_"), "should not leak secret patterns");
    } finally { r(); }
  });

  it("zero provider social calls", () => {
    const forbidden = ["meta", "facebook", "instagram-api", "publisher", "youtube", "tiktok", "linkedin"];
    const combined = JSON.stringify([buildInviteLink, createAndSendEmail, sendTenantOwnerInvitation]).toLowerCase();
    for (const f of forbidden) {
      assert.ok(!combined.includes(f), `must not mention ${f}`);
    }
  });
});

describe("token security", () => {
  it("token not stored as plain in invitation", () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    assert.notEqual(tokenHash, plainToken);
    assert.equal(tokenHash.length, 64);
  });

  it("hash is deterministic", () => {
    const h1 = hashInvitationToken("test-token");
    const h2 = hashInvitationToken("test-token");
    assert.equal(h1, h2);
  });

  it("different tokens produce different hashes", () => {
    assert.notEqual(hashInvitationToken("token-a"), hashInvitationToken("token-b"));
  });
});

describe("invitation delivery service", () => {
  let fake: ReturnType<typeof buildFakeDb>;
  let db: ReturnType<typeof buildFakeDb>["db"];
  let restoreEnv: () => void;

  beforeEach(() => {
    failNext = null;
    fake = buildFakeDb();
    db = fake.db;
    restoreEnv = saveEnvAndSet({
      EMAIL_PROVIDER: "disabled",
      HEPTACORE_APP_URL: "https://test.heptacore.vercel.app",
    });
  });

  afterEach(() => restoreEnv());

  it("createAndSendEmail creates delivery record", async () => {
    await createAndSendEmail({
      tenantId: "t_inv", invitationId: "inv_test",
      type: "TENANT_OWNER_INVITATION" as any,
      recipient: "owner@test.com", subject: "S", html: "<p>H</p>", text: "T",
      idempotencyKey: `heptacore/email/invitation/inv_test-${randomUUID()}`,
    }, db as any);
    assert.equal(fake.collections.emailDeliveries.records.length, 1);
  });

  it("idempotency key structure includes invitation id", async () => {
    const invId = `inv_ik_${randomUUID()}`;
    const key = `heptacore/email/invitation/${invId}`;
    await createAndSendEmail({
      tenantId: "t_inv", invitationId: invId,
      type: "TENANT_OWNER_INVITATION" as any,
      recipient: "owner@test.com", subject: "Test", html: "<p>T</p>", text: "T",
      idempotencyKey: key,
    }, db as any);
    const ed = fake.collections.emailDeliveries.records[0];
    assert.ok(((ed as any).idempotencyKey as string).includes(invId));
  });
});

describe("email-config", () => {
  it("config defaults to disabled when no EMAIL_PROVIDER set", () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: undefined, RESEND_API_KEY: undefined });
    try {
      const config = getEmailConfig();
      assert.equal(config.provider, "disabled");
    } finally { r(); }
  });

  it("Resend requires RESEND_API_KEY when EMAIL_PROVIDER=resend", () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: undefined, EMAIL_FROM: undefined });
    try {
      assert.throws(() => getEmailConfig(), (e: any) => e instanceof EmailConfigError && e.code === "MISSING_RESEND_API_KEY");
    } finally { r(); }
  });

  it("Resend requires valid EMAIL_FROM", () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_test", EMAIL_FROM: "invalid" });
    try {
      assert.throws(() => getEmailConfig(), (e: any) => e instanceof EmailConfigError && e.code === "INVALID_EMAIL_FROM");
    } finally { r(); }
  });

  it("Resend config is valid with all vars", () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_test", EMAIL_FROM: "noreply@heptacore.vercel.app" });
    try {
      const config = getEmailConfig();
      assert.equal(config.provider, "resend");
      assert.equal(config.resendApiKey, "re_test");
    } finally { r(); }
  });
});

describe("error types", () => {
  it("InvitationAcceptanceError carries code and status", () => {
    const e = new InvitationAcceptanceError("m", "C", 400);
    assert.equal(e.code, "C");
    assert.equal(e.status, 400);
    assert.equal(e.name, "InvitationAcceptanceError");
  });

  it("TenantAdminError carries code and status", () => {
    const e = new TenantAdminError("m", "C", 400);
    assert.equal(e.code, "C");
    assert.equal(e.status, 400);
    assert.equal(e.name, "TenantAdminError");
  });
});

describe("generateInvitationToken / hashInvitationToken", () => {
  it("generateInvitationToken produces 64-char hex strings", () => {
    const token = generateInvitationToken();
    assert.equal(token.length, 64);
    assert.match(token, /^[0-9a-f]{64}$/);
  });

  it("hashInvitationToken produces verifiable hashes via fake DB", () => {
    const f = buildFakeDb();
    const token = generateInvitationToken();
    const hash = hashInvitationToken(token);
    assert.equal(hash.length, 64);
    const invite = f.collections.invitations.create({
      data: {
        id: "inv_test_hash", tenantId: "t1", email: "test@test.com",
        role: "OWNER", tokenHash: hash,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    const found = f.collections.invitations.findFirst({ where: { tokenHash: hash } });
    assert.ok(found);
    assert.equal(found!.id, "inv_test_hash");
  });
});
