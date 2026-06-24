import { type UserRole } from "@prisma/client";
import { TenantAccessError, type TenantAdminDb } from "./tenant-access";

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

const ADMIN_CORE_PERMISSIONS: Permission[] = [
  Permission.MEMBERS_READ,
  Permission.MEMBERS_ADD,
  Permission.MEMBERS_ROLE_UPDATE,
  Permission.MEMBERS_REMOVE,
  Permission.INVITATIONS_READ,
  Permission.INVITATIONS_CREATE,
  Permission.INVITATIONS_REISSUE,
  Permission.INVITATIONS_REVOKE,
  Permission.INTEGRATIONS_MANAGE,
  Permission.SECURITY_MANAGE,
  Permission.TENANT_CONFIG_UPDATE,
];

const ALL_TENANT_PERMISSIONS: Permission[] = Object.values(Permission);

function superAdminPermissions(): Set<Permission> {
  return new Set(ALL_TENANT_PERMISSIONS);
}

const ADMIN_OPERATIONAL_PERMISSIONS: Permission[] = [
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

const VIEWER_PERMISSIONS: Permission[] = [
  Permission.TENANT_READ,
  Permission.ANALYTICS_READ,
];

const ROLE_PERMISSION_MAP: Record<UserRole, Set<Permission>> = {
  SUPER_ADMIN: superAdminPermissions(),
  OWNER: new Set(ALL_TENANT_PERMISSIONS),
  TENANT_ADMIN: new Set(ADMIN_OPERATIONAL_PERMISSIONS),
  ADMIN: new Set(ADMIN_OPERATIONAL_PERMISSIONS),
  STRATEGIST: new Set(ADMIN_OPERATIONAL_PERMISSIONS),
  EDITOR: new Set(ADMIN_OPERATIONAL_PERMISSIONS),
  APPROVER: new Set(ADMIN_OPERATIONAL_PERMISSIONS),
  PUBLISHER: new Set(ADMIN_OPERATIONAL_PERMISSIONS),
  ANALYST: new Set(VIEWER_PERMISSIONS),
  VIEWER: new Set(VIEWER_PERMISSIONS),
};

export function getPermissionsForRole(role: UserRole): ReadonlySet<Permission> {
  return ROLE_PERMISSION_MAP[role] ?? new Set();
}

export function hasRolePermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSION_MAP[role]?.has(permission) ?? false;
}

export interface PermissionAccessDb {
  user: {
    findUnique(args: { where: { id: string }; select: { id: true } }): Promise<{ id: string } | null>;
  };
  membership: {
    findUnique(args: { where: { tenantId_userId: { tenantId: string; userId: string } }; select: { role: true } }): Promise<{ role: UserRole } | null>;
    findMany(args: { where: { userId: string }; select: { role: true } }): Promise<Array<{ role: UserRole }>>;
  };
}

async function isGlobalSuperAdmin(userId: string, db: Pick<PermissionAccessDb, "membership">): Promise<boolean> {
  const memberships = await db.membership.findMany({
    where: { userId },
    select: { role: true },
  });
  return memberships.some((m) => m.role === "SUPER_ADMIN");
}

export async function hasTenantPermission(
  userId: string,
  tenantId: string,
  permission: Permission,
  db: PermissionAccessDb,
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return false;

  if (await isGlobalSuperAdmin(userId, db)) return true;

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
    select: { id: true },
  });
  if (!user) throw new TenantAccessError("User not found", "UNAUTHORIZED", 401);

  if (await isGlobalSuperAdmin(userId, db)) {
    return { role: "SUPER_ADMIN" as UserRole };
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
