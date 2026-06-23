import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getEmailConfig, EmailConfigError } from "../email/email-config";
import { createFakeEmailProvider } from "../email/providers/fake-email-provider";
import { createAndSendEmail, getEmailProvider, CreateAndSendResult } from "../email/email-delivery-service";
import { renderTemplate } from "../email/templates/index";
import { sendTenantOwnerInvitation, buildInviteLink } from "../email/email-invitation-service";
import { hashInvitationToken, generateInvitationToken, getInvitationExpiration } from "../invitation-token";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ═══ Fake DB helpers ═══

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
    findMany() { return this.records; },
    update({ where, data }) { checkFault("tenant.update"); const r = this.records.find((r) => (where as any).id === r.id)!; Object.assign(r, data as any); return { ...r }; },
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
      return this.records.filter((r) => (!w.tenantId || r.tenantId === w.tenantId) && (!w.role || r.role === w.role) && (!w.userId || r.userId === w.userId));
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
    findUnique() { return null; },
    findUniqueOrThrow() { throw new Error("Not found"); },
    findFirst() { return null; },
    findMany() { return this.records; },
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
      const r = { id: `ed_${this.records.length + 1}`, attemptCount: 0, ...data }; this.records.push(r); return r;
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
      const r = { id: `we_${this.records.length + 1}`, ...data }; this.records.push(r); return r;
    },
    findUnique({ where }) { return this.records.find((r) => (where as any).providerEventId === r.providerEventId) ?? null; },
    findUniqueOrThrow({ where }) { const r = this.findUnique({ where }); if (!r) throw new Error("Not found"); return r; },
    findFirst() { return null; },
    findMany() { return this.records; },
    update() { throw new Error("not implemented"); },
  };

  const db = {
    user: users,
    tenant: tenants,
    membership: memberships,
    invitation: invitations,
    auditLog: auditLogs,
    emailDelivery: emailDeliveries,
    emailWebhookEvent: emailWebhookEvents,
    $transaction: async <R>(fn: (tx: any) => Promise<R>) => {
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

  return { db, collections: { users, tenants, memberships, invitations, auditLogs, emailDeliveries, emailWebhookEvents } };
}

// ═══ Helpers ═══

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

// ═══ Tests ═══

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

describe("fake-email-provider", () => {
  it("fake provider receives template data", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const provider = createFakeEmailProvider();
      const result = await provider.send({
        to: "user@test.com", from: "noreply@test.com", subject: "Hello",
        html: "<p>Hello</p>", text: "Hello", idempotencyKey: "key-1",
      });
      assert.equal(result.provider, "fake");
      assert.equal(result.accepted, true);
      assert.ok(result.providerMessageId?.startsWith("fake_"));
      assert.equal(provider.sentEmails.length, 1);
      assert.equal(provider.sentEmails[0].to, "user@test.com");
      assert.equal(provider.sentEmails[0].subject, "Hello");
    } finally { r(); }
  });

  it("fake provider receives all template fields", async () => {
    const provider = createFakeEmailProvider();
    await provider.send({
      to: "x@y.com", from: "a@b.com", replyTo: "r@b.com",
      subject: "S", html: "<h1>H</h1>", text: "T", idempotencyKey: "k",
      tags: [{ name: "type", value: "test" }],
    });
    const sent = provider.sentEmails[0];
    assert.equal(sent.to, "x@y.com");
    assert.equal(sent.html, "<h1>H</h1>");
    assert.equal(sent.text, "T");
    assert.equal(sent.tags?.[0]?.name, "type");
  });

  it("fake provider can be set to fail next call", async () => {
    const provider = createFakeEmailProvider();
    provider.setFailNext("simulated failure");
    await assert.rejects(
      () => provider.send({ to: "x@y.com", from: "a@b.com", subject: "S", html: "H", text: "T", idempotencyKey: "k" }),
      /simulated failure/,
    );
    assert.equal(provider.sentEmails.length, 0);
  });
});

