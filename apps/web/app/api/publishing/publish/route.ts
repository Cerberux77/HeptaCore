import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { auditLog } from "../../../../lib/audit";
import { prisma } from "../../../../lib/prisma";
import { TRIAL_POSTS_PER_NETWORK } from "../../../../lib/trial";
import { resolveAndDecryptOAuthCredential } from "../../../../lib/credential-resolver";
import { getPublisher, PublishInput } from "../../../../lib/publishers";
import { buildImmediateJobId, buildScheduledJobId, checkExistingJobForRetry } from "../../../../lib/publishing-execution";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PUBLISH_ROLES = ["OWNER", "ADMIN", "APPROVER", "PUBLISHER", "SUPER_ADMIN", "TENANT_ADMIN"];

type PublishMode = "dry_run" | "scheduled" | "immediate";

function checkScopes(required: string[], actual: string[]): string[] {
  return required.filter(
    (scope) => !actual.includes(scope) && !actual.includes(scope.replace("instagram_business_", ""))
  );
}

function resolveAssetPath(asset: { storageKey?: string | null; sourcePath?: string | null; filename: string }): string | null {
  const raw = asset.storageKey || asset.sourcePath || asset.filename;
  if (!raw) return null;
  const normalized = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..")) return null;
  return normalized;
}

function tenantAssetSlug(tenantSlug: string): string {
  return tenantSlug === "turpial-sound" ? "turpial" : tenantSlug;
}

