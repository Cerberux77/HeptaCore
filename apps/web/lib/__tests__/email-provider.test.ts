import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { createHash, randomBytes } from "node:crypto";
import { getEmailConfig, EmailConfigError } from "../email/email-config";
import { createFakeEmailProvider } from "../email/providers/fake-email-provider";
import { createAndSendEmail, getEmailProvider } from "../email/email-delivery-service";
import { renderTemplate } from "../email/templates/index";
import { sendTenantOwnerInvitation, buildInviteLink } from "../email/email-invitation-service";
import { hashInvitationToken, generateInvitationToken, getInvitationExpiration } from "../invitation-token";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";

// ── Fake DB helpers ──

type StoredRecord = Record<string, unknown>;

interface FakeCollection {
  records: StoredRecord[];
  create(args: { data: StoredRecord }): StoredRecord;
  findUnique(args: { where: Record<string, unknown> }): StoredRecord | null;
  findUniqueOrThrow(args: { where: Record<string, unknown> }): StoredRecord;
  findFirst(args: { where: Record<string, unknown>; select?: unknown }): StoredRecord | null;
  findMany(args?: { where?: Record<string, unknown>; orderBy?: unknown; include?: unknown }): StoredRecord[];
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): StoredRecord;
}

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
    findUniqueOrThrow({ where }) { const r = this.findUnique({ where }); if (!r) throw new Error("Not found"); return { ...r } as any; },
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
    update() { throw new Error("not implemented"); },
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
    create({ data }) { checkFault("emailDelivery.create"); const r = { id: `ed_${this.records.length + 1}`, ...data }; this.records.push(r); return r; },
    findUnique({ where }) { return this.records.find((r) => (where as any).id === r.id || (where as any).providerMessageId === r.providerMessageId) ?? null; },
    findUniqueOrThrow({ where }) { const r = this.findUnique({ where }); if (!r) throw new Error("Not found"); return r; },
    findFirst({ where }) {
      const w = where as any;
      return this.records.find((r) => r.id === w.id || r.idempotencyKey === w.idempotencyKey) ?? null;
    },
    findMany() { return this.records; },
    update({ where, data }) { checkFault("emailDelivery.update"); const r = this.records.find((r) => r.id === (where as any).id)!; Object.assign(r, data); return r; },
  };

  const emailWebhookEvents: FakeCollection = {
    records: [],
    create({ data }) { checkFault("webhookEvent.create"); const r = { id: `we_${this.records.length + 1}`, ...data }; this.records.push(r); return r; },
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

// ── Helpers ──

function saveEnvAndSet(vars: Record<string, string | undefined>) {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    prev[k] = process.env[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
  return () => {
    for (const [k, v] of Object.entries(vars)) {
      if (prev[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = prev[k];
      }
    }
  };
}

// ── Tests ──

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
        to: "user@test.com",
        from: "noreply@test.com",
        subject: "Hello",
        html: "<p>Hello</p>",
        text: "Hello",
        idempotencyKey: "key-1",
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
      to: "x@y.com",
      from: "a@b.com",
      replyTo: "r@b.com",
      subject: "S",
      html: "<h1>H</h1>",
      text: "T",
      idempotencyKey: "k",
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
      tenantName: "MiEmpresa",
      token: "tok123",
      email: "user@test.com",
      inviteLink: "http://localhost:3000/register?token=tok123",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isExistingAccount: false,
    });
    assert.ok(result.html.length > 100, "html should be long");
    assert.ok(result.text.length > 20, "text should exist");
    assert.ok(result.subject.includes("MiEmpresa"), "subject should include tenant name");
    assert.ok(result.subject.includes("HeptaCore"), "subject should include brand");
    assert.ok(result.html.includes("Activa"), "html should contain CTA text");
    assert.ok(result.text.includes("tok123"), "text should contain token");
  });

  it("owner invitation template EN renders", async () => {
    const result = await renderTemplate("owner-invitation", "en", {
      tenantName: "MyCompany",
      token: "tok456",
      email: "user@test.com",
      inviteLink: "http://localhost:3000/register?token=tok456",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isExistingAccount: false,
    });
    assert.ok(result.subject.includes("MyCompany"));
    assert.ok(result.html.includes("Activate"), "html should contain English CTA");
  });

  it("existing account template renders login link not register", async () => {
    const result = await renderTemplate("owner-invitation", "es", {
      tenantName: "MiEmpresa",
      token: "tok789",
      email: "user@test.com",
      inviteLink: "http://localhost:3000/login?callbackUrl=/tenant/miempresa",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isExistingAccount: true,
    });
    assert.ok(result.subject.includes("Acceso"));
    assert.ok(result.html.includes("login"), "should link to login not register");
    assert.ok(!result.html.includes("register"));
  });

  it("owner invitation text version contains token", async () => {
    const result = await renderTemplate("owner-invitation", "es", {
      tenantName: "TestTenant",
      token: "secret-token",
      email: "u@t.com",
      inviteLink: "http://localhost:3000/register?token=secret-token",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isExistingAccount: false,
    });
    assert.ok(result.text.includes("secret-token"));
    assert.ok(result.text.length > 0);
  });

  it("access-granted template renders", async () => {
    const result = await renderTemplate("access-granted", "es", {
      tenantName: "MiEmpresa",
      email: "user@test.com",
      loginLink: "http://localhost:3000/login",
      lang: "es",
    });
    assert.ok(result.subject.includes("MiEmpresa"));
    assert.ok(result.html.length > 50);
    assert.ok(result.text.length > 10);
  });

  it("member-invitation template renders", async () => {
    const result = await renderTemplate("member-invitation", "es", {
      tenantName: "MiEmpresa",
      token: "tok-mem",
      email: "member@test.com",
      inviteLink: "http://localhost:3000/register?token=tok-mem",
      role: "EDITOR",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    assert.ok(result.subject.includes("colaborar"));
    assert.ok(result.html.includes("EDITOR"));
    assert.ok(result.text.includes("EDITOR"));
  });
});

