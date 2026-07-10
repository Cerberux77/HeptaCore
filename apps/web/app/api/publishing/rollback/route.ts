import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { auditLog } from "../../../../lib/audit";
import { prisma } from "../../../../lib/prisma";
import { hasCanonicalTenantAccess } from "../../../../lib/role-model";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const tenantSlug = String(body?.tenantSlug ?? "");
  const draftId = String(body?.draftId ?? "");
  const manualApproval = body?.manualApproval === true;

  if (!manualApproval) {
    return NextResponse.json({ error: "Manual approval gate is required for rollback." }, { status: 400 });
  }
  if (!tenantSlug || !draftId) {
    return NextResponse.json({ error: "tenantSlug and draftId are required." }, { status: 400 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true, name: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id },
    select: { role: true },
  });
  if (!hasCanonicalTenantAccess(session.user.platformRole, membership?.role, ["TENANT_ADMIN", "PUBLISHER"])) {
    return NextResponse.json({ error: "Forbidden: publisher role required." }, { status: 403 });
  }

  const draft = await prisma.contentDraft.findFirst({
    where: { id: draftId, tenantId: tenant.id },
  });
  if (!draft) {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }
  if (draft.status !== "SCHEDULED") {
    return NextResponse.json({
      error: `Only SCHEDULED drafts can be rolled back. Current status: ${draft.status}.`,
    }, { status: 409 });
  }
  if (!draft.externalPostId?.startsWith("dryrun_")) {
    return NextResponse.json({
      error: "Only dry-run drafts can be rolled back. Real published posts are protected.",
    }, { status: 403 });
  }

  const previousExternalPostId = draft.externalPostId;
  const previousStatus = draft.status;

  await prisma.contentDraft.update({
    where: { id: draft.id },
    data: {
      status: "DRAFT",
      externalPostId: null,
      requiresReview: true,
    },
  });

  await auditLog({
    tenantId: tenant.id,
    actorId: session.user.id,
    action: "publish_dry_run_rollback",
    target: `draft:${draft.id}`,
    metadata: {
      tenant: tenant.name,
      title: draft.title,
      network: draft.network,
      previousStatus,
      previousExternalPostId,
      manualApproval,
    },
  });

  return NextResponse.json({
    ok: true,
    draftId: draft.id,
    previousStatus,
    status: "DRAFT",
    message: `Draft ${draft.title} rolled back to DRAFT from ${previousStatus}.`,
  });
}
