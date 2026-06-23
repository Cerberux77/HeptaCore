import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("svix-signature");

  if (!signature) {
    return NextResponse.json({ ok: false, error: "Missing signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const type = event?.type as string;
  const providerEventId = event?.data?.id as string;
  const providerMessageId = event?.data?.email_id as string;

  if (!type || !providerEventId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const existing = await prisma.emailWebhookEvent.findUnique({ where: { providerEventId } });
  if (existing) return NextResponse.json({ ok: true, duplicate: true });

  await prisma.emailWebhookEvent.create({
    data: {
      providerEventId,
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
  if (!status) return NextResponse.json({ ok: true });

  if (providerMessageId) {
    const delivery = await prisma.emailDelivery.findUnique({ where: { providerMessageId } });
    if (delivery) {
      if (delivery.status === "DELIVERED" && status !== "DELIVERED") {
        return NextResponse.json({ ok: true });
      }
      const updateData: any = { status };
      if (status === "DELIVERED") updateData.deliveredAt = new Date();
      if (status === "BOUNCED") updateData.bouncedAt = new Date();
      if (status === "COMPLAINED") updateData.complainedAt = new Date();
      if (status === "FAILED") updateData.lastErrorMessage = event?.data?.reason || "Webhook reported failure";

      await prisma.emailDelivery.update({ where: { id: delivery.id }, data: updateData });
    }
  }

  return NextResponse.json({ ok: true });
}
