import { prisma as defaultPrisma } from "./prisma";
import type { TenantStatus, UserRole } from "@prisma/client";

export class TenantAccessError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
    this.name = "TenantAccessError";
  }
}

export interface TenantAdminDb {
  user: {
    findUnique(args: { where: { id: string }; select: { id: true } }): Promise<{ id: string } | null>;
  };
  membership: {
    findUnique(args: { where: { tenantId_userId: { tenantId: string; userId: string } }; select: { role: true } }): Promise<{ role: UserRole } | null>;
    findMany(args: { where: { userId: string }; select: { role: true } }): Promise<Array<{ role: UserRole }>>;
  };
  tenant: {
    findUnique(args: { where: { id: string }; select: { status: true } }): Promise<{ status: TenantStatus } | null>;
    findMany(args?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
    findUniqueOrThrow(args: { where: { id: string }; include?: unknown }): Promise<Record<string, unknown>>;
  };
}

export interface TenantAccessTx {
  user: {
    findUnique(args: { where: { id: string }; select: { id: true } }): Promise<{ id: string } | null>;
  };
  membership: {
    findMany(args: { where: { userId: string }; select: { role: true } }): Promise<Array<{ role: UserRole }>>;
  };
}

export function isSuperAdmin(memberships: Array<{ role: UserRole }>): boolean {
  return memberships.some((m) => m.role === "SUPER_ADMIN");
}

export async function requireSuperAdminActor(
  actorId: string,
  tx: { user: { findUnique(args: { where: { id: string }; select: { id: true } }): Promise<{ id: string } | null> }; membership: { findMany(args: { where: { userId: string }; select: { role: true } }): Promise<Array<{ role: UserRole }>> } },
): Promise<string> {
  const user = await tx.user.findUnique({
    where: { id: actorId },
    select: { id: true },
  });
  if (!user) throw new TenantAccessError("User not found", "UNAUTHORIZED", 401);

  const memberships = await tx.membership.findMany({
    where: { userId: actorId },
    select: { role: true },
  });
  if (!isSuperAdmin(memberships)) {
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
