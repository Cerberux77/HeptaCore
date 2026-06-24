import { randomUUID } from "node:crypto";
import { TenantStatus, type Tenant, type Membership, type Invitation, type User } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";
import { hashInvitationToken, generateInvitationToken, getInvitationExpiration } from "./invitation-token";
import { buildInviteLink } from "./email/email-invitation-service";
import { resolvePublicOrigin } from "./url-origin";
import {
  assertTenantLifecycleAllowsMutation,
  requireSuperAdminActor,
  resolveTenantAccessWithLifecycle,
  resolveTenantAccess,
  invitationCapabilityForLifecycle,
  TenantAccessError,
  type TenantAdminDb,
  type AccessResolutionDb,
} from "./tenant-access";
import { Permission } from "./permissions";
import type { Prisma, UserRole } from "@prisma/client";

export type TenantAdminTx = Prisma.TransactionClient;

export interface TenantAdminDbWithTx extends TenantAdminDb {
  $transaction<R>(fn: (tx: TenantAdminTx) => Promise<R>): Promise<R>;
}

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

export interface CreateTenantParams {
  actorId: string;
  slug: string;
  name: string;
  ownerEmail: string;
  ownerName?: string;
  timezone?: string;
  locale?: string;
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
  inviteLink?: string;
  ownerAccountState?: "EXISTING_ACCOUNT" | "INVITATION_REQUIRED";
}

function serializeTenant(
  tenant: Tenant & { memberships?: Array<{ user: { email: string } }> },
  ownerEmail: string,
  inviteLink?: string,
  ownerAccountState?: "EXISTING_ACCOUNT" | "INVITATION_REQUIRED",
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
    ...(inviteLink ? { inviteLink } : {}),
    ...(ownerAccountState ? { ownerAccountState } : {}),
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function validatePagination(raw: Record<string, unknown>): PaginationParams {
  const hasPage = raw.page !== undefined && raw.page !== null;
  const hasLimit = raw.limit !== undefined && raw.limit !== null;

  let page = DEFAULT_PAGE;
  let limit = DEFAULT_LIMIT;

  if (hasPage) {
    const p = raw.page;
    if (typeof p !== "number" || !Number.isFinite(p) || !Number.isInteger(p) || p < 1) {
      throw new TenantAdminError(`Invalid page: ${p}. Must be an integer >= 1.`, "INVALID_PAGINATION", 400);
    }
    page = p;
  }

  if (hasLimit) {
    const l = raw.limit;
    if (typeof l !== "number" || !Number.isFinite(l) || !Number.isInteger(l) || l < 1 || l > MAX_LIMIT) {
      throw new TenantAdminError(`Invalid limit: ${l}. Must be an integer between 1 and ${MAX_LIMIT}.`, "INVALID_PAGINATION", 400);
    }
    limit = l;
  }

  return { page, limit };
}

const VALID_STATUSES = new Set(["PROVISIONING", "ACTIVE", "SUSPENDED", "ARCHIVED"]);

export async function listAdminTenants(
  actorId: string,
  db: TenantAdminDb = defaultPrisma as unknown as TenantAdminDb,
  pagination: PaginationParams = { page: DEFAULT_PAGE, limit: DEFAULT_LIMIT },
  filters?: { search?: string; status?: string },
): Promise<PaginatedResult<SerializedTenant>> {
  await requireSuperAdminActor(actorId, db);
  const skip = (pagination.page - 1) * pagination.limit;

  const where: Record<string, unknown> = {};

  if (filters?.search) {
    const term = filters.search.trim();
    if (term) {
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { slug: { contains: term, mode: "insensitive" } },
      ];
    }
  }

  if (filters?.status) {
    if (!VALID_STATUSES.has(filters.status)) {
      throw new TenantAdminError(`Invalid status filter: ${filters.status}`, "INVALID_STATUS", 400);
    }
    where.status = filters.status;
  }

  const hasWhere = Object.keys(where).length > 0;

  const [tenantsRaw, total] = await Promise.all([
    db.tenant.findMany({
      ...(hasWhere ? { where } : {}),
      skip,
      take: pagination.limit,
      orderBy: { createdAt: "desc" },
      include: {
        memberships: {
          where: { role: "OWNER" },
          select: { user: { select: { email: true } } },
        },
      },
    } as unknown as Parameters<typeof db.tenant.findMany>[0]),
    hasWhere
      ? (db.tenant as any).count({ where }) as Promise<number>
      : (db.tenant as any).count() as Promise<number>,
  ]);

  const items = (tenantsRaw as unknown as Array<Record<string, unknown> & { memberships?: Array<{ user: { email: string } }> }>).map((t) => {
    const ownerEmail = t.memberships?.[0]?.user?.email ?? "N/A";
    return serializeTenant(t as unknown as Tenant & { memberships?: Array<{ user: { email: string } }> }, ownerEmail);
  });

  return {
    items,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getAdminTenant(
  actorId: string,
  tenantId: string,
  db: TenantAdminDb = defaultPrisma as unknown as TenantAdminDb,
): Promise<SerializedTenant> {
  await requireSuperAdminActor(actorId, db);
  const tenant = await db.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: {
      memberships: {
        where: { role: "OWNER" },
        select: { user: { select: { email: true } } },
      },
    },
  } as unknown as Parameters<typeof db.tenant.findUniqueOrThrow>[0]);
  const t = tenant as unknown as Record<string, unknown> & { memberships?: Array<{ user: { email: string } }> };
  const ownerEmail = t.memberships?.[0]?.user?.email ?? "N/A";
  return serializeTenant(
    t as unknown as Tenant & { memberships?: Array<{ user: { email: string } }> },
    ownerEmail,
  );
}