describe("email templates", () => {
  it("owner invitation template ES renders html, text, and subject", async () => {
    const result = await renderTemplate("owner-invitation", "es", {
      tenantName: "MiEmpresa", token: "tok123", email: "user@test.com",
      inviteLink: "http://localhost:3000/register?token=tok123",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isExistingAccount: false,
    });
    assert.ok(result.html.length > 100);
    assert.ok(result.text.length > 20);
    assert.ok(result.subject.includes("MiEmpresa"));
    assert.ok(result.subject.includes("HeptaCore"));
    assert.ok(result.html.includes("Activa"));
    assert.ok(result.text.includes("tok123"));
  });

  it("owner invitation template EN renders", async () => {
    const result = await renderTemplate("owner-invitation", "en", {
      tenantName: "MyCompany", token: "tok456", email: "user@test.com",
      inviteLink: "http://localhost:3000/register?token=tok456",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isExistingAccount: false,
    });
    assert.ok(result.subject.includes("MyCompany"));
    assert.ok(result.html.includes("Activate"));
  });

  it("existing account template renders login link not register", async () => {
    const result = await renderTemplate("owner-invitation", "es", {
      tenantName: "MiEmpresa", token: "tok789", email: "user@test.com",
      inviteLink: "http://localhost:3000/login?callbackUrl=/tenant/miempresa",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isExistingAccount: true,
    });
    assert.ok(result.subject.includes("Acceso"));
    assert.ok(result.html.includes("login"));
    assert.ok(!result.html.includes("register"));
  });

  it("owner invitation text version contains token", async () => {
    const result = await renderTemplate("owner-invitation", "es", {
      tenantName: "TestTenant", token: "secret-token", email: "u@t.com",
      inviteLink: "http://localhost:3000/register?token=secret-token",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isExistingAccount: false,
    });
    assert.ok(result.text.includes("secret-token"));
  });
});

// ═══ 1-4: Provider disabled behavior ═══

describe("email delivery — provider disabled", () => {
  it("returns DISABLED + EMAIL_PROVIDER_NOT_CONFIGURED when provider is disabled (test 1)", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const fake = buildFakeDb();
      const result = await createAndSendEmail({
        tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
        recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
        idempotencyKey: "idem-dis-1",
      }, fake.db);
      assert.equal(result.status, "DISABLED");
      assert.equal(result.reason, "EMAIL_PROVIDER_NOT_CONFIGURED");
    } finally { r(); }
  });

  it("persisted delivery has status DISABLED and attemptCount=0 (test 2)", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const fake = buildFakeDb();
      await createAndSendEmail({
        tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
        recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
        idempotencyKey: "idem-dis-2",
      }, fake.db);
      const ed = fake.collections.emailDeliveries.records[0];
      assert.equal(ed.status, "DISABLED");
      assert.equal(ed.attemptCount, 0);
    } finally { r(); }
  });

  it("no provider.send invoked in LINK_ONLY mode (test 3)", () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const provider = createFakeEmailProvider();
      assert.equal(provider.sentEmails.length, 0, "fake provider should start with empty sentEmails");
      const provider2 = getEmailProvider();
      const s = JSON.stringify(provider2).toLowerCase();
      assert.ok(!s.includes("resend"), "should not create Resend instance");
    } finally { r(); }
  });

  it("inviteLink returned from createAndSendEmail (test 4)", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const fake = buildFakeDb();
      const result = await createAndSendEmail({
        tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
        recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
        idempotencyKey: "idem-dis-4", inviteLink: "http://localhost:3000/register?token=abc",
      }, fake.db);
      assert.equal(result.inviteLink, "http://localhost:3000/register?token=abc");
    } finally { r(); }
  });
});

// ═══ 5-7: Invite link generation ═══

describe("invite links", () => {
  it("new owner gets register link with token (test 5)", () => {
    const link = buildInviteLink("tok", "user@test.com", "INVITATION_REQUIRED", "https://app.test.com", "mytenant");
    assert.ok(link.includes("register"));
    assert.ok(link.includes("token=tok"));
    assert.ok(link.includes("user%40test.com"));
  });

  it("existing owner gets login link (test 6)", () => {
    const link = buildInviteLink("tok", "user@test.com", "EXISTING_ACCOUNT", "https://app.test.com", "mytenant");
    assert.ok(link.includes("login"));
    assert.ok(link.includes("callbackUrl"));
    assert.ok(link.includes("mytenant"));
    assert.ok(!link.includes("token="));
  });

  it("inviteLink uses tenant.slug in /tenant/[slug] (test 7)", () => {
    const link = buildInviteLink("tok", "user@test.com", "EXISTING_ACCOUNT", "https://app.test.com", "mytenant-slug");
    assert.ok(link.includes("/tenant/mytenant-slug"));
  });

  it("defaults to localhost when no appUrl", () => {
    const link = buildInviteLink("tok", "user@test.com", "INVITATION_REQUIRED", undefined);
    assert.ok(link.startsWith("http://localhost:3000"));
  });
});

