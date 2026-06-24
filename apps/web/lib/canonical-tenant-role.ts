import type { UserRole } from "@prisma/client";

export type CanonicalTenantRole = "OWNER" | "ADMIN" | "VIEWER";

export const CANONICAL_TENANT_ROLES: readonly CanonicalTenantRole[] = ["OWNER", "ADMIN", "VIEWER"];

const LEGACY_TO_CANONICAL_MAP: Partial<Record<UserRole, CanonicalTenantRole>> = {
  TENANT_ADMIN: "ADMIN",
  ADMIN: "ADMIN",
  STRATEGIST: "ADMIN",
  EDITOR: "ADMIN",
  APPROVER: "ADMIN",
  PUBLISHER: "ADMIN",
  ANALYST: "VIEWER",
  VIEWER: "VIEWER",
};

export function normalizeTenantRole(role: UserRole): CanonicalTenantRole | null {
  if (role === "OWNER") return "OWNER";
  if (role === "SUPER_ADMIN") return null;
  return LEGACY_TO_CANONICAL_MAP[role] ?? null;
}

export function isAssignableTenantRole(role: string): role is CanonicalTenantRole {
  return CANONICAL_TENANT_ROLES.includes(role as CanonicalTenantRole);
}

export function isLegacyTenantRole(role: string): boolean {
  const legacyRoles: UserRole[] = ["TENANT_ADMIN", "STRATEGIST", "EDITOR", "APPROVER", "PUBLISHER", "ANALYST"];
  return legacyRoles.includes(role as UserRole);
}

export const CANONICAL_ROLE_LABELS: Record<CanonicalTenantRole, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  VIEWER: "Consulta",
};

export function getCanonicalRoleLabel(role: string): string {
  return CANONICAL_ROLE_LABELS[role as CanonicalTenantRole] ?? role;
}
