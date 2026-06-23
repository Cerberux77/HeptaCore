import { Prisma, TenantStatus, type Tenant } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { auditLog } from "./audit";
import { prisma } from "./prisma";
import { requireSuperAdmin } from "./tenant-access";

const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "login", "register", "tenant",
  "settings", "billing", "support", "www",
]);

const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export class TenantAdminError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
    this.name = "TenantAdminError";
  }
}

export function normalizeTenantSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

export function validateTenantSlug(slug: string): void {
  if (slug.length < 3 || slug.length > 63) throw new TenantAdminError("Slug must be 3-63 characters", "INVALID_SLUG", 400);
  if (!SLUG_REGEX.test(slug)) throw new TenantAdminError("Slug must be lowercase alphanumeric with hyphens, no double hyphens, no leading/trailing hyphen", "INVALID_SLUG", 400);
  if (slug.includes("--")) throw new TenantAdminError("Slug cannot contain double hyphens", "INVALID_SLUG", 400);
  if (RESERVED_SLUGS.has(slug)) throw new TenantAdminError(`"${slug}" is a reserved word`, "RESERVED_SLUG", 400);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

export interface CreateTenantParams {
  actorId: string;
  slug: string;
  name: string;
  ownerEmail: string;
  ownerName?: string;
}

export interface SerializedTenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: TenantStatus;
  timezone: string;
  locale: string;
  createdAt: Date;
  ownerEmail: string;
  invitationToken?: string;
}

function serializeTenant(tenant: Tenant & { memberships?: Array<{ user: { email: string } }> }, ownerEmail: string, invitationToken?: string): SerializedTenant {
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    plan: tenant.plan,
    status: tenant.status,
    timezone: tenant.timezone ?? "UTC",
    locale: tenant.locale ?? "es",
    createdAt: tenant.createdAt,
    ownerEmail,
    ...(invitationToken ? { invitationToken } : {}),
  };
}

export async function listAdminTenants(actorId: string): Promise<SerializedTenant[]> {
  requireSuperAdmin({ user: { id: actorId, memberships: [{ role: "SUPER_ADMIN" } as any] } });
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      memberships: {
        where: { role: "OWNER" },
        select: { user: { select: { email: true } } },
        take: 1,
      },
    },
  });
  return tenants.map((t) => serializeTenant(t, t.memberships[0]?.user.email ?? "N/A"));
}

export async function getAdminTenant(actorId: string, tenantId: string): Promise<SerializedTenant> {
  requireSuperAdmin({ user: { id: actorId, memberships: [{ role: "SUPER_ADMIN" } as any] } });
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: {
      memberships: {
        where: { role: "OWNER" },
        select: { user: { select: { email: true } } },
        take: 1,
      },
    },
  });
  return serializeTenant(tenant, tenant.memberships[0]?.user.email ?? "N/A");
}

export async function createAdminTenant(params: CreateTenantParams): Promise<SerializedTenant> {
  requireSuperAdmin({ user: { id: params.actorId, memberships: [{ role: "SUPER_ADMIN" } as any] } });

  const normalizedSlug = normalizeTenantSlug(params.slug);
  validateTenantSlug(normalizedSlug);

  const ownerEmail = params.ownerEmail.toLowerCase().trim();
  if (!ownerEmail || !ownerEmail.includes("@")) throw new TenantAdminError("Invalid owner email", "INVALID_OWNER_EMAIL", 400);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.tenant.findUnique({ where: { slug: normalizedSlug } });
    if (existing) throw new TenantAdminError("Slug already in use", "SLUG_TAKEN", 409);

    let owner = await tx.user.findUnique({ where: { email: ownerEmail } });
    if (!owner) {
      owner = await tx.user.create({
        data: {
          email: ownerEmail,
          name: params.ownerName ?? ownerEmail,
        },
      });
    }

    const tenant = await tx.tenant.create({
      data: {
        slug: normalizedSlug,
        name: params.name,
        status: "PROVISIONING",
        timezone: "UTC",
        locale: "es",
      },
    });

    await tx.membership.create({
      data: {
        tenantId: tenant.id,
        userId: owner.id,
        role: "OWNER",
      },
    });

    const plainToken = generateInvitationToken();
    const tokenHash = hashToken(plainToken);
    await tx.invitation.create({
      data: {
        id: `inv_${tenant.id}`,
        tenantId: tenant.id,
        email: ownerEmail,
        role: "OWNER",
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorId: params.actorId,
        action: "TENANT_CREATED",
        target: tenant.id,
        metadata: { slug: normalizedSlug, name: params.name, ownerEmail },
      } as any,
    });

    return serializeTenant({ ...tenant, memberships: [{ user: { email: ownerEmail } }] } as any, ownerEmail, plainToken);
  });

  return result;
}

const ALLOWED_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
  PROVISIONING: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["SUSPENDED", "ARCHIVED"],
  SUSPENDED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: ["ACTIVE"],
};

export async function changeTenantStatus(
  actorId: string,
  tenantId: string,
  newStatus: TenantStatus,
): Promise<SerializedTenant> {
  requireSuperAdmin({ user: { id: actorId, memberships: [{ role: "SUPER_ADMIN" } as any] } });

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const allowed = ALLOWED_TRANSITIONS[tenant.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new TenantAdminError(
      `Cannot transition from ${tenant.status} to ${newStatus}`,
      "INVALID_TRANSITION",
      400,
    );
  }

  const now = new Date();
  const update: any = { status: newStatus };

  if (newStatus === "SUSPENDED") {
    update.suspendedAt = now;
    update.archivedAt = null;
  } else if (newStatus === "ARCHIVED") {
    update.archivedAt = now;
    update.suspendedAt = null;
  } else {
    update.suspendedAt = null;
    update.archivedAt = null;
  }

  const updated = await prisma.tenant.update({ where: { id: tenantId }, data: update });

  await auditLog({
    tenantId,
    actorId,
    action: `TENANT_${newStatus}`,
    target: tenantId,
    metadata: { before: tenant.status, after: newStatus },
  });

  const owner = await prisma.membership.findFirst({
    where: { tenantId, role: "OWNER" },
    select: { user: { select: { email: true } } },
  });

  return serializeTenant(updated, owner?.user.email ?? "N/A");
}

export async function updateAdminTenantConfiguration(
  actorId: string,
  tenantId: string,
  config: { name?: string; timezone?: string; locale?: string },
): Promise<SerializedTenant> {
  requireSuperAdmin({ user: { id: actorId, memberships: [{ role: "SUPER_ADMIN" } as any] } });

  if (config.name !== undefined && (!config.name || config.name.trim().length === 0)) {
    throw new TenantAdminError("Name cannot be empty", "INVALID_NAME", 400);
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(config.name !== undefined ? { name: config.name.trim() } : {}),
      ...(config.timezone !== undefined ? { timezone: config.timezone } : {}),
      ...(config.locale !== undefined ? { locale: config.locale } : {}),
    },
  });

  const owner = await prisma.membership.findFirst({
    where: { tenantId, role: "OWNER" },
    select: { user: { select: { email: true } } },
  });

  return serializeTenant(updated, owner?.user.email ?? "N/A");
}