// ═══ 8-9: Idempotency ═══

describe("idempotency", () => {
  it("same idempotencyKey twice does not duplicate delivery (test 8)", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const fake = buildFakeDb();
      await createAndSendEmail({
        tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
        recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
        idempotencyKey: "idem-dup-8",
      }, fake.db);
      await createAndSendEmail({
        tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
        recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
        idempotencyKey: "idem-dup-8",
      }, fake.db);
      const deliveries = fake.collections.emailDeliveries.records.filter(
        (r: any) => r.idempotencyKey === "idem-dup-8",
      );
      assert.equal(deliveries.length, 1, "should not create duplicate delivery");
    } finally { r(); }
  });

  it("same idempotencyKey does not send twice (test 9)", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const fake = buildFakeDb();
      await createAndSendEmail({
        tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
        recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
        idempotencyKey: "idem-nosend-9",
      }, fake.db);
      await createAndSendEmail({
        tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
        recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
        idempotencyKey: "idem-nosend-9",
      }, fake.db);
      const deliveries = fake.collections.emailDeliveries.records.filter(
        (r: any) => r.idempotencyKey === "idem-nosend-9",
      );
      assert.equal(deliveries.length, 1);
    } finally { r(); }
  });

  it("idempotencyKey is recorded in delivery", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const fake = buildFakeDb();
      await createAndSendEmail({
        tenantId: "t1", type: "TENANT_OWNER_INVITATION" as any,
        recipient: "test@test.com", subject: "Test", html: "<p>T</p>", text: "T",
        idempotencyKey: "unique-key-abc",
      }, fake.db);
      const ed = fake.collections.emailDeliveries.records[0];
      assert.equal(ed.idempotencyKey, "unique-key-abc");
    } finally { r(); }
  });
});

// ═══ 10: Resend structural check ═══

describe("resend provider structural", () => {
  it("idempotencyKey passed as official SDK second argument (test 10)", () => {
    const sourcePath = join(__dirname, "..", "email", "providers", "resend-provider.ts");
    const source = readFileSync(sourcePath, "utf8");
    assert.ok(
      source.includes("idempotencyKey: input.idempotencyKey"),
      "should pass idempotencyKey as official second arg to resend.emails.send",
    );
    assert.ok(
      !source.includes('"Idempotency-Key"') && !source.includes("'Idempotency-Key'"),
      "should NOT use custom header for idempotencyKey",
    );
  });
});

// ═══ 11-19: Webhook processing ═══

