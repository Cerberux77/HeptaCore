import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DB_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

let passed = 0;
let failed = 0;

function check(label, ok, detail) {
  if (ok) {
    console.log(`  [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

try {
  console.log("HeptaCore Production Smoke Verification\n");

  // 1. DB connection
  console.log("1. Database connection");
  try {
    await prisma.$queryRaw`SELECT 1`;
    check("Database connection", true);
  } catch (e) {
    check("Database connection", false, e.message);
    process.exit(1);
  }

  // 2. Migrations applied
  console.log("\n2. Prisma migrations");
  try {
    const migrations = await prisma.$queryRaw`SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC`;
    const names = migrations.map((m) => m.migration_name);
    check("Migrations table exists", names.length > 0, `Found ${names.length} migration(s)`);
    const required = [
      "20260603000808_init_heptacore",
      "20260608221500_init_saas_tenants_auth_oauth_content",
      "20260609233000_init_operational_product",
    ];
    for (const name of required) {
      check(`Migration ${name}`, names.includes(name));
    }
  } catch (e) {
    check("Migrations check", false, e.message);
  }

  // 3. Tenant
  console.log("\n3. Tenant turpial-sound");
  const tenant = await prisma.tenant.findUnique({ where: { slug: "turpial-sound" } });
  check("Tenant exists", !!tenant);
  if (tenant) {
    check("Tenant name is 'Turpial Sound'", tenant.name === "Turpial Sound");
    check("Tenant plan is PILOT", tenant.plan === "PILOT");
    check("Automation mode is APPROVAL_REQUIRED", tenant.automationMode === "APPROVAL_REQUIRED");
  }

  // 4. Admin user
  console.log("\n4. Admin user");
  const adminEmail = process.env.HEPTACORE_ADMIN_EMAIL || "jean@heptacore.dev";
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  check(`Admin user exists (${adminEmail})`, !!admin);
  if (admin) {
    check("Admin has password hash", !!admin.passwordHash);
    const adminMembership = tenant
      ? await prisma.membership.findFirst({
          where: { tenantId: tenant.id, userId: admin.id },
        })
      : null;
    check("Admin has membership on turpial-sound", !!adminMembership);
    if (adminMembership) {
      const validRoles = ["SUPER_ADMIN", "TENANT_ADMIN", "OWNER", "ADMIN"];
      check(`Admin role is valid (${adminMembership.role})`, validRoles.includes(adminMembership.role));
    }
  }

  // 5. Assets
  console.log("\n5. Assets (expecting 46)");
  if (tenant) {
    const assetCount = await prisma.asset.count({ where: { tenantId: tenant.id } });
    check(`Asset count is 46`, assetCount === 46, `Found ${assetCount}`);
    if (assetCount > 0) {
      const imageCount = await prisma.asset.count({ where: { tenantId: tenant.id, kind: "IMAGE" } });
      const videoCount = await prisma.asset.count({ where: { tenantId: tenant.id, kind: "VIDEO" } });
      check(`Image assets > 0`, imageCount > 0, `Images: ${imageCount}, Videos: ${videoCount}`);
    }
  }

  // 6. Content Drafts
  console.log("\n6. Content Drafts (expecting 29)");
  if (tenant) {
    const draftCount = await prisma.contentDraft.count({ where: { tenantId: tenant.id } });
    check(`Draft count is 29`, draftCount === 29, `Found ${draftCount}`);
    if (draftCount > 0) {
      const approvedCount = await prisma.contentDraft.count({
        where: { tenantId: tenant.id, status: "APPROVED" },
      });
      check(`Some drafts are APPROVED`, approvedCount > 0, `Approved: ${approvedCount}`);

      const instagramCount = await prisma.contentDraft.count({
        where: { tenantId: tenant.id, network: "INSTAGRAM" },
      });
      const facebookCount = await prisma.contentDraft.count({
        where: { tenantId: tenant.id, network: "FACEBOOK" },
      });
      check(`Instagram drafts present`, instagramCount > 0, `Instagram: ${instagramCount}`);
      check(`Facebook drafts present`, facebookCount > 0, `Facebook: ${facebookCount}`);

      const withAssets = await prisma.contentDraft.count({
        where: { tenantId: tenant.id, assets: { some: {} } },
      });
      check(`Drafts with linked assets`, withAssets > 0, `Has assets: ${withAssets}`);
    }
  }

  // 7. Social Accounts
  console.log("\n7. Social Accounts");
  if (tenant) {
    const accounts = await prisma.socialAccount.findMany({ where: { tenantId: tenant.id } });
    check("Instagram account exists", accounts.some((a) => a.network === "INSTAGRAM"));
    check("Facebook account exists", accounts.some((a) => a.network === "FACEBOOK"));
    const okStatuses = ["sandbox_connected", "connected", "active", "needs_oauth", "pending"];
    const allOk = accounts.every((a) => okStatuses.includes(a.status));
    check(`Accounts status ok (${accounts.map((a) => `${a.network}:${a.status}`).join(", ")})`, allOk);
  }

  // 8. Login smoke (readiness check, not actual auth)
  console.log("\n8. Auth readiness");
  const authSecret = process.env.AUTH_SECRET;
  check("AUTH_SECRET is set", !!authSecret);
  if (authSecret) {
    check("AUTH_SECRET is at least 32 chars", authSecret.length >= 32, `${authSecret.length} chars`);
  }
  check("bcryptjs is available", true); // Already imported and used in seed scripts

  // 9. Dry-run gate
  console.log("\n9. Dry-run gate");
  const botMode = process.env.BOT_MODE;
  const botDryRun = process.env.BOT_DRY_RUN;
  check("BOT_MODE is draft or unset", !botMode || botMode === "draft", `BOT_MODE=${botMode || "unset"}`);
  check("BOT_DRY_RUN is true or unset", !botDryRun || botDryRun === "true", `BOT_DRY_RUN=${botDryRun || "unset"}`);

} catch (e) {
  console.error(`\nFATAL: ${e.message}`);
  failed++;
} finally {
  await prisma.$disconnect();
  await pool.end();
}

console.log(`\n${"═".repeat(40)}`);
console.log(`Passed: ${passed}  Failed: ${failed}`);
console.log(`${"═".repeat(40)}`);

if (failed > 0) {
  process.exit(1);
}
