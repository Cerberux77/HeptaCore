import { Prisma, TenantStatus, type Tenant } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { prisma as defaultPrisma } from "./prisma";
import {
  assertTenantLifecycleAllowsMutation,
  requireSuperAdminActor,
  TenantAccessError,
  type TenantAdminDb,
} from "./tenant-access";

const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "login", "register", "tenant",
  "settings", "billing", "support", "www",
]);

const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

const VALID_TIMEZONES = new Set([
  "UTC", "America/Caracas", "America/New_York", "America/Chicago",
  "America/Denver", "America/Los_Angeles", "America/Bogota",
  "America/Lima", "America/Santiago", "America/Buenos_Aires",
  "America/Mexico_City", "America/Panama", "Europe/Madrid",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
]);

const VALID_LOCALES = new Set(["es", "en", "pt", "fr", "de", "it"]);

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

export function generateInvitationToken(): string {
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

function serializeTenant(
  tenant: Tenant & { memberships?: Array<{ user: { email: string } }> },
  ownerEmail: string,
  invitationToken?: string,
): SerializedTenant {
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

export async function listAdminTenants(
  actorId: string,
  db: TenantAdminDb = defaultPrisma,
): Promise<SerializedTenant[]> {
  await requireSuperAdminActor(actorId, db as any);
  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      memberships: {
        where: { role: "OWNER" },
        select: { user: { select: { email: true } } },
        take: 1,
      },
    },
  } as any);
  return (tenants as any[]).map((t) =>
    serializeTenant(t, (t as any).memberships[0]?.user.email ?? "N/A"),
  );
}

export async function getAdminTenant(
  actorId: string,
  tenantId: string,
  db: TenantAdminDb = defaultPrisma,
): Promise<SerializedTenant> {
  await requireSuperAdminActor(actorId, db as any);
  const tenant = await (db.tenant as any).findUniqueOrThrow({
    where: { id: tenantId },
    include: {
      memberships: {
        where: { role: "OWNER" },
        select: { user: { select: { email: true } } },
        take: 1,
      },
    },
  });
  return serializeTenant(
    tenant,
    (tenant as any).memberships[0]?.user.email ?? "N/A",
  );
}

export async function createAdminTenant(
  params: CreateTenantParams,
  db: TenantAdminDb = defaultPrisma,
): Promise<SerializedTenant> {
  await requireSuperAdminActor(params.actorId, db as any);

  const normalizedSlug = normalizeTenantSlug(params.slug);
  validateTenantSlug(normalizedSlug);

  const ownerEmail = params.ownerEmail.toLowerCase().trim();
  if (!ownerEmail || !ownerEmail.includes("@"))
    throw new TenantAdminError("Invalid owner email", "INVALID_OWNER_EMAIL", 400);

  const fullDb = db as unknown as Prisma.TransactionClient;

  const result = await fullDb.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.tenant.findUnique({ where: { slug: normalizedSlug } });
    if (existing) throw new TenantAdminError("Slug already in use", "SLUG_TAKEN", 409);

    let owner = await tx.user.findUnique({ where: { email: ownerEmail } });
    if (!owner) {
      owner = await tx.user.create({
        data: { email: ownerEmail, name: params.ownerName ?? ownerEmail },
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
      data: { tenantId: tenant.id, userId: owner.id, role: "OWNER" },
    });

    const plainToken = generateInvitationToken();
    const tokenHash = hashToken(plainToken);
    await tx.invitation.create({
      data: {
        id: `inv_${randomBytes(12).toString("hex")}`,
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

    return serializeTenant(
      { ...tenant, memberships: [{ user: { email: ownerEmail } }] } as any,
      ownerEmail,
      plainToken,
    );
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
  db: TenantAdminDb = defaultPrisma,
): Promise<SerializedTenant> {
  await requireSuperAdminActor(actorId, db as any);
  const fullDb = db as unknown as Prisma.TransactionClient;

  return fullDb.$transaction(async (tx: Prisma.TransactionClient) => {
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });

    const allowed = ALLOWED_TRANSITIONS[tenant.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new TenantAdminError(
        `Cannot transition from ${tenant.status} to ${newStatus}`,
        "INVALID_TRANSITION",
        400,
      );
    }

    const now = new Date();
    const update: Record<string, unknown> = { status: newStatus };

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

    const updated = await tx.tenant.update({ where: { id: tenantId }, data: update });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: `TENANT_${newStatus}`,
        target: tenantId,
        metadata: { before: tenant.status, after: newStatus },
      } as any,
    });

    const owner = await tx.membership.findFirst({
      where: { tenantId, role: "OWNER" },
      select: { user: { select: { email: true } } },
    });

    return serializeTenant(updated, owner?.user.email ?? "N/A");
  });
}

export async function updateAdminTenantConfiguration(
  actorId: string,
  tenantId: string,
  config: { name?: string; timezone?: string; locale?: string },
  db: TenantAdminDb = defaultPrisma,
): Promise<SerializedTenant> {
  await requireSuperAdminActor(actorId, db as any);
  const fullDb = db as unknown as Prisma.TransactionClient;

  if (config.name !== undefined && (!config.name || config.name.trim().length === 0)) {
    throw new TenantAdminError("Name cannot be empty", "INVALID_NAME", 400);
  }
  if (config.timezone !== undefined && !VALID_TIMEZONES.has(config.timezone)) {
    throw new TenantAdminError("Invalid timezone", "INVALID_TIMEZONE", 400);
  }
  if (config.locale !== undefined && !VALID_LOCALES.has(config.locale)) {
    throw new TenantAdminError("Invalid locale", "INVALID_LOCALE", 400);
  }

  return fullDb.$transaction(async (tx: Prisma.TransactionClient) => {
    const before = await tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true, timezone: true, locale: true },
    });

    const updated = await tx.tenant.update({
      where: { id: tenantId },
      data: {
        ...(config.name !== undefined ? { name: config.name.trim() } : {}),
        ...(config.timezone !== undefined ? { timezone: config.timezone } : {}),
        ...(config.locale !== undefined ? { locale: config.locale } : {}),
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: "TENANT_CONFIGURATION_UPDATED",
        target: tenantId,
        metadata: {
          before: { name: before.name, timezone: before.timezone, locale: before.locale },
          after: { name: updated.name, timezone: updated.timezone, locale: updated.locale },
        },
      } as any,
    });

    const owner = await tx.membership.findFirst({
      where: { tenantId, role: "OWNER" },
      select: { user: { select: { email: true } } },
    });

    return serializeTenant(updated, owner?.user.email ?? "N/A");
  });
}
