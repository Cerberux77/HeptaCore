import { randomUUID } from "node:crypto";
import { TenantStatus, type Tenant, type Membership, type Invitation, type User } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";
import { hashInvitationToken, generateInvitationToken, getInvitationExpiration } from "./invitation-token";
import { buildInviteLink } from "./email/email-invitation-service";
import {
  assertTenantLifecycleAllowsMutation,
  requireSuperAdminActor,
  resolveTenantAccessWithLifecycle,
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

export async function listAdminTenants(
  actorId: string,
  db: TenantAdminDb = defaultPrisma as unknown as TenantAdminDb,
): Promise<SerializedTenant[]> {
  await requireSuperAdminActor(actorId, db);
  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: "desc" },
  } as unknown as Parameters<typeof db.tenant.findMany>[0]);
  return (tenants as unknown as Array<Record<string, unknown> & { memberships?: Array<{ user: { email: string } }> }>).map((t) =>
    serializeTenant(t as unknown as Tenant & { memberships?: Array<{ user: { email: string } }> }, (t.memberships?.[0]?.user?.email) ?? "N/A"),
  );
}

export async function getAdminTenant(
  actorId: string,
  tenantId: string,
  db: TenantAdminDb = defaultPrisma as unknown as TenantAdminDb,
): Promise<SerializedTenant> {
  await requireSuperAdminActor(actorId, db);
  const tenant = await db.tenant.findUniqueOrThrow({
    where: { id: tenantId },
  } as unknown as Parameters<typeof db.tenant.findUniqueOrThrow>[0]);
  return serializeTenant(
    tenant as unknown as Tenant & { memberships?: Array<{ user: { email: string } }> },
    "N/A",
  );
}

export async function createAdminTenant(
  params: CreateTenantParams,
  db: TenantAdminDbWithTx = defaultPrisma as unknown as TenantAdminDbWithTx,
): Promise<SerializedTenant> {
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
      inviteLink = buildInviteLink(plainToken, ownerEmail, "INVITATION_REQUIRED", undefined, normalizedSlug);
    } else {
      inviteLink = buildInviteLink("", ownerEmail, "EXISTING_ACCOUNT", undefined, normalizedSlug);
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
): Promise<SerializedMember[]> {
  return db.$transaction(async (tx) => {
    await resolveTenantAccessWithLifecycle(actorId, tenantId, Permission.MEMBERS_READ, "NORMAL_OPERATION", tx as unknown as AccessResolutionDb);

    const memberships = await tx.membership.findMany({
      where: { tenantId },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role as UserRole,
      createdAt: m.createdAt,
    }));
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

    let user = await tx.user.findUnique({ where: { email } });
    if (!user) {
      user = await tx.user.create({ data: { email, name: email } });
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

  return db.$transaction(async (tx) => {
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
}

export async function removeTenantMember(
  actorId: string,
  tenantId: string,
  membershipId: string,
  db: TenantAdminDbWithTx = defaultPrisma as unknown as TenantAdminDbWithTx,
): Promise<void> {
  await db.$transaction(async (tx) => {
    await resolveTenantAccessWithLifecycle(actorId, tenantId, Permission.MEMBERS_REMOVE, "NORMAL_OPERATION", tx as unknown as AccessResolutionDb);

    const membership = await tx.membership.findUnique({
      where: { id: membershipId },
    });
    if (!membership || membership.tenantId !== tenantId) {
      throw new TenantAdminError("Membership not found", "NOT_FOUND", 404);
    }

    if (membership.role === "OWNER") {
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
): Promise<{ id: string; email: string; role: string; inviteLink: string; createdAt: Date }> {
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
    await resolveTenantAccessWithLifecycle(actorId, tenantId, Permission.INVITATIONS_CREATE, "NORMAL_OPERATION", tx as unknown as AccessResolutionDb);

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

    const inviteLink = buildInviteLink(plainToken, email, "INVITATION_REQUIRED", undefined, tenant.slug);

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
): Promise<{ id: string; inviteLink: string }> {
  return db.$transaction(async (tx) => {
    await resolveTenantAccessWithLifecycle(actorId, tenantId, Permission.INVITATIONS_REISSUE, "NORMAL_OPERATION", tx as unknown as AccessResolutionDb);

    const invitation = await tx.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.tenantId !== tenantId) {
      throw new TenantAdminError("Invitation not found", "NOT_FOUND", 404);
    }

    if (invitation.acceptedById) {
      throw new TenantAdminError("Invitation already accepted", "ALREADY_ACCEPTED", 409);
    }

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

    const inviteLink = buildInviteLink(plainToken, invitation.email, "INVITATION_REQUIRED", undefined, tenant.slug);

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
    await resolveTenantAccessWithLifecycle(actorId, tenantId, Permission.INVITATIONS_REVOKE, "NORMAL_OPERATION", tx as unknown as AccessResolutionDb);

    const invitation = await tx.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.tenantId !== tenantId) {
      throw new TenantAdminError("Invitation not found", "NOT_FOUND", 404);
    }

    if (invitation.acceptedById) {
      throw new TenantAdminError("Cannot revoke an accepted invitation", "ALREADY_ACCEPTED", 409);
    }

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
): Promise<Array<{ id: string; email: string; role: string; accepted: boolean; expiresAt: Date; createdAt: Date }>> {
  return db.$transaction(async (tx) => {
    await resolveTenantAccessWithLifecycle(actorId, tenantId, Permission.INVITATIONS_READ, "NORMAL_OPERATION", tx as unknown as AccessResolutionDb);

    const invitations = await tx.invitation.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      accepted: !!inv.acceptedById,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    }));
  });
}