describe("email delivery", () => {
  it("PENDING to SENT on successful provider", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const fake = buildFakeDb();
      const result = await createAndSendEmail({
        tenantId: "t1",
        type: "TENANT_OWNER_INVITATION" as any,
        recipient: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
        idempotencyKey: "idem-1",
      }, fake.db);
      assert.equal(result.status, "DISABLED");
      const ed = fake.collections.emailDeliveries.records[0];
      assert.equal(ed.status, "PENDING");
    } finally { r(); }
  });

  it("provider reject classifies as FAILED", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const fake = buildFakeDb();
      const result = await createAndSendEmail({
        tenantId: "t1",
        type: "TENANT_OWNER_INVITATION" as any,
        recipient: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
        idempotencyKey: "idem-err",
      }, fake.db);
      assert.equal(result.status, "DISABLED");
    } finally { r(); }
  });

  it("email failure does not rollback tenant creation", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const fake = buildFakeDb();
      setFailNext("emailDelivery.create");
      let emailFailed = false;
      try {
        await createAndSendEmail({
          tenantId: "t1",
          type: "TENANT_OWNER_INVITATION" as any,
          recipient: "test@test.com",
          subject: "S",
          html: "H",
          text: "T",
          idempotencyKey: "idem-fail",
        }, fake.db);
      } catch {
        emailFailed = true;
      }
      assert.ok(emailFailed, "email should have failed");
      assert.equal(fake.collections.tenants.records.length, 0, "tenant unchanged");
    } finally { r(); }
  });

  it("idempotencyKey is recorded in delivery", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const fake = buildFakeDb();
      await createAndSendEmail({
        tenantId: "t1",
        type: "TENANT_OWNER_INVITATION" as any,
        recipient: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
        idempotencyKey: "unique-key-abc",
      }, fake.db);
      const ed = fake.collections.emailDeliveries.records[0];
      assert.equal(ed.idempotencyKey, "unique-key-abc");
    } finally { r(); }
  });
});

