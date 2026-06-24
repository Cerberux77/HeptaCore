import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const VERIFICATION_URL = process.env.VERCEL_URL || process.env.VERCEL_BRANCH_URL || "";
const IS_PREVIEW = VERIFICATION_URL && !VERIFICATION_URL.includes("heptacore.vercel.app");

if (!IS_PREVIEW) {
  console.error("[ABORT] Seed script must run against a Preview deployment, not Production.");
  process.exit(1);
}

const QA_PASSWORD = process.env.HEPTACORE_QA_E2E_PASSWORD;
if (!QA_PASSWORD) {
  console.error("[ABORT] HEPTACORE_QA_E2E_PASSWORD environment variable is required.");
  process.exit(1);
}

const QA_TENANT_SLUG = process.env.HEPTACORE_QA_TENANT_SLUG || "qa-e2e-active";
const TENANT_SLUG = process.env.HEPTACORE_TENANT_SLUG === "turpial"
  ? "turpial-sound"
  : process.env.HEPTACORE_TENANT_SLUG || "turpial-sound";

if (!process.env.DATABASE_URL) {
  console.error("[ABORT] DATABASE_URL is required.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function ensureUser(email: string, name: string, role: string, tenantSlug: string) {
  const hash = await bcrypt.hash(QA_PASSWORD, 10);

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, name, passwordHash: hash } });
    console.log(`[CREATED] User: ${email}`);
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash, name } });
    console.log(`[UPDATED] User: ${email}`);
  }

  const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error(`Tenant ${tenantSlug} not found`);

  const membership = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, userId: user.id },
  });
  if (!membership) {
    await prisma.membership.create({ data: { tenantId: tenant.id, userId: user.id, role } });
    console.log(`[CREATED] Membership: ${role} on ${tenantSlug} for ${email}`);
  } else if (membership.role !== role) {
    await prisma.membership.update({ where: { id: membership.id }, data: { role } });
    console.log(`[UPDATED] Membership: ${role} on ${tenantSlug} for ${email}`);
  } else {
    console.log(`[OK] Membership unchanged: ${role} on ${tenantSlug} for ${email}`);
  }

  return user;
}

async function ensureLegacyUser(identifier: string, name: string, role: string, tenantSlug: string) {
  const hash = await bcrypt.hash(QA_PASSWORD, 10);

  let user = await prisma.user.findUnique({ where: { email: identifier } });
  if (!user) {
    user = await prisma.user.create({ data: { email: identifier, name, passwordHash: hash } });
    console.log(`[CREATED] Legacy user: ${identifier}`);
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash, name } });
    console.log(`[UPDATED] Legacy user: ${identifier}`);
  }

  const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error(`Tenant ${tenantSlug} not found`);

  const membership = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, userId: user.id },
  });
  if (!membership) {
    await prisma.membership.create({ data: { tenantId: tenant.id, userId: user.id, role } });
    console.log(`[CREATED] Membership: ${role} on ${tenantSlug} for ${identifier}`);
  }

  return user;
}

async function ensureTenant(slug: string) {
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
    console.log(`[CREATED] Tenant: ${slug}`);
  } else {
    console.log(`[OK] Tenant exists: ${slug}`);
  }
  return tenant;
}

try {
  console.log(`[QA SEED] Starting seed for Preview: ${VERIFICATION_URL}`);

  const baseTenant = await ensureTenant(TENANT_SLUG);
  const qaTenant = await ensureTenant(QA_TENANT_SLUG);

  await ensureUser("qa-superadmin@heptacore.test", "QA SuperAdmin", "SUPER_ADMIN", TENANT_SLUG);
  await ensureUser("qa-owner@heptacore.test", "QA Owner", "OWNER", QA_TENANT_SLUG);
  await ensureUser("qa-admin@heptacore.test", "QA Admin", "ADMIN", QA_TENANT_SLUG);
  await ensureUser("qa-viewer@heptacore.test", "QA Viewer", "VIEWER", QA_TENANT_SLUG);
  await ensureLegacyUser("qa-legacy", "QA Legacy", "VIEWER", QA_TENANT_SLUG);

  console.log("[QA SEED] Complete.");
} catch (error) {
  console.error("[QA SEED] Failed:", error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
