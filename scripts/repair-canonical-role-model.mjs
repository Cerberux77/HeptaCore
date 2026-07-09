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

try {
  const memberships = await prisma.membership.findMany({
    include: {
      tenant: { select: { id: true, slug: true } },
      user: { select: { id: true, email: true, platformRole: true } },
    },
    orderBy: [{ tenantId: "asc" }, { userId: "asc" }],
  });

  const ambiguous = memberships.filter((membership) => AMBIGUOUS_ROLES.has(membership.role));
  const report = {
    applyRequested: APPLY,
    safeToApply: ambiguous.length === 0,
    roleCounts: summarize(memberships),
    superAdminMemberships: memberships
      .filter((membership) => membership.role === "SUPER_ADMIN")
      .map((membership) => ({
        membershipId: membership.id,
        userId: membership.userId,
        tenantId: membership.tenantId,
        tenantSlug: membership.tenant.slug,
        currentPlatformRole: membership.user.platformRole,
      })),
    ambiguousMemberships: ambiguous.map((membership) => ({
      membershipId: membership.id,
      role: membership.role,
      userId: membership.userId,
      tenantId: membership.tenantId,
      tenantSlug: membership.tenant.slug,
    })),
    safeConversions: memberships
      .filter((membership) => SAFE_CONVERSIONS.has(membership.role))
      .map((membership) => ({
        membershipId: membership.id,
        from: membership.role,
        to: SAFE_CONVERSIONS.get(membership.role),
        userId: membership.userId,
        tenantId: membership.tenantId,
        tenantSlug: membership.tenant.slug,
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
    const superAdminUserIds = [...new Set(
      memberships.filter((membership) => membership.role === "SUPER_ADMIN").map((membership) => membership.userId),
    )];

    for (const userId of superAdminUserIds) {
      await tx.user.update({
        where: { id: userId },
        data: { platformRole: "SUPER_ADMIN" },
      });
    }

    await tx.membership.deleteMany({
      where: { role: "SUPER_ADMIN" },
    });

    await tx.membership.updateMany({
      where: { role: "OWNER" },
      data: { role: "TENANT_ADMIN" },
    });

    await tx.membership.updateMany({
      where: { role: "ADMIN" },
      data: { role: "TENANT_ADMIN" },
    });
  });

  console.log("[DONE] Canonical role repair applied successfully.");
} finally {
  await prisma.$disconnect();
  await pool.end();
}
