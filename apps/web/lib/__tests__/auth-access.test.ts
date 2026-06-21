import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  appLoginHref,
  hasTenantMembership,
  normalizeAuthRedirectUrl,
  resolveAppAccess,
  sanitizeInternalCallbackUrl,
  tenantAccessRequiredHref,
} from "../access-routing.js";
import { applyMembershipClaims } from "../auth-token-claims.js";

describe("auth access routing", () => {
  it("visitor goes to login with app callback", () => {
    assert.equal(appLoginHref(), "/login?callbackUrl=%2Fapp");
  });

  it("login without callback falls back to /app", () => {
    assert.equal(sanitizeInternalCallbackUrl(null), "/app");
    assert.equal(sanitizeInternalCallbackUrl(""), "/app");
  });

  it("session without memberships goes to access-required without loop", () => {
    const resolved = resolveAppAccess([]);
    assert.deepEqual(resolved, { kind: "access-required", href: "/access-required" });
  });

  it("one membership redirects to the real tenant slug", () => {
    const resolved = resolveAppAccess([
      { tenantId: "tenant-1", role: "TENANT_ADMIN", tenant: { slug: "real-slug", name: "Real Tenant" } },
    ]);
    assert.equal(resolved.kind, "tenant");
    if (resolved.kind === "tenant") assert.equal(resolved.href, "/tenant/real-slug");
  });

  it("superadmin goes to admin", () => {
    const resolved = resolveAppAccess([
      { tenantId: "tenant-1", role: "SUPER_ADMIN", tenant: { slug: "real-slug", name: "Real Tenant" } },
    ]);
    assert.deepEqual(resolved, { kind: "admin", href: "/admin" });
  });

  it("unauthorized tenant access goes to access-required", () => {
    assert.equal(hasTenantMembership([{ tenantId: "tenant-1", role: "TENANT_ADMIN" }], "tenant-2"), false);
    assert.equal(tenantAccessRequiredHref("tenant-2"), "/access-required?tenant=tenant-2");
  });

  it("external callbacks are rejected", () => {
    assert.equal(sanitizeInternalCallbackUrl("https://evil.example/path"), "/app");
    assert.equal(sanitizeInternalCallbackUrl("//evil.example/path"), "/app");
    assert.equal(normalizeAuthRedirectUrl("https://evil.example/path", "/app", "https://app.example"), "/app");
    assert.equal(
      normalizeAuthRedirectUrl("https://app.example/tenant/real-slug", "/app", "https://app.example"),
      "/tenant/real-slug",
    );
  });

  it("proxy no longer sends anonymous users to a hardcoded tenant", async () => {
    const { readFileSync } = await import("node:fs");
    const proxySource = readFileSync(new URL("../../proxy.ts", import.meta.url), "utf8");
    assert.doesNotMatch(proxySource, /new URL\("\/tenant\/turpial-sound"/);
    assert.match(proxySource, /new URL\("\/login"/);
    assert.match(proxySource, /callbackUrl/);
  });

  it("login does not block legacy identifiers with browser email validation", async () => {
    const { readFileSync } = await import("node:fs");
    const loginSource = readFileSync(new URL("../../app/login/page.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(loginSource, /type="email"/);
    assert.match(loginSource, /Correo electrónico/);
  });

  it("membership added after login refreshes token claims", () => {
    const token = { id: "user-1", memberships: [], tenantId: null, role: null };
    applyMembershipClaims(token, [{ tenantId: "tenant-1", role: "TENANT_ADMIN" }]);
    assert.deepEqual(token.memberships, [{ tenantId: "tenant-1", role: "TENANT_ADMIN" }]);
    assert.equal(token.tenantId, "tenant-1");
    assert.equal(token.role, "TENANT_ADMIN");
  });
});

describe("ensure-user-access tool", async () => {
  const { ensureUserAccess, membershipWritePlan, maskEmail } = await import("../../../../scripts/ensure-user-access.mjs");

  it("plans idempotent membership writes", () => {
    assert.equal(membershipWritePlan(undefined, "TENANT_ADMIN"), "create");
    assert.equal(membershipWritePlan("VIEWER", "TENANT_ADMIN"), "update");
    assert.equal(membershipWritePlan("TENANT_ADMIN", "TENANT_ADMIN"), "noop");
  });

  it("is idempotent against an existing membership", async () => {
    const state: { membership: { id: string; role: string } | null } = { membership: null };
    const pool = {
      async query(sql: string, params: unknown[]) {
        if (sql.includes('from "User"')) return { rows: [{ id: "user-123456", email: "manuel@example.com" }] };
        if (sql.includes('from "Tenant"')) return { rows: [{ id: "tenant-123456", slug: params[0], name: "Tenant" }] };
        if (sql.includes('from "Membership"') && sql.startsWith("select")) return { rows: state.membership ? [state.membership] : [] };
        if (sql.startsWith("insert")) {
          state.membership = { id: String(params[0]), role: "TENANT_ADMIN" };
          return { rows: [state.membership] };
        }
        if (sql.startsWith("update")) {
          state.membership = { id: String(params[1]), role: String(params[0]) };
          return { rows: [state.membership] };
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      },
    };

    const first = await ensureUserAccess({ pool, email: "manuel@example.com", tenantSlug: "turpial-sound", role: "TENANT_ADMIN" });
    const second = await ensureUserAccess({ pool, email: "manuel@example.com", tenantSlug: "turpial-sound", role: "TENANT_ADMIN" });

    assert.equal(first.action, "created");
    assert.equal(second.action, "unchanged");
    assert.equal(second.membership.role, "TENANT_ADMIN");
    assert.equal(maskEmail("manuel@example.com"), "ml****@example.com");
  });

  it("accepts legacy identifiers stored in User.email", async () => {
    const pool = {
      async query(sql: string, params: unknown[]) {
        if (sql.includes('from "User"')) return { rows: [{ id: "user-legacy", email: String(params[0]) }] };
        if (sql.includes('from "Tenant"')) return { rows: [{ id: "tenant-legacy", slug: params[0], name: "Tenant" }] };
        if (sql.includes('from "Membership"') && sql.startsWith("select")) return { rows: [] };
        if (sql.startsWith("insert")) return { rows: [{ id: String(params[0]), role: "TENANT_ADMIN" }] };
        throw new Error(`Unexpected SQL: ${sql}`);
      },
    };

    const result = await ensureUserAccess({ pool, email: "mvera", tenantSlug: "turpial-sound", role: "TENANT_ADMIN" });
    assert.equal(result.action, "created");
    assert.equal(result.user.email, "mvera");
  });
});