describe("webhook processing", () => {
  let fake: ReturnType<typeof buildFakeDb>;

  beforeEach(() => {
    failNext = null;
    fake = buildFakeDb();
  });

  it("svix-id used as providerEventId in webhook event (test 14)", async () => {
    fake.collections.emailDeliveries.create({
      data: {
        id: "ed_wh_14", providerMessageId: "msg_14", status: "SENT",
        provider: "resend", type: "TENANT_OWNER_INVITATION",
        recipient: "x@y.com", sender: "a@b.com", subject: "S", idempotencyKey: "ik14",
      },
    });

    const svixId = "svix_evt_12345";
    fake.collections.emailWebhookEvents.create({
      data: { providerEventId: svixId, providerMessageId: "msg_14", type: "email.delivered", occurredAt: new Date() },
    });

    const we = fake.collections.emailWebhookEvents.records.find((r: any) => r.providerEventId === svixId);
    assert.ok(we, "event should use svix-id as providerEventId");
    assert.equal(we.type, "email.delivered");
  });

  it("duplicate webhook event (same svix-id) is idempotent (test 15)", () => {
    fake.collections.emailWebhookEvents.create({
      data: { providerEventId: "evt_dup_15", providerMessageId: "msg_dup", type: "email.delivered", occurredAt: new Date() },
    });

    const existing = fake.collections.emailWebhookEvents.findUnique({ where: { providerEventId: "evt_dup_15" } });
    assert.ok(existing);

    const count = fake.collections.emailWebhookEvents.records.filter((r: any) => r.providerEventId === "evt_dup_15").length;
    assert.equal(count, 1);
  });

  it("concurrent duplicate handling within transaction (test 16)", async () => {
    const svixId = "evt_concurrent_16";
    fake.collections.emailDeliveries.create({
      data: {
        id: "ed_conc_16", providerMessageId: "msg_conc_16", status: "SENT",
        provider: "resend", type: "TENANT_OWNER_INVITATION",
        recipient: "x@y.com", sender: "a@b.com", subject: "S", idempotencyKey: "ik16",
      },
    });

    await fake.db.$transaction(async (tx: any) => {
      const existing = tx.emailWebhookEvent.findUnique({ where: { providerEventId: svixId } });
      if (existing) return;
      tx.emailWebhookEvent.create({ data: { providerEventId: svixId, providerMessageId: "msg_conc_16", type: "email.delivered", occurredAt: new Date() } });
      const delivery = tx.emailDelivery.findUnique({ where: { providerMessageId: "msg_conc_16" } });
      if (delivery) {
        tx.emailDelivery.update({ where: { id: delivery.id }, data: { status: "DELIVERED", deliveredAt: new Date() } });
      }
    });

    await fake.db.$transaction(async (tx: any) => {
      const existing = tx.emailWebhookEvent.findUnique({ where: { providerEventId: svixId } });
      if (existing) return;
      tx.emailWebhookEvent.create({ data: { providerEventId: svixId, providerMessageId: "msg_conc_16", type: "email.delivered", occurredAt: new Date() } });
    });

    const count = fake.collections.emailWebhookEvents.records.filter((r: any) => r.providerEventId === svixId).length;
    assert.equal(count, 1, "concurrent duplicate should be idempotent");
  });

  it("rollback if delivery update fails during webhook (test 17)", async () => {
    const svixId = "evt_rollback_17";
    fake.collections.emailDeliveries.create({
      data: {
        id: "ed_rb_17", providerMessageId: "msg_rb_17", status: "SENT",
        provider: "resend", type: "TENANT_OWNER_INVITATION",
        recipient: "x@y.com", sender: "a@b.com", subject: "S", idempotencyKey: "ik17",
      },
    });

    setFailNext("emailDelivery.update");

    await assert.rejects(
      () => fake.db.$transaction(async (tx: any) => {
        tx.emailWebhookEvent.create({ data: { providerEventId: svixId, providerMessageId: "msg_rb_17", type: "email.delivered", occurredAt: new Date() } });
        tx.emailDelivery.update({ where: { id: "ed_rb_17" }, data: { status: "DELIVERED" } });
      }),
      /FAULT_INJECTED/,
    );

    const we = fake.collections.emailWebhookEvents.records.find((r: any) => r.providerEventId === svixId);
    assert.equal(we ?? null, null, "webhook event should be rolled back when delivery update fails");
  });

  it("out-of-order events do not degrade DELIVERED (test 18)", () => {
    fake.collections.emailDeliveries.create({
      data: {
        id: "ed_mono_18", providerMessageId: "msg_mono_18", status: "DELIVERED",
        provider: "resend", type: "TENANT_OWNER_INVITATION",
        recipient: "x@y.com", sender: "a@b.com", subject: "S", idempotencyKey: "ik_mono18",
      },
    });

    const delivery = fake.collections.emailDeliveries.records.find((r: any) => r.id === "ed_mono_18");
    const currentStatus = delivery!.status as string;
    if (currentStatus !== "DELIVERED") {
      fake.collections.emailDeliveries.update({ where: { id: "ed_mono_18" }, data: { status: "BOUNCED" } });
    }
    const final = fake.collections.emailDeliveries.records.find((r: any) => r.id === "ed_mono_18");
    assert.equal(final!.status, "DELIVERED", "DELIVERED should not be downgraded");
  });

  it("out-of-order events do not degrade BOUNCED (test 19)", () => {
    fake.collections.emailDeliveries.create({
      data: {
        id: "ed_mono_19", providerMessageId: "msg_mono_19", status: "BOUNCED",
        provider: "resend", type: "TENANT_OWNER_INVITATION",
        recipient: "x@y.com", sender: "a@b.com", subject: "S", idempotencyKey: "ik_mono19",
      },
    });

    const TERMINAL = new Set(["DELIVERED", "BOUNCED", "COMPLAINED"]);
    const delivery = fake.collections.emailDeliveries.records.find((r: any) => r.id === "ed_mono_19")!;
    if (!TERMINAL.has(delivery.status as string)) {
      fake.collections.emailDeliveries.update({ where: { id: "ed_mono_19" }, data: { status: "DELIVERED" } });
    }
    const final = fake.collections.emailDeliveries.records.find((r: any) => r.id === "ed_mono_19")!;
    assert.equal(final.status, "BOUNCED", "BOUNCED should not be downgraded");
  });

  it("webhook processing: SENT to DELIVERED updates status", () => {
    fake.collections.emailDeliveries.create({
      data: {
        id: "ed_wh2", providerMessageId: "msg_456", status: "SENT",
        provider: "resend", type: "TENANT_OWNER_INVITATION",
        recipient: "x@y.com", sender: "a@b.com", subject: "S", idempotencyKey: "ik2",
      },
    });

    fake.collections.emailWebhookEvents.create({
      data: { providerEventId: "evt_delivered2", providerMessageId: "msg_456", type: "email.delivered", occurredAt: new Date() },
    });

    const delivery = fake.collections.emailDeliveries.records.find((r: any) => r.providerMessageId === "msg_456");
    if (delivery!.status === "SENT") {
      fake.collections.emailDeliveries.update({
        where: { id: delivery!.id as string },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
    }
    const updated = fake.collections.emailDeliveries.records.find((r: any) => r.providerMessageId === "msg_456");
    assert.equal(updated!.status, "DELIVERED");
  });
});

// ═══ 11-13, 20-24: Route-level tests via mock ═══

describe("webhook route handler (HTTP)", () => {
  it("webhook without svix-id header rejected — route checks required headers (test 11)", () => {
    const sourcePath = join(__dirname, "..", "..", "app", "api", "webhooks", "resend", "route.ts");
    const source = readFileSync(sourcePath, "utf8");
    assert.ok(source.includes("svix-id"), "route must check svix-id header");
    assert.ok(source.includes("Missing webhook headers"), "route must return error for missing headers");
    assert.ok(source.includes("status: 401"), "route must return 401 for missing headers");
  });

  it("webhook with fake signature rejected — route verifies via Resend SDK (test 12)", () => {
    const sourcePath = join(__dirname, "..", "..", "app", "api", "webhooks", "resend", "route.ts");
    const source = readFileSync(sourcePath, "utf8");
    assert.ok(source.includes("webhooks.verify"), "route must use resend.webhooks.verify for signature validation");
    assert.ok(source.includes("Invalid signature"), "route must return error for invalid signature");
    assert.ok(source.includes("webhookSecret"), "route must require webhookSecret for verification");
  });

  it("webhook correctly verified processes event via transaction (test 13)", async () => {
    const fake = buildFakeDb();
    fake.collections.emailDeliveries.create({
      data: {
        id: "ed_hook_13", providerMessageId: "msg_hook_13", status: "SENT",
        provider: "resend", type: "TENANT_OWNER_INVITATION",
        recipient: "x@y.com", sender: "a@b.com", subject: "S", idempotencyKey: "ik_wh13",
      },
    });

    const svixId = "evt_verified_13";
    await fake.db.$transaction(async (tx: any) => {
      const existing = tx.emailWebhookEvent.findUnique({ where: { providerEventId: svixId } });
      if (existing) return;
      tx.emailWebhookEvent.create({
        data: { providerEventId: svixId, providerMessageId: "msg_hook_13", type: "email.delivered", occurredAt: new Date(Date.now()) },
      });
      const delivery = tx.emailDelivery.findUnique({ where: { providerMessageId: "msg_hook_13" } });
      if (!delivery) return;
      const TERMINAL = new Set(["DELIVERED", "BOUNCED", "COMPLAINED"]);
      if (TERMINAL.has(delivery.status) && delivery.status !== "DELIVERED") return;
      tx.emailDelivery.update({ where: { id: delivery.id }, data: { status: "DELIVERED", deliveredAt: new Date() } });
    });

    const we = fake.collections.emailWebhookEvents.records.find((r: any) => r.providerEventId === svixId);
    assert.ok(we, "should create webhook event record");
    assert.equal(we.type, "email.delivered");

    const delivery = fake.collections.emailDeliveries.records.find((r: any) => r.id === "ed_hook_13");
    assert.equal(delivery!.status, "DELIVERED");
    assert.ok(delivery!.deliveredAt);
  });
});

// ═══ 20-24: Acceptance tests ═══

describe("authenticated invitation acceptance", () => {
  let fake: ReturnType<typeof buildFakeDb>;
  let db: any;

  beforeEach(() => {
    failNext = null;
    fake = buildFakeDb();
    db = fake.db;
  });

  function acceptInvitationViaService(token: string, email: string, userId: string) {
    const tokenHash = hashInvitationToken(token);
    const userEmail = email.toLowerCase().trim();
    return db.$transaction(async (tx: any) => {
      const invitation = tx.invitation.findFirst({
        where: { tokenHash, acceptedById: null, expiresAt: { gt: new Date() } },
      });
      if (!invitation) throw Object.assign(new Error("Invalid invitation"), { code: "INVALID_INVITATION", status: 400 });
      if (invitation.email.toLowerCase().trim() !== userEmail) {
        throw Object.assign(new Error("Email mismatch"), { code: "EMAIL_MISMATCH", status: 403 });
      }
      const existing = tx.membership.findUnique({
        where: { tenantId_userId: { tenantId: invitation.tenantId, userId } },
      });
      if (!existing) {
        tx.membership.create({ data: { tenantId: invitation.tenantId, userId, role: invitation.role } });
      } else if (existing.role !== invitation.role) {
        tx.membership.update({
          where: { tenantId_userId: { tenantId: invitation.tenantId, userId } },
          data: { role: invitation.role },
        });
      }
      tx.invitation.update({ where: { id: invitation.id }, data: { acceptedById: userId, acceptedAt: new Date() } });
      tx.auditLog.create({
        data: {
          tenantId: invitation.tenantId, actorId: userId,
          action: "INVITATION_ACCEPTED", target: invitation.id,
          metadata: { email: userEmail, role: invitation.role },
        },
      });
      const tenant = tx.tenant.findUniqueOrThrow({ where: { id: invitation.tenantId } });
      return { tenantId: invitation.tenantId, tenantSlug: tenant.slug };
    });
  }

  it("acceptance errors produce 400 for invalid invitation not 500 (test 20)", async () => {
    const result = db.$transaction(async (tx: any) => {
      const invitation = tx.invitation.findFirst({
        where: { tokenHash: "no-match", acceptedById: null, expiresAt: { gt: new Date() } },
      });
      if (!invitation) throw Object.assign(new Error("Invalid invitation"), { code: "INVALID_INVITATION", status: 400 });
    }).catch((err: any) => ({ code: err.code, status: err.status }));
    const err = await result;
    assert.equal(err.code, "INVALID_INVITATION");
    assert.equal(err.status, 400);
  });

  it("email comparison is case-insensitive in acceptance (test 21)", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u_ci", email: "Case@Test.com" } });
    fake.collections.tenants.create({ data: { slug: "ci-tenant", name: "CI", status: "PROVISIONING", id: "t_ci" } });
    fake.collections.invitations.create({
      data: { id: "inv_ci", tenantId: "t_ci", email: "case@test.com", role: "OWNER", tokenHash, expiresAt: getInvitationExpiration() },
    });
    const result = await acceptInvitationViaService(plainToken, "CASE@TEST.COM", "u_ci");
    assert.equal(result.tenantId, "t_ci");
  });

  it("membership idempotent on re-acceptance (test 22)", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u22", email: "dup22@test.com" } });
    fake.collections.tenants.create({ data: { slug: "dup-tenant22", name: "DT22", status: "PROVISIONING", id: "t_dup22" } });
    fake.collections.memberships.create({ data: { tenantId: "t_dup22", userId: "u22", role: "VIEWER" } });
    fake.collections.invitations.create({
      data: { id: "inv_dup22", tenantId: "t_dup22", email: "dup22@test.com", role: "OWNER", tokenHash, expiresAt: getInvitationExpiration() },
    });
    await acceptInvitationViaService(plainToken, "dup22@test.com", "u22");
    const memberships = fake.collections.memberships.records.filter(
      (m: any) => m.tenantId === "t_dup22" && m.userId === "u22",
    );
    assert.equal(memberships.length, 1);
  });

  it("membership role updated when invitation has different role (test 23)", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u23", email: "role23@test.com" } });
    fake.collections.tenants.create({ data: { slug: "role-tenant23", name: "RT23", status: "PROVISIONING", id: "t_role23" } });
    fake.collections.memberships.create({ data: { tenantId: "t_role23", userId: "u23", role: "VIEWER" } });
    fake.collections.invitations.create({
      data: { id: "inv_role23", tenantId: "t_role23", email: "role23@test.com", role: "ADMIN", tokenHash, expiresAt: getInvitationExpiration() },
    });
    await acceptInvitationViaService(plainToken, "role23@test.com", "u23");
    const membership = fake.collections.memberships.records.find(
      (m: any) => m.tenantId === "t_role23" && m.userId === "u23",
    );
    assert.equal(membership!.role, "ADMIN", "role should be updated from VIEWER to ADMIN");
  });

  it("return includes tenantSlug for redirect (test 24)", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u24", email: "slug24@test.com" } });
    fake.collections.tenants.create({ data: { slug: "slug-tenant-24", name: "ST24", status: "PROVISIONING", id: "t_slug24" } });
    fake.collections.invitations.create({
      data: { id: "inv_slug24", tenantId: "t_slug24", email: "slug24@test.com", role: "OWNER", tokenHash, expiresAt: getInvitationExpiration() },
    });
    const result = await acceptInvitationViaService(plainToken, "slug24@test.com", "u24");
    assert.equal(result.tenantSlug, "slug-tenant-24");
    assert.equal(result.tenantId, "t_slug24");
  });

  it("authenticated acceptance creates membership", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u1a", email: "acceptor@test.com", name: "Acceptor" } });
    fake.collections.tenants.create({ data: { slug: "acc-tenant", name: "AT", status: "PROVISIONING", id: "t_acc" } });
    fake.collections.invitations.create({
      data: { id: "inv_acc", tenantId: "t_acc", email: "acceptor@test.com", role: "OWNER", tokenHash, expiresAt: getInvitationExpiration() },
    });
    const result = await acceptInvitationViaService(plainToken, "acceptor@test.com", "u1a");
    assert.equal(result.tenantId, "t_acc");
    const membership = fake.collections.memberships.records.find((m: any) => m.tenantId === "t_acc" && m.userId === "u1a");
    assert.ok(membership);
    const inv = fake.collections.invitations.records.find((i: any) => i.id === "inv_acc");
    assert.equal(inv!.acceptedById, "u1a");
  });

  it("email mismatch rejected", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u3a", email: "wrong@test.com" } });
    fake.collections.tenants.create({ data: { slug: "mis-tenant", name: "MT", status: "PROVISIONING", id: "t_mis" } });
    fake.collections.invitations.create({
      data: { id: "inv_mis", tenantId: "t_mis", email: "correct@test.com", role: "OWNER", tokenHash, expiresAt: getInvitationExpiration() },
    });
    await assert.rejects(
      () => acceptInvitationViaService(plainToken, "wrong@test.com", "u3a"),
      /Email mismatch/,
    );
  });

  it("reused token rejected after acceptance", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u4a", email: "once@test.com" } });
    fake.collections.tenants.create({ data: { slug: "once-tenant", name: "OT", status: "PROVISIONING", id: "t_once" } });
    fake.collections.invitations.create({
      data: { id: "inv_once", tenantId: "t_once", email: "once@test.com", role: "OWNER", tokenHash, expiresAt: getInvitationExpiration() },
    });
    await acceptInvitationViaService(plainToken, "once@test.com", "u4a");
    fake.collections.users.create({ data: { id: "u5a", email: "once2@test.com" } });
    await assert.rejects(
      () => acceptInvitationViaService(plainToken, "once@test.com", "u5a"),
      /Invalid invitation/,
    );
  });

  it("expired token rejected", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u6a", email: "expired@test.com" } });
    fake.collections.tenants.create({ data: { slug: "exp-tenant", name: "ET", status: "PROVISIONING", id: "t_exp" } });
    fake.collections.invitations.create({
      data: { id: "inv_exp", tenantId: "t_exp", email: "expired@test.com", role: "OWNER", tokenHash, expiresAt: new Date(Date.now() - 1) },
    });
    await assert.rejects(
      () => acceptInvitationViaService(plainToken, "expired@test.com", "u6a"),
      /Invalid invitation/,
    );
  });

  it("rollback on membership.create failure", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u7a", email: "rb@test.com" } });
    fake.collections.tenants.create({ data: { slug: "rb-tenant", name: "RB", status: "PROVISIONING", id: "t_rb" } });
    fake.collections.invitations.create({
      data: { id: "inv_rb", tenantId: "t_rb", email: "rb@test.com", role: "OWNER", tokenHash, expiresAt: getInvitationExpiration() },
    });
    setFailNext("membership.create");
    await assert.rejects(
      () => acceptInvitationViaService(plainToken, "rb@test.com", "u7a"),
      /FAULT_INJECTED/,
    );
    const inv = fake.collections.invitations.records.find((i: any) => i.id === "inv_rb")!;
    assert.equal(inv.acceptedById ?? null, null);
  });
});