export async function createAdminTenant(
  params: CreateTenantParams,
  db: TenantAdminDbWithTx = defaultPrisma as unknown as TenantAdminDbWithTx,
  origin?: string,
): Promise<SerializedTenant> {
  const safeOrigin = resolvePublicOrigin(origin);
  const normalizedSlug = normalizeTenantSlug(params.slug);
  validateTenantSlug(normalizedSlug);

  const ownerEmail = params.ownerEmail.toLowerCase().trim();
  if (!ownerEmail || !ownerEmail.includes("@"))
    throw new TenantAdminError("Invalid owner email", "INVALID_OWNER_EMAIL", 400);

  return db.$transaction(async (tx) => {
    await requireSuperAdminActor(params.actorId, tx);

    const existing = await tx.tenant.findUnique({ where: { slug: normalizedSlug } });
    if (existing) throw new TenantAdminError("Slug already in use", "SLUG_TAKEN", 409);

    let owner = await tx.user.findUnique({ where: { email: ownerEmail } });
    if (!owner) {
      owner = await tx.user.create({
        data: { email: ownerEmail, name: params.ownerName ?? ownerEmail },
      });
    }

    let ownerAccountState: "EXISTING_ACCOUNT" | "INVITATION_REQUIRED" = "INVITATION_REQUIRED";
    if (owner.passwordHash) {
      ownerAccountState = "EXISTING_ACCOUNT";
    }

    const timezone = params.timezone && VALID_TIMEZONES.has(params.timezone) ? params.timezone : "UTC";
    const locale = params.locale && VALID_LOCALES.has(params.locale) ? params.locale : "es";

    const tenant = await tx.tenant.create({
      data: {
        slug: normalizedSlug,
        name: params.name,
        status: "PROVISIONING",
        timezone,
        locale,
      },
    });

    await tx.membership.create({
      data: { tenantId: tenant.id, userId: owner.id, role: "OWNER" },
    });

    let plainToken: string | undefined;
    let inviteLink: string | undefined;
    if (ownerAccountState === "INVITATION_REQUIRED") {
      plainToken = generateInvitationToken();
      const tokenHash = hashInvitationToken(plainToken);
      await tx.invitation.create({
        data: {
          id: `inv_${randomUUID()}`,
          tenantId: tenant.id,
          email: ownerEmail,
          role: "OWNER",
          tokenHash,
          expiresAt: getInvitationExpiration(),
        },
      });
      inviteLink = buildInviteLink(safeOrigin, plainToken, ownerEmail, "INVITATION_REQUIRED", normalizedSlug);
    } else {
      inviteLink = buildInviteLink(safeOrigin, "", ownerEmail, "EXISTING_ACCOUNT", normalizedSlug);
    }

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorId: params.actorId,
        action: "TENANT_CREATED",
        target: tenant.id,
        metadata: { slug: normalizedSlug, name: params.name, ownerEmail },
      },
    });

    return serializeTenant(
      { ...tenant, memberships: [{ user: { email: ownerEmail } }] } as Tenant & { memberships?: Array<{ user: { email: string } }> },
      ownerEmail,
      inviteLink,
      ownerAccountState,
    );
  });
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
  db: TenantAdminDbWithTx = defaultPrisma as unknown as TenantAdminDbWithTx,
): Promise<SerializedTenant> {
  return db.$transaction(async (tx) => {
    await requireSuperAdminActor(actorId, tx);

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
      },
    });

    const owner = await tx.membership.findFirst({
      where: { tenantId, role: "OWNER" },
      select: { user: { select: { email: true } } },
    });

    return serializeTenant(updated as unknown as Tenant & { memberships?: Array<{ user: { email: string } }> }, owner?.user.email ?? "N/A");
  });
}

