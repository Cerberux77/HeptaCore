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

  const allowedStatuses = ["DRAFT", "NEEDS_REVIEW", "REJECTED"];
  if (!allowedStatuses.includes(draft.status)) {
    return NextResponse.json({ error: `Cannot approve draft in status ${draft.status}` }, { status: 409 });
  }

  // RBAC: check if user has approval role in this tenant
  const membership = await prisma.membership.findFirst({
    where: { tenantId: draft.tenantId, userId: session.user.id },
  });
  if (!membership || !["OWNER", "ADMIN", "APPROVER", "SUPER_ADMIN", "TENANT_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden: approval role required" }, { status: 403 });
  }

  await prisma.contentDraft.update({
    where: { id },
    data: { status: "APPROVED", requiresReview: false },
  });

  await prisma.approval.create({
    data: {
      tenantId: draft.tenantId,
      draftId: id,
      reviewerId: session.user.id,
      status: "APPROVED",
      reason: "Approved via console",
    },
  });

  await auditLog({
    tenantId: draft.tenantId,
    actorId: session.user.id,
    action: "draft_approved",
    target: `draft:${id}`,
    metadata: { title: draft.title },
  });

  return NextResponse.json({ ok: true, status: "APPROVED" });
}