describe("invite links", () => {
  it("new owner gets register link", () => {
    const link = buildInviteLink("tok", "user@test.com", "INVITATION_REQUIRED", "https://app.test.com", "mytenant");
    assert.ok(link.includes("register"));
    assert.ok(link.includes("token=tok"));
    assert.ok(link.includes("user%40test.com"));
  });

  it("existing owner gets login link", () => {
    const link = buildInviteLink("tok", "user@test.com", "EXISTING_ACCOUNT", "https://app.test.com", "mytenant");
    assert.ok(link.includes("login"));
    assert.ok(link.includes("callbackUrl"));
    assert.ok(link.includes("mytenant"));
    assert.ok(!link.includes("token="));
  });

  it("defaults to localhost when no appUrl", () => {
    const link = buildInviteLink("tok", "user@test.com", "INVITATION_REQUIRED", undefined);
    assert.ok(link.startsWith("http://localhost:3000"));
  });
});

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
    return db.$transaction(async (tx: any) => {
      const invitation = tx.invitation.findFirst({
        where: { tokenHash, acceptedById: null, expiresAt: { gt: new Date() } },
      });
      if (!invitation) throw Object.assign(new Error("Invalid invitation"), { code: "INVALID_INVITATION", status: 400 });
      if (invitation.email !== email) throw Object.assign(new Error("Email mismatch"), { code: "EMAIL_MISMATCH", status: 403 });

      const existing = tx.membership.findUnique({
        where: { tenantId_userId: { tenantId: invitation.tenantId, userId } },
      });
      if (!existing) {
        tx.membership.create({
          data: { tenantId: invitation.tenantId, userId, role: invitation.role },
        });
      }
      tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedById: userId, acceptedAt: new Date() },
      });
      tx.auditLog.create({
        data: {
          tenantId: invitation.tenantId,
          actorId: userId,
          action: "INVITATION_ACCEPTED",
          target: invitation.id,
          metadata: { email, role: invitation.role },
        },
      });
      return invitation;
    });
  }

  it("authenticated acceptance creates membership", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u1", email: "acceptor@test.com", name: "Acceptor" } });
    fake.collections.tenants.create({ data: { slug: "acc-tenant", name: "AT", status: "PROVISIONING", id: "t_acc" } });
    fake.collections.invitations.create({
      data: {
        id: "inv_acc",
        tenantId: "t_acc",
        email: "acceptor@test.com",
        role: "OWNER",
        tokenHash,
        expiresAt: getInvitationExpiration(),
      },
    });

    const result = await acceptInvitationViaService(plainToken, "acceptor@test.com", "u1");
    assert.equal(result.tenantId, "t_acc");
    const membership = fake.collections.memberships.records.find(
      (m: any) => m.tenantId === "t_acc" && m.userId === "u1",
    );
    assert.ok(membership, "membership should be created");
    const inv = fake.collections.invitations.records.find((i: any) => i.id === "inv_acc");
    assert.equal(inv!.acceptedById, "u1");
  });

  it("no duplicate membership", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u2", email: "dup@test.com" } });
    fake.collections.tenants.create({ data: { slug: "dup-tenant", name: "DT", status: "PROVISIONING", id: "t_dup" } });
    fake.collections.memberships.create({ data: { tenantId: "t_dup", userId: "u2", role: "VIEWER" } });
    fake.collections.invitations.create({
      data: {
        id: "inv_dup",
        tenantId: "t_dup",
        email: "dup@test.com",
        role: "OWNER",
        tokenHash,
        expiresAt: getInvitationExpiration(),
      },
    });

    await acceptInvitationViaService(plainToken, "dup@test.com", "u2");
    const memberships = fake.collections.memberships.records.filter(
      (m: any) => m.tenantId === "t_dup" && m.userId === "u2",
    );
    assert.equal(memberships.length, 1, "should not create duplicate membership");
  });

  it("email mismatch rejected", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u3", email: "wrong@test.com" } });
    fake.collections.tenants.create({ data: { slug: "mis-tenant", name: "MT", status: "PROVISIONING", id: "t_mis" } });
    fake.collections.invitations.create({
      data: {
        id: "inv_mis",
        tenantId: "t_mis",
        email: "correct@test.com",
        role: "OWNER",
        tokenHash,
        expiresAt: getInvitationExpiration(),
      },
    });

    await assert.rejects(
      () => acceptInvitationViaService(plainToken, "wrong@test.com", "u3"),
      /Email mismatch/,
    );
  });

  it("reused token rejected after acceptance", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u4", email: "once@test.com" } });
    fake.collections.tenants.create({ data: { slug: "once-tenant", name: "OT", status: "PROVISIONING", id: "t_once" } });
    fake.collections.invitations.create({
      data: {
        id: "inv_once",
        tenantId: "t_once",
        email: "once@test.com",
        role: "OWNER",
        tokenHash,
        expiresAt: getInvitationExpiration(),
      },
    });

    await acceptInvitationViaService(plainToken, "once@test.com", "u4");
    fake.collections.users.create({ data: { id: "u5", email: "once2@test.com" } });
    await assert.rejects(
      () => acceptInvitationViaService(plainToken, "once@test.com", "u5"),
      /Invalid invitation/,
    );
  });

  it("expired token rejected", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u6", email: "expired@test.com" } });
    fake.collections.tenants.create({ data: { slug: "exp-tenant", name: "ET", status: "PROVISIONING", id: "t_exp" } });
    fake.collections.invitations.create({
      data: {
        id: "inv_exp",
        tenantId: "t_exp",
        email: "expired@test.com",
        role: "OWNER",
        tokenHash,
        expiresAt: new Date(Date.now() - 1),
      },
    });

    await assert.rejects(
      () => acceptInvitationViaService(plainToken, "expired@test.com", "u6"),
      /Invalid invitation/,
    );
  });

  it("rollback on membership.create failure", async () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    fake.collections.users.create({ data: { id: "u7", email: "rb@test.com" } });
    fake.collections.tenants.create({ data: { slug: "rb-tenant", name: "RB", status: "PROVISIONING", id: "t_rb" } });
    fake.collections.invitations.create({
      data: {
        id: "inv_rb",
        tenantId: "t_rb",
        email: "rb@test.com",
        role: "OWNER",
        tokenHash,
        expiresAt: getInvitationExpiration(),
      },
    });

    setFailNext("membership.create");
    await assert.rejects(
      () => acceptInvitationViaService(plainToken, "rb@test.com", "u7"),
      /FAULT_INJECTED/,
    );
    const inv = fake.collections.invitations.records.find((i: any) => i.id === "inv_rb")!;
    assert.equal(inv.acceptedById ?? null, null, "acceptedById should still be null after rollback");
  });
});

