import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

export const RecoverPasswordRequestSchema = z.object({
  identifier: z.string().trim().min(1).optional(),
  email: z.string().trim().min(1).optional(),
}).superRefine((value, ctx) => {
  const identifier = value.identifier ?? value.email;
  if (!identifier || !identifier.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["identifier"],
      message: "identifier is required",
    });
  }
});

export const ResetPasswordRequestSchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).superRefine((value, ctx) => {
  if (value.password !== value.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords do not match",
    });
  }
});

export class PasswordResetError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
    this.name = "PasswordResetError";
  }
}

type PasswordResetDb = Prisma.TransactionClient;

function authDiagnosticsEnabled(): boolean {
  return process.env.HEPTACORE_AUTH_DIAGNOSTICS === "1";
}

function logPasswordResetDiagnostic(event: string, payload: Record<string, unknown>) {
  if (!authDiagnosticsEnabled()) return;
  console.info(`[auth.reset] ${event}`, payload);
}

function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createPlainPasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
}

function normalizeRecoveryIdentifier(value: string): string {
  const trimmed = value.trim();
  return trimmed.includes("@") ? trimmed.toLowerCase() : trimmed;
}

export async function issuePasswordResetForUser(
  userId: string,
  db: PasswordResetDb,
  expiresInMs = 60 * 60 * 1000,
): Promise<string> {
  const plainToken = createPlainPasswordResetToken();
  const tokenHash = hashPasswordResetToken(plainToken);
  const expiresAt = new Date(Date.now() + expiresInMs);

  await db.passwordResetToken.updateMany({
    where: { userId, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await db.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return plainToken;
}

export async function consumePasswordResetToken(
  rawInput: unknown,
  db: PasswordResetDb,
): Promise<{ ok: true; userId: string }> {
  const parsed = ResetPasswordRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new PasswordResetError("token, password and confirmPassword are required", "INVALID_REQUEST", 400);
  }

  const { token, password } = parsed.data;
  const tokenHash = hashPasswordResetToken(token);

  const stored = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true } } },
  });

  if (!stored || stored.consumedAt || stored.expiresAt.getTime() <= Date.now()) {
    throw new PasswordResetError("Invalid or expired reset token", "INVALID_TOKEN", 400);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.update({
    where: { id: stored.userId },
    data: { passwordHash },
  });

  const updatedUser = authDiagnosticsEnabled()
    ? await db.user.findUnique({
      where: { id: stored.userId },
      select: { id: true, email: true, passwordHash: true },
    })
    : null;

  const immediateCompareOk = updatedUser?.passwordHash
    ? await bcrypt.compare(password, updatedUser.passwordHash)
    : false;

  logPasswordResetDiagnostic("password update verification", {
    normalizedIdentifier: updatedUser ? normalizeRecoveryIdentifier(updatedUser.email) : null,
    userId: stored.userId,
    passwordHashUpdated: Boolean(updatedUser?.passwordHash),
    immediateCompareOk,
  });

  await db.passwordResetToken.update({
    where: { id: stored.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true, userId: stored.userId };
}

export async function requestPasswordReset(
  rawInput: unknown,
  db: PasswordResetDb,
): Promise<{ ok: true; token: string | null }> {
  const parsed = RecoverPasswordRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new PasswordResetError("identifier is required", "INVALID_REQUEST", 400);
  }

  const identifier = normalizeRecoveryIdentifier((parsed.data.identifier ?? parsed.data.email) as string);
  const user = await db.user.findUnique({
    where: { email: identifier },
    select: { id: true },
  });

  if (!user) {
    return { ok: true, token: null };
  }

  const token = await issuePasswordResetForUser(user.id, db);
  return { ok: true, token };
}
