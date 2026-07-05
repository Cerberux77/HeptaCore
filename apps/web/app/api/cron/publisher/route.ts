import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getPublisher } from "../../../../lib/publishers";
import { resolveAndDecryptOAuthCredential } from "../../../../lib/credential-resolver";
import { resolveAssetUrl } from "../../../../lib/asset-resolution";
import { validateCronSecret } from "../../../../lib/cron-auth";
import { executePublishingCron } from "../../../../lib/publishing-cron-executor";
import { reconcilePublication } from "../../../../lib/publishing-finalization";
import { TRIAL_POSTS_PER_NETWORK } from "../../../../lib/trial";
import type { Pub04CronDeps, Pub04CronInput, Pub04Publisher } from "../../../../../../contracts/S-HC-PUB-04/pub04-contract.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

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

function adaptPublisher(raw: ReturnType<typeof getPublisher>): Pub04Publisher | null {
  if (!raw) return null;
  const supportedFormats =
    raw.network === "INSTAGRAM"
      ? ["INSTAGRAM_FEED", "INSTAGRAM_STORY", "INSTAGRAM_REEL"]
      : raw.network === "FACEBOOK"
        ? ["FACEBOOK_FEED", "FACEBOOK_STORY", "FACEBOOK_REEL"]
        : ["FACEBOOK_FEED", "INSTAGRAM_FEED"];
  return {
    textOnly: raw.capabilities.textOnly,
    supportedFormats,
    requiredScopes: raw.requiredScopes,
    async publish(input) {
      const result = await raw.publish({
        targetId: input.targetId,
        accessToken: input.accessToken,
        caption: input.caption,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaType,
        format: input.format,
      });
      return { kind: "success", externalPostId: result.externalPostId, providerResponse: result.providerResponse };
    },
  };
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const authResult = validateCronSecret(authHeader);
  if (!authResult.valid) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dry_run") === "true";
  const batchLimitEnv = process.env.CRON_BATCH_LIMIT;
  const batchLimit = batchLimitEnv ? Math.max(1, Math.min(50, parseInt(batchLimitEnv, 10) || 20)) : 20;

  const deps: Pub04CronDeps = {
    repo: {
      async listCandidates({ now, limit }) {
        const jobs = await prisma.publishingJob.findMany({
          where: {
            status: { in: ["SCHEDULED", "IN_REVIEW"] },
            scheduledFor: { lte: now },
          },
          orderBy: { scheduledFor: "asc" },
          take: limit,
        });
        return jobs.map((j) => ({
          id: j.id,
          tenantId: j.tenantId,
          postId: j.postId ?? "",
          provider: j.provider,
          status: j.status as "SCHEDULED" | "IN_REVIEW" | "PUBLISHED" | "FAILED",
          scheduledFor: j.scheduledFor!,
          attempts: j.attempts,
          claimedAt: j.claimedAt,
          claimToken: j.claimToken,
          providerAttemptStartedAt: j.providerAttemptStartedAt,
        }));
      },
      async countDue({ now }) {
        return prisma.publishingJob.count({
          where: {
            status: { in: ["SCHEDULED", "IN_REVIEW"] },
            scheduledFor: { lte: now },
          },
        });
      },
      async loadContext(jobId) {
        const job = await prisma.publishingJob.findUnique({
          where: { id: jobId },
          include: {
            Tenant: { select: { id: true, slug: true, status: true, automationMode: true } },
            ContentDraft: {
              include: { assets: { include: { asset: true } } },
            },
          },
        });
        if (!job || !job.Tenant) return null;

        const tenantSlug = job.Tenant.slug ?? "";
        const socialAccounts = await prisma.socialAccount.findMany({
          where: { tenantId: job.tenantId, network: job.provider as any, status: "connected" },
          select: { id: true, tenantId: true, network: true, status: true, scopes: true, externalAccountId: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
        });

        const durableResult = await prisma.publishingResult.findUnique({
          where: { jobId },
          select: { ok: true, externalPostId: true },
        });

        const publishedCountOnNetwork = await prisma.contentDraft.count({
          where: { tenantId: job.tenantId, network: job.provider as any, status: "PUBLISHED" },
        });

        const draft = job.ContentDraft;
        return {
          job: {
            id: job.id,
            tenantId: job.tenantId,
            postId: job.postId ?? "",
            provider: job.provider,
            status: job.status as "SCHEDULED" | "IN_REVIEW" | "PUBLISHED" | "FAILED",
            scheduledFor: job.scheduledFor!,
            attempts: job.attempts,
            claimedAt: job.claimedAt,
            claimToken: job.claimToken,
            providerAttemptStartedAt: job.providerAttemptStartedAt,
          },
          tenant: {
            id: job.Tenant.id,
            status: job.Tenant.status,
            automationMode: job.Tenant.automationMode,
          },
          draft: draft ? {
            id: draft.id,
            tenantId: draft.tenantId,
            status: draft.status as "APPROVED" | "SCHEDULED" | "PUBLISHED" | "FAILED",
            network: draft.network,
            format: draft.format,
            caption: draft.caption,
            title: draft.title,
            externalPostId: draft.externalPostId,
            socialAccountId: draft.socialAccountId,
            assets: draft.assets.map((da) => ({
              kind: da.asset.kind as "IMAGE" | "VIDEO",
              publicUrl: buildPublicAssetUrl(tenantSlug, da.asset),
            })),
          } : null,
          socialAccounts: socialAccounts.map((sa) => ({
            id: sa.id,
            tenantId: sa.tenantId,
            network: sa.network,
            status: sa.status,
            scopes: sa.scopes,
            externalAccountId: sa.externalAccountId,
            updatedAt: sa.updatedAt,
          })),
          durableResult: durableResult ? {
            ok: durableResult.ok,
            externalPostId: durableResult.externalPostId,
          } : null,
          publishedCountOnNetwork,
          trialLimit: TRIAL_POSTS_PER_NETWORK,
        };
      },
      async claimScheduled({ jobId, claimToken, now }) {
        const result = await prisma.publishingJob.updateMany({
          where: { id: jobId, status: "SCHEDULED" },
          data: { status: "IN_REVIEW", claimedAt: now, claimToken },
        });
        return result.count > 0;
      },
      async reclaimExpiredPreProvider({ jobId, claimToken, now, leaseTtlMs }) {
        const expiryBoundary = new Date(now.getTime() - leaseTtlMs);
        const result = await prisma.publishingJob.updateMany({
          where: {
            id: jobId,
            status: "IN_REVIEW",
            providerAttemptStartedAt: null,
            claimedAt: { lt: expiryBoundary },
          },
          data: { claimToken, claimedAt: now },
        });
        return result.count > 0;
      },
      async markProviderAttemptStarted({ jobId, claimToken, now }) {
        const job = await prisma.publishingJob.findUnique({ where: { id: jobId }, select: { attempts: true } });
        if (!job) return false;
        const nextAttempts = job.attempts + 1;
        const result = await prisma.publishingJob.updateMany({
          where: { id: jobId, status: "IN_REVIEW", claimToken },
          data: { attempts: nextAttempts, providerAttemptStartedAt: now },
        });
        return result.count > 0;
      },
      async recordPreProviderBlock({ jobId, claimToken, code, terminal }) {
        const nextStatus = terminal ? "FAILED" : "SCHEDULED";
        await prisma.publishingJob.updateMany({
          where: { id: jobId, claimToken },
          data: { status: nextStatus as any, claimToken: null, claimedAt: null, lastError: code },
        });
      },
      async recordProviderFailure({ jobId, claimToken, error, retryable, maxAttempts, now }) {
        await prisma.$transaction(async (tx) => {
          const job = await tx.publishingJob.findUnique({ where: { id: jobId } });
          if (!job) return;
          const canRetry = retryable && job.attempts < maxAttempts;
          const nextStatus = canRetry ? "SCHEDULED" : "FAILED";
          const updateResult = await tx.publishingJob.updateMany({
            where: { id: jobId, claimToken },
            data: { status: nextStatus as any, claimToken: null, claimedAt: null, providerAttemptStartedAt: null, lastError: error },
          });
          if (updateResult.count === 0) return;
          if (job.postId) {
            await tx.contentDraft.updateMany({
              where: { id: job.postId },
              data: { status: nextStatus === "SCHEDULED" ? "SCHEDULED" : "FAILED" },
            });
          }
        });
      },
      async markReconciliation({ jobId, claimToken, code }) {
        if (claimToken) {
          await prisma.publishingJob.updateMany({
            where: { id: jobId, claimToken },
            data: { status: "IN_REVIEW", lastError: code },
          });
        } else {
          await prisma.publishingJob.updateMany({
            where: { id: jobId },
            data: { status: "IN_REVIEW", lastError: code },
          });
        }
      },
      async finalizeSuccess({ jobId, claimToken, externalPostId, providerResponse, now }) {
        try {
          await prisma.$transaction(async (tx) => {
            const job = await tx.publishingJob.findUnique({ where: { id: jobId } });
            if (!job || job.claimToken !== claimToken || job.status !== "IN_REVIEW") {
              throw new Error("FINALIZE_PRECONDITION_FAILED");
            }
            await tx.publishingResult.upsert({
              where: { id: `pr_${jobId}` },
              create: { id: `pr_${jobId}`, jobId, provider: job.provider, externalPostId, ok: true, response: providerResponse as any },
              update: { externalPostId, ok: true, response: providerResponse as any },
            });
            if (job.postId) {
              await tx.contentDraft.update({
                where: { id: job.postId },
                data: { status: "PUBLISHED", externalPostId, publishedAt: now },
              });
            }
            await tx.publishingJob.updateMany({
              where: { id: jobId },
              data: { status: "PUBLISHED" },
            });
          });
          return "committed";
        } catch {
          return "reconciliation_required";
        }
      },
      async reconcileDurableSuccess({ jobId, externalPostId, now }) {
        const job = await prisma.publishingJob.findUnique({
          where: { id: jobId },
          select: { postId: true, tenantId: true },
        });
        if (!job?.postId || !job.tenantId) return "conflict";

        const result = await reconcilePublication(prisma, {
          jobId,
          draftId: job.postId,
          tenantId: job.tenantId,
          externalPostId,
          now,
        });
        return result.committed ? "committed" : "conflict";
      },
    },
    getPublisher(network) {
      return adaptPublisher(getPublisher(network));
    },
    async resolveCredential({ tenantId, provider, socialAccountId }) {
      const result = await resolveAndDecryptOAuthCredential({
        tenantId,
        provider,
        socialAccountId,
        credentialLabel: "facebook_page_oauth",
      });
      if (!result.ok) return { ok: false, code: result.code };
      return { ok: true, accessToken: result.accessToken, targetId: result.providerUserId };
    },
    now() {
      return new Date();
    },
    newClaimToken() {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    },
  };

  const input: Pub04CronInput = {
    dryRun,
    batchLimit,
    timeBudgetMs: 50000,
    leaseTtlMs: 300000,
    maxAttempts: 3,
  };

  const result = await executePublishingCron(input, deps);

  return NextResponse.json({ ok: true, summary: result.summary, outcomes: result.outcomes, dryRun });
}
