import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { hashInvitationToken } from "./invitation-token";

export class InvitationAcceptanceError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
    this.name = "InvitationAcceptanceError";
  }
}

export interface AcceptRegistrationParams {
  token: string;
  email: string;
  password: string;
  confirmPassword?: string;
  name?: string;
}

export interface AcceptRegistrationResult {
  ok: true;
  userId: string;
}

export async function acceptRegistrationInvitation(
  params: AcceptRegistrationParams,
  tx: Prisma.TransactionClient,
): Promise<AcceptRegistrationResult> {
  const { token, email, password, confirmPassword, name } = params;
  const normalizedEmail = email.toLowerCase().trim();

  if (!password || password.length < 8) {
    throw new InvitationAcceptanceError("Password must be at least 8 characters", "WEAK_PASSWORD", 400);
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    throw new InvitationAcceptanceError("Passwords do not match", "PASSWORD_MISMATCH", 400);
  }

  const tokenHash = hashInvitationToken(token);

  const invitation = await tx.invitation.findFirst({
    where: { tokenHash, acceptedById: null, expiresAt: { gt: new Date() } },
  });

  if (!invitation) {
    throw new InvitationAcceptanceError("Invalid or expired invitation token", "INVALID_INVITATION", 400);
  }

  if (invitation.email !== normalizedEmail) {
    throw new InvitationAcceptanceError("Email does not match the invitation", "EMAIL_MISMATCH", 400);
  }

  const existingUser = await tx.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, passwordHash: true, name: true },
  });

  if (existingUser && existingUser.passwordHash === null) {
    const passwordHash = await bcrypt.hash(password, 12);

    await tx.user.update({
      where: { id: existingUser.id },
      data: { passwordHash, name: name || existingUser.name || normalizedEmail.split("@")[0] },
    });

    const existingMembership = await tx.membership.findUnique({
      where: { tenantId_userId: { tenantId: invitation.tenantId, userId: existingUser.id } },
    });
    if (!existingMembership) {
      await tx.membership.create({
        data: { tenantId: invitation.tenantId, userId: existingUser.id, role: invitation.role },
      });
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedById: existingUser.id, acceptedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        tenantId: invitation.tenantId,
        actorId: existingUser.id,
        action: "TENANT_INVITATION_ACCEPTED",
        target: invitation.id,
        metadata: { email: normalizedEmail, role: invitation.role },
      } as any,
    });

    return { ok: true, userId: existingUser.id };
  }

  if (!existingUser) {
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        name: name || normalizedEmail.split("@")[0],
        passwordHash,
      },
    });

    await tx.membership.create({
      data: { tenantId: invitation.tenantId, userId: user.id, role: invitation.role },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedById: user.id, acceptedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        tenantId: invitation.tenantId,
        actorId: user.id,
        action: "TENANT_INVITATION_ACCEPTED",
        target: invitation.id,
        metadata: { email: normalizedEmail, role: invitation.role },
      } as any,
    });

    return { ok: true, userId: user.id };
  }

  throw new InvitationAcceptanceError(
    "This email is already registered. Please log in instead.",
    "ACCOUNT_ALREADY_EXISTS",
    409,
  );
}
