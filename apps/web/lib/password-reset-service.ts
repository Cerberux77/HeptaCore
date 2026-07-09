import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

export const RecoverPasswordRequestSchema = z.object({
  email: z.string().trim().email(),
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

function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createPlainPasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
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
    throw new PasswordResetError("email is required", "INVALID_REQUEST", 400);
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return { ok: true, token: null };
  }

  const token = await issuePasswordResetForUser(user.id, db);
  return { ok: true, token };
}
