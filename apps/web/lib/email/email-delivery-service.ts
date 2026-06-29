import { prisma } from "../prisma";
import { getEmailConfig } from "./email-config";
import { createResendProvider } from "./providers/resend-provider";
import { createFakeEmailProvider } from "./providers/fake-email-provider";
import type { TransactionalEmailProvider } from "./email-provider";
import type { Prisma, TransactionalEmailType } from "@prisma/client";

export function getEmailProvider(): TransactionalEmailProvider {
  const config = getEmailConfig();
  if (config.provider === "disabled") return createFakeEmailProvider();
  return createResendProvider(config.resendApiKey!);
}

export interface CreateAndSendResult {
  deliveryId: string;
  status: string;
  reason?: string;
  inviteLink?: string;
  providerMessageId?: string;
  error?: string;
}

export async function createAndSendEmail(params: {
  tenantId?: string;
  invitationId?: string;
  userId?: string;
  type: TransactionalEmailType;
  recipient: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  inviteLink?: string;
  tags?: Array<{ name: string; value: string }>;
}, tx?: Prisma.TransactionClient): Promise<CreateAndSendResult> {
  const db = tx ?? prisma;
  const config = getEmailConfig();
  const sender = config.from;

  let delivery: any;
  try {
    delivery = await (db as any).emailDelivery.create({
      data: {
        tenantId: params.tenantId,
        invitationId: params.invitationId,
        userId: params.userId,
        type: params.type,
        provider: config.provider,
        recipient: params.recipient,
        sender,
        subject: params.subject,
        idempotencyKey: params.idempotencyKey,
        status: config.provider === "disabled" ? "DISABLED" : "PENDING",
        attemptCount: 0,
      },
    });
  } catch (err: any) {
    if (err?.code === "P2002" || err?.message?.includes("Unique constraint") || err?.message?.includes("unique")) {
      delivery = await (db as any).emailDelivery.findUnique({ where: { idempotencyKey: params.idempotencyKey } });
    }
    if (!delivery) throw err;
  }

  // Idempotent return: if delivery already exists, don't re-send
  if (delivery && delivery.status !== "PENDING") {
    return {
      deliveryId: delivery.id,
      status: delivery.status as string,
      reason: delivery.status === "DISABLED" ? "EMAIL_PROVIDER_NOT_CONFIGURED" : undefined,
      inviteLink: params.inviteLink,
      providerMessageId: delivery.providerMessageId,
    };
  }

  if (config.provider === "disabled") {
    if (delivery && delivery.status === "PENDING") {
      await (db as any).emailDelivery.update({
        where: { id: delivery.id },
        data: { status: "DISABLED" },
      });
    }
    return {
      deliveryId: delivery.id,
      status: "DISABLED",
      reason: "EMAIL_PROVIDER_NOT_CONFIGURED",
      inviteLink: params.inviteLink,
    };
  }

  const provider = getEmailProvider();
  try {
    const result = await provider.send({
      to: params.recipient,
      from: sender,
      replyTo: config.replyTo,
      subject: params.subject,
      html: params.html,
      text: params.text,
      idempotencyKey: params.idempotencyKey,
      tags: params.tags,
    });

    if (result.accepted && result.providerMessageId) {
      await (db as any).emailDelivery.update({
        where: { id: delivery.id },
        data: { status: "SENT", providerMessageId: result.providerMessageId, sentAt: new Date(), attemptCount: { increment: 1 } },
      });
      return { deliveryId: delivery.id, status: "SENT", providerMessageId: result.providerMessageId };
    } else {
      await (db as any).emailDelivery.update({
        where: { id: delivery.id },
        data: { status: "FAILED", lastErrorCode: "SEND_FAILED", lastErrorMessage: result.error || "Provider rejected", attemptCount: { increment: 1 } },
      });
      return { deliveryId: delivery.id, status: "FAILED", error: result.error };
    }
  } catch (err: any) {
    await (db as any).emailDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", lastErrorCode: "PROVIDER_ERROR", lastErrorMessage: err?.message?.slice(0, 500), attemptCount: { increment: 1 } },
    });
    return { deliveryId: delivery.id, status: "FAILED", error: err?.message };
  }
}