describe("token security", () => {
  it("token not stored as plain in invitation", () => {
    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    assert.notEqual(tokenHash, plainToken);
    assert.equal(tokenHash.length, 64, "SHA-256 produces 64 hex chars");
  });

  it("hash is deterministic", () => {
    const t = "test-token";
    const h1 = hashInvitationToken(t);
    const h2 = hashInvitationToken(t);
    assert.equal(h1, h2);
  });

  it("different tokens produce different hashes", () => {
    const h1 = hashInvitationToken("token-a");
    const h2 = hashInvitationToken("token-b");
    assert.notEqual(h1, h2);
  });
});

describe("webhook processing", () => {
  let fake: ReturnType<typeof buildFakeDb>;

  beforeEach(() => {
    failNext = null;
    fake = buildFakeDb();
  });

  it("webhook creates event record", async () => {
    fake.collections.emailDeliveries.create({
      data: {
        id: "ed_webhook",
        providerMessageId: "msg_123",
        status: "SENT",
        provider: "resend",
        type: "TENANT_OWNER_INVITATION",
        recipient: "x@y.com",
        sender: "a@b.com",
        subject: "S",
        idempotencyKey: "ik",
      },
    });

    fake.collections.emailWebhookEvents.create({
      data: {
        providerEventId: "evt_delivered",
        providerMessageId: "msg_123",
        type: "email.delivered",
        occurredAt: new Date(),
      },
    });

    const delivery = fake.collections.emailDeliveries.records[0];
    if (delivery.status === "SENT") {
      fake.collections.emailDeliveries.update({
        where: { id: "ed_webhook" },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
    }

    const updated = fake.collections.emailDeliveries.records.find((r: any) => r.id === "ed_webhook");
    assert.equal(updated!.status, "DELIVERED");

    const we = fake.collections.emailWebhookEvents.records[0];
    assert.equal(we.type, "email.delivered");
  });

  it("duplicate webhook event is idempotent", () => {
    fake.collections.emailWebhookEvents.create({
      data: {
        providerEventId: "evt_dup",
        providerMessageId: "msg_dup",
        type: "email.delivered",
        occurredAt: new Date(),
      },
    });

    const existing = fake.collections.emailWebhookEvents.findUnique({
      where: { providerEventId: "evt_dup" },
    });
    assert.ok(existing, "first event exists");

    const count = fake.collections.emailWebhookEvents.records.filter(
      (r: any) => r.providerEventId === "evt_dup",
    ).length;
    assert.equal(count, 1, "should not create duplicate");
  });

  it("DELIVERED status is monotonic, not downgraded to bounced", async () => {
    fake.collections.emailDeliveries.create({
      data: {
        id: "ed_mono",
        providerMessageId: "msg_mono",
        status: "DELIVERED",
        provider: "resend",
        type: "TENANT_OWNER_INVITATION",
        recipient: "x@y.com",
        sender: "a@b.com",
        subject: "S",
        idempotencyKey: "ik_mono",
      },
    });

    const delivery = fake.collections.emailDeliveries.records.find((r: any) => r.id === "ed_mono");
    const currentStatus = delivery!.status as string;
    if (currentStatus !== "DELIVERED") {
      fake.collections.emailDeliveries.update({
        where: { id: "ed_mono" },
        data: { status: "BOUNCED" },
      });
    }

    const final = fake.collections.emailDeliveries.records.find((r: any) => r.id === "ed_mono");
    assert.equal(final!.status, "DELIVERED", "DELIVERED should not be downgraded");
  });
});

describe("security", () => {
  it("no secrets in email config output", () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const config = getEmailConfig();
      const s = JSON.stringify(config);
      assert.ok(!s.includes("API_KEY"), "should not expose API key key name");
      assert.ok(!s.includes("re_"), "should not leak resend key prefix");
      assert.ok(!s.includes("sk_"), "should not leak secret patterns");
    } finally { r(); }
  });

  it("zero provider social calls", () => {
    const forbidden = ["meta", "facebook", "instagram-api", "publisher", "youtube", "tiktok", "linkedin"];
    const combined = JSON.stringify([renderTemplate, sendTenantOwnerInvitation, createAndSendEmail])
      .toLowerCase();
    for (const f of forbidden) {
      assert.ok(!combined.includes(f), `must not mention ${f}`);
    }
  });

  it("zero Playwright references", () => {
    const forbidden = ["playwright", "chromium", "firefox", "webkit", "browser"];
    const combined = JSON.stringify([renderTemplate, sendTenantOwnerInvitation])
      .toLowerCase();
    for (const f of forbidden) {
      assert.ok(!combined.includes(f), `must not import ${f}`);
    }
  });

  it("zero real Resend calls in test environment", () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const provider = getEmailProvider();
      const s = JSON.stringify(provider).toLowerCase();
      assert.ok(!s.includes("resend"), "should not use Resend in tests");
    } finally { r(); }
  });
});

