import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { auditLog } from "../../../../lib/audit";
import { prisma } from "../../../../lib/prisma";
import { TRIAL_POSTS_PER_NETWORK } from "../../../../lib/trial";

export const dynamic = "force-dynamic";

const PUBLISH_ROLES = ["OWNER", "ADMIN", "APPROVER", "PUBLISHER", "SUPER_ADMIN", "TENANT_ADMIN"];

type PublishMode = "dry_run" | "scheduled" | "immediate";

function tenantAllowsRealPublish(automationMode: string): boolean {
  return automationMode === "AUTOPILOT_FULL" || automationMode === "AUTOPILOT_LIMITED";
}

function tenantRequiresManualApproval(automationMode: string): boolean {
  return automationMode === "APPROVAL_REQUIRED" || automationMode === "DRAFT_ONLY";
}

function requiredScopesForNetwork(network: string) {
  switch (network) {
    case "INSTAGRAM":
      return ["content_publish"];
    case "FACEBOOK":
      return ["pages_manage_posts"];
    case "YOUTUBE":
      return ["youtube.upload"];
    case "TIKTOK":
      return ["video.publish"];
    case "LINKEDIN":
      return ["w_member_social"];
    default:
      return ["publish"];
  }
}

async function validateLiveGates(tenantId: string, network: string) {
  const net = network as any;
  const [socialAccount, credential] = await Promise.all([
    prisma.socialAccount.findFirst({
      where: { tenantId, network: net },
      select: { id: true, status: true, scopes: true },
    }),
    prisma.credentialVaultItem.findFirst({
      where: { tenantId, provider: network },
      select: { id: true, expiresAt: true },
    }),
  ]);

  if (!socialAccount) {
    return { ok: false, error: `Live publishing needs a configured ${network} account.`, action: `Configurar cuenta ${network}` };
  }
  if (!credential || (credential.expiresAt && credential.expiresAt < new Date())) {
    return { ok: false, error: `Live publishing needs a valid ${network} credential in vault.`, action: `Conectar credenciales ${network}` };
  }
  const missingScopes = requiredScopesForNetwork(network).filter((scope) => !socialAccount.scopes.includes(scope));
  if (missingScopes.length > 0) {
    return { ok: false, error: `${network} account is missing publish scopes: ${missingScopes.join(", ")}.`, action: `Revisar permisos ${network}` };
  }

  const publishedOnNetwork = await prisma.contentDraft.count({
    where: { tenantId, network: net, status: "PUBLISHED" },
  });
  if (publishedOnNetwork >= TRIAL_POSTS_PER_NETWORK) {
    return { ok: false, error: `Trial limit reached: ${publishedOnNetwork}/${TRIAL_POSTS_PER_NETWORK} posts published on ${network}. Payment required.` };
  }

  return { ok: true };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const tenantSlug = String(body?.tenantSlug ?? "");
  const draftId = String(body?.draftId ?? "");
  const requestMode = (body?.mode ?? "dry_run") as PublishMode;
  const manualApproval = body?.manualApproval === true;
  const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt) : null;

  if (!tenantSlug || !draftId) {
    return NextResponse.json({ error: "tenantSlug and draftId are required." }, { status: 400 });
  }

  const validModes: PublishMode[] = ["dry_run", "scheduled", "immediate"];
  if (!validModes.includes(requestMode)) {
    return NextResponse.json({ error: `Invalid mode: ${requestMode}. Use dry_run, scheduled, or immediate.` }, { status: 400 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true, name: true, automationMode: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  const tenantNeedsManual = tenantRequiresManualApproval(tenant.automationMode);

  if ((requestMode === "scheduled" || requestMode === "immediate") && tenantNeedsManual && !manualApproval) {
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

  if (requestMode === "scheduled" || requestMode === "immediate") {
    const gate = await validateLiveGates(tenant.id, draft.network);
    if (!gate.ok) {
      return NextResponse.json(gate, { status: 409 });
    }
  }

  const now = new Date();

  if (requestMode === "dry_run") {
    await auditLog({
      tenantId: tenant.id,
      actorId: session.user.id,
      action: "publish_dry_run_validated",
      target: `draft:${draft.id}`,
      metadata: {
        tenant: tenant.name,
        title: draft.title,
        network: draft.network,
        format: draft.format,
        tenantAutomationMode: tenant.automationMode,
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "dry_run",
      message: "Validation passed. No job created.",
      draftId: draft.id,
    });
  }

  if (requestMode === "scheduled") {
    const scheduledFor = scheduledAt ?? draft.scheduledFor ?? new Date(Date.now() + 3600000);

    await prisma.contentDraft.update({
      where: { id: draft.id },
      data: { status: "SCHEDULED", scheduledFor },
    });

    const jobId = `pj_${draft.id}_${Date.now().toString(36)}`;
    await prisma.publishingJob.create({
      data: {
        id: jobId,
        tenantId: tenant.id,
        postId: draft.id,
        provider: draft.network as any,
        status: "SCHEDULED",
        scheduledFor,
        updatedAt: new Date(),
      },
    });

    await auditLog({
      tenantId: tenant.id,
      actorId: session.user.id,
      action: "publish_scheduled",
      target: `draft:${draft.id}`,
      metadata: {
        tenant: tenant.name,
        title: draft.title,
        network: draft.network,
        format: draft.format,
        scheduledFor: scheduledFor.toISOString(),
        jobId,
        tenantAutomationMode: tenant.automationMode,
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "scheduled",
      status: "SCHEDULED",
      draftId: draft.id,
      jobId,
      scheduledFor: scheduledFor.toISOString(),
    });
  }

  // immediate
  const externalPostId = `live_${draft.network.toLowerCase()}_${Date.now().toString(36)}`;

  await prisma.contentDraft.update({
    where: { id: draft.id },
    data: { status: "PUBLISHED", publishedAt: now, externalPostId },
  });

  const jobId = `pj_${draft.id}_${Date.now().toString(36)}`;
  await prisma.publishingJob.create({
    data: {
      id: jobId,
      tenantId: tenant.id,
      postId: draft.id,
      provider: draft.network as any,
      status: "PUBLISHED",
      scheduledFor: null,
      updatedAt: new Date(),
    },
  });

  await prisma.publishingResult.create({
    data: {
      id: `pr_${jobId}`,
      jobId,
      provider: draft.network as any,
      externalPostId,
      ok: true,
      response: { manual: true, immediate: true },
    },
  });

  await auditLog({
    tenantId: tenant.id,
    actorId: session.user.id,
    action: "publish_immediate",
    target: `draft:${draft.id}`,
    metadata: {
      tenant: tenant.name,
      title: draft.title,
      network: draft.network,
      format: draft.format,
      externalPostId,
      manualApproval,
      tenantAutomationMode: tenant.automationMode,
    },
  });

  return NextResponse.json({
    ok: true,
    mode: "immediate",
    status: "PUBLISHED",
    draftId: draft.id,
    externalPostId,
  });
}
