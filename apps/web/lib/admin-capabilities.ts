import { Permission, getPermissionsForRole } from "./permissions";
import type { PlatformRole, UserRole, TenantStatus } from "@prisma/client";
import { PLATFORM_ROLE_SUPER_ADMIN, isPlatformSuperAdmin } from "./role-model";

const ALL_PERMISSIONS = Object.values(Permission);

export const LIFECYCLE_MUTATION_BLOCKED: Record<string, string | null> = {
  PROVISIONING: "El tenant esta en PROVISIONING. Solo se permiten invitaciones TENANT_ADMIN y configuracion.",
  SUSPENDED: "El tenant esta SUSPENDED. Las mutaciones estan bloqueadas hasta su reactivacion.",
  ARCHIVED: "El tenant esta ARCHIVED. Las mutaciones estan bloqueadas hasta su reactivacion.",
  ACTIVE: null,
};

export interface CapabilityUser {
  id: string;
  email: string;
  name: string | null;
  globalRole: string | null;
}

export interface CapabilityPermission {
  permission: string;
  granted: boolean;
}

export interface CapabilityTenantContext {
  tenantId?: string;
  tenantSlug?: string;
  tenantName?: string;
  tenantStatus?: string;
  tenantRole?: string | null;
  lifecycleBlockedReason?: string | null;
  tenantPermissions?: CapabilityPermission[];
}

export interface AdminCapabilities {
  user: CapabilityUser;
  effectivePermissions: CapabilityPermission[];
  tenant: CapabilityTenantContext;
}

export interface CapabilityResolverDb {
  user: {
    findUnique(args: { where: { id: string }; select: { id: true; email: true; name: true; platformRole: true } }): Promise<{ id: string; email: string; name: string | null; platformRole: PlatformRole | null } | null>;
  };
  membership: {
    findMany(args: { where: { userId: string }; select: { tenantId: true; role: true } }): Promise<Array<{ tenantId: string; role: UserRole }>>;
  };
  tenant: {
    findUnique(args: { where: { slug: string }; select: { id: true; slug: true; name: true; status: true } }): Promise<{ id: string; slug: string; name: string; status: TenantStatus } | null>;
  };
}

export async function resolveAdminCapabilities(
  userId: string,
  tenantSlug: string | null,
  db: CapabilityResolverDb,
): Promise<AdminCapabilities> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, platformRole: true },
  });
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  if (!isPlatformSuperAdmin(user.platformRole)) {
    throw new Error("FORBIDDEN");
  }

  const memberships = await db.membership.findMany({
    where: { userId },
    select: { tenantId: true, role: true },
  });

  const superAdminPermissionSet = getPermissionsForRole(PLATFORM_ROLE_SUPER_ADMIN);
  const effectivePermissions: CapabilityPermission[] = ALL_PERMISSIONS.map((p) => ({
    permission: p as string,
    granted: superAdminPermissionSet.has(p),
  }));

  let tenant: CapabilityTenantContext = {};

  if (tenantSlug) {
    const t = await db.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, slug: true, name: true, status: true },
    });
    if (!t) {
      throw new Error("NOT_FOUND");
    }
    const membership = memberships.find((m) => m.tenantId === t.id);
    const role = membership?.role ?? null;
    const rolePermissions = getPermissionsForRole(PLATFORM_ROLE_SUPER_ADMIN);
    const tenantPerms = ALL_PERMISSIONS.map((p) => ({
      permission: p as string,
      granted: rolePermissions.has(p),
    }));
    const lifecycleReason = LIFECYCLE_MUTATION_BLOCKED[t.status] ?? null;
    tenant = {
      tenantId: t.id,
      tenantSlug: t.slug,
      tenantName: t.name,
      tenantStatus: t.status,
      tenantRole: role,
      lifecycleBlockedReason: lifecycleReason,
      tenantPermissions: tenantPerms,
    };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      globalRole: user.platformRole,
    },
    effectivePermissions,
    tenant,
  };
}
