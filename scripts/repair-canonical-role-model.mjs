import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const APPLY = process.argv.includes("--apply");
const ALLOW_MUTATION = process.env.HEPTACORE_ALLOW_ROLE_REPAIR === "1";
const AMBIGUOUS_ROLES = new Set(["STRATEGIST", "EDITOR", "ANALYST", "APPROVER", "VIEWER"]);
const SAFE_CONVERSIONS = new Map([
  ["OWNER", "TENANT_ADMIN"],
  ["ADMIN", "TENANT_ADMIN"],
  ["TENANT_ADMIN", "TENANT_ADMIN"],
  ["PUBLISHER", "PUBLISHER"],
]);

if (APPLY && !ALLOW_MUTATION) {
  console.error("[ABORT] Refusing to mutate without HEPTACORE_ALLOW_ROLE_REPAIR=1");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function summarize(records) {
  const byRole = {};
  for (const record of records) {
    byRole[record.role] = (byRole[record.role] || 0) + 1;
  }
  return byRole;
}

function redactIdentifier(value) {
  const text = String(value || "");
  if (!text) return text;
  if (!text.includes("@")) return text;
  const [local, domain] = text.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

try {
  const memberships = await prisma.$queryRawUnsafe(`
    SELECT
      m.id AS "membershipId",
      m."tenantId" AS "tenantId",
      m."userId" AS "userId",
      m.role::text AS "role",
      t.slug AS "tenantSlug",
      u.email AS "userIdentifier",
      u."platformRole"::text AS "platformRole"
    FROM "Membership" m
    JOIN "Tenant" t ON t.id = m."tenantId"
    JOIN "User" u ON u.id = m."userId"
    ORDER BY m."tenantId", m."userId"
  `);

  const ambiguous = memberships.filter((membership) => AMBIGUOUS_ROLES.has(membership.role));
  const report = {
    applyRequested: APPLY,
    safeToApply: ambiguous.length === 0,
    roleCounts: summarize(memberships),
    superAdminMemberships: memberships
      .filter((membership) => membership.role === "SUPER_ADMIN")
      .map((membership) => ({
        membershipId: membership.membershipId,
        userId: membership.userId,
        tenantId: membership.tenantId,
        tenantSlug: membership.tenantSlug,
        userIdentifier: redactIdentifier(membership.userIdentifier),
        currentPlatformRole: membership.platformRole,
      })),
    ambiguousMemberships: ambiguous.map((membership) => ({
      membershipId: membership.membershipId,
      role: membership.role,
      userId: membership.userId,
      tenantId: membership.tenantId,
      tenantSlug: membership.tenantSlug,
      userIdentifier: redactIdentifier(membership.userIdentifier),
    })),
    safeConversions: memberships
      .filter((membership) => SAFE_CONVERSIONS.has(membership.role))
      .map((membership) => ({
        membershipId: membership.membershipId,
        from: membership.role,
        to: SAFE_CONVERSIONS.get(membership.role),
        userId: membership.userId,
        tenantId: membership.tenantId,
        tenantSlug: membership.tenantSlug,
      })),
  };

  console.log(JSON.stringify(report, null, 2));

  if (ambiguous.length > 0) {
    console.error("[ABORT] Ambiguous legacy roles detected. Manual assignment decision required before repair.");
    process.exit(2);
  }

  if (!APPLY) {
    console.log("[DRY-RUN] No changes applied. Re-run with --apply and HEPTACORE_ALLOW_ROLE_REPAIR=1 to mutate.");
    process.exit(0);
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`
      UPDATE "User" u
      SET "platformRole" = 'SUPER_ADMIN'::"PlatformRole"
      WHERE EXISTS (
        SELECT 1
        FROM "Membership" m
        WHERE m."userId" = u.id
          AND m.role::text = 'SUPER_ADMIN'
      )
    `);

    await tx.$executeRawUnsafe(`
      DELETE FROM "Membership"
      WHERE role::text = 'SUPER_ADMIN'
    `);

    await tx.$executeRawUnsafe(`
      UPDATE "Membership"
      SET role = 'TENANT_ADMIN'::"UserRole"
      WHERE role::text IN ('OWNER', 'ADMIN')
    `);
  });

  console.log("[DONE] Canonical role repair applied successfully.");
} finally {
  await prisma.$disconnect();
  await pool.end();
}
