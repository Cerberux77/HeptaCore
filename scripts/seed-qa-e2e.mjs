import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { pathToFileURL } from "node:url";

const QA_TENANT_SLUG = "qa-e2e-active";
const BASE_TENANT_SLUG = "turpial-sound";

// --- Pure, testable guard helpers (no side effects, no secrets logged) ---

/** Extract the lowercased hostname from a connection URL, or null if invalid. */
export function parseDbHost(databaseUrl) {
  if (!databaseUrl || typeof databaseUrl !== "string") return null;
  try {
    return new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Build the authorized-host allowlist from env values (comma-separated + single). */
export function parseHostAllowlist(allowlistRaw, expectedHostRaw) {
  return [allowlistRaw || "", expectedHostRaw || ""]
    .join(",")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * A host is authorized when it exactly matches an allowlist entry, or contains
 * one as a substring (supports Neon-style endpoint ids embedded in the full
 * hostname). Never authorizes when the allowlist is empty.
 */
export function isHostAuthorized(host, allowlist) {
  if (!host || !Array.isArray(allowlist) || allowlist.length === 0) return false;
  return allowlist.some((entry) => host === entry || host.includes(entry));
}

async function main() {
  const ALLOW = process.env.ALLOW_QA_SEED;
  const VERCEL_ENV = process.env.VERCEL_ENV;
  const DATABASE_URL = process.env.DATABASE_URL;
  const QA_PASSWORD = process.env.HEPTACORE_QA_E2E_PASSWORD;

  const abort = (reason) => {
    console.error("[ABORT] " + reason);
    process.exit(1);
  };

  // Safety guards — every failure aborts before any DB connection is opened.
  if (ALLOW !== "1") abort("ALLOW_QA_SEED must be 1");
  if (VERCEL_ENV !== "preview") abort("VERCEL_ENV must be preview");
  if (!DATABASE_URL) abort("DATABASE_URL is required");
  if (!QA_PASSWORD) abort("HEPTACORE_QA_E2E_PASSWORD is required");

  const allowlist = parseHostAllowlist(
    process.env.HEPTACORE_QA_DATABASE_HOST_ALLOWLIST,
    process.env.HEPTACORE_QA_DATABASE_EXPECTED_HOST,
  );
  if (allowlist.length === 0) {
    abort(
      "no QA database host allowlist configured (set HEPTACORE_QA_DATABASE_HOST_ALLOWLIST or HEPTACORE_QA_DATABASE_EXPECTED_HOST)",
    );
  }

  const currentHost = parseDbHost(DATABASE_URL);
  if (!currentHost) abort("DATABASE_URL is not a valid connection URL");

  if (!isHostAuthorized(currentHost, allowlist)) {
    // Only the hostname (never the full URL / credentials) is logged.
    console.error("[GUARD] current DB host: " + currentHost);
    console.error("[GUARD] authorized hosts: " + allowlist.join(", "));
    abort("DATABASE_URL host is not in the QA allowlist");
  }

  console.log("[GUARD] QA seed authorized for host: " + currentHost);

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  async function ensureTenant(slug) {
    let tenant = await prisma.tenant.findFirst({ where: { slug } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { slug, name: slug.replace(/-/g, " ").toUpperCase(), status: "ACTIVE", plan: "PILOT", timezone: "UTC", locale: "es" },
      });
      console.log("[TENANT] created:", slug);
    } else {
      console.log("[TENANT] exists:", slug);
    }
    return tenant;
  }

  async function ensureUser(email, name, role, tenantSlug) {
    const hash = await bcrypt.hash(QA_PASSWORD, 10);
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email, name, passwordHash: hash } });
      console.log("[USER] created:", email);
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash, name } });
      console.log("[USER] updated:", email);
    }
    const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) throw new Error("Tenant " + tenantSlug + " not found");
    const membership = await prisma.membership.findFirst({ where: { tenantId: tenant.id, userId: user.id } });
    if (!membership) {
      await prisma.membership.create({ data: { tenantId: tenant.id, userId: user.id, role } });
      console.log("[MEMBER] created:", email, role, tenantSlug);
    } else if (membership.role !== role) {
      await prisma.membership.update({ where: { id: membership.id }, data: { role } });
      console.log("[MEMBER] updated:", email, role, tenantSlug);
    } else {
      console.log("[MEMBER] unchanged:", email, role, tenantSlug);
    }
    return user;
  }

  async function ensureLegacyUser(identifier, name, role, tenantSlug) {
    const hash = await bcrypt.hash(QA_PASSWORD, 10);
    let user = await prisma.user.findUnique({ where: { email: identifier } });
    if (!user) {
      user = await prisma.user.create({ data: { email: identifier, name, passwordHash: hash } });
      console.log("[USER] created legacy:", identifier);
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash, name } });
      console.log("[USER] updated legacy:", identifier);
    }
    const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) throw new Error("Tenant " + tenantSlug + " not found");
    const membership = await prisma.membership.findFirst({ where: { tenantId: tenant.id, userId: user.id } });
    if (!membership) {
      await prisma.membership.create({ data: { tenantId: tenant.id, userId: user.id, role } });
      console.log("[MEMBER] created legacy:", identifier, role, tenantSlug);
    }
    return user;
  }

  try {
    console.log("[QA SEED] Starting...");
    await ensureTenant(BASE_TENANT_SLUG);
    await ensureTenant(QA_TENANT_SLUG);
    await ensureUser("qa-superadmin@heptacore.test", "QA SuperAdmin", "SUPER_ADMIN", BASE_TENANT_SLUG);
    await ensureUser("qa-owner@heptacore.test", "QA Owner", "OWNER", QA_TENANT_SLUG);
    await ensureUser("qa-admin@heptacore.test", "QA Admin", "ADMIN", QA_TENANT_SLUG);
    await ensureUser("qa-viewer@heptacore.test", "QA Viewer", "VIEWER", QA_TENANT_SLUG);
    await ensureLegacyUser("qa-legacy", "QA Legacy", "VIEWER", QA_TENANT_SLUG);
    console.log("[QA SEED] Complete.");
  } catch (error) {
    console.error("[QA SEED] Failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Only run the seed when executed directly (so the guard helpers stay importable
// and unit-testable without opening any DB connection).
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  await main();
}
