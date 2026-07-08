import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { pathToFileURL } from "node:url";

// Deterministic Preview admin bootstrap.
//
// There are NO hardcoded credentials or emails. Every value comes from the
// environment. The script is preview-only and idempotent, and it never logs
// passwords, DATABASE_URL, tokens or connection strings.

const REQUIRED_ADMIN_ENV = [
  "HEPTACORE_ADMIN_EMAIL",
  "HEPTACORE_ADMIN_PASSWORD",
  "HEPTACORE_ADMIN_ROLE",
  "HEPTACORE_TENANT_SLUG",
];

/**
 * Validate and extract the required admin bootstrap configuration from an env
 * bag. Throws an error listing ONLY the missing variable names (never values).
 */
export function requireAdminBootstrapEnv(env) {
  const missing = REQUIRED_ADMIN_ENV.filter((key) => !env[key] || !String(env[key]).trim());
  if (missing.length > 0) {
    const error = new Error("Missing required admin bootstrap env: " + missing.join(", "));
    error.code = "MISSING_ADMIN_ENV";
    error.missing = missing;
    throw error;
  }
  return {
    email: String(env.HEPTACORE_ADMIN_EMAIL).trim(),
    password: String(env.HEPTACORE_ADMIN_PASSWORD),
    role: String(env.HEPTACORE_ADMIN_ROLE).trim(),
    tenantSlug: String(env.HEPTACORE_TENANT_SLUG).trim(),
    name: env.HEPTACORE_ADMIN_NAME ? String(env.HEPTACORE_ADMIN_NAME).trim() : null,
  };
}

/** The Preview admin bootstrap only ever provisions a SUPER_ADMIN. */
export function assertSuperAdminRole(role) {
  if (role !== "SUPER_ADMIN") {
    const error = new Error(
      'HEPTACORE_ADMIN_ROLE must be exactly "SUPER_ADMIN" for the Preview admin bootstrap.',
    );
    error.code = "INVALID_ADMIN_ROLE";
    throw error;
  }
}

/**
 * Idempotent upsert of the configured super admin and their tenant membership.
 * `prisma` and `hashPassword` are injected so this is unit-testable without a
 * real database. Existing users keep their unrelated data (only passwordHash is
 * refreshed); memberships are created or promoted to the configured role.
 */
export async function upsertSuperAdmin({ prisma, hashPassword, email, name, password, role, tenantSlug }) {
  const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug } });
  if (!tenant) {
    const error = new Error(
      `Tenant "${tenantSlug}" not found. Set HEPTACORE_TENANT_SLUG to an existing tenant slug.`,
    );
    error.code = "TENANT_NOT_FOUND";
    throw error;
  }

  const passwordHash = await hashPassword(password);

  let user = await prisma.user.findUnique({ where: { email } });
  let userCreated = false;
  if (!user) {
    user = await prisma.user.create({ data: { email, name: name || email, passwordHash } });
    userCreated = true;
  } else {
    // Preserve unrelated fields (e.g. name); only refresh the credential.
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, userId: user.id },
  });

  let membershipAction;
  if (!membership) {
    await prisma.membership.create({ data: { tenantId: tenant.id, userId: user.id, role } });
    membershipAction = "created";
  } else if (membership.role !== role) {
    await prisma.membership.update({ where: { id: membership.id }, data: { role } });
    membershipAction = "updated";
  } else {
    membershipAction = "unchanged";
  }

  return { userId: user.id, tenantId: tenant.id, userCreated, membershipAction, role, tenantSlug };
}

async function main() {
  const abort = (reason) => {
    console.error("[ABORT] " + reason);
    process.exit(1);
  };

  if (process.env.VERCEL_ENV !== "preview") abort("VERCEL_ENV must be preview for admin bootstrap");
  if (!process.env.DATABASE_URL) abort("DATABASE_URL is required");

  let cfg;
  try {
    cfg = requireAdminBootstrapEnv(process.env);
    assertSuperAdminRole(cfg.role);
  } catch (error) {
    abort(error instanceof Error ? error.message : String(error));
    return;
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const result = await upsertSuperAdmin({
      prisma,
      hashPassword: (plain) => bcrypt.hash(plain, 10),
      email: cfg.email,
      name: cfg.name,
      password: cfg.password,
      role: cfg.role,
      tenantSlug: cfg.tenantSlug,
    });
    // Log identity + outcome only. Never the password / DATABASE_URL / tokens.
    console.log(
      `[ADMIN BOOTSTRAP] email=${cfg.email} userCreated=${result.userCreated} membership=${result.membershipAction} role=${result.role} tenant=${result.tenantSlug}`,
    );
    console.log("[ADMIN BOOTSTRAP] Complete.");
  } catch (error) {
    console.error("[ADMIN BOOTSTRAP] Failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Only run when invoked directly, so the pure helpers stay importable/testable
// without opening a database connection.
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  await main();
}