export async function updateAdminTenantConfiguration(
  actorId: string,
  tenantId: string,
  config: { name?: string; timezone?: string; locale?: string },
  db: TenantAdminDbWithTx = defaultPrisma as unknown as TenantAdminDbWithTx,
): Promise<SerializedTenant> {
  return db.$transaction(async (tx) => {
    await requireSuperAdminActor(actorId, tx);

    if (config.name !== undefined && (!config.name || config.name.trim().length === 0)) {
      throw new TenantAdminError("Name cannot be empty", "INVALID_NAME", 400);
    }
    if (config.timezone !== undefined && !VALID_TIMEZONES.has(config.timezone)) {
      throw new TenantAdminError("Invalid timezone", "INVALID_TIMEZONE", 400);
    }
    if (config.locale !== undefined && !VALID_LOCALES.has(config.locale)) {
      throw new TenantAdminError("Invalid locale", "INVALID_LOCALE", 400);
    }

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
      },
    });

    const owner = await tx.membership.findFirst({
      where: { tenantId, role: "OWNER" },
      select: { user: { select: { email: true } } },
    });

    return serializeTenant(updated as unknown as Tenant & { memberships?: Array<{ user: { email: string } }> }, owner?.user.email ?? "N/A");
  });
}

export { generateInvitationToken };

export interface SerializedMember {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
}

export async function listTenantMembers(
  actorId: string,
  tenantId: string,
  db: TenantAdminDbWithTx = defaultPrisma as unknown as TenantAdminDbWithTx,
  pagination: PaginationParams = { page: DEFAULT_PAGE, limit: DEFAULT_LIMIT },
): Promise<PaginatedResult<SerializedMember>> {
  return db.$transaction(async (tx) => {
    await resolveTenantAccess(actorId, tenantId, Permission.MEMBERS_READ, tx as unknown as AccessResolutionDb);

    const skip = (pagination.page - 1) * pagination.limit;
    const [memberships, total] = await Promise.all([
      tx.membership.findMany({
        where: { tenantId },
        include: { user: { select: { email: true, name: true } } },
        orderBy: { createdAt: "asc" },
        skip,
        take: pagination.limit,
      }),
      tx.membership.count({ where: { tenantId } }),
    ]);

    const items = memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role as UserRole,
      createdAt: m.createdAt,
    }));

    return { items, total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) };
  });
}

export interface AddMemberParams {
  email: string;
  role: UserRole;
}

