import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auditLog } from "../../../../lib/audit";
import { resolveAndDecryptOAuthCredential } from "../../../../lib/credential-resolver";
import { getPublisher, PublishInput } from "../../../../lib/publishers";
import { ProviderError } from "../../../../lib/publishers/types";
import { hasDurableProviderSuccess } from "../../../../lib/publishing-execution";
import { commitConfirmedPublication, recordUnconfirmedProviderFailure } from "../../../../lib/publishing-finalization";
import { resolveAssetUrl } from "../../../../lib/asset-resolution";
import { validateCronSecret } from "../../../../lib/cron-auth";
import { computeWindow, classifyJob, generateRunId } from "../../../../lib/publishing-cron-time";
import { claimJob } from "../../../../lib/publishing-claim";
import { revalidateJob, RevalidationBlock } from "../../../../lib/publishing-revalidation";
import { getBatchBudgetConfig, isTimeBudgetExhausted } from "../../../../lib/publishing-batch-budget";
import { createEmptySummary, CronRunSummary, CronJobOutcome } from "../../../../lib/publishing-observability";
import { TRIAL_POSTS_PER_NETWORK } from "../../../../lib/trial";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ATTEMPTS = 3;

interface JobRecord {
  id: string;
  tenantId: string;
  postId: string | null;
  provider: string;
  scheduledFor: Date | null;
  attempts: number;
  claimedAt: Date | null;
  providerAttemptStartedAt: Date | null;
  draft: {
    id: string;
    title: string;
    network: string;
    caption: string;
    format: string;
    socialAccountId: string | null;
  } | null;
  tenant: {
    slug: string;
    automationMode: string;
    status: string;
  } | null;
}

type PublishOutcome =
  | { kind: "success"; externalPostId: string; providerResponse: unknown }
  | { kind: "blocked"; reason: string; blocks: RevalidationBlock[] }
  | { kind: "attempted"; error: string }
  | { kind: "ambiguous"; error: string };

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

