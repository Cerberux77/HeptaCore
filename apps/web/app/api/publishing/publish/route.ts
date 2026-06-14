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

  const globalRequireManual = false; // Manual approval gate disabled for production flow

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
  const isDryRun = requestMode !== "live";

  if (!isDryRun && (tenantNeedsManual || !tenantAutoPilot) && globalRequireManual && !manualApproval) {
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
    const [socialAccount, credential] = await Promise.all([
      prisma.socialAccount.findFirst({
        where: { tenantId: tenant.id, network: draft.network },
        select: { id: true, status: true, scopes: true },
      }),
      prisma.credentialVaultItem.findFirst({
        where: { tenantId: tenant.id, provider: draft.network },
        select: { id: true, expiresAt: true },
      }),
    ]);

    if (!socialAccount) {
      return NextResponse.json({
        error: `Live publishing needs a configured ${draft.network} account.`,
        action: `Configurar cuenta ${draft.network}`,
      }, { status: 409 });
    }
    if (!credential || (credential.expiresAt && credential.expiresAt < new Date())) {
      return NextResponse.json({
        error: `Live publishing needs a valid ${draft.network} credential in vault.`,
        action: `Conectar credenciales ${draft.network}`,
      }, { status: 409 });
    }
    const missingScopes = requiredScopesForNetwork(draft.network).filter((scope) => !socialAccount.scopes.includes(scope));
    if (missingScopes.length > 0) {
      return NextResponse.json({
        error: `${draft.network} account is missing publish scopes: ${missingScopes.join(", ")}.`,
        action: `Revisar permisos ${draft.network}`,
      }, { status: 409 });
    }

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
      readinessMode: "per_network",
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