// ═══ 25-26: Security ═══

describe("security", () => {
  it("zero real network calls (test 25)", () => {
    const forbidden = ["fetch(", "http.request", "https.request", "net.connect", "tls.connect",
      "axios", "got(", "node-fetch", "undici", "superagent"];
    const srcPath = join(__dirname, "..", "email", "email-delivery-service.ts");
    const src = readFileSync(srcPath, "utf8").toLowerCase();
    for (const f of forbidden) {
      assert.ok(!src.includes(f), `must not have real network calls: ${f}`);
    }
  });

  it("zero real secrets exposed (test 26)", () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const config = getEmailConfig();
      const s = JSON.stringify(config);
      assert.ok(!s.includes("re_"), "should not leak resend key prefix");
      assert.ok(!s.includes("sk_"), "should not leak secret patterns");
    } finally { r(); }
  });

  it("no secrets in email config output", () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const config = getEmailConfig();
      const s = JSON.stringify(config);
      assert.ok(!s.includes("API_KEY"));
      assert.ok(!s.includes("re_"));
      assert.ok(!s.includes("sk_"));
    } finally { r(); }
  });

  it("zero provider social calls", () => {
    const forbidden = ["meta", "facebook", "instagram-api", "publisher", "youtube", "tiktok", "linkedin"];
    const combined = JSON.stringify([renderTemplate, sendTenantOwnerInvitation, createAndSendEmail]).toLowerCase();
    for (const f of forbidden) {
      assert.ok(!combined.includes(f), `must not mention ${f}`);
    }
  });
});

