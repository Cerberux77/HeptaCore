import type { UserRole } from "@prisma/client";

export type TenantRouteMembership = {
  tenantId: string;
  role: UserRole | string;
  tenant: {
    slug: string;
    name?: string | null;
  } | null;
};

export type TenantChoice = {
  tenantId: string;
  slug: string;
  name: string;
  role: UserRole | string;
};

export type AppAccessResolution =
  | { kind: "admin"; href: "/admin" }
  | { kind: "tenant"; href: string; tenant: TenantChoice }
  | { kind: "select"; tenants: TenantChoice[] }
  | { kind: "access-required"; href: "/access-required" };

export function sanitizeInternalCallbackUrl(value: string | null | undefined, fallback = "/app"): string {
  const candidate = value?.trim();
  if (!candidate) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;
  return candidate;
}

export function normalizeAuthRedirectUrl(
  value: string | null | undefined,
  fallback = "/app",
  origin?: string,
): string {
  const candidate = value?.trim();
  if (!candidate) return fallback;
  if (candidate.startsWith("/")) return sanitizeInternalCallbackUrl(candidate, fallback);
  if (!origin) return fallback;

  try {
    const parsed = new URL(candidate);
    if (parsed.origin !== origin) return fallback;
    return sanitizeInternalCallbackUrl(`${parsed.pathname}${parsed.search}${parsed.hash}`, fallback);
  } catch {
    return fallback;
  }
}

export function appLoginHref(): string {
  return "/login?callbackUrl=%2Fapp";
}

export function tenantLoginHref(slug: string): string {
  return `/login?callbackUrl=/tenant/${encodeURIComponent(slug)}`;
}

export function tenantAccessRequiredHref(slug: string): string {
  return `/access-required?tenant=${encodeURIComponent(slug)}`;
}

export function resolveAppAccess(memberships: TenantRouteMembership[]): AppAccessResolution {
  if (memberships.some((membership) => membership.role === "SUPER_ADMIN")) {
    return { kind: "admin", href: "/admin" };
  }

  const tenants = memberships
    .filter((membership): membership is TenantRouteMembership & { tenant: NonNullable<TenantRouteMembership["tenant"]> } =>
      Boolean(membership.tenant?.slug),
    )
    .map((membership) => ({
      tenantId: membership.tenantId,
      slug: membership.tenant.slug,
      name: membership.tenant.name || membership.tenant.slug,
      role: membership.role,
    }));

  if (tenants.length === 0) return { kind: "access-required", href: "/access-required" };
  if (tenants.length === 1) return { kind: "tenant", href: `/tenant/${tenants[0].slug}`, tenant: tenants[0] };
  return { kind: "select", tenants };
}

export function hasTenantMembership(
  memberships: Array<{ tenantId: string; role: UserRole | string }>,
  tenantId: string,
): boolean {
  return memberships.some((membership) => membership.tenantId === tenantId || membership.role === "SUPER_ADMIN");
}