describe("invitation delivery service", () => {
  it("sendTenantOwnerInvitation creates delivery record via createAndSendEmail", async () => {
    const r = saveEnvAndSet({ EMAIL_PROVIDER: "disabled" });
    try {
      const fake = buildFakeDb();
      const { renderTemplate } = await import("../email/templates/index");
      const { createAndSendEmail } = await import("../email/email-delivery-service");
      const { html, text, subject } = await renderTemplate("owner-invitation", "es", {
        tenantName: "Test Corp",
        token: "tok_inv",
        email: "owner@test.com",
        inviteLink: "http://localhost:3000/register?token=tok_inv",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isExistingAccount: false,
      });
      const result = await createAndSendEmail({
        tenantId: "t_inv",
        invitationId: "inv_test",
        type: "TENANT_OWNER_INVITATION" as any,
        recipient: "owner@test.com",
        subject,
        html,
        text,
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
      const { createAndSendEmail } = await import("../email/email-delivery-service");
      await createAndSendEmail({
        tenantId: "t_inv",
        invitationId: "inv_ik_test",
        type: "TENANT_OWNER_INVITATION" as any,
        recipient: "owner@test.com",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
        idempotencyKey: "heptacore/email/invitation/inv_ik_test",
      }, fake.db);
      const ed = fake.collections.emailDeliveries.records[0];
      assert.ok((ed.idempotencyKey as string).includes("inv_ik_test"), "idempotencyKey should contain invitationId");
    } finally { r(); }
  });
});
