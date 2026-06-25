import { createHash, randomBytes } from "node:crypto";

export function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getInvitationExpiration(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}
