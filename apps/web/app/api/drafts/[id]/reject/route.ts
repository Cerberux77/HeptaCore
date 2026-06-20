import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { auditLog } from "../../../../../lib/audit";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const draft = await prisma.contentDraft.findUnique({ where: { id } });
  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  // RBAC: check if user has approval role in this tenant
  const membership = await prisma.membership.findFirst({
    where: { tenantId: draft.tenantId, userId: session.user.id },
  });
  if (!membership || !["OWNER", "ADMIN", "APPROVER", "SUPER_ADMIN", "TENANT_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden: approval role required" }, { status: 403 });
  }

  const updated = await prisma.contentDraft.update({
    where: { id },
    data: { status: "REJECTED" },
    select: {
      id: true,
      title: true,
      caption: true,
      network: true,
      format: true,
      pillar: true,
      status: true,
      riskLevel: true,
      requiresReview: true,
      scheduledFor: true,
      hashtags: true,
      cta: true,
      source: true,
      assets: { take: 1, select: { asset: { select: { filename: true, sourcePath: true, kind: true } } } },
    },
  });

  await prisma.approval.create({
    data: {
      tenantId: draft.tenantId,
      draftId: id,
      reviewerId: session.user.id,
      status: "REJECTED",
      reason: "Rejected via console",
    },
  });

  await auditLog({
    tenantId: draft.tenantId,
    actorId: session.user.id,
    action: "draft_rejected",
    target: `draft:${id}`,
    metadata: { title: draft.title },
  });

  return NextResponse.json({
    ok: true,
    status: "REJECTED",
    draft: {
      id: updated.id,
      title: updated.title,
      caption: updated.caption,
      network: updated.network,
      format: updated.format,
      pillar: updated.pillar,
      status: updated.status,
      riskLevel: updated.riskLevel,
      requiresReview: updated.requiresReview,
      scheduledFor: updated.scheduledFor?.toISOString().slice(0, 16).replace("T", " ") ?? null,
      hashtags: updated.hashtags,
      cta: updated.cta,
      source: updated.source,
      asset: updated.assets[0]?.asset
        ? {
            filename: updated.assets[0].asset.filename,
            path: updated.assets[0].asset.sourcePath,
            kind: updated.assets[0].asset.kind,
          }
        : null,
    },
  });
}
