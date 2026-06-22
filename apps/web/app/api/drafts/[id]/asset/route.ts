import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { auditLog } from "../../../../../lib/audit";
import { normalizeAssetManifest, roleForAssetOrder } from "../../../../../lib/publishing-formats";
import { resolveAssetUrl } from "../../../../../lib/asset-resolution";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null) as { assetId?: string; assetIds?: unknown[] } | null;
  if (!body || (typeof body.assetId !== "string" && !Array.isArray(body.assetIds))) {
    return NextResponse.json({ error: "assetId or assetIds is required" }, { status: 400 });
  }

  const requestedAssetIds: string[] = Array.isArray(body.assetIds)
    ? body.assetIds.map((value: unknown) => String(value)).filter(Boolean)
    : [String(body.assetId)];
  const assetIds: string[] = Array.from(new Set(requestedAssetIds));

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

  const newAssets = assetIds.length > 0
    ? await prisma.asset.findMany({
        where: { id: { in: assetIds }, tenantId: draft.tenantId },
      })
    : [];
  if (newAssets.length !== assetIds.length) {
    return NextResponse.json({ error: "One or more assets were not found in this tenant" }, { status: 404 });
  }

  const oldAssets = draft.assets;
  const oldAssetIds = oldAssets.map((da: { assetId: string }) => da.assetId);

  if (!Array.isArray(body.assetIds) && oldAssetIds.includes(assetIds[0])) {
    return NextResponse.json({ error: "Asset already linked to this draft" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.contentDraftAsset.deleteMany({
      where: { draftId: id },
    });

    if (assetIds.length > 0) {
      await tx.contentDraftAsset.createMany({
        data: assetIds.map((assetId, index) => ({
          id: crypto.randomUUID(),
          draftId: id,
          assetId,
          role: roleForAssetOrder(index + 1),
        })),
      });
    }
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
      newAssetIds: assetIds,
      previousFilenames: oldAssets.map((da: { asset: { filename: string } }) => da.asset.filename),
      newFilenames: newAssets.map((asset) => asset.filename),
    },
  });

  const updatedLinks = await prisma.contentDraftAsset.findMany({
    where: { draftId: id },
    include: { asset: true },
  });
  const tenant = await prisma.tenant.findUnique({ where: { id: draft.tenantId }, select: { slug: true } });
  const orderedAssets = normalizeAssetManifest(updatedLinks, (asset) => resolveAssetUrl(asset, tenant?.slug ?? ""));

  return NextResponse.json({
    ok: true,
    draftId: id,
    previousAssetIds: oldAssetIds,
    assets: orderedAssets,
    newAsset: orderedAssets[0]
      ? {
          id: orderedAssets[0].id,
          filename: orderedAssets[0].filename,
          kind: orderedAssets[0].kind,
          path: orderedAssets[0].url,
        }
      : null,
    statusChanged: draft.status === "APPROVED",
  });
}
