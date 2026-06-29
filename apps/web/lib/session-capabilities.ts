import { Permission, getPermissionsForRole } from "./permissions";
import { normalizeTenantRole } from "./canonical-tenant-role";
import type { UserRole, TenantStatus } from "@prisma/client";

const ALL_PERMISSIONS = Object.values(Permission);

const LIFECYCLE_BLOCKED: Record<string, string | null> = {
  PROVISIONING: "El tenant esta en PROVISIONING. Solo se permiten invitaciones OWNER y configuracion.",
  SUSPENDED: "El tenant esta SUSPENDED. Las mutaciones estan bloqueadas hasta su reactivacion.",
  ARCHIVED: "El tenant esta ARCHIVED. Las mutaciones estan bloqueadas hasta su reactivacion.",
  ACTIVE: null,
};

export interface SessionCapabilityUser {
  id: string;
  email: string;
  name: string | null;
  identifier: string;
  emailIsValid: boolean;
  globalRole: string | null;
}

export interface SessionCapabilityPermission {
  permission: string;
  granted: boolean;
}

export interface SessionCapabilityTenantContext {
  tenantId?: string;
  tenantSlug?: string;
  tenantName?: string;
  tenantStatus?: string;
  tenantRole?: string | null;
  canonicalTenantRole?: string | null;
  lifecycleBlockedReason?: string | null;
  tenantPermissions?: SessionCapabilityPermission[];
}

export interface SessionCapabilities {
  user: SessionCapabilityUser;
  effectivePermissions: SessionCapabilityPermission[];
  tenant: SessionCapabilityTenantContext;
}

export interface SessionCapabilityResolverDb {
  user: {
    findUnique(args: { where: { id: string }; select: { id: true; email: true; name: true } }): Promise<{ id: string; email: string; name: string | null } | null>;
  };
  membership: {
    findMany(args: { where: { userId: string }; select: { tenantId: true; role: true } }): Promise<Array<{ tenantId: string; role: UserRole }>>;
  };
  tenant: {
    findUnique(args: { where: { slug: string }; select: { id: true; slug: true; name: true; status: true } }): Promise<{ id: string; slug: string; name: string; status: TenantStatus } | null>;
  };
}

export class SessionCapabilityError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
    this.name = "SessionCapabilityError";
  }
}

export async function resolveSessionCapabilities(
  userId: string,
  tenantSlug: string | null,
  db: SessionCapabilityResolverDb,
): Promise<SessionCapabilities> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    throw new SessionCapabilityError("Usuario no encontrado", "UNAUTHORIZED", 401);
  }

  const memberships = await db.membership.findMany({
    where: { userId },
    select: { tenantId: true, role: true },
  });

  const isGlobalSuperAdmin = memberships.some((m) => m.role === "SUPER_ADMIN");

  let tenantContext: SessionCapabilityTenantContext = {};
  let effectivePermissions: SessionCapabilityPermission[] = [];

  if (tenantSlug) {
    const tenant = await db.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, slug: true, name: true, status: true },
    });
    if (!tenant) {
      throw new SessionCapabilityError("Tenant no encontrado", "NOT_FOUND", 404);
    }

    const membership = memberships.find((m) => m.tenantId === tenant.id);

    if (!membership && !isGlobalSuperAdmin) {
      throw new SessionCapabilityError("No tienes acceso a este tenant", "FORBIDDEN", 403);
    }

    const tenantRole = membership?.role ?? null;
    const canonicalRole = tenantRole ? normalizeTenantRole(tenantRole) : null;

    const roleForPerms = isGlobalSuperAdmin ? "SUPER_ADMIN" : (tenantRole ?? "VIEWER");
    const rolePermissions = getPermissionsForRole(roleForPerms);

    const tenantPerms = ALL_PERMISSIONS.map((p) => ({
      permission: p as string,
      granted: rolePermissions.has(p),
    }));

    effectivePermissions = tenantPerms;

    const lifecycleReason = LIFECYCLE_BLOCKED[tenant.status] ?? null;

    tenantContext = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      tenantStatus: tenant.status,
      tenantRole,
      canonicalTenantRole: canonicalRole,
      lifecycleBlockedReason: lifecycleReason,
      tenantPermissions: tenantPerms,
    };
  } else {
    effectivePermissions = ALL_PERMISSIONS.map((p) => ({
      permission: p as string,
      granted: false,
    }));
  }

  const emailIsValid = !!(user.email && user.email.includes("@"));
  const identifier = emailIsValid ? user.email : "Cuenta con identificador heredado.";

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      identifier,
      emailIsValid,
      globalRole: isGlobalSuperAdmin ? "SUPER_ADMIN" : null,
    },
    effectivePermissions,
    tenant: tenantContext,
  };
}
