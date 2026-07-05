import { prisma } from "../prisma";
import { createAndSendEmail } from "./email-delivery-service";
import type { CreateAndSendResult } from "./email-delivery-service";
import { renderTemplate } from "./templates/index";
import { getEmailConfig } from "./email-config";
import { resolvePublicOrigin } from "../url-origin";
import type { Prisma } from "@prisma/client";

export async function sendTenantOwnerInvitation(params: {
  tenantId: string;
  tenantSlug: string;
  invitationId: string;
  email: string;
  tenantName: string;
  token: string;
  expiresAt: Date;
  ownerAccountState?: "EXISTING_ACCOUNT" | "INVITATION_REQUIRED";
}): Promise<CreateAndSendResult> {
  const config = getEmailConfig();
  const origin = resolvePublicOrigin(config.appUrl);
  const inviteLink = buildInviteLink(origin, params.token, params.email, params.ownerAccountState, params.tenantSlug);
  const { html, text, subject } = await renderTemplate("owner-invitation", "es", {
    tenantName: params.tenantName,
    token: params.token,
    email: params.email,
    inviteLink,
    expiresAt: params.expiresAt,
    isExistingAccount: params.ownerAccountState === "EXISTING_ACCOUNT",
    emailFrom: config.from,
  });

  const idempotencyKey = `heptacore/email/invitation/${params.invitationId}`;
  return createAndSendEmail({
    tenantId: params.tenantId,
    invitationId: params.invitationId,
    type: "TENANT_OWNER_INVITATION",
    recipient: params.email,
    subject,
    html,
    text,
    idempotencyKey,
    inviteLink,
    tags: [{ name: "type", value: "owner-invitation" }],
  });
}

export function buildInviteLink(
  origin: string,
  token: string,
  email: string,
  ownerAccountState?: string,
  tenantSlug?: string,
): string {
  const base = origin.replace(/\/+$/, "");
  if (ownerAccountState === "EXISTING_ACCOUNT") {
    return `${base}/login?callbackUrl=/tenant/${tenantSlug || ""}`;
  }
  return `${base}/register?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}
