import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { auditLog } from "../../../../../lib/audit";

const APPROVE_ROLES = ["OWNER", "ADMIN", "SUPER_ADMIN", "TENANT_ADMIN"];

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: campaign.tenantId, userId: session.user.id },
  });
  if (!membership || !APPROVE_ROLES.includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
  }

  const body = await _req.json().catch(() => ({}));
  const action = String(body.action ?? "approve");

  if (action === "approve") {
    if (campaign.status !== "PROPOSED" && campaign.status !== "NEEDS_APPROVAL") {
      return NextResponse.json({ error: `Campaign must be PROPOSED or NEEDS_APPROVAL. Current: ${campaign.status}` }, { status: 409 });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    await auditLog({
      tenantId: campaign.tenantId,
      actorId: session.user.id,
      action: "campaign_approved",
      target: `campaign:${id}`,
      metadata: { name: campaign.name, network: campaign.network, totalCharge: Number(campaign.totalCharge) },
    });

    return NextResponse.json({ ok: true, status: "APPROVED", realSpendBlocked: true });
  }

  if (action === "reject") {
    await prisma.campaign.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    await auditLog({
      tenantId: campaign.tenantId,
      actorId: session.user.id,
      action: "campaign_rejected",
      target: `campaign:${id}`,
      metadata: { name: campaign.name, network: campaign.network },
    });

    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  return NextResponse.json({ error: "Invalid action. Use 'approve' or 'reject'" }, { status: 400 });
}