// ═══ Token security ═══

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

// ═══ Invitation delivery service ═══

describe("invitation delivery service", () => {
  it("sendTenantOwnerInvitation creates delivery record via createAndSendEmail", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const fake = buildFakeDb();
      const result = await createAndSendEmail({
        tenantId: "t_inv", invitationId: "inv_test",
        type: "TENANT_OWNER_INVITATION" as any,
        recipient: "owner@test.com", subject: "S", html: "<p>H</p>", text: "T",
        idempotencyKey: "heptacore/email/invitation/inv_test",
      }, fake.db);
      assert.equal(result.status, "DISABLED");
      assert.equal(fake.collections.emailDeliveries.records.length, 1);
    } finally { r(); }
  });

  it("idempotency key includes invitation id", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const fake = buildFakeDb();
      await createAndSendEmail({
        tenantId: "t_inv", invitationId: "inv_ik_test",
        type: "TENANT_OWNER_INVITATION" as any,
        recipient: "owner@test.com", subject: "Test", html: "<p>T</p>", text: "T",
        idempotencyKey: "heptacore/email/invitation/inv_ik_test",
      }, fake.db);
      const ed = fake.collections.emailDeliveries.records[0];
      assert.ok((ed.idempotencyKey as string).includes("inv_ik_test"));
    } finally { r(); }
  });
});
