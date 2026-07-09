import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const PLATFORM_ADMINS = (process.env.HEPTACORE_PLATFORM_ADMINS || "mvera,jean")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function normalizeAdminEmail(value) {
  return value.includes("@") ? value.toLowerCase() : `${value.toLowerCase()}@heptacore.dev`;
}

for (const admin of PLATFORM_ADMINS) {
  const email = normalizeAdminEmail(admin);
  const name = admin.includes("@") ? admin.split("@")[0] : admin;

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
