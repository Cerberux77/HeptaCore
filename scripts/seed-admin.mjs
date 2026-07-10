import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const PLATFORM_ADMIN_IDENTIFIERS = (
  process.env.HEPTACORE_PLATFORM_ADMIN_IDENTIFIERS
    || process.env.HEPTACORE_PLATFORM_ADMINS
    || "mvera,jean"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function normalizePlatformAdminIdentifier(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) throw new Error("Empty platform admin identifier is not allowed");
  return trimmed.includes("@") ? trimmed.toLowerCase() : trimmed;
}

function displayNameFromIdentifier(identifier) {
  return identifier.includes("@") ? identifier.split("@")[0] : identifier;
}

for (const configuredIdentifier of PLATFORM_ADMIN_IDENTIFIERS) {
  const email = normalizePlatformAdminIdentifier(configuredIdentifier);
  const name = displayNameFromIdentifier(email);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: null,
        platformRole: "SUPER_ADMIN",
      },
    });
    console.log(`Platform admin created: ${email}`);
    continue;
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: {
      name: existing.name || name,
      platformRole: "SUPER_ADMIN",
    },
  });
  console.log(`Platform admin updated: ${email}`);
}

await prisma.$disconnect();
await pool.end();
console.log("[DONE] Platform admin bootstrap complete.");
