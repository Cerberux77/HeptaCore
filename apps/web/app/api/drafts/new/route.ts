import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { auditLog } from "../../../../lib/audit";
import { formatNetwork, MULTIFORMAT_VALUES, normalizePublishingFormat } from "../../../../lib/publishing-formats";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { title, caption = "", network, format = "INSTAGRAM_FEED", assetId, tenantSlug } = body as {
    title: string;
    caption?: string;
    network?: string;
    format?: string;
    assetId?: string;
    tenantSlug?: string;
  };

  if (!tenantSlug) {
    return NextResponse.json({ error: "tenantSlug is required" }, { status: 400 });
  }

  const validNetworks = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "LINKEDIN", "X"];
  const normalizedFormat = normalizePublishingFormat(network ?? "INSTAGRAM", format);
  if (!MULTIFORMAT_VALUES.includes(normalizedFormat)) {
    return NextResponse.json({ error: "Invalid publishing format" }, { status: 400 });
  }
  const normalizedNetwork = formatNetwork(normalizedFormat);

  if (!validNetworks.includes(normalizedNetwork)) {
    return NextResponse.json({ error: "Invalid network" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id },
  });
  if (!membership || !["OWNER", "ADMIN", "EDITOR", "STRATEGIST", "PUBLISHER", "SUPER_ADMIN", "TENANT_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const draft = await prisma.contentDraft.create({
    data: {
      tenantId: tenant.id,
      network: normalizedNetwork as any,
      format: normalizedFormat,
      title: title.trim(),
      caption: (caption ?? "").trim(),
      hashtags: [],
      status: "DRAFT",
      riskLevel: "low",
      requiresReview: true,
    },
  });

  if (assetId) {
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, tenantId: tenant.id },
    });
    if (asset) {
      await prisma.contentDraftAsset.create({
        data: { draftId: draft.id, assetId: asset.id, role: "primary" },
      });
    }
  }

  await auditLog({
    tenantId: tenant.id,
    actorId: session.user.id,
    action: "draft_created",
    target: `draft:${draft.id}`,
    metadata: { title: draft.title, network: normalizedNetwork, format: normalizedFormat },
  });

  return NextResponse.json({ ok: true, draft });
}
