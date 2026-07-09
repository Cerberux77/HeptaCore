import { type UserRole } from "@prisma/client";
import { TenantAccessError, type TenantAdminDb } from "./tenant-access";
import { PLATFORM_ROLE_SUPER_ADMIN, isPlatformSuperAdmin, normalizeFunctionalTenantRole } from "./role-model";

export const Permission = {
  TENANT_READ: "TENANT_READ",
  TENANT_CONFIG_UPDATE: "TENANT_CONFIG_UPDATE",
  TENANT_STATUS_CHANGE: "TENANT_STATUS_CHANGE",
  MEMBERS_READ: "MEMBERS_READ",
  MEMBERS_ADD: "MEMBERS_ADD",
  MEMBERS_ROLE_UPDATE: "MEMBERS_ROLE_UPDATE",
  MEMBERS_REMOVE: "MEMBERS_REMOVE",
  INVITATIONS_READ: "INVITATIONS_READ",
  INVITATIONS_CREATE: "INVITATIONS_CREATE",
  INVITATIONS_REISSUE: "INVITATIONS_REISSUE",
  INVITATIONS_REVOKE: "INVITATIONS_REVOKE",
  INTEGRATIONS_MANAGE: "INTEGRATIONS_MANAGE",
  SECURITY_MANAGE: "SECURITY_MANAGE",
  PROJECTS_WRITE: "PROJECTS_WRITE",
  CONTENT_WRITE: "CONTENT_WRITE",
  CONTENT_APPROVE: "CONTENT_APPROVE",
  CONTENT_PUBLISH: "CONTENT_PUBLISH",
  ANALYTICS_READ: "ANALYTICS_READ",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const ALL_TENANT_PERMISSIONS: Permission[] = Object.values(Permission);

function superAdminPermissions(): Set<Permission> {
  return new Set(ALL_TENANT_PERMISSIONS);
}

const TENANT_ADMIN_PERMISSIONS: Permission[] = [
  Permission.TENANT_READ,
  Permission.MEMBERS_READ,
  Permission.MEMBERS_ADD,
  Permission.MEMBERS_ROLE_UPDATE,
  Permission.MEMBERS_REMOVE,
  Permission.INVITATIONS_READ,
  Permission.INVITATIONS_CREATE,
  Permission.INVITATIONS_REISSUE,
  Permission.INVITATIONS_REVOKE,
  Permission.INTEGRATIONS_MANAGE,
  Permission.TENANT_CONFIG_UPDATE,
  Permission.PROJECTS_WRITE,
  Permission.CONTENT_WRITE,
  Permission.CONTENT_APPROVE,
  Permission.CONTENT_PUBLISH,
  Permission.ANALYTICS_READ,
];

const PUBLISHER_PERMISSIONS: Permission[] = [
  Permission.TENANT_READ,
  Permission.PROJECTS_WRITE,
  Permission.CONTENT_WRITE,
  Permission.CONTENT_APPROVE,
  Permission.CONTENT_PUBLISH,
  Permission.ANALYTICS_READ,
];

const CANONICAL_PERMISSION_MAP: Record<string, Set<Permission>> = {
  [PLATFORM_ROLE_SUPER_ADMIN]: superAdminPermissions(),
  TENANT_ADMIN: new Set(TENANT_ADMIN_PERMISSIONS),
  PUBLISHER: new Set(PUBLISHER_PERMISSIONS),
};

export function getPermissionsForRole(role: UserRole | string): ReadonlySet<Permission> {
  if (role === PLATFORM_ROLE_SUPER_ADMIN) return CANONICAL_PERMISSION_MAP[PLATFORM_ROLE_SUPER_ADMIN];
  const canonical = normalizeFunctionalTenantRole(role);
  if (canonical === null) return new Set();
  return CANONICAL_PERMISSION_MAP[canonical] ?? new Set();
}

export function hasRolePermission(role: UserRole | string, permission: Permission): boolean {
  if (role === PLATFORM_ROLE_SUPER_ADMIN) return (CANONICAL_PERMISSION_MAP[PLATFORM_ROLE_SUPER_ADMIN]?.has(permission)) ?? false;
  const canonical = normalizeFunctionalTenantRole(role);
  if (canonical === null) return false;
  return CANONICAL_PERMISSION_MAP[canonical]?.has(permission) ?? false;
}

export interface PermissionAccessDb {
  user: {
    findUnique(args: { where: { id: string }; select: { id: true; platformRole: true } }): Promise<{ id: string; platformRole: "SUPER_ADMIN" | null } | null>;
  };
  membership: {
    findUnique(args: { where: { tenantId_userId: { tenantId: string; userId: string } }; select: { role: true } }): Promise<{ role: UserRole } | null>;
  };
}

async function isGlobalSuperAdmin(userId: string, db: Pick<PermissionAccessDb, "user">): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, platformRole: true },
  });
  return isPlatformSuperAdmin(user?.platformRole ?? null);
}

export async function hasTenantPermission(
  userId: string,
  tenantId: string,
  permission: Permission,
  db: PermissionAccessDb,
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, platformRole: true },
  });
  if (!user) return false;

  if (isPlatformSuperAdmin(user.platformRole)) return true;

  const membership = await db.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { role: true },
  });
  if (!membership) return false;

  return hasRolePermission(membership.role, permission);
}

export async function requireTenantPermission(
  userId: string,
  tenantId: string,
  permission: Permission,
  db: PermissionAccessDb,
): Promise<{ role: UserRole }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, platformRole: true },
  });
  if (!user) throw new TenantAccessError("User not found", "UNAUTHORIZED", 401);

  if (isPlatformSuperAdmin(user.platformRole)) {
    return { role: PLATFORM_ROLE_SUPER_ADMIN as UserRole };
  }

  const membership = await db.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { role: true },
  });
  if (!membership) throw new TenantAccessError("Not a member of this tenant", "NOT_MEMBER", 403);

  if (!hasRolePermission(membership.role, permission)) {
    throw new TenantAccessError(
      `Role ${membership.role} lacks permission ${permission}`,
      "FORBIDDEN",
      403,
    );
  }

  return { role: membership.role };
}