export async function addTenantMember(
  actorId: string,
  tenantId: string,
  params: AddMemberParams,
  db: TenantAdminDbWithTx = defaultPrisma as unknown as TenantAdminDbWithTx,
): Promise<SerializedMember> {
  const email = params.email.toLowerCase().trim();
  if (!email || !email.includes("@")) {
    throw new TenantAdminError("Invalid email", "INVALID_EMAIL", 400);
  }

  if (params.role === "SUPER_ADMIN") {
    throw new TenantAdminError("Cannot assign SUPER_ADMIN to a tenant", "INVALID_ROLE", 400);
  }

  const validRoles: UserRole[] = ["OWNER", "ADMIN", "STRATEGIST", "EDITOR", "ANALYST", "APPROVER", "VIEWER", "TENANT_ADMIN", "PUBLISHER"];
  if (!validRoles.includes(params.role)) {
    throw new TenantAdminError(`Invalid role: ${params.role}`, "INVALID_ROLE", 400);
  }

  return db.$transaction(async (tx) => {
    await resolveTenantAccessWithLifecycle(actorId, tenantId, Permission.MEMBERS_ADD, "NORMAL_OPERATION", tx as unknown as AccessResolutionDb);

    const user = await tx.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true },
    });
    if (!user || user.passwordHash === null) {
      throw new TenantAdminError(
        "Account does not exist or is not activated. New accounts must be added via invitation.",
        "ACCOUNT_REQUIRES_INVITATION",
        422,
      );
    }

    const existing = await tx.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId: user.id } },
    });
    if (existing) {
      throw new TenantAdminError("User is already a member of this tenant", "DUPLICATE_MEMBERSHIP", 409);
    }

    const membership = await tx.membership.create({
      data: { tenantId, userId: user.id, role: params.role },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: "MEMBER_ADDED",
        target: membership.id,
        metadata: { userId: user.id, email, role: params.role },
      },
    });

    return {
      id: membership.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: membership.role as UserRole,
      createdAt: membership.createdAt,
    };
  });
}

export interface ChangeRoleParams {
  role: UserRole;
}

export async function changeTenantMemberRole(
  actorId: string,
  tenantId: string,
  membershipId: string,
  params: ChangeRoleParams,
  db: TenantAdminDbWithTx = defaultPrisma as unknown as TenantAdminDbWithTx,
): Promise<SerializedMember> {
  if (params.role === "SUPER_ADMIN") {
    throw new TenantAdminError("Cannot assign SUPER_ADMIN to a tenant", "INVALID_ROLE", 400);
  }

  const validRoles: UserRole[] = ["OWNER", "ADMIN", "STRATEGIST", "EDITOR", "ANALYST", "APPROVER", "VIEWER", "TENANT_ADMIN", "PUBLISHER"];
  if (!validRoles.includes(params.role)) {
    throw new TenantAdminError(`Invalid role: ${params.role}`, "INVALID_ROLE", 400);
  }

  const MAX_RETRIES = 3;
  let attempt = 0;
  while (true) {
    try {
      return await db.$transaction(async (tx) => {
        await resolveTenantAccessWithLifecycle(actorId, tenantId, Permission.MEMBERS_ROLE_UPDATE, "NORMAL_OPERATION", tx as unknown as AccessResolutionDb);

        const membership = await tx.membership.findUnique({
          where: { id: membershipId },
          include: { user: { select: { email: true, name: true } } },
        });
        if (!membership || membership.tenantId !== tenantId) {
          throw new TenantAdminError("Membership not found", "NOT_FOUND", 404);
        }

        const previousRole = membership.role;

        if (previousRole === "OWNER" && params.role !== "OWNER") {
          await tx.$executeRawUnsafe(`SELECT id FROM "Membership" WHERE "tenantId" = $1 AND role = $2 FOR UPDATE`, tenantId, "OWNER");
          const ownerCount = await tx.membership.count({
            where: { tenantId, role: "OWNER" },
          });
          if (ownerCount <= 1) {
            throw new TenantAdminError(
              "Cannot downgrade the last OWNER of the tenant",
              "LAST_OWNER",
              409,
            );
          }
        }

        const updated = await tx.membership.update({
          where: { id: membershipId },
          data: { role: params.role },
          include: { user: { select: { email: true, name: true } } },
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            actorId,
            action: "MEMBER_ROLE_CHANGED",
            target: membershipId,
            metadata: {
              userId: membership.userId,
              before: previousRole,
              after: params.role,
            },
          },
        });

        return {
          id: updated.id,
          userId: updated.userId,
          email: updated.user.email,
          name: updated.user.name,
          role: updated.role as UserRole,
          createdAt: updated.createdAt,
        };
      });
    } catch (e: any) {
      if (e?.code === "P2034" && attempt < MAX_RETRIES) {
        attempt++;
        continue;
      }
      throw e;
    }
  }
}

