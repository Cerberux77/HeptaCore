import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { auditLog } from "../../../../lib/audit";
import { prisma } from "../../../../lib/prisma";
import { TRIAL_POSTS_PER_NETWORK } from "../../../../lib/trial";
import { decryptJson } from "../../../../lib/token-vault";
import { publishInstagramMedia } from "../../../../lib/instagram-publisher";

export const dynamic = "force-dynamic";

const PUBLISH_ROLES = ["OWNER", "ADMIN", "APPROVER", "PUBLISHER", "SUPER_ADMIN", "TENANT_ADMIN"];

type PublishMode = "dry_run" | "scheduled" | "immediate";

function requiredScopesForNetwork(network: string) {
  switch (network) {
    case "INSTAGRAM":
      return ["instagram_business_content_publish"];
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
  if (draft.assets.length === 0) {
    return NextResponse.json({ error: "Draft has no linked assets." }, { status: 409 });
  }

  const now = new Date();

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

  // === GATES: provider, account, credential, asset, token ===

  if (draft.network !== "INSTAGRAM") {
    return NextResponse.json({
      code: "LIVE_PROVIDER_NOT_IMPLEMENTED",
      error: `Live publishing for ${draft.network} is not yet implemented. Only INSTAGRAM is supported.`,
    }, { status: 501 });
  }

  let socialAccount: { id: string; status: string; scopes: string[]; externalAccountId: string | null } | null = null;

  if (draft.socialAccountId) {
    socialAccount = await prisma.socialAccount.findFirst({
      where: { id: draft.socialAccountId, tenantId: tenant.id, network: "INSTAGRAM", status: "connected" },
      select: { id: true, status: true, scopes: true, externalAccountId: true },
    });
  }

  if (!socialAccount) {
    socialAccount = await prisma.socialAccount.findFirst({
      where: { tenantId: tenant.id, network: "INSTAGRAM", status: "connected" },
      select: { id: true, status: true, scopes: true, externalAccountId: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (!socialAccount) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_NO_SOCIAL_ACCOUNT",
      error: "No connected Instagram account. Connect via Settings > Social Accounts.",
      action: "Conectar cuenta de Instagram desde Settings.",
    }, { status: 409 });
  }

  const missingScopes = checkScopes(requiredScopesForNetwork("INSTAGRAM"), socialAccount.scopes);
  if (missingScopes.length > 0) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_MISSING_SCOPES",
      error: `Instagram account is missing required scopes: ${missingScopes.join(", ")}.`,
      action: "Reconectar la cuenta con los permisos correctos.",
    }, { status: 409 });
  }

  const oauthConnection = await prisma.oAuthConnection.findFirst({
    where: {
      tenantId: tenant.id,
      provider: "INSTAGRAM",
      status: "connected",
      socialAccountId: socialAccount.id,
      tokenRef: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, tokenRef: true, expiresAt: true, updatedAt: true, socialAccountId: true },
  });
  if (!oauthConnection || !oauthConnection.tokenRef) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_NO_CREDENTIAL",
      error: "No active Instagram OAuth connection found. Reconnect via OAuth.",
      action: "Reconectar Instagram desde Settings.",
    }, { status: 409 });
  }
  if (oauthConnection.expiresAt && oauthConnection.expiresAt < now) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_NO_CREDENTIAL",
      error: "Instagram OAuth connection is expired. Reconnect via OAuth.",
      action: "Reconectar Instagram desde Settings.",
    }, { status: 409 });
  }

  const credential = await prisma.credentialVaultItem.findFirst({
    where: { id: oauthConnection.tokenRef, tenantId: tenant.id, provider: "INSTAGRAM", label: "instagram_oauth" },
    select: { id: true, encryptedBlob: true, expiresAt: true },
  });
  if (!credential || (credential.expiresAt && credential.expiresAt < now)) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_NO_CREDENTIAL",
      error: "No valid Instagram credential found for the active OAuth connection. Reconnect via OAuth.",
      action: "Reconectar Instagram desde Settings.",
    }, { status: 409 });
  }

  const publishedOnInstagram = await prisma.contentDraft.count({
    where: { tenantId: tenant.id, network: "INSTAGRAM", status: "PUBLISHED" },
  });
  if (publishedOnInstagram >= TRIAL_POSTS_PER_NETWORK) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_TRIAL_LIMIT",
      error: `Trial limit reached: ${publishedOnInstagram}/${TRIAL_POSTS_PER_NETWORK} posts published on Instagram.`,
      action: "Actualizar plan para desbloquear publicaciones.",
    }, { status: 409 });
  }

  const primaryAsset = draft.assets.find((a) => a.role === "primary") ?? draft.assets[0];
  const assetPath = resolveAssetPath(primaryAsset.asset);
  if (!assetPath) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_ASSET_NOT_PUBLIC",
      error: "Instagram live publishing requires a public HTTPS asset URL.",
      action: "Sube un asset con URL pública o configura APP_PUBLIC_URL/NEXT_PUBLIC_APP_URL.",
    }, { status: 409 });
  }
  const mediaUrl = buildPublicAssetUrl(tenantSlug, assetPath);

  if (!mediaUrl) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_ASSET_NOT_PUBLIC",
      error: "Instagram live publishing requires a public HTTPS asset URL.",
      action: "Sube un asset con URL pública o configura APP_PUBLIC_URL/NEXT_PUBLIC_APP_URL.",
    }, { status: 409 });
  }

  let accessToken: string;
  try {
    const decrypted = decryptJson<{ access_token: string }>(credential.encryptedBlob);
    accessToken = decrypted.access_token;
    if (!accessToken) throw new Error("missing access_token");
  } catch {
    return NextResponse.json({
      code: "LIVE_BLOCKED_DECRYPT_FAILED",
      error: "Failed to decrypt Instagram credential. Reconnect via OAuth.",
      action: "Reconectar Instagram desde Settings.",
    }, { status: 409 });
  }

  const igUserId = socialAccount.externalAccountId;
  if (!igUserId) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_NO_IG_USER_ID",
      error: "Instagram account is missing external account ID. Reconnect via OAuth.",
      action: "Reconectar Instagram desde Settings.",
    }, { status: 409 });
  }

  const isVideo = primaryAsset.asset.kind === "VIDEO";
  const mediaType = isVideo ? "VIDEO" as const : "IMAGE" as const;

  // === DRY RUN: preflight passed, no Meta call ===

  if (requestMode === "dry_run") {
    await auditLog({
      tenantId: tenant.id,
      actorId: session.user.id,
      action: "publish_dry_run_technical_validated",
      target: `draft:${draft.id}`,
      metadata: {
        tenant: tenant.name,
        title: draft.title,
        network: draft.network,
        format: draft.format,
        mediaUrl,
        mediaType,
        igUserId,
        tenantAutomationMode: tenant.automationMode,
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "dry_run",
      message: "Technical preflight passed. No provider call executed.",
      draftId: draft.id,
      mediaUrl,
      mediaType,
      igUserId,
      tenantAutomationMode: tenant.automationMode,
    });
  }

  // === IMMEDIATE: attempt real publish to Meta ===
  let publishResult: { externalPostId: string; providerResponse: unknown };
  try {
    publishResult = await publishInstagramMedia({
      igUserId,
      accessToken,
      mediaUrl,
      caption: draft.caption || draft.title,
      mediaType,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Instagram publish failed";

    const jobId = `pj_${draft.id}_${Date.now().toString(36)}`;
    await prisma.publishingJob.create({
      data: {
        id: jobId,
        tenantId: tenant.id,
        postId: draft.id,
        provider: draft.network as any,
        status: "FAILED",
        scheduledFor: null,
        attempts: 1,
        lastError: errorMsg.slice(0, 500),
        updatedAt: new Date(),
      },
    });

    await prisma.publishingResult.create({
      data: {
        id: `pr_${jobId}`,
        jobId,
        provider: "INSTAGRAM",
        ok: false,
        response: { error: errorMsg },
      },
    });

    await auditLog({
      tenantId: tenant.id,
      actorId: session.user.id,
      action: "publish_immediate_failed",
      target: `draft:${draft.id}`,
      metadata: {
        tenant: tenant.name,
        title: draft.title,
        network: draft.network,
        format: draft.format,
        error: errorMsg.slice(0, 500),
      },
    });

    return NextResponse.json({
      ok: false,
      mode: "immediate",
      code: "LIVE_PUBLISH_FAILED",
      error: `Instagram publish failed: ${errorMsg}`,
      action: "Revisa la configuración, credenciales y URL del asset.",
      draftId: draft.id,
    }, { status: 502 });
  }

  // Success: Meta returned a real ID
  const externalPostId = publishResult.externalPostId;

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
      provider: "INSTAGRAM",
      externalPostId,
      ok: true,
      response: publishResult.providerResponse as any,
    },
  });

  await auditLog({
    tenantId: tenant.id,
    actorId: session.user.id,
    action: "publish_immediate_live",
    target: `draft:${draft.id}`,
    metadata: {
      tenant: tenant.name,
      title: draft.title,
      network: draft.network,
      format: draft.format,
      externalPostId,
      providerResponse: publishResult.providerResponse,
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
