import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auditLog } from "../../../../lib/audit";
import { resolveAndDecryptOAuthCredential } from "../../../../lib/credential-resolver";
import { getPublisher, PublishInput } from "../../../../lib/publishers";
import { ProviderError } from "../../../../lib/publishers/types";
import { checkCronJobEligibility, hasDurableProviderSuccess, isPublicationDurablyCommitted } from "../../../../lib/publishing-execution";
import { commitConfirmedPublication, recordUnconfirmedProviderFailure } from "../../../../lib/publishing-finalization";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET ?? "heptacore-cron-secret";
const BATCH_LIMIT = 50;
const MAX_ATTEMPTS = 3;

interface JobRecord {
  id: string;
  tenantId: string;
  postId: string | null;
  provider: string;
  scheduledFor: Date | null;
  attempts: number;
  draft: {
    id: string;
    title: string;
    network: string;
    caption: string;
    format: string;
  } | null;
  tenant: {
    slug: string;
  } | null;
}

type PublishOutcome =
  | { kind: "success"; externalPostId: string; providerResponse: unknown }
  | { kind: "blocked"; reason: string }
  | { kind: "attempted"; error: string }
  | { kind: "ambiguous"; error: string };

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

async function tryRealPublish(job: JobRecord): Promise<PublishOutcome> {
  const network = job.provider;
  const publisher = getPublisher(network);
  if (!publisher) {
    return { kind: "blocked", reason: `Provider ${network} is not implemented for live publishing.` };
  }

  if (!job.draft) {
    return { kind: "blocked", reason: "Draft not found or not linked to this job." };
  }

  const draft = await prisma.contentDraft.findFirst({
    where: { id: job.draft.id, tenantId: job.tenantId },
    select: { id: true, status: true, network: true, externalPostId: true, caption: true, title: true, format: true, assets: { include: { asset: true } } },
  });

  if (!draft) {
    return { kind: "blocked", reason: "Draft not found." };
  }

  const resultCheck = await prisma.publishingResult.findFirst({
    where: { jobId: job.id, ok: true },
    select: { externalPostId: true },
  });

  const isImmediatePreAttempt = !job.scheduledFor;

  const eligibility = checkCronJobEligibility({
    jobStatus: "IN_REVIEW",
    scheduledFor: job.scheduledFor,
    attempts: job.attempts,
    maxAttempts: MAX_ATTEMPTS,
    draftExists: true,
    draftStatus: draft.status,
    draftNetwork: draft.network,
    jobProvider: network,
    draftExternalPostId: draft.externalPostId,
    resultOk: resultCheck ? true : undefined,
    resultExternalPostId: resultCheck?.externalPostId ?? undefined,
    isImmediatePreAttempt,
  });

  if (!eligibility.eligible) {
    return { kind: "blocked", reason: eligibility.reason ?? "Cron eligibility check failed." };
  }

  const needsAsset = !publisher.capabilities.textOnly || draft.assets.length > 0;
  if (needsAsset && draft.assets.length === 0) {
    return { kind: "blocked", reason: "Draft has no linked assets." };
  }

  let mediaUrl: string | undefined | null;
  let mediaType: "IMAGE" | "VIDEO" | undefined;
  const primaryAsset = needsAsset ? (draft.assets.find((a) => a.role === "primary") ?? draft.assets[0]) : null;

  if (primaryAsset) {
    const assetPath = resolveAssetPath(primaryAsset.asset);
    if (!assetPath) {
      return { kind: "blocked", reason: "Cannot resolve asset path. Ensure storageKey or sourcePath is set." };
    }

    let tenantSlug = job.tenant?.slug;
    if (!tenantSlug) {
      const tenant = await prisma.tenant.findFirst({
        where: { id: job.tenantId },
        select: { slug: true },
      });
      tenantSlug = tenant?.slug;
    }
    if (!tenantSlug) {
      return { kind: "blocked", reason: "Tenant slug not found." };
    }

    mediaUrl = buildPublicAssetUrl(tenantSlug, assetPath);
    if (!mediaUrl) {
      return { kind: "blocked", reason: "Cannot construct public HTTPS asset URL." };
    }

    const isVideo = primaryAsset.asset.kind === "VIDEO";
    mediaType = isVideo ? "VIDEO" : "IMAGE";
  }

  // SocialAccount
  const socialAccount = await prisma.socialAccount.findFirst({
    where: { tenantId: job.tenantId, network: network as any, status: "connected" },
    select: { id: true, externalAccountId: true, scopes: true },
    orderBy: { updatedAt: "desc" },
  });

  const targetId = socialAccount?.externalAccountId;
  if (!targetId) {
    return { kind: "blocked", reason: `${network} account missing external account ID. Reconnect via OAuth.` };
  }

  const hasRequiredScope = publisher.requiredScopes.every(
    (s) => socialAccount.scopes.includes(s) || socialAccount.scopes.includes(s.replace("instagram_business_", ""))
  );
  if (!hasRequiredScope) {
    return { kind: "blocked", reason: `${network} account is missing required publish scopes.` };
  }

  // Credential resolution via shared resolver
  const credentialResolution = await resolveAndDecryptOAuthCredential({
    tenantId: job.tenantId,
    provider: network,
    socialAccountId: socialAccount.id,
    credentialLabel: publisher.credentialLabel,
  });

  if (!credentialResolution.ok) {
    return { kind: "blocked", reason: `${network} credential: ${credentialResolution.error}` };
  }

  const accessToken = credentialResolution.accessToken;

  const publishInput: PublishInput = {
    targetId,
    accessToken,
    mediaUrl,
    caption: draft.caption || draft.title,
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
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const slot = searchParams.get("slot") ?? "??";
  const nowUtc = new Date();

  const due = await prisma.publishingJob.findMany({
    where: {
      status: "SCHEDULED",
      scheduledFor: { lte: nowUtc },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { scheduledFor: "asc" },
    take: BATCH_LIMIT,
    include: {
      ContentDraft: { select: { id: true, title: true, network: true, caption: true, format: true } },
      Tenant: { select: { slug: true } },
    },
  });

  const jobs: JobRecord[] = due.map((j) => ({
    id: j.id,
    tenantId: j.tenantId,
    postId: j.postId,
    provider: j.provider,
    scheduledFor: j.scheduledFor,
    attempts: j.attempts,
    draft: j.ContentDraft
      ? { id: j.ContentDraft.id, title: j.ContentDraft.title, network: j.ContentDraft.network, caption: j.ContentDraft.caption, format: j.ContentDraft.format }
      : null,
    tenant: { slug: j.Tenant.slug },
  }));

  let published = 0;
  let failed = 0;
  let skipped = 0;
  const results: string[] = [];

  for (const job of jobs) {
    try {
      const claimed = await prisma.publishingJob.updateMany({
        where: { id: job.id, status: "SCHEDULED" },
        data: { status: "IN_REVIEW", attempts: { increment: 1 } },
      });

      if (claimed.count === 0) {
        skipped++;
        results.push(`SKIP ${job.id}: already claimed by another process`);
        continue;
      }

      const outcome = await tryRealPublish(job);

      if (outcome.kind === "success") {
        published++;
        results.push(`OK ${job.id}: published (${job.provider}) externalId=${outcome.externalPostId}`);

        const finalizeResult = await commitConfirmedPublication(prisma, {
          jobId: job.id,
          draftId: job.postId ?? "",
          tenantId: job.tenantId,
          network: job.provider,
          externalPostId: outcome.externalPostId,
          providerResponse: outcome.providerResponse,
        });

        if (finalizeResult.committed) {
          try {
            await auditLog({
              tenantId: job.tenantId,
              actorId: "system",
              action: "auto_publish_live",
              target: `draft:${job.postId}`,
              metadata: {
                title: job.draft?.title ?? "untitled",
                network: job.provider,
                externalPostId: outcome.externalPostId,
                scheduledFor: job.scheduledFor,
              },
            });
          } catch {}
        } else {
          try {
            await auditLog({
              tenantId: job.tenantId,
              actorId: "system",
              action: "auto_publish_live_reconciliation_needed",
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
        }
      } else if (outcome.kind === "ambiguous") {
        failed++;
        const msg = outcome.error;
        results.push(`AMBIGUOUS ${job.id}: ${msg}`);
        try {
          await auditLog({
            tenantId: job.tenantId,
            actorId: "system",
            action: "auto_publish_ambiguous",
            target: `draft:${job.postId}`,
            metadata: { title: job.draft?.title ?? "untitled", network: job.provider, error: msg.slice(0, 500) },
          });
        } catch {}
      } else if (outcome.kind === "attempted") {
        failed++;
        const msg = outcome.error;
        results.push(`FAIL ${job.id}: ${msg}`);

        const existingResult = await prisma.publishingResult.findUnique({
          where: { jobId: job.id },
          select: { ok: true, externalPostId: true },
        });

        const alreadyHasSuccess = hasDurableProviderSuccess({
          resultOk: existingResult?.ok,
          resultExternalPostId: existingResult?.externalPostId,
          draftExternalPostId: job.draft?.title ? undefined : undefined,
        });

        if (!alreadyHasSuccess) {
          await prisma.$transaction(async (tx) => {
            await recordUnconfirmedProviderFailure({
              tx,
              jobId: job.id,
              draftId: job.postId ?? "",
              tenantId: job.tenantId,
              network: job.provider,
              errorMsg: msg,
              isMaxAttempts: job.attempts + 1 >= MAX_ATTEMPTS,
            });
          });
        }

        if (job.postId && job.draft) {
          try {
            await prisma.contentDraft.update({
              where: { id: job.postId },
              data: { status: "FAILED" },
            });
          } catch { /* best-effort */ }
        }
      } else {
        // kind === "blocked" — preflight failure
        failed++;
        const msg = outcome.reason;
        results.push(`BLOCKED ${job.id}: ${msg}`);

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
              errorMsg: msg,
              isMaxAttempts: job.attempts + 1 >= MAX_ATTEMPTS,
            });
          });
        }
      }
    } catch (err) {
      failed++;
      const msg = (err as Error).message;
      results.push(`FAIL ${job.id}: ${msg}`);

      const existingResult = await prisma.publishingResult.findUnique({
        where: { jobId: job.id },
        select: { ok: true, externalPostId: true },
      });

      const alreadyHasSuccess = hasDurableProviderSuccess({
        resultOk: existingResult?.ok,
        resultExternalPostId: existingResult?.externalPostId,
      });

      if (!alreadyHasSuccess) {
        await prisma.$transaction(async (tx) => {
          await recordUnconfirmedProviderFailure({
            tx,
            jobId: job.id,
            draftId: job.postId ?? "",
            tenantId: job.tenantId,
            network: job.provider,
            errorMsg: msg,
            isMaxAttempts: job.attempts + 1 >= MAX_ATTEMPTS,
          });
        });
      }
    }
  }

  const logEntry = {
    timestamp: nowUtc.toISOString(),
    slot,
    due: jobs.length,
    published,
    failed,
    skipped,
    results,
  };

  console.log(`[CRON] slot=${slot} due=${jobs.length} ok=${published} fail=${failed} skip=${skipped}`);

  return NextResponse.json({ ok: true, ...logEntry });
}
