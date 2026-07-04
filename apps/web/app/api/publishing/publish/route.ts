import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { auditLog } from "../../../../lib/audit";
import { prisma } from "../../../../lib/prisma";
import { TRIAL_POSTS_PER_NETWORK } from "../../../../lib/trial";
import { resolveAndDecryptOAuthCredential } from "../../../../lib/credential-resolver";
import { getPublisher, PublishInput } from "../../../../lib/publishers";
import { buildImmediateJobId, checkExistingJobForRetry, getAllPossibleJobIds, buildDeterministicScheduledJobId } from "../../../../lib/publishing-execution";
import { commitConfirmedPublication, recordUnconfirmedProviderFailure } from "../../../../lib/publishing-finalization";
import { ProviderError } from "../../../../lib/publishers/types";
import { buildMultiformatDryRun, normalizeAssetManifest, normalizePublishingFormat } from "../../../../lib/publishing-formats";
import { resolveAssetUrl } from "../../../../lib/asset-resolution";
import { resolveTenantAccessWithLifecycle } from "../../../../lib/tenant-access";
import { Permission } from "../../../../lib/permissions";
import { schedulePublication } from "../../../../lib/publishing-scheduler-service";
import type { Pub04ScheduleRepository } from "../../../../../../contracts/S-HC-PUB-04/pub04-contract.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type PublishMode = "dry_run" | "scheduled" | "immediate";

function checkScopes(required: string[], actual: string[]): string[] {
  return required.filter(
    (scope) => !actual.includes(scope) && !actual.includes(scope.replace("instagram_business_", ""))
  );
}

function appOrigin(): string | null {
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

  return origin.includes("\r") || origin.includes("\n") ? null : origin;
}

