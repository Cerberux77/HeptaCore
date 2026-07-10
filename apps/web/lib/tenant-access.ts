import { prisma as defaultPrisma } from "./prisma";
import type { PlatformRole, TenantStatus, UserRole } from "@prisma/client";
import { hasRolePermission, type Permission } from "./permissions";
import { PLATFORM_ROLE_SUPER_ADMIN, isPlatformSuperAdmin } from "./role-model";

export class TenantAccessError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
    this.name = "TenantAccessError";
  }
}

export interface TenantAdminDb {
  user: {
    findUnique(args: { where: { id: string }; select: { id: true; platformRole: true } }): Promise<{ id: string; platformRole: PlatformRole | null } | null>;
  };
  membership: {
    findUnique(args: { where: { tenantId_userId: { tenantId: string; userId: string } }; select: { role: true } }): Promise<{ role: UserRole } | null>;
  };
  tenant: {
    findUnique(args: { where: { id: string }; select: { status: true } }): Promise<{ status: TenantStatus } | null>;
    findMany(args?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
    findUniqueOrThrow(args: { where: { id: string }; include?: unknown }): Promise<Record<string, unknown>>;
  };
}

export interface TenantAccessTx {
  user: {
    findUnique(args: { where: { id: string }; select: { id: true; platformRole: true } }): Promise<{ id: string; platformRole: PlatformRole | null } | null>;
  };
}

export function isSuperAdmin(platformRole: PlatformRole | null | undefined): boolean {
  return isPlatformSuperAdmin(platformRole);
}

export async function requireSuperAdminActor(
  actorId: string,
  tx: { user: { findUnique(args: { where: { id: string }; select: { id: true; platformRole: true } }): Promise<{ id: string; platformRole: PlatformRole | null } | null> } },
): Promise<string> {
  const user = await tx.user.findUnique({
    where: { id: actorId },
    select: { id: true, platformRole: true },
  });
  if (!user) throw new TenantAccessError("User not found", "UNAUTHORIZED", 401);
  if (!isSuperAdmin(user.platformRole)) {
    throw new TenantAccessError("SUPER_ADMIN role required", "FORBIDDEN", 403);
  }
  return user.id;
}

export async function requireTenantMembership(
  userId: string,
  tenantId: string,
  db: TenantAdminDb = defaultPrisma as unknown as TenantAdminDb,
): Promise<{ role: UserRole }> {
  const membership = await db.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { role: true },
  });
  if (!membership) throw new TenantAccessError("Not a member of this tenant", "NOT_MEMBER", 403);
  return membership;
}

export type TenantMutationCapability =
  | "NORMAL_OPERATION"
  | "PROVISIONING_CONFIGURATION"
  | "OWNER_INVITATION"
  | "ONBOARDING_SETUP";

const PROVISIONING_ALLOWED: TenantMutationCapability[] = [
  "PROVISIONING_CONFIGURATION",
  "OWNER_INVITATION",
  "ONBOARDING_SETUP",
];

export function assertTenantLifecycleAllowsMutation(
  status: TenantStatus,
  capability: TenantMutationCapability,
): void {
  if (status === "SUSPENDED") {
    throw new TenantAccessError("Tenant is suspended", "TENANT_SUSPENDED", 403);
  }
  if (status === "ARCHIVED") {
    throw new TenantAccessError("Tenant is archived", "TENANT_ARCHIVED", 403);
  }
  if (status === "PROVISIONING" && !PROVISIONING_ALLOWED.includes(capability)) {
    throw new TenantAccessError(
      `Tenant is provisioning; ${capability} not allowed`,
      "TENANT_PROVISIONING",
      403,
    );
  }
}

export async function requireActiveTenant(
  tenantId: string,
  db: TenantAdminDb = defaultPrisma as unknown as TenantAdminDb,
): Promise<{ status: TenantStatus }> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true },
  });
  if (!tenant) throw new TenantAccessError("Tenant not found", "NOT_FOUND", 404);
  assertTenantLifecycleAllowsMutation(tenant.status, "NORMAL_OPERATION");
  return tenant;
}

export interface ResolveTenantAccessResult {
  role: UserRole | "SUPER_ADMIN";
  status: TenantStatus;
  superAdminBypass: boolean;
}

export type AccessResolutionDb = {
  user: {
    findUnique(args: { where: { id: string }; select: { id: true; platformRole: true } }): Promise<{ id: string; platformRole: PlatformRole | null } | null>;
  };
  membership: {
    findUnique(args: { where: { tenantId_userId: { tenantId: string; userId: string } }; select: { role: true } }): Promise<{ role: UserRole } | null>;
  };
  tenant: {
    findUnique(args: { where: { id: string }; select: { id: true; status: true } }): Promise<{ id: string; status: TenantStatus } | null>;
    count(args: { where: { id: string } }): Promise<number>;
  };
};

async function isGlobalSuperAdmin(
  userId: string,
  db: Pick<AccessResolutionDb, "user">,
): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, platformRole: true } });
  if (!user) return false;
  return isSuperAdmin(user.platformRole);
}

export async function resolveTenantAccess(
  userId: string,
  tenantId: string,
  permission: Permission,
  db: AccessResolutionDb = defaultPrisma as unknown as AccessResolutionDb,
): Promise<ResolveTenantAccessResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, platformRole: true },
  });
  if (!user) throw new TenantAccessError("User not found", "UNAUTHORIZED", 401);

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, status: true },
  });
  if (!tenant) throw new TenantAccessError("Tenant not found", "NOT_FOUND", 404);

  const superAdmin = isSuperAdmin(user.platformRole);
  if (superAdmin) {
    return { role: PLATFORM_ROLE_SUPER_ADMIN, status: tenant.status, superAdminBypass: true };
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

  return { role: membership.role, status: tenant.status, superAdminBypass: false };
}

export async function resolveTenantAccessWithLifecycle(
  userId: string,
  tenantId: string,
  permission: Permission,
  capability: TenantMutationCapability,
  db: AccessResolutionDb = defaultPrisma as unknown as AccessResolutionDb,
): Promise<ResolveTenantAccessResult> {
  const result = await resolveTenantAccess(userId, tenantId, permission, db);
  assertTenantLifecycleAllowsMutation(result.status, capability);
  return result;
}

export async function resolveSuperAdminAccess(
  userId: string,
  db: Pick<AccessResolutionDb, "user"> = defaultPrisma as unknown as Pick<AccessResolutionDb, "user">,
): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, platformRole: true },
  });
  if (!user) throw new TenantAccessError("User not found", "UNAUTHORIZED", 401);
  if (!isSuperAdmin(user.platformRole)) {
    throw new TenantAccessError("SUPER_ADMIN role required", "FORBIDDEN", 403);
  }
  return user.id;
}

export function invitationCapabilityForLifecycle(status: TenantStatus, role: UserRole): TenantMutationCapability {
  if (status === "PROVISIONING" && role === "TENANT_ADMIN") {
    return "OWNER_INVITATION";
  }
  return "NORMAL_OPERATION";
}