function buildPublicAssetUrl(tenantSlug: string, assetPath: string): string | null {
  const raw =
    process.env.APP_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL ||
    null;

  const base = raw?.replace(/\r/g, "").replace(/\n/g, "").trim().replace(/\/+$/, "");

  if (!base) return null;

  let origin: string;
  if (base.startsWith("https://")) {
    origin = base;
  } else if (base.startsWith("http://")) {
    const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
    if (isProd) return null;
    origin = base;
  } else {
    origin = `https://${base}`;
  }

  const folder = tenantAssetSlug(tenantSlug);
  const encodedPath = assetPath.split("/").map((s) => encodeURIComponent(s)).join("/");
  const url = `${origin}/tenant-assets/${folder}/${encodedPath}`;

  if (url.includes("\r") || url.includes("\n")) return null;

  return url;
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

  const now = new Date();
  const network = draft.network;

  const draftOnly = tenant.automationMode === "DRAFT_ONLY";
  const approvalRequired = tenant.automationMode === "APPROVAL_REQUIRED";

  if (requestMode !== "dry_run" && draftOnly) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_DRAFT_ONLY_MODE",
      error: "Este tenant esta en modo DRAFT_ONLY. Solo se permite dry-run.",
      action: "Cambia el modo de automatizacion del tenant para publicar o programar.",
    }, { status: 409 });
  }

  if (requestMode !== "dry_run" && approvalRequired && !manualApproval) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_MANUAL_APPROVAL_REQUIRED",
      error: "Este tenant requiere aprobacion manual explicita para publicar o programar.",
      action: "Marca el checkbox de aprobacion manual antes de ejecutar.",
    }, { status: 409 });
  }

  if (requestMode === "scheduled") {
    const scheduledFor = scheduledAt ?? draft.scheduledFor ?? new Date(Date.now() + 3600000);

    const scheduledClaim = await prisma.contentDraft.updateMany({
      where: { id: draft.id, tenantId: tenant.id, status: "APPROVED" },
      data: { status: "SCHEDULED", scheduledFor },
    });

    if (scheduledClaim.count === 0) {
      return NextResponse.json({
        code: "LIVE_BLOCKED_ALREADY_CLAIMED",
        error: "Este draft ya fue reclamado en otra solicitud o cambio de estado.",
        action: "Verifica si el draft ya fue publicado o programado por otra operacion concurrente.",
      }, { status: 409 });
    }

    const jobId = `pj_${draft.id}_${Date.now().toString(36)}`;
    try {
      await prisma.publishingJob.create({
        data: {
          id: jobId,
          tenantId: tenant.id,
          postId: draft.id,
          provider: network as any,
          status: "SCHEDULED",
          scheduledFor,
          updatedAt: new Date(),
        },
      });
    } catch {
      await prisma.contentDraft.updateMany({
        where: { id: draft.id, status: "SCHEDULED" },
        data: { status: "APPROVED" },
      });
      return NextResponse.json({
        code: "LIVE_BLOCKED_JOB_CREATION_FAILED",
        error: "No se pudo crear el PublishingJob. El draft fue revertido.",
        action: "Reintenta la operacion.",
      }, { status: 500 });
    }

    await auditLog({
      tenantId: tenant.id,
      actorId: session.user.id,
      action: "publish_scheduled",
      target: `draft:${draft.id}`,
      metadata: {
        tenant: tenant.name,
        title: draft.title,
        network,
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

  // === GATES: provider, account, credential, asset, token ===

  const publisher = getPublisher(network);
  if (!publisher) {
    return NextResponse.json({
      code: "LIVE_PROVIDER_NOT_IMPLEMENTED",
      error: `Live publishing for ${network} is not yet implemented.`,
    }, { status: 501 });
  }

  // Asset gate (skip for text-only capable publishers with no assets)
  const needsAsset = !publisher.capabilities.textOnly || draft.assets.length > 0;
  if (needsAsset && draft.assets.length === 0) {
    return NextResponse.json({ error: "Draft has no linked assets." }, { status: 409 });
  }

  // SocialAccount gate
  let socialAccount: { id: string; status: string; scopes: string[]; externalAccountId: string | null } | null = null;

  if (draft.socialAccountId) {
    socialAccount = await prisma.socialAccount.findFirst({
      where: { id: draft.socialAccountId, tenantId: tenant.id, network: network as any, status: "connected" },
      select: { id: true, status: true, scopes: true, externalAccountId: true },
    });
  }

  if (!socialAccount) {
    socialAccount = await prisma.socialAccount.findFirst({
      where: { tenantId: tenant.id, network: network as any, status: "connected" },
      select: { id: true, status: true, scopes: true, externalAccountId: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (!socialAccount) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_NO_SOCIAL_ACCOUNT",
      error: `No connected ${network} account. Connect via Settings.`,
      action: `Conectar cuenta ${network} desde Settings.`,
    }, { status: 409 });
  }

  const missingScopes = checkScopes(publisher.requiredScopes, socialAccount.scopes);
  if (missingScopes.length > 0) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_MISSING_SCOPES",
      error: `${network} account is missing required scopes: ${missingScopes.join(", ")}.`,
      action: "Reconectar la cuenta con los permisos correctos.",
    }, { status: 409 });
  }

  // Credential resolution via shared resolver (follows tokenRef exclusively)
  const credentialResolution = await resolveAndDecryptOAuthCredential({
    tenantId: tenant.id,
    provider: network,
    socialAccountId: socialAccount.id,
    credentialLabel: publisher.credentialLabel,
  });

  if (!credentialResolution.ok) {
    return NextResponse.json({
      code: credentialResolution.code,
      error: credentialResolution.error,
      action: `Reconectar ${network} desde Settings.`,
    }, { status: 409 });
  }

  const accessToken = credentialResolution.accessToken;
  const targetId = credentialResolution.providerUserId;
  const credentialId = credentialResolution.credentialId;
  const connectionId = credentialResolution.connectionId;

  // Trial limit gate
  const publishedOnNetwork = await prisma.contentDraft.count({
    where: { tenantId: tenant.id, network: network as any, status: "PUBLISHED" },
  });
  if (publishedOnNetwork >= TRIAL_POSTS_PER_NETWORK) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_TRIAL_LIMIT",
      error: `Trial limit reached: ${publishedOnNetwork}/${TRIAL_POSTS_PER_NETWORK} posts published on ${network}.`,
      action: "Actualizar plan para desbloquear publicaciones.",
    }, { status: 409 });
  }

  // Asset URL gate (only if asset is needed)
  let mediaUrl: string | undefined | null;
  let mediaType: "IMAGE" | "VIDEO" | undefined;
  const primaryAsset = needsAsset ? (draft.assets.find((a) => a.role === "primary") ?? draft.assets[0]) : null;

  if (primaryAsset) {
    const assetPath = resolveAssetPath(primaryAsset.asset);
    if (!assetPath) {
      return NextResponse.json({
        code: "LIVE_BLOCKED_ASSET_NOT_PUBLIC",
        error: "Live publishing requires a public HTTPS asset URL.",
        action: "Sube un asset con URL pública o configura APP_PUBLIC_URL/NEXT_PUBLIC_APP_URL.",
      }, { status: 409 });
    }
    mediaUrl = buildPublicAssetUrl(tenantSlug, assetPath);

    if (!mediaUrl) {
      return NextResponse.json({
        code: "LIVE_BLOCKED_ASSET_NOT_PUBLIC",
        error: "Live publishing requires a public HTTPS asset URL.",
        action: "Sube un asset con URL pública o configura APP_PUBLIC_URL/NEXT_PUBLIC_APP_URL.",
      }, { status: 409 });
    }

    const isVideo = primaryAsset.asset.kind === "VIDEO";
    mediaType = isVideo ? "VIDEO" : "IMAGE";
  }

  // === DRY RUN: preflight passed, no provider call ===

  if (requestMode === "dry_run") {
    await auditLog({
      tenantId: tenant.id,
      actorId: session.user.id,
      action: "publish_dry_run_technical_validated",
      target: `draft:${draft.id}`,
      metadata: {
        tenant: tenant.name,
        title: draft.title,
        network,
        format: draft.format,
        mediaUrl: mediaUrl ?? null,
        mediaType: mediaType ?? null,
        targetId,
        capabilities: publisher.capabilities,
        tenantAutomationMode: tenant.automationMode,
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "dry_run",
      message: "Technical preflight passed. No provider call executed.",
      draftId: draft.id,
      mediaUrl: mediaUrl ?? null,
      mediaType: mediaType ?? null,
      targetId,
      capabilities: publisher.capabilities,
      tenantAutomationMode: tenant.automationMode,
    });
  }

  // === IMMEDIATE: attempt real publish ===

  const attemptJobId = buildImmediateJobId(draft.id, network);

  // Check for existing completed/in-flight state
  const existingJob = await prisma.publishingJob.findUnique({
    where: { id: attemptJobId },
    select: { status: true, PublishingResult: { select: { ok: true, externalPostId: true } } },
  });

  const retryCheck = checkExistingJobForRetry({
    jobStatus: existingJob?.status,
    resultOk: existingJob?.PublishingResult?.ok,
    externalPostId: existingJob?.PublishingResult?.externalPostId ?? undefined,
    draftExternalPostId: draft.externalPostId,
  });

  if (retryCheck.blocked) {
    return NextResponse.json({
      ok: false,
      mode: "immediate",
      code: retryCheck.code ?? "LIVE_BLOCKED_RETRY",
      error: retryCheck.reason ?? "No puede volver a publicarse.",
      action: "Verifica el estado del draft y el job existente.",
    }, { status: 409 });
  }

  // Atomic claim: only one request wins
  const claimed = await prisma.contentDraft.updateMany({
    where: { id: draft.id, status: "APPROVED" },
    data: { status: "SCHEDULED" },
  });

  if (claimed.count === 0) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_ALREADY_CLAIMED",
      error: "Este draft ya fue reclamado en otra solicitud o cambio de estado.",
      action: "Verifica si el draft ya fue publicado o programado por otra operacion concurrente.",
    }, { status: 409 });
  }

  // Create durable attempt job BEFORE provider call
  try {
    await prisma.publishingJob.upsert({
      where: { id: attemptJobId },
      create: {
        id: attemptJobId,
        tenantId: tenant.id,
        postId: draft.id,
        provider: network as any,
        status: "SCHEDULED",
        scheduledFor: null,
        updatedAt: new Date(),
      },
      update: {
        status: "SCHEDULED",
        scheduledFor: null,
        attempts: { increment: 1 },
        updatedAt: new Date(),
      },
    });
  } catch {
    // Rollback claim
    await prisma.contentDraft.updateMany({
      where: { id: draft.id, tenantId: tenant.id, status: "SCHEDULED" },
      data: { status: "APPROVED" },
    });
    return NextResponse.json({
      code: "LIVE_BLOCKED_JOB_CREATION_FAILED",
      error: "No se pudo crear el intento durable. El draft fue revertido.",
      action: "Reintenta la operacion.",
    }, { status: 500 });
  }

  const publishInput: PublishInput = {
    targetId,
    accessToken,
    mediaUrl,
    caption: draft.caption || draft.title,
    mediaType,
  };

  let publishResult: { externalPostId: string; providerResponse: unknown };
  try {
    publishResult = await publisher.publish(publishInput);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : `${network} publish failed`;

    // Provider failed — revert draft to APPROVED
    await prisma.contentDraft.updateMany({
      where: { id: draft.id, tenantId: tenant.id, status: "SCHEDULED" },
      data: { status: "APPROVED" },
    });

    await prisma.publishingJob.update({
      where: { id: attemptJobId },
      data: { status: "FAILED", lastError: errorMsg.slice(0, 500), updatedAt: new Date() },
    });

    await prisma.publishingResult.upsert({
      where: { id: `pr_${attemptJobId}` },
      create: { id: `pr_${attemptJobId}`, jobId: attemptJobId, provider: network as any, ok: false, response: { error: errorMsg } },
      update: { ok: false, response: { error: errorMsg } },
    });

    try {
      await auditLog({
        tenantId: tenant.id,
        actorId: session.user.id,
        action: "publish_immediate_failed",
        target: `draft:${draft.id}`,
        metadata: { tenant: tenant.name, title: draft.title, network, format: draft.format, error: errorMsg.slice(0, 500) },
      });
    } catch {}

    return NextResponse.json({
      ok: false,
      mode: "immediate",
      code: "LIVE_PUBLISH_FAILED",
      error: `${network} publish failed: ${errorMsg}`,
      action: "Revisa la configuracion, credenciales y URL del asset.",
      draftId: draft.id,
    }, { status: 502 });
  }

  // Provider succeeded — persist result immediately
  const externalPostId = publishResult.externalPostId;
  let resultPersisted = false;
  let draftPersisted = false;
  let jobPersisted = false;

  try {
    await prisma.publishingResult.upsert({
      where: { id: `pr_${attemptJobId}` },
      create: { id: `pr_${attemptJobId}`, jobId: attemptJobId, provider: network as any, externalPostId, ok: true, response: publishResult.providerResponse as any },
      update: { externalPostId, ok: true, response: publishResult.providerResponse as any },
    });
    resultPersisted = true;
  } catch {
    // Result persistence failed — reconciliation required
  }

  try {
    await prisma.contentDraft.update({
      where: { id: draft.id },
      data: { status: "PUBLISHED", publishedAt: now, externalPostId },
    });
    draftPersisted = true;
  } catch {}

  try {
    await prisma.publishingJob.update({
      where: { id: attemptJobId },
      data: { status: "PUBLISHED", scheduledFor: null, updatedAt: new Date() },
    });
    jobPersisted = true;
  } catch {}

  try {
    await auditLog({
      tenantId: tenant.id,
      actorId: session.user.id,
      action: "publish_immediate_live",
      target: `draft:${draft.id}`,
      metadata: { tenant: tenant.name, title: draft.title, network, format: draft.format, externalPostId, providerResponse: publishResult.providerResponse, tenantAutomationMode: tenant.automationMode },
    });
  } catch {}

  if (!resultPersisted || !draftPersisted) {
    return NextResponse.json({
      ok: false,
      providerConfirmed: true,
      code: "LIVE_RECONCILIATION_REQUIRED",
      status: "RECONCILIATION_REQUIRED",
      draftId: draft.id,
      externalPostId,
      error: "El proveedor confirmo la publicacion, pero HeptaCore no completo toda la persistencia.",
      action: "No vuelva a publicar. Requiere reconciliacion operativa.",
    }, { status: 202 });
  }

  return NextResponse.json({
    ok: true,
    mode: "immediate",
    status: "PUBLISHED",
    draftId: draft.id,
    externalPostId,
  });

}
