import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const ALLOW = process.env.ALLOW_QA_SEED;
const VERCEL_ENV = process.env.VERCEL_ENV;
const DATABASE_URL = process.env.DATABASE_URL;
const QA_PASSWORD = process.env.HEPTACORE_QA_E2E_PASSWORD;
const EXPECTED_HOST = "ep-lively-lake-aq2uvkv4";

function abort(reason) {
  console.error("[ABORT] " + reason);
  process.exit(1);
}

if (ALLOW !== "1") abort("ALLOW_QA_SEED must be 1");
if (VERCEL_ENV !== "preview") abort("VERCEL_ENV must be preview");
if (!DATABASE_URL) abort("DATABASE_URL is required");
if (!QA_PASSWORD) abort("HEPTACORE_QA_E2E_PASSWORD is required");
if (!DATABASE_URL.includes(EXPECTED_HOST)) abort("DATABASE_URL host mismatch");

const QA_TENANT_SLUG = "qa-e2e-active";
const BASE_TENANT_SLUG = "turpial-sound";

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
