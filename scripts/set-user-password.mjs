import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const MIN_PASSWORD_LENGTH = 12;

export function normalizeAuthIdentifier(value) {
  return String(value).toLowerCase().trim();
}

export function passwordRepairEnabled(env = process.env) {
  return env.HEPTACORE_ALLOW_PASSWORD_REPAIR === "1";
}

export async function setUserPassword({
  db,
  env = process.env,
  bcryptLib = bcrypt,
  logger = console.info,
}) {
  if (!passwordRepairEnabled(env)) {
    const error = new Error("HEPTACORE_ALLOW_PASSWORD_REPAIR=1 is required");
    error.exitCode = 1;
    throw error;
  }

  const rawIdentifier = env.HEPTACORE_PASSWORD_REPAIR_IDENTIFIER;
  const password = env.HEPTACORE_PASSWORD_REPAIR_PASSWORD;

  if (!rawIdentifier?.trim()) {
    const error = new Error("HEPTACORE_PASSWORD_REPAIR_IDENTIFIER is required");
    error.exitCode = 1;
    throw error;
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    const error = new Error(`HEPTACORE_PASSWORD_REPAIR_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`);
    error.exitCode = 1;
    throw error;
  }

  const identifier = normalizeAuthIdentifier(rawIdentifier);
  const user = await db.user.findUnique({
    where: { email: identifier },
    select: { id: true, email: true, platformRole: true, passwordHash: true },
  });

  if (!user) {
    logger("[auth.password-repair] result", {
      userFound: false,
      identifier,
      platformRole: null,
      hasPasswordHashBefore: false,
      hasPasswordHashAfter: false,
      immediateCompareOk: false,
    });

    const error = new Error("User not found");
    error.exitCode = 1;
    throw error;
  }

  const nextPasswordHash = await bcryptLib.hash(password, 12);
  const updated = await db.user.update({
    where: { id: user.id },
    data: { passwordHash: nextPasswordHash },
    select: { email: true, platformRole: true, passwordHash: true },
  });

  const immediateCompareOk = await bcryptLib.compare(password, updated.passwordHash);

  logger("[auth.password-repair] result", {
    userFound: true,
    identifier,
    platformRole: updated.platformRole ?? null,
    hasPasswordHashBefore: Boolean(user.passwordHash),
    hasPasswordHashAfter: Boolean(updated.passwordHash),
    immediateCompareOk,
  });

  if (!immediateCompareOk) {
    const error = new Error("Immediate bcrypt verification failed");
    error.exitCode = 2;
    throw error;
  }

  return {
    userFound: true,
    identifier,
    platformRole: updated.platformRole ?? null,
    hasPasswordHashBefore: Boolean(user.passwordHash),
    hasPasswordHashAfter: Boolean(updated.passwordHash),
    immediateCompareOk,
  };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await setUserPassword({ db: prisma });
  } catch (error) {
    const exitCode = typeof error?.exitCode === "number" ? error.exitCode : 1;
    process.exitCode = exitCode;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  await main();
}
