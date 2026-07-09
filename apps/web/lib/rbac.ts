import type { UserRole } from "@prisma/client";
import { isPlatformSuperAdmin } from "./role-model";

export type AuthSession = {
  user?: {
    id: string;
    email: string;
    name?: string | null;
    platformRole: "SUPER_ADMIN" | null;
    tenantId: string | null;
    role: UserRole | null;
    memberships: Array<{ tenantId: string; role: UserRole }>;
  };
};

/**
 * Roles allowed to perform admin-level actions.
 */
const ADMIN_ROLES: UserRole[] = ["TENANT_ADMIN"];

/**
 * Roles allowed to create or modify content.
 */
const EDITOR_ROLES: UserRole[] = [
  "TENANT_ADMIN",
  "PUBLISHER",
];

/**
 * Check if the session has one of the required roles for the given tenant.
 */
export function hasTenantRole(
  session: AuthSession | null,
  tenantId: string,
  allowedRoles: UserRole[],
): boolean {
  if (!session?.user?.memberships) return false;
  if (isPlatformSuperAdmin(session.user.platformRole)) return true;
  return session.user.memberships.some(
    (m) => m.tenantId === tenantId && allowedRoles.includes(m.role),
  );
}

export function isTenantAdmin(session: AuthSession | null, tenantId: string): boolean {
  return hasTenantRole(session, tenantId, ADMIN_ROLES);
}

export function isTenantEditor(session: AuthSession | null, tenantId: string): boolean {
  return hasTenantRole(session, tenantId, EDITOR_ROLES);
}

export function getTenantRole(
  session: AuthSession | null,
  tenantId: string,
): UserRole | null {
  if (!session?.user?.memberships) return null;
  const m = session.user.memberships.find((m) => m.tenantId === tenantId);
  return m?.role ?? null;
}
