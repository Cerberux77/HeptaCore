import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getEmailConfig } from "../../../../lib/email/email-config";

export const dynamic = "force-dynamic";

const TERMINAL_STATUSES = new Set(["DELIVERED", "BOUNCED", "COMPLAINED"]);

export async function POST(request: Request) {
  const config = getEmailConfig();
  if (!config.webhookSecret) {
    return NextResponse.json({ ok: false, error: "Webhook secret not configured" }, { status: 401 });
  }

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ ok: false, error: "Missing webhook headers" }, { status: 401 });
  }

  let event: any;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(config.resendApiKey || "placeholder");
    event = resend.webhooks.verify({
      payload: rawBody,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      webhookSecret: config.webhookSecret,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const type = event?.type as string;
  const providerMessageId = event?.data?.email_id as string;

  if (!type || !svixId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await prisma.$transaction(async (tx: any) => {
    const existing = await tx.emailWebhookEvent.findUnique({ where: { providerEventId: svixId } });
    if (existing) return;

    await tx.emailWebhookEvent.create({
      data: {
        providerEventId: svixId,
        providerMessageId,
        type,
        occurredAt: new Date(event.data?.created_at || Date.now()),
      },
    });

    const statusMap: Record<string, string> = {
      "email.sent": "SENT",
      "email.delivered": "DELIVERED",
      "email.delivery_delayed": "DELAYED",
      "email.failed": "FAILED",
      "email.bounced": "BOUNCED",
      "email.complained": "COMPLAINED",
    };

    const status = statusMap[type];
    if (!status || !providerMessageId) return;

    const delivery = await tx.emailDelivery.findUnique({ where: { providerMessageId } });
    if (!delivery) return;

    if (TERMINAL_STATUSES.has(delivery.status) && delivery.status !== status) {
      return;
    }

    const updateData: any = { status };
    if (status === "DELIVERED") updateData.deliveredAt = new Date();
    if (status === "BOUNCED") updateData.bouncedAt = new Date();
    if (status === "COMPLAINED") updateData.complainedAt = new Date();
    if (status === "FAILED") updateData.lastErrorMessage = event?.data?.reason || "Webhook reported failure";

    await tx.emailDelivery.update({ where: { id: delivery.id }, data: updateData });
  });

  return NextResponse.json({ ok: true });
}