function buildPublicAssetUrl(tenantSlug: string, asset: { storageKey?: string | null; sourcePath?: string | null; filename?: string | null }): string | null {
  const resolved = resolveAssetUrl(asset, tenantSlug);
  if (!resolved) return null;
  if (resolved.startsWith("https://")) return resolved;
  if (resolved.startsWith("http://")) {
    const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
    return isProd ? null : resolved;
  }
  const origin = appOrigin();
  return origin ? `${origin}${resolved.startsWith("/") ? "" : "/"}${resolved}` : null;
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

  try {
    await resolveTenantAccessWithLifecycle(session.user.id, tenant.id, Permission.CONTENT_PUBLISH, "NORMAL_OPERATION");
  } catch (e: any) {
    if (e?.code) {
      return NextResponse.json({ error: e.message }, { status: e.status || 403 });
    }
    throw e;
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

  const network = draft.network;
  const format = normalizePublishingFormat(network, draft.format);
  const orderedAssets = normalizeAssetManifest(draft.assets, (asset) => {
    if (!asset) return null;
    return buildPublicAssetUrl(tenantSlug, asset);
  });

  const draftOnly = tenant.automationMode === "DRAFT_ONLY";
  const approvalRequired = tenant.automationMode === "APPROVAL_REQUIRED";

  if (requestMode === "dry_run") {
    const dryRun = buildMultiformatDryRun(format, orderedAssets);

    await auditLog({
      tenantId: tenant.id,
      actorId: session.user.id,
      action: "publish_dry_run_multiformat_validated",
      target: `draft:${draft.id}`,
      metadata: {
        tenant: tenant.name,
        title: draft.title,
        network,
        format,
        valid: dryRun.valid,
        errorCodes: dryRun.errors.map((error) => error.code),
        warningCodes: dryRun.warnings.map((warning) => warning.code),
        assetIds: orderedAssets.map((asset) => asset.id),
        tenantAutomationMode: tenant.automationMode,
      },
    });

    return NextResponse.json({
      ok: dryRun.valid,
      mode: "dry_run",
      message: dryRun.valid
        ? "Multiformat dry-run passed. No provider call executed."
        : "Multiformat dry-run found blocking validation errors. No provider call executed.",
      draftId: draft.id,
      valid: dryRun.valid,
      errors: dryRun.errors,
      warnings: dryRun.warnings,
      format: dryRun.format,
      assets: dryRun.assets,
      previewData: dryRun.previewData,
    });
  }

  if (format === "INSTAGRAM_CAROUSEL" || format === "INSTAGRAM_STORY") {
    return NextResponse.json({
      code: "LIVE_BLOCKED_FORMAT_PREVIEW_ONLY",
      error: `${format} is available for preview and dry-run only in this sprint.`,
      action: "Use dry-run for Carousel or Story. Real publishing remains disabled for this format.",
    }, { status: 409 });
  }

  if (draftOnly) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_DRAFT_ONLY_MODE",
      error: "Este tenant esta en modo DRAFT_ONLY. Solo se permite dry-run.",
      action: "Cambia el modo de automatizacion del tenant para publicar o programar.",
    }, { status: 409 });
  }

  if (approvalRequired && !manualApproval) {
    return NextResponse.json({
      code: "LIVE_BLOCKED_MANUAL_APPROVAL_REQUIRED",
      error: "Este tenant requiere aprobacion manual explicita para publicar o programar.",
      action: "Marca el checkbox de aprobacion manual antes de ejecutar.",
    }, { status: 409 });
  }

  if (requestMode === "scheduled") {
    const scheduledFor = scheduledAt ?? draft.scheduledFor ?? new Date(Date.now() + 3600000);

    if (isNaN(scheduledFor.getTime())) {
      return NextResponse.json({
        code: "LIVE_BLOCKED_INVALID_DATE",
        error: "scheduledAt is not a valid date.",
      }, { status: 400 });
    }

    const scheduleRepo: Pub04ScheduleRepository = {
      async scheduleAtomic(input) {
        const existingJob = await prisma.publishingJob.findUnique({ where: { id: input.jobId } });
        if (existingJob) {
          return { jobId: input.jobId, status: "existing" };
        }

        try {
          await prisma.$transaction(async (tx) => {
            const claimed = await tx.contentDraft.updateMany({
              where: { id: input.draftId, tenantId: input.tenantId, status: "APPROVED" },
              data: { status: "SCHEDULED", scheduledFor: input.scheduledFor },
            });

            if (claimed.count === 0) {
              const alreadyScheduled = await tx.contentDraft.findFirst({
                where: { id: input.draftId, tenantId: input.tenantId, status: "SCHEDULED" },
              });
              if (alreadyScheduled) {
                const recheckJob = await tx.publishingJob.findUnique({ where: { id: input.jobId } });
                if (recheckJob) {
                  throw new Error("JOB_EXISTS");
                }
                await tx.publishingJob.create({
                  data: {
                    id: input.jobId,
                    tenantId: input.tenantId,
                    postId: input.draftId,
                    provider: input.network as any,
                    status: "SCHEDULED",
                    scheduledFor: input.scheduledFor,
                    updatedAt: new Date(),
                  },
                });
                return;
              }
              throw new Error("DRAFT_ALREADY_CLAIMED");
            }

            await tx.publishingJob.create({
              data: {
                id: input.jobId,
                tenantId: input.tenantId,
                postId: input.draftId,
                provider: input.network as any,
                status: "SCHEDULED",
                scheduledFor: input.scheduledFor,
                updatedAt: new Date(),
              },
            });
          });

          return { jobId: input.jobId, status: "created" };
        } catch (err: any) {
          if (err?.message === "JOB_EXISTS") {
            return { jobId: input.jobId, status: "existing" };
          }
          throw err;
        }
      },
    };

    try {
      const scheduleResult = await schedulePublication({
        tenantId: tenant.id,
        draftId: draft.id,
        network,
        scheduledFor,
      }, scheduleRepo);

      await auditLog({
        tenantId: tenant.id,
        actorId: session.user.id,
        action: "publish_scheduled",
        target: `draft:${draft.id}`,
        metadata: {
          tenant: tenant.name,
          title: draft.title,
          network,
          format,
          scheduledFor: scheduledFor.toISOString(),
          jobId: scheduleResult.jobId,
          tenantAutomationMode: tenant.automationMode,
        },
      });

      return NextResponse.json({
        ok: true,
        mode: "scheduled",
        status: "SCHEDULED",
        draftId: draft.id,
        jobId: scheduleResult.jobId,
        scheduledFor: scheduleResult.scheduledFor,
      });
    } catch (err: any) {
      if (err?.message?.includes("DRAFT_ALREADY_CLAIMED")) {
        return NextResponse.json({
          code: "LIVE_BLOCKED_ALREADY_CLAIMED",
          error: "Este draft ya fue reclamado en otra solicitud o cambio de estado.",
          action: "Verifica si el draft ya fue publicado o programado por otra operacion concurrente.",
        }, { status: 409 });
      }
      if (err?.message?.includes("INVALID_SCHEDULED_AT")) {
        return NextResponse.json({
          code: "LIVE_BLOCKED_INVALID_DATE",
          error: "scheduledAt is not a valid date.",
        }, { status: 400 });
      }
      return NextResponse.json({
        code: "LIVE_BLOCKED_JOB_CREATION_FAILED",
        error: "No se pudo crear el PublishingJob de forma transaccional.",
        action: "Reintenta la operacion.",
      }, { status: 500 });
    }
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
  const refreshToken = credentialResolution.refreshToken;
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
  const thumbnailAsset = draft.assets.find((asset) => asset.asset.kind === "IMAGE" && asset.asset.id !== primaryAsset?.asset.id);
  const thumbnailUrl = thumbnailAsset ? buildPublicAssetUrl(tenantSlug, thumbnailAsset.asset) : null;

  if (primaryAsset) {
    mediaUrl = buildPublicAssetUrl(tenantSlug, primaryAsset.asset);

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

  // === IMMEDIATE: attempt real publish ===

  const attemptJobId = buildImmediateJobId(draft.id, network);

  // Check for existing completed/in-flight state (legacy + new IDs)
  const allJobIds = getAllPossibleJobIds(draft.id, network);
  const existingJobs = await prisma.publishingJob.findMany({
    where: { id: { in: allJobIds } },
    select: { id: true, status: true, scheduledFor: true, PublishingResult: { select: { ok: true, externalPostId: true } } },
  });

  const blockingJob = existingJobs.find((j) => {
    const check = checkExistingJobForRetry({
      jobStatus: j.status,
      resultOk: j.PublishingResult?.ok,
      externalPostId: j.PublishingResult?.externalPostId ?? undefined,
      draftExternalPostId: draft.externalPostId,
    });
    return check.blocked;
  });

  if (blockingJob) {
    const check = checkExistingJobForRetry({
      jobStatus: blockingJob.status,
      resultOk: blockingJob.PublishingResult?.ok,
      externalPostId: blockingJob.PublishingResult?.externalPostId ?? undefined,
      draftExternalPostId: draft.externalPostId,
    });
    return NextResponse.json({
      ok: false,
      mode: "immediate",
      code: check.code ?? "LIVE_BLOCKED_RETRY",
      error: check.reason ?? "No puede volver a publicarse.",
      action: "Verifica el estado del draft y jobs existentes.",
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
        status: "IN_REVIEW",
        scheduledFor: null,
        updatedAt: new Date(),
      },
      update: {
        status: "IN_REVIEW",
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
    refreshToken,
    mediaUrl,
    caption: draft.caption || draft.title,
    title: draft.title,
    description: draft.caption || draft.title,
    thumbnailUrl,
    format,
    mediaType,
  };

  let publishResult: { externalPostId: string; providerResponse: unknown };
  try {
    publishResult = await publisher.publish(publishInput);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : `${network} publish failed`;

    if (err instanceof ProviderError && err.isAmbiguous) {
      try {
        await auditLog({
          tenantId: tenant.id,
          actorId: session.user.id,
          action: "publish_immediate_failed_ambiguous",
          target: `draft:${draft.id}`,
          metadata: { tenant: tenant.name, title: draft.title, network, format, error: errorMsg.slice(0, 500), code: err.meta.code, subcode: err.meta.subcode, fbtrace: err.meta.fbtrace },
        });
      } catch {}

      return NextResponse.json({
        ok: false,
        providerConfirmed: false,
        providerOutcomeUnknown: true,
        code: "LIVE_RECONCILIATION_REQUIRED",
        status: "RECONCILIATION_REQUIRED",
        draftId: draft.id,
        error: "Meta devolvio un resultado ambiguo. Verifique la pagina antes de reintentar.",
        action: "No vuelva a publicar hasta verificar Facebook. El job permanece IN_REVIEW.",
      }, { status: 202 });
    }

    await prisma.$transaction(async (tx) => {
      await recordUnconfirmedProviderFailure({
        tx,
        jobId: attemptJobId,
        draftId: draft.id,
        tenantId: tenant.id,
        network,
        errorMsg,
        isMaxAttempts: true,
      });
    });

    try {
      await auditLog({
        tenantId: tenant.id,
        actorId: session.user.id,
        action: "publish_immediate_failed",
        target: `draft:${draft.id}`,
        metadata: { tenant: tenant.name, title: draft.title, network, format, error: errorMsg.slice(0, 500) },
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

  // Provider succeeded — finalize via shared transactional service
  const externalPostId = publishResult.externalPostId;

  const finalizeResult = await commitConfirmedPublication(prisma, {
    jobId: attemptJobId,
    draftId: draft.id,
    tenantId: tenant.id,
    network,
    externalPostId,
    providerResponse: publishResult.providerResponse,
  });

  try {
    await auditLog({
      tenantId: tenant.id,
      actorId: session.user.id,
      action: finalizeResult.committed ? "publish_immediate_live" : "publish_immediate_live_reconciliation_needed",
      target: `draft:${draft.id}`,
      metadata: { tenant: tenant.name, title: draft.title, network, format, externalPostId, providerResponse: publishResult.providerResponse, tenantAutomationMode: tenant.automationMode, committed: finalizeResult.committed },
    });
  } catch {}

  if (!finalizeResult.committed) {
    return NextResponse.json({
      ok: false,
      providerConfirmed: true,
      code: "LIVE_RECONCILIATION_REQUIRED",
      status: "RECONCILIATION_REQUIRED",
      draftId: draft.id,
      externalPostId,
      error: "El proveedor confirmo la publicacion, pero HeptaCore no completo la persistencia. El job permanece IN_REVIEW.",
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
