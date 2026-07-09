import type { UserRole } from "@prisma/client";
import { getTenantRoleLabel, normalizeFunctionalTenantRole, type CanonicalTenantRole } from "./role-model";

export type { CanonicalTenantRole };

export const CANONICAL_TENANT_ROLES: readonly CanonicalTenantRole[] = ["TENANT_ADMIN", "PUBLISHER"];

export function normalizeTenantRole(role: UserRole): CanonicalTenantRole | null {
  return normalizeFunctionalTenantRole(role);
}

export function isAssignableTenantRole(role: string): role is CanonicalTenantRole {
  return CANONICAL_TENANT_ROLES.includes(role as CanonicalTenantRole);
}

export function isLegacyTenantRole(role: string): boolean {
  const legacyRoles: string[] = ["OWNER", "ADMIN", "STRATEGIST", "EDITOR", "ANALYST", "APPROVER", "VIEWER", "SUPER_ADMIN"];
  return legacyRoles.includes(role);
}

export function getCanonicalRoleLabel(role: string): string {
  return getTenantRoleLabel(role);
}
