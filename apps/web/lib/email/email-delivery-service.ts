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
  tags?: Array<{ name: string; value: string }>;
}, tx?: Prisma.TransactionClient): Promise<{ deliveryId: string; status: string; providerMessageId?: string; error?: string }> {
  const db = tx ?? prisma;
  const config = getEmailConfig();
  const sender = config.from;

  const delivery = await (db as any).emailDelivery.create({
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
      status: "PENDING",
    },
  });

  if (config.provider === "disabled") {
    return { deliveryId: delivery.id, status: "DISABLED" };
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
