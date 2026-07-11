import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { pathToFileURL } from "node:url";

// Preview-only, environment-driven and idempotent. Secret values are never logged.
const REQUIRED_ADMIN_ENV = [
  "HEPTACORE_ADMIN_EMAIL",
  "HEPTACORE_ADMIN_PASSWORD",
  "HEPTACORE_ADMIN_ROLE",
  "HEPTACORE_TENANT_SLUG",
];

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

export function assertSuperAdminRole(role) {
  if (role !== "SUPER_ADMIN") {
    const error = new Error(
      'HEPTACORE_ADMIN_ROLE must be exactly "SUPER_ADMIN" for the Preview admin bootstrap.',
    );
    error.code = "INVALID_ADMIN_ROLE";
    throw error;
  }
}

export async function upsertSuperAdmin({ prisma, hashPassword, email, name, password, role }) {
  assertSuperAdminRole(role);
  const passwordHash = await hashPassword(password);
  let user = await prisma.user.findUnique({ where: { email } });
  const userCreated = !user;

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: name || email,
        passwordHash,
        platformRole: "SUPER_ADMIN",
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        platformRole: "SUPER_ADMIN",
        ...(name ? { name } : {}),
      },
    });
  }

  return { userId: user.id, userCreated, platformRole: "SUPER_ADMIN" };
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
    });
    console.log(
      `[ADMIN BOOTSTRAP] email=${cfg.email} userCreated=${result.userCreated} platformRole=${result.platformRole}`,
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

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  await main();
}
