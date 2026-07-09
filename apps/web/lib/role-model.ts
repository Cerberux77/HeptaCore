import type { PlatformRole, UserRole } from "@prisma/client";

export const PLATFORM_ROLE_SUPER_ADMIN: PlatformRole = "SUPER_ADMIN";

export const TENANT_FUNCTIONAL_ROLES = ["TENANT_ADMIN", "PUBLISHER"] as const;

export const SAFE_LEGACY_TENANT_ROLE_CONVERSIONS = {
  OWNER: "TENANT_ADMIN",
  ADMIN: "TENANT_ADMIN",
  TENANT_ADMIN: "TENANT_ADMIN",
  PUBLISHER: "PUBLISHER",
} as const;

export const AMBIGUOUS_LEGACY_TENANT_ROLES = [
  "STRATEGIST",
  "EDITOR",
  "ANALYST",
  "APPROVER",
  "VIEWER",
] as const;

export type CanonicalTenantRole = (typeof TENANT_FUNCTIONAL_ROLES)[number];

export type ConvertibleLegacyTenantRole = keyof typeof SAFE_LEGACY_TENANT_ROLE_CONVERSIONS;

export function isPlatformSuperAdmin(platformRole: PlatformRole | null | undefined): boolean {
  return platformRole === PLATFORM_ROLE_SUPER_ADMIN;
}

export function isCanonicalTenantRole(role: string | null | undefined): role is CanonicalTenantRole {
  return !!role && TENANT_FUNCTIONAL_ROLES.includes(role as CanonicalTenantRole);
}

export function isAmbiguousLegacyTenantRole(role: string | null | undefined): role is (typeof AMBIGUOUS_LEGACY_TENANT_ROLES)[number] {
  return !!role && AMBIGUOUS_LEGACY_TENANT_ROLES.includes(role as (typeof AMBIGUOUS_LEGACY_TENANT_ROLES)[number]);
}

export function normalizeFunctionalTenantRole(role: UserRole | string | null | undefined): CanonicalTenantRole | null {
  if (!role) return null;
  if (isCanonicalTenantRole(role)) return role;
  if (role in SAFE_LEGACY_TENANT_ROLE_CONVERSIONS) {
    return SAFE_LEGACY_TENANT_ROLE_CONVERSIONS[role as ConvertibleLegacyTenantRole];
  }
  return null;
}

export function hasCanonicalTenantAccess(
  platformRole: PlatformRole | null | undefined,
  role: UserRole | string | null | undefined,
  allowedRoles: readonly CanonicalTenantRole[],
): boolean {
  if (isPlatformSuperAdmin(platformRole)) return true;
  const canonicalRole = normalizeFunctionalTenantRole(role);
  return canonicalRole !== null && allowedRoles.includes(canonicalRole);
}

export function getTenantRoleLabel(role: string | null | undefined): string {
  if (role === "TENANT_ADMIN") return "Tenant Admin";
  if (role === "PUBLISHER") return "Publisher";
  if (role === PLATFORM_ROLE_SUPER_ADMIN) return "Super Admin";
  return role ?? "Sin rol";
}
