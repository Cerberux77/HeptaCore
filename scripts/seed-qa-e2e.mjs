import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { pathToFileURL } from "node:url";

const QA_TENANT_SLUG = "qa-e2e-active";
const BASE_TENANT_SLUG = "turpial-sound";

export function parseDbHost(databaseUrl) {
  if (!databaseUrl || typeof databaseUrl !== "string") return null;
  try {
    return new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function parseHostAllowlist(allowlistRaw, expectedHostRaw) {
  return [allowlistRaw || "", expectedHostRaw || ""]
    .join(",")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isHostAuthorized(host, allowlist) {
  if (!host || !Array.isArray(allowlist) || allowlist.length === 0) return false;
  return allowlist.some((entry) => host === entry || host.includes(entry));
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const qaPassword = process.env.HEPTACORE_QA_E2E_PASSWORD;
  const abort = (reason) => {
    console.error("[ABORT] " + reason);
    process.exit(1);
  };

  if (process.env.ALLOW_QA_SEED !== "1") abort("ALLOW_QA_SEED must be 1");
  if (process.env.VERCEL_ENV !== "preview") abort("VERCEL_ENV must be preview");
  if (!databaseUrl) abort("DATABASE_URL is required");
  if (!qaPassword) abort("HEPTACORE_QA_E2E_PASSWORD is required");

  const allowlist = parseHostAllowlist(
    process.env.HEPTACORE_QA_DATABASE_HOST_ALLOWLIST,
    process.env.HEPTACORE_QA_DATABASE_EXPECTED_HOST,
  );
  if (allowlist.length === 0) {
    abort(
      "no QA database host allowlist configured (set HEPTACORE_QA_DATABASE_HOST_ALLOWLIST or HEPTACORE_QA_DATABASE_EXPECTED_HOST)",
    );
  }

  const currentHost = parseDbHost(databaseUrl);
  if (!currentHost) abort("DATABASE_URL is not a valid connection URL");
  if (!isHostAuthorized(currentHost, allowlist)) {
    console.error("[GUARD] current DB host: " + currentHost);
    console.error("[GUARD] authorized hosts: " + allowlist.join(", "));
    abort("DATABASE_URL host is not in the QA allowlist");
  }

  console.log("[GUARD] QA seed authorized for host: " + currentHost);
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  async function ensureTenant(slug) {
    let tenant = await prisma.tenant.findFirst({ where: { slug } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          slug,
          name: slug.replace(/-/g, " ").toUpperCase(),
          status: "ACTIVE",
          plan: "PILOT",
          timezone: "UTC",
          locale: "es",
        },
      });
      console.log("[TENANT] created:", slug);
    } else {
      console.log("[TENANT] exists:", slug);
    }
    return tenant;
  }

  async function ensureUser(email, name, role, tenantSlug) {
    const passwordHash = await bcrypt.hash(qaPassword, 10);
    const platformRole = role === "SUPER_ADMIN" ? "SUPER_ADMIN" : null;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email, name, passwordHash, platformRole } });
      console.log("[USER] created:", email);
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, name, platformRole },
      });
      console.log("[USER] updated:", email);
    }

    if (platformRole === "SUPER_ADMIN") return user;

    const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) throw new Error("Tenant " + tenantSlug + " not found");
    const membership = await prisma.membership.findFirst({
      where: { tenantId: tenant.id, userId: user.id },
    });
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

  try {
    console.log("[QA SEED] Starting...");
    await ensureTenant(BASE_TENANT_SLUG);
    await ensureTenant(QA_TENANT_SLUG);
    await ensureUser("qa-superadmin@heptacore.test", "QA SuperAdmin", "SUPER_ADMIN", BASE_TENANT_SLUG);
    await ensureUser("qa-tenant-admin@heptacore.test", "QA Tenant Admin", "TENANT_ADMIN", QA_TENANT_SLUG);
    await ensureUser("qa-publisher@heptacore.test", "QA Publisher", "PUBLISHER", QA_TENANT_SLUG);
    console.log("[QA SEED] Complete.");
  } catch (error) {
    console.error("[QA SEED] Failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  await main();
}