export async function removeTenantMember(
  actorId: string,
  tenantId: string,
  membershipId: string,
  db: TenantAdminDbWithTx = defaultPrisma as unknown as TenantAdminDbWithTx,
): Promise<void> {
  const MAX_RETRIES = 3;
  let attempt = 0;
  while (true) {
    try {
      await db.$transaction(async (tx) => {
        await resolveTenantAccessWithLifecycle(actorId, tenantId, Permission.MEMBERS_REMOVE, "NORMAL_OPERATION", tx as unknown as AccessResolutionDb);

        const membership = await tx.membership.findUnique({
          where: { id: membershipId },
        });
        if (!membership || membership.tenantId !== tenantId) {
          throw new TenantAdminError("Membership not found", "NOT_FOUND", 404);
        }

        if (membership.role === "OWNER") {
          await tx.$executeRawUnsafe(`SELECT id FROM "Membership" WHERE "tenantId" = $1 AND role = $2 FOR UPDATE`, tenantId, "OWNER");
          const ownerCount = await tx.membership.count({
            where: { tenantId, role: "OWNER" },
          });
          if (ownerCount <= 1) {
            throw new TenantAdminError(
              "Cannot remove the last OWNER of the tenant",
              "LAST_OWNER",
              409,
            );
          }
        }

        await tx.membership.delete({ where: { id: membershipId } });

        await tx.auditLog.create({
          data: {
            tenantId,
            actorId,
            action: "MEMBER_REMOVED",
            target: membershipId,
            metadata: { userId: membership.userId, role: membership.role },
          },
        });
      });
      return;
    } catch (e: any) {
      if (e?.code === "P2034" && attempt < MAX_RETRIES) {
        attempt++;
        continue;
      }
      throw e;
    }
  }
}

export interface CreateInvitationParams {
  email: string;
  role: UserRole;
}

export async function createTenantInvitation(
  actorId: string,
  tenantId: string,
  params: CreateInvitationParams,
  db: TenantAdminDbWithTx = defaultPrisma as unknown as TenantAdminDbWithTx,
  origin?: string,
): Promise<{ id: string; email: string; role: string; inviteLink: string; createdAt: Date }> {
  const safeOrigin = resolvePublicOrigin(origin);
  const email = params.email.toLowerCase().trim();
  if (!email || !email.includes("@")) {
    throw new TenantAdminError("Invalid email", "INVALID_EMAIL", 400);
  }

  if (params.role === "SUPER_ADMIN") {
    throw new TenantAdminError("Cannot invite SUPER_ADMIN to a tenant", "INVALID_ROLE", 400);
  }

  const validRoles: UserRole[] = ["OWNER", "ADMIN", "STRATEGIST", "EDITOR", "ANALYST", "APPROVER", "VIEWER", "TENANT_ADMIN", "PUBLISHER"];
  if (!validRoles.includes(params.role)) {
    throw new TenantAdminError(`Invalid role: ${params.role}`, "INVALID_ROLE", 400);
  }

  return db.$transaction(async (tx) => {
    const accessResult = await resolveTenantAccess(actorId, tenantId, Permission.INVITATIONS_CREATE, tx as unknown as AccessResolutionDb);
    const capability = invitationCapabilityForLifecycle(accessResult.status, params.role as UserRole);
    assertTenantLifecycleAllowsMutation(accessResult.status, capability);

    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    if (!tenant) throw new TenantAdminError("Tenant not found", "NOT_FOUND", 404);

    const existingInvite = await tx.invitation.findFirst({
      where: { tenantId, email, acceptedById: null, expiresAt: { gt: new Date() } },
    });
    if (existingInvite) {
      throw new TenantAdminError("An active invitation already exists for this email", "DUPLICATE_INVITATION", 409);
    }

    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);

    const invitation = await tx.invitation.create({
      data: {
        id: `inv_${randomUUID()}`,
        tenantId,
        email,
        role: params.role,
        tokenHash,
        expiresAt: getInvitationExpiration(),
      },
    });

    const inviteLink = buildInviteLink(safeOrigin, plainToken, email, "INVITATION_REQUIRED", tenant.slug);

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: "INVITATION_CREATED",
        target: invitation.id,
        metadata: { email, role: params.role },
      },
    });

    return {
      id: invitation.id,
      email,
      role: params.role,
      inviteLink,
      createdAt: invitation.createdAt,
    };
  });
}

