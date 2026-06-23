import { prisma } from "./prisma";
import type { TenantStatus, UserRole } from "@prisma/client";

export class TenantAccessError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
    this.name = "TenantAccessError";
  }
}

export function isSuperAdmin(memberships: Array<{ role: UserRole }>): boolean {
  return memberships.some((m) => m.role === "SUPER_ADMIN");
}

export function requireSuperAdmin(session: { user?: { id?: string; memberships?: Array<{ role: UserRole }> } | null }): string {
  if (!session?.user?.id) throw new TenantAccessError("Unauthorized", "UNAUTHORIZED", 401);
  if (!isSuperAdmin(session.user.memberships ?? [])) {
    throw new TenantAccessError("SUPER_ADMIN role required", "FORBIDDEN", 403);
  }
  return session.user.id;
}

export async function requireTenantMembership(userId: string, tenantId: string): Promise<{ role: UserRole }> {
  const membership = await prisma.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { role: true },
  });
  if (!membership) throw new TenantAccessError("Not a member of this tenant", "NOT_MEMBER", 403);
  return membership;
}

export async function requireActiveTenant(tenantId: string): Promise<{ status: TenantStatus }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true },
  });
  if (!tenant) throw new TenantAccessError("Tenant not found", "NOT_FOUND", 404);
  if (tenant.status === "SUSPENDED") throw new TenantAccessError("Tenant is suspended", "TENANT_SUSPENDED", 403);
  if (tenant.status === "ARCHIVED") throw new TenantAccessError("Tenant is archived", "TENANT_ARCHIVED", 403);
  return tenant;
}

export async function assertTenantLifecycleAllowsMutation(tenantId: string): Promise<void> {
  await requireActiveTenant(tenantId);
}
