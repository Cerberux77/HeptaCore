import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { auditLog } from "../../../../lib/audit";
import { prisma } from "../../../../lib/prisma";
import { TRIAL_POSTS_PER_NETWORK } from "../../../../lib/trial";

export const dynamic = "force-dynamic";

const PUBLISH_ROLES = ["OWNER", "ADMIN", "APPROVER", "PUBLISHER", "SUPER_ADMIN", "TENANT_ADMIN"];

function tenantAllowsRealPublish(automationMode: string): boolean {
  return automationMode === "AUTOPILOT_FULL" || automationMode === "AUTOPILOT_LIMITED";
}

function tenantRequiresManualApproval(automationMode: string): boolean {
  return automationMode === "APPROVAL_REQUIRED" || automationMode === "DRAFT_ONLY";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const tenantSlug = String(body?.tenantSlug ?? "");
  const draftId = String(body?.draftId ?? "");
  const requestMode = String(body?.mode ?? "dry-run");
  const manualApproval = body?.manualApproval === true;

  const globalHardStop = process.env.PUBLISHING_HARD_STOP !== "false";
  const globalRealEnabled = process.env.PUBLISHING_REAL_ENABLED === "true";
  const globalRequireManual = process.env.PUBLISHING_REQUIRE_MANUAL_APPROVAL !== "false";

  if (!tenantSlug || !draftId) {
    return NextResponse.json({ error: "tenantSlug and draftId are required." }, { status: 400 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true, name: true, automationMode: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  const tenantAutoPilot = tenantAllowsRealPublish(tenant.automationMode);
  const tenantNeedsManual = tenantRequiresManualApproval(tenant.automationMode);

  const isDryRun = globalHardStop || (requestMode === "dry-run") || !globalRealEnabled || !tenantAutoPilot;

  if (requestMode !== "dry-run" && (!globalRealEnabled || !tenantAutoPilot)) {
    const blocks: string[] = [];
    if (!globalRealEnabled) blocks.push("PUBLISHING_REAL_ENABLED is not true");
    if (globalHardStop) blocks.push("PUBLISHING_HARD_STOP is active");
    if (!tenantAutoPilot) blocks.push(`tenant automationMode is ${tenant.automationMode} (needs AUTOPILOT_FULL or AUTOPILOT_LIMITED)`);
    return NextResponse.json({ error: `Real publishing blocked: ${blocks.join("; ")}.` }, { status: 403 });
  }

  if (!isDryRun && tenantNeedsManual && globalRequireManual && !manualApproval) {
    return NextResponse.json({ error: "Manual approval gate is required for this tenant mode." }, { status: 400 });
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
    return NextResponse.json({ error: `Draft must be APPROVED. Current status: ${draft.status}.` }, { status: 409 });
  }
  if (draft.assets.length === 0) {
    return NextResponse.json({ error: "Draft has no linked assets." }, { status: 409 });
  }

  if (!isDryRun) {
    const publishedOnNetwork = await prisma.contentDraft.count({
      where: { tenantId: tenant.id, network: draft.network, status: "PUBLISHED" },
    });
    if (publishedOnNetwork >= TRIAL_POSTS_PER_NETWORK) {
      return NextResponse.json({
        error: `Trial limit reached: ${publishedOnNetwork}/${TRIAL_POSTS_PER_NETWORK} posts published on ${draft.network}. Payment required to continue publishing.`,
      }, { status: 402 });
    }
  }

  const externalPostId = isDryRun
    ? `dryrun_${draft.network.toLowerCase()}_${Date.now().toString(36)}`
    : `live_${draft.network.toLowerCase()}_${Date.now().toString(36)}`;
  const scheduledFor = draft.scheduledFor ?? new Date();
  const newStatus = isDryRun ? "SCHEDULED" : "PUBLISHED";

  await prisma.contentDraft.update({
    where: { id: draft.id },
    data: {
      status: newStatus,
      scheduledFor,
      externalPostId,
    },
  });

  await auditLog({
    tenantId: tenant.id,
    actorId: session.user.id,
    action: isDryRun ? "publish_dry_run_scheduled" : "publish_live_completed",
    target: `draft:${draft.id}`,
    metadata: {
      tenant: tenant.name,
      title: draft.title,
      network: draft.network,
      format: draft.format,
      externalPostId,
      manualApproval,
      realPublishing: !isDryRun,
      tenantAutomationMode: tenant.automationMode,
      globalHardStop,
      globalRealEnabled,
    },
  });

  return NextResponse.json({
    ok: true,
    dryRun: isDryRun,
    realPublish: !isDryRun,
    status: newStatus,
    draftId: draft.id,
    externalPostId,
  });
}