export async function resendTenantInvitation(
  actorId: string,
  tenantId: string,
  invitationId: string,
  db: TenantAdminDbWithTx = defaultPrisma as unknown as TenantAdminDbWithTx,
  origin?: string,
): Promise<{ id: string; inviteLink: string }> {
  const safeOrigin = resolvePublicOrigin(origin);
  return db.$transaction(async (tx) => {
    const accessResult = await resolveTenantAccess(actorId, tenantId, Permission.INVITATIONS_REISSUE, tx as unknown as AccessResolutionDb);

    const invitation = await tx.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.tenantId !== tenantId) {
      throw new TenantAdminError("Invitation not found", "NOT_FOUND", 404);
    }

    if (invitation.acceptedById) {
      throw new TenantAdminError("Invitation already accepted", "ALREADY_ACCEPTED", 409);
    }

    const capability = invitationCapabilityForLifecycle(accessResult.status, invitation.role as UserRole);
    assertTenantLifecycleAllowsMutation(accessResult.status, capability);

    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    if (!tenant) throw new TenantAdminError("Tenant not found", "NOT_FOUND", 404);

    const plainToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(plainToken);
    const now = new Date();

    await tx.invitation.update({
      where: { id: invitationId },
      data: {
        tokenHash,
        expiresAt: getInvitationExpiration(),
      },
    });

    const inviteLink = buildInviteLink(safeOrigin, plainToken, invitation.email, "INVITATION_REQUIRED", tenant.slug);

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: "INVITATION_REISSUED",
        target: invitationId,
        metadata: { email: invitation.email },
      },
    });

    return { id: invitationId, inviteLink };
  });
}

export async function revokeTenantInvitation(
  actorId: string,
  tenantId: string,
  invitationId: string,
  db: TenantAdminDbWithTx = defaultPrisma as unknown as TenantAdminDbWithTx,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const accessResult = await resolveTenantAccess(actorId, tenantId, Permission.INVITATIONS_REVOKE, tx as unknown as AccessResolutionDb);

    const invitation = await tx.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.tenantId !== tenantId) {
      throw new TenantAdminError("Invitation not found", "NOT_FOUND", 404);
    }

    if (invitation.acceptedById) {
      throw new TenantAdminError("Cannot revoke an accepted invitation", "ALREADY_ACCEPTED", 409);
    }

    const capability = invitationCapabilityForLifecycle(accessResult.status, invitation.role as UserRole);
    assertTenantLifecycleAllowsMutation(accessResult.status, capability);

    await tx.invitation.delete({ where: { id: invitationId } });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: "INVITATION_REVOKED",
        target: invitationId,
        metadata: { email: invitation.email, role: invitation.role },
      },
    });
  });
}

export async function listTenantInvitations(
  actorId: string,
  tenantId: string,
  db: TenantAdminDbWithTx = defaultPrisma as unknown as TenantAdminDbWithTx,
  pagination: PaginationParams = { page: DEFAULT_PAGE, limit: DEFAULT_LIMIT },
): Promise<PaginatedResult<{ id: string; email: string; role: string; accepted: boolean; expiresAt: Date; createdAt: Date }>> {
  return db.$transaction(async (tx) => {
    await resolveTenantAccess(actorId, tenantId, Permission.INVITATIONS_READ, tx as unknown as AccessResolutionDb);

    const skip = (pagination.page - 1) * pagination.limit;
    const [invitations, total] = await Promise.all([
      tx.invitation.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        skip,
        take: pagination.limit,
      }),
      tx.invitation.count({ where: { tenantId } }),
    ]);

    const items = invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      accepted: !!inv.acceptedById,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    }));

    return { items, total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) };
  });
}
