import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { auditLog } from "../../../../lib/audit";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

const PUBLISH_ROLES = ["OWNER", "ADMIN", "APPROVER", "PUBLISHER", "SUPER_ADMIN", "TENANT_ADMIN"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const tenantSlug = String(body?.tenantSlug ?? "");
  const draftId = String(body?.draftId ?? "");
  const mode = String(body?.mode ?? "dry-run");
  const manualApproval = body?.manualApproval === true;

  if (mode !== "dry-run") {
    return NextResponse.json({ error: "Real publishing is blocked by product hard stop." }, { status: 403 });
  }
  if (!manualApproval) {
    return NextResponse.json({ error: "Manual approval gate is required." }, { status: 400 });
  }
  if (!tenantSlug || !draftId) {
    return NextResponse.json({ error: "tenantSlug and draftId are required." }, { status: 400 });
  }

  const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug }, select: { id: true, name: true } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id },
    select: { role: true },
  });
  if (!membership || !PUBLISH_ROLES.includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden: publisher role required." }, { status: 403 });
  }

  const draft = await prisma.contentDraft.findFirst({
    where: { id: draftId, tenantId: tenant.id },
    include: { assets: { include: { asset: true } } },
  });
  if (!draft) {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }
  if (draft.status !== "APPROVED") {
    return NextResponse.json({ error: `Draft must be APPROVED before dry-run. Current status: ${draft.status}.` }, { status: 409 });
  }
  if (draft.assets.length === 0) {
    return NextResponse.json({ error: "Draft has no linked assets." }, { status: 409 });
  }

  const externalPostId = `dryrun_${draft.network.toLowerCase()}_${Date.now().toString(36)}`;
  const scheduledFor = draft.scheduledFor ?? new Date();

  await prisma.contentDraft.update({
    where: { id: draft.id },
    data: {
      status: "SCHEDULED",
      scheduledFor,
      externalPostId,
    },
  });

  await auditLog({
    tenantId: tenant.id,
    actorId: session.user.id,
    action: "publish_dry_run_scheduled",
    target: `draft:${draft.id}`,
    metadata: {
      tenant: tenant.name,
      title: draft.title,
      network: draft.network,
      format: draft.format,
      externalPostId,
      manualApproval,
      realPublishingBlocked: true,
    },
  });

  return NextResponse.json({
    ok: true,
    dryRun: true,
    status: "SCHEDULED",
    draftId: draft.id,
    externalPostId,
  });
}