async function tryRealPublish(job: JobRecord): Promise<PublishOutcome> {
  const network = job.provider;
  const publisher = getPublisher(network);
  if (!publisher) {
    return { kind: "blocked", reason: `Provider ${network} is not implemented.`, blocks: [] };
  }

  if (!job.tenant || !job.draft) {
    return { kind: "blocked", reason: "Tenant or draft not resolved.", blocks: [] };
  }

  const tenant = await prisma.tenant.findFirst({
    where: { id: job.tenantId },
    select: { id: true, slug: true, status: true, automationMode: true },
  });

  const draft = await prisma.contentDraft.findFirst({
    where: { id: job.draft.id, tenantId: job.tenantId },
    include: { assets: { include: { asset: true } } },
  });

  const existingResult = await prisma.publishingResult.findFirst({
    where: { jobId: job.id, ok: true },
    select: { externalPostId: true },
  });

  const publishedCount = await prisma.contentDraft.count({
    where: { tenantId: job.tenantId, network: network as any, status: "PUBLISHED" },
  });

  let socialAccount: { id: string; status: string; scopes: string[]; externalAccountId: string | null } | null = null;

  if (draft?.socialAccountId) {
    socialAccount = await prisma.socialAccount.findFirst({
      where: { id: draft.socialAccountId, tenantId: job.tenantId, network: network as any, status: "connected" },
      select: { id: true, status: true, scopes: true, externalAccountId: true },
    });
  }

  if (!socialAccount) {
    socialAccount = await prisma.socialAccount.findFirst({
      where: { tenantId: job.tenantId, network: network as any, status: "connected" },
      select: { id: true, status: true, scopes: true, externalAccountId: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  const formatSupported = publisher.capabilities.textOnly || (network === "FACEBOOK" || network === "INSTAGRAM");
  const assetUrlPublic = draft
    ? (() => {
        const primaryAsset = draft.assets.length > 0
          ? (draft.assets.find((a) => a.role === "primary") ?? draft.assets[0])
          : null;
        if (!primaryAsset) return true;
        const url = buildPublicAssetUrl(job.tenant?.slug ?? "", primaryAsset.asset);
        return !!url && url.startsWith("https://");
      })()
    : false;

  const requiredScopes = publisher.requiredScopes;
  const requiredScopesPresent = socialAccount
    ? requiredScopes.every(
        (s) => socialAccount!.scopes.includes(s) || socialAccount!.scopes.includes(s.replace("instagram_business_", ""))
      )
    : false;

  const credentialResolvable = socialAccount
    ? (await resolveAndDecryptOAuthCredential({
        tenantId: job.tenantId,
        provider: network,
        socialAccountId: socialAccount.id,
        credentialLabel: publisher.credentialLabel,
      })).ok
    : false;

  const revalidation = revalidateJob({
    tenant: tenant as any,
    draft: draft as any,
    job: {
      id: job.id,
      tenantId: job.tenantId,
      postId: job.postId,
      provider: job.provider as any,
      status: "IN_REVIEW",
      scheduledFor: job.scheduledFor,
      attempts: job.attempts,
      claimedAt: job.claimedAt,
    } as any,
    socialAccount: socialAccount as any,
    credentialResolvable,
    publishedCountOnNetwork: publishedCount,
    formatSupportedForLive: formatSupported,
    assetUrlPublic,
    requiredScopesPresent,
    hasDurableResult: hasDurableProviderSuccess({
      resultOk: existingResult ? true : undefined,
      resultExternalPostId: existingResult?.externalPostId,
      draftExternalPostId: draft?.externalPostId,
    }),
    maxAttempts: MAX_ATTEMPTS,
  });

  if (!revalidation.valid) {
    return { kind: "blocked", reason: revalidation.blocks.map((b) => b.code).join(", "), blocks: revalidation.blocks };
  }

  const needsAsset = !publisher.capabilities.textOnly || (draft?.assets?.length ?? 0) > 0;
  let mediaUrl: string | undefined | null;
  let mediaType: "IMAGE" | "VIDEO" | undefined;

  if (needsAsset && draft) {
    const primaryAsset = draft.assets.find((a) => a.role === "primary") ?? draft.assets[0];
    if (primaryAsset) {
      let tenantSlug = job.tenant?.slug;
      if (!tenantSlug && tenant) {
        tenantSlug = tenant.slug ?? undefined;
      }
      if (!tenantSlug) {
        return { kind: "blocked", reason: "Tenant slug not found.", blocks: [] };
      }
      mediaUrl = buildPublicAssetUrl(tenantSlug, primaryAsset.asset);
      if (!mediaUrl) {
        return { kind: "blocked", reason: "Cannot construct public HTTPS asset URL.", blocks: [] };
      }
      const isVideo = primaryAsset.asset.kind === "VIDEO";
      mediaType = isVideo ? "VIDEO" : "IMAGE";
    }
  }

  const targetId = socialAccount?.externalAccountId;
  if (!targetId) {
    return { kind: "blocked", reason: "Social account missing external account ID.", blocks: [] };
  }

  const credentialResolution = await resolveAndDecryptOAuthCredential({
    tenantId: job.tenantId,
    provider: network,
    socialAccountId: socialAccount!.id,
    credentialLabel: publisher.credentialLabel,
  });

  if (!credentialResolution.ok) {
    return { kind: "blocked", reason: `${network} credential: ${credentialResolution.error}`, blocks: [] };
  }

  const accessToken = credentialResolution.accessToken;

  const publishInput: PublishInput = {
    targetId,
    accessToken,
    mediaUrl,
    caption: draft?.caption || draft?.title || "",
    mediaType,
  };

  try {
    const result = await publisher.publish(publishInput);
    return { kind: "success", externalPostId: result.externalPostId, providerResponse: result.providerResponse };
  } catch (err) {
    if (err instanceof ProviderError && err.isAmbiguous) {
      return { kind: "ambiguous", error: err instanceof Error ? err.message : `${network} publish failed` };
    }
    return { kind: "attempted", error: err instanceof Error ? err.message : `${network} publish failed` };
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const authResult = validateCronSecret(authHeader);
  if (!authResult.valid) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dry_run") === "true";
  const nowUtc = new Date();
  const runId = generateRunId();
  const window = computeWindow(nowUtc);
  const budget = getBatchBudgetConfig(process.env.CRON_BATCH_LIMIT);

  const summary = createEmptySummary(runId, nowUtc, window.windowStart, window.windowEnd, dryRun);

  const due = await prisma.publishingJob.findMany({
    where: {
      status: "SCHEDULED",
      scheduledFor: { lte: nowUtc },
    },
    orderBy: { scheduledFor: "asc" },
    take: budget.limit,
    select: {
      id: true,
      tenantId: true,
      postId: true,
      provider: true,
      scheduledFor: true,
      attempts: true,
      claimedAt: true,
      providerAttemptStartedAt: true,
      ContentDraft: { select: { id: true, title: true, network: true, caption: true, format: true, socialAccountId: true } },
      Tenant: { select: { slug: true, automationMode: true, status: true } },
    },
  });

  const jobs: JobRecord[] = due.map((j) => ({
    id: j.id,
    tenantId: j.tenantId,
    postId: j.postId,
    provider: j.provider,
    scheduledFor: j.scheduledFor,
    attempts: j.attempts,
    claimedAt: j.claimedAt,
    providerAttemptStartedAt: j.providerAttemptStartedAt,
    draft: j.ContentDraft
      ? { id: j.ContentDraft.id, title: j.ContentDraft.title, network: j.ContentDraft.network, caption: j.ContentDraft.caption, format: j.ContentDraft.format, socialAccountId: j.ContentDraft.socialAccountId }
      : null,
    tenant: j.Tenant ? { slug: j.Tenant.slug, automationMode: j.Tenant.automationMode, status: j.Tenant.status } : null,
  }));

  let currentWindowDue = 0;
  let backlogDue = 0;
  for (const job of jobs) {
    if (job.scheduledFor) {
      const classification = classifyJob(job.scheduledFor, nowUtc);
      if (classification === "currentWindow") currentWindowDue++;
      else if (classification === "backlog") backlogDue++;
    }
  }

  summary.currentWindowDue = currentWindowDue;
  summary.backlogDue = backlogDue;
  summary.selected = jobs.length;

  const outcomes: CronJobOutcome[] = [];

  for (const job of jobs) {
    if (isTimeBudgetExhausted(nowUtc, new Date(), budget.timeBudgetMs)) {
      summary.timeBudgetExhausted = true;
      summary.remainingDue = jobs.length - outcomes.length;
      outcomes.push({ jobId: job.id, code: "SKIPPED_TIME_BUDGET", reason: "Time budget exhausted" });
      summary.skipped++;
      continue;
    }

    if (dryRun) {
      const network = job.provider;
      const publisher = getPublisher(network);
      const formatSupported = publisher?.capabilities.textOnly || (network === "FACEBOOK" || network === "INSTAGRAM") || false;
      const draft = job.draft;
      const tenant = job.tenant;

      const dryRunCheck = revalidateJob({
        tenant: tenant ? { id: job.tenantId, status: tenant.status, automationMode: tenant.automationMode } as any : null,
        draft: draft ? { id: draft.id, status: "SCHEDULED", network: draft.network, externalPostId: null, assets: [] } as any : null,
        job: { id: job.id, tenantId: job.tenantId, postId: job.postId, provider: network as any, status: "SCHEDULED", scheduledFor: job.scheduledFor, attempts: job.attempts, claimedAt: job.claimedAt } as any,
        socialAccount: null,
        credentialResolvable: false,
        publishedCountOnNetwork: 0,
        formatSupportedForLive: formatSupported,
        assetUrlPublic: false,
        requiredScopesPresent: false,
        hasDurableResult: false,
        maxAttempts: MAX_ATTEMPTS,
      });

      if (dryRunCheck.valid) {
        outcomes.push({ jobId: job.id, code: "PUBLISHED" });
        summary.published++;
      } else {
        outcomes.push({ jobId: job.id, code: "TERMINAL_FAILURE", reason: dryRunCheck.blocks.map((b) => b.code).join(", ") });
        summary.terminalFailures++;
      }
      continue;
    }

    const claimResult = await claimJob(prisma as any, job.id, "SCHEDULED");

    if (!claimResult.claimed) {
      summary.skipped++;
      outcomes.push({ jobId: job.id, code: "SKIPPED_ALREADY_CLAIMED", reason: claimResult.reason });
      continue;
    }

    summary.claimed++;

    await prisma.publishingJob.updateMany({
      where: { id: job.id },
      data: {
        attempts: { increment: 1 },
        providerAttemptStartedAt: new Date(),
      },
    });

    const outcome = await tryRealPublish({ ...job, attempts: job.attempts + 1 });

    if (outcome.kind === "success") {
      summary.published++;
      outcomes.push({ jobId: job.id, code: "PUBLISHED" });

      const finalizeResult = await commitConfirmedPublication(prisma, {
        jobId: job.id,
        draftId: job.postId ?? "",
        tenantId: job.tenantId,
        network: job.provider,
        externalPostId: outcome.externalPostId,
        providerResponse: outcome.providerResponse,
      });

      if (!finalizeResult.committed) {
        summary.published--;
        summary.reconciliationRequired++;
        outcomes[outcomes.length - 1] = { jobId: job.id, code: "RECONCILIATION_REQUIRED", reason: "Provider confirmed but local persistence failed" };
      }

      try {
        await auditLog({
          tenantId: job.tenantId,
          actorId: "system",
          action: finalizeResult.committed ? "auto_publish_live" : "auto_publish_live_reconciliation_needed",
          target: `draft:${job.postId}`,
          metadata: {
            title: job.draft?.title ?? "untitled",
            network: job.provider,
            externalPostId: outcome.externalPostId,
            scheduledFor: job.scheduledFor,
            code: finalizeResult.code,
          },
        });
      } catch {}
    } else if (outcome.kind === "ambiguous") {
      summary.reconciliationRequired++;
      outcomes.push({ jobId: job.id, code: "RECONCILIATION_REQUIRED", reason: outcome.error });
      try {
        await auditLog({
          tenantId: job.tenantId,
          actorId: "system",
          action: "auto_publish_ambiguous",
          target: `draft:${job.postId}`,
          metadata: { title: job.draft?.title ?? "untitled", network: job.provider, error: outcome.error.slice(0, 500) },
        });
      } catch {}
    } else if (outcome.kind === "attempted") {
      summary.retryableFailures++;
      outcomes.push({ jobId: job.id, code: "RETRYABLE_FAILURE", reason: outcome.error });

      const existingResult = await prisma.publishingResult.findUnique({
        where: { jobId: job.id },
        select: { ok: true, externalPostId: true },
      });

      if (!hasDurableProviderSuccess({ resultOk: existingResult?.ok, resultExternalPostId: existingResult?.externalPostId })) {
        await prisma.$transaction(async (tx) => {
          await recordUnconfirmedProviderFailure({
            tx,
            jobId: job.id,
            draftId: job.postId ?? "",
            tenantId: job.tenantId,
            network: job.provider,
            errorMsg: outcome.error,
            isMaxAttempts: (job.attempts + 1) >= MAX_ATTEMPTS,
          });
        });
      }

      if (job.postId && job.draft) {
        try {
          await prisma.contentDraft.update({ where: { id: job.postId }, data: { status: "FAILED" } });
        } catch {}
      }
    } else {
      const hasTerminalBlocks = outcome.blocks.length > 0 && outcome.blocks.every((b) => b.category === "terminal-before-provider");
      if (hasTerminalBlocks) {
        summary.terminalFailures++;
        outcomes.push({ jobId: job.id, code: "TERMINAL_FAILURE", reason: outcome.reason });
      } else {
        summary.retryableFailures++;
        outcomes.push({ jobId: job.id, code: "RETRYABLE_FAILURE", reason: outcome.reason });
      }

      const existingResult = await prisma.publishingResult.findUnique({
        where: { jobId: job.id },
        select: { ok: true, externalPostId: true },
      });

      if (!hasDurableProviderSuccess({ resultOk: existingResult?.ok, resultExternalPostId: existingResult?.externalPostId })) {
        await prisma.$transaction(async (tx) => {
          await recordUnconfirmedProviderFailure({
            tx,
            jobId: job.id,
            draftId: job.postId ?? "",
            tenantId: job.tenantId,
            network: job.provider,
            errorMsg: outcome.reason,
            isMaxAttempts: (job.attempts + 1) >= MAX_ATTEMPTS,
          });
        });
      }
    }
  }

  const finishedAt = new Date();
  summary.finishedAt = finishedAt.toISOString();
  summary.durationMs = finishedAt.getTime() - nowUtc.getTime();
  summary.remainingDue = summary.remainingDue || 0;

  console.log(`[CRON] runId=${runId} selected=${summary.selected} claimed=${summary.claimed} published=${summary.published} recon=${summary.reconciliationRequired} retry=${summary.retryableFailures} terminal=${summary.terminalFailures} skipped=${summary.skipped} remaining=${summary.remainingDue} budgetExhausted=${summary.timeBudgetExhausted} durationMs=${summary.durationMs}`);

  return NextResponse.json({ ok: true, summary, outcomes, dryRun });
}
