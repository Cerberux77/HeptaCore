import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { auditLog } from "../../../../lib/audit";
import { formatNetwork, MULTIFORMAT_VALUES, normalizePublishingFormat } from "../../../../lib/publishing-formats";
import { hasCanonicalTenantAccess } from "../../../../lib/role-model";

export async function PUT(
  req: Request,
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

  const membership = await prisma.membership.findFirst({
    where: { tenantId: draft.tenantId, userId: session.user.id },
  });
  if (!hasCanonicalTenantAccess(session.user.platformRole, membership?.role, ["TENANT_ADMIN", "PUBLISHER"])) {
    return NextResponse.json({ error: "Forbidden: editor role required" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Request body is required" }, { status: 400 });
  }

  const allowedFields = ["title", "caption", "cta", "hashtags", "riskLevel", "requiresReview", "scheduledFor", "format"] as const;
  const updateData: Record<string, unknown> = {};
  const before: Record<string, unknown> = {};
  const changed: string[] = [];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      const prev = draft[field as keyof typeof draft];
      if (field === "format") {
        const requestedFormat = String(body[field] ?? "").trim().toUpperCase();
        if (!MULTIFORMAT_VALUES.includes(requestedFormat as any)) {
          return NextResponse.json({ error: "Invalid publishing format" }, { status: 400 });
        }
        const format = normalizePublishingFormat(draft.network, requestedFormat);
        updateData.format = format;
        updateData.network = formatNetwork(format);
      } else {
        updateData[field] = body[field];
      }
      before[field] = prev;
      changed.push(field);
    }
  }

  if (changed.length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const wasApproved = draft.status === "APPROVED";
  if (wasApproved && (changed.includes("title") || changed.includes("caption") || changed.includes("cta") || changed.includes("hashtags") || changed.includes("format"))) {
    updateData.status = "NEEDS_REVIEW";
    updateData.requiresReview = true;
  }

  const updated = await prisma.contentDraft.update({
    where: { id },
    data: updateData as any,
  });

  await auditLog({
    tenantId: draft.tenantId,
    actorId: session.user.id,
    action: "draft_edited",
    target: `draft:${id}`,
    metadata: {
      title: draft.title,
      changedFields: changed,
      before,
      after: changed.reduce((acc, f) => ({ ...acc, [f]: updated[f as keyof typeof updated] }), {}),
      statusChanged: wasApproved && updated.status === "NEEDS_REVIEW",
    },
  });

  return NextResponse.json({ ok: true, draft: updated, changedFields: changed });
}
