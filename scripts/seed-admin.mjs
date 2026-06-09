import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const ADMIN_EMAIL = process.env.HEPTACORE_ADMIN_EMAIL || "jean@heptacore.dev";
const ADMIN_PASSWORD = process.env.HEPTACORE_ADMIN_PASSWORD || "admin123";
const ADMIN_ROLE = process.env.HEPTACORE_ADMIN_ROLE || "SUPER_ADMIN";
const TENANT_SLUG = process.env.HEPTACORE_TENANT_SLUG === "turpial"
  ? "turpial-sound"
  : process.env.HEPTACORE_TENANT_SLUG || "turpial-sound";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
const tenant = await prisma.tenant.findFirst({ where: { slug: TENANT_SLUG } });
if (!tenant) throw new Error(`Tenant ${TENANT_SLUG} not found`);

let user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
if (!user) {
  user = await prisma.user.create({
    data: { email: ADMIN_EMAIL, name: "Jean", passwordHash: hash },
  });
  console.log(`User created: ${user.email}`);
} else {
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
  console.log(`User updated: ${user.email}`);
}

const membership = await prisma.membership.findFirst({
  where: { tenantId: tenant.id, userId: user.id },
});
if (!membership) {
  await prisma.membership.create({
    data: { tenantId: tenant.id, userId: user.id, role: ADMIN_ROLE },
  });
  console.log(`Membership created: ${ADMIN_ROLE} on ${TENANT_SLUG}`);
} else {
  await prisma.membership.update({
    where: { id: membership.id },
    data: { role: ADMIN_ROLE },
  });
  console.log(`Membership updated: ${ADMIN_ROLE} on ${TENANT_SLUG}`);
}

await prisma.$disconnect();
await pool.end();
console.log("[DONE] Admin seed complete.");
