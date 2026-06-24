import { NextResponse, NextRequest } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { Permission, getPermissionsForRole } from "../../../../lib/permissions";
import { isSuperAdmin } from "../../../../lib/tenant-access";
import type { TenantStatus, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALL_PERMISSIONS = Object.values(Permission);

const LIFECYCLE_MUTATION_BLOCKED: Record<TenantStatus, string | null> = {
  PROVISIONING: "El tenant esta en PROVISIONING. Solo se permiten invitaciones OWNER y configuracion.",
  SUSPENDED: "El tenant esta SUSPENDED. Las mutaciones estan bloqueadas hasta su reactivacion.",
  ARCHIVED: "El tenant esta ARCHIVED. Las mutaciones estan bloqueadas hasta su reactivacion.",
  ACTIVE: null,
};

function permissionsForGlobalSuperAdmin(): Array<{ permission: string; granted: boolean }> {
  const set = getPermissionsForRole("SUPER_ADMIN");
  return ALL_PERMISSIONS.map((p) => ({
    permission: p as string,
    granted: set.has(p),
  }));
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "User not found" } },
        { status: 401 },
      );
    }

    const memberships = await prisma.membership.findMany({
      where: { userId: session.user.id },
      select: { tenantId: true, role: true },
    });

    const isGlobalAdmin = isSuperAdmin(memberships);
    const effectivePermissions = isGlobalAdmin
      ? permissionsForGlobalSuperAdmin()
      : ALL_PERMISSIONS.map((p) => ({
          permission: p as string,
          granted: false,
        }));

    const tenantSlug = req.nextUrl.searchParams.get("tenant");
    let tenantContext: {
      tenantId?: string;
      tenantSlug?: string;
      tenantName?: string;
      tenantStatus?: string;
      tenantRole?: string | null;
      lifecycleBlockedReason?: string | null;
      tenantPermissions?: Array<{ permission: string; granted: boolean }>;
    } = {};

    if (tenantSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true, slug: true, name: true, status: true },
      });
      if (tenant) {
        const membership = memberships.find((m) => m.tenantId === tenant.id);
        const role = membership?.role ?? null;
        const rolePermissions = role ? getPermissionsForRole(role) : new Set<Permission>();

        const tenantPerms = ALL_PERMISSIONS.map((p) => ({
          permission: p as string,
          granted: isGlobalAdmin || rolePermissions.has(p),
        }));

        const lifecycleReason = LIFECYCLE_MUTATION_BLOCKED[tenant.status];

        tenantContext = {
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
          tenantStatus: tenant.status,
          tenantRole: role,
          lifecycleBlockedReason: lifecycleReason,
          tenantPermissions: tenantPerms,
        };
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          globalRole: isGlobalAdmin ? "SUPER_ADMIN" : null,
        },
        effectivePermissions,
        tenant: tenantContext,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to load capabilities" } },
      { status: 500 },
    );
  }
}
