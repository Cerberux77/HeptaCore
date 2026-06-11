import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { auditLog } from "../../../../../lib/audit";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.assetId !== "string") {
    return NextResponse.json({ error: "assetId is required" }, { status: 400 });
  }

  const { assetId } = body as { assetId: string };

  const draft = await prisma.contentDraft.findUnique({
    where: { id },
    include: { assets: { include: { asset: true } } },
  });
  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: draft.tenantId, userId: session.user.id },
  });
  if (!membership || !["OWNER", "ADMIN", "EDITOR", "STRATEGIST", "PUBLISHER", "SUPER_ADMIN", "TENANT_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden: editor role required" }, { status: 403 });
  }

  const newAsset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId: draft.tenantId },
  });
  if (!newAsset) {
    return NextResponse.json({ error: "Asset not found in this tenant" }, { status: 404 });
  }

  const oldAssets = draft.assets;
  const oldAssetIds = oldAssets.map((da: { assetId: string }) => da.assetId);

  if (oldAssetIds.includes(assetId)) {
    return NextResponse.json({ error: "Asset already linked to this draft" }, { status: 409 });
  }

  await prisma.contentDraftAsset.deleteMany({
    where: { draftId: id },
  });

  await prisma.contentDraftAsset.create({
    data: {
      id: crypto.randomUUID(),
      draftId: id,
      assetId,
      role: "primary",
    },
  });

  if (draft.status === "APPROVED") {
    await prisma.contentDraft.update({
      where: { id },
      data: { status: "NEEDS_REVIEW", requiresReview: true },
    });
  }

  await auditLog({
    tenantId: draft.tenantId,
    actorId: session.user.id,
    action: "draft_asset_replaced",
    target: `draft:${id}`,
    metadata: {
      title: draft.title,
      previousAssetIds: oldAssetIds,
      newAssetId: assetId,
      previousFilenames: oldAssets.map((da: { asset: { filename: string } }) => da.asset.filename),
      newFilename: newAsset.filename,
    },
  });

  return NextResponse.json({
    ok: true,
    draftId: id,
    previousAssetIds: oldAssetIds,
    newAsset: {
      id: newAsset.id,
      filename: newAsset.filename,
      kind: newAsset.kind,
      path: newAsset.sourcePath,
    },
    statusChanged: draft.status === "APPROVED",
  });
}
