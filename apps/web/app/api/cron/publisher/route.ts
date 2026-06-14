import { NextResponse } from "next/server";
import path from "node:path";
import { prisma } from "../../../../lib/prisma";
import { auditLog } from "../../../../lib/audit";
import { decryptJson } from "../../../../lib/token-vault";
import { publishInstagramMedia } from "../../../../lib/instagram-publisher";

export const dynamic = "force-dynamic";

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
  | { kind: "attempted"; error: string };

function resolveAssetFileName(asset: { storageKey?: string | null; sourcePath?: string | null; filename: string }): string {
  if (asset.storageKey) return path.basename(asset.storageKey);
  if (asset.sourcePath) return path.basename(asset.sourcePath);
  return asset.filename;
}

function buildPublicAssetUrl(tenantSlug: string, assetFileName: string): string | null {
  const base =
    process.env.APP_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    null;

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

  return `${origin}/api/tenant-assets/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(assetFileName)}`;
}

async function tryRealPublish(job: JobRecord): Promise<PublishOutcome> {
  if (job.provider !== "INSTAGRAM") {
    return { kind: "blocked", reason: `Provider ${job.provider} is not implemented for live publishing. Only INSTAGRAM is supported.` };
  }

  if (!job.draft) {
    return { kind: "blocked", reason: "Draft not found or not linked to this job." };
  }

  const draft = await prisma.contentDraft.findFirst({
    where: { id: job.draft.id, tenantId: job.tenantId },
    include: { assets: { include: { asset: true } } },
  });

  if (!draft || draft.assets.length === 0) {
    return { kind: "blocked", reason: "Draft has no linked assets." };
  }

  const primaryAsset = draft.assets.find((a) => a.role === "primary") ?? draft.assets[0];
  const assetFileName = resolveAssetFileName(primaryAsset.asset);

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

  const mediaUrl = buildPublicAssetUrl(tenantSlug, assetFileName);
  if (!mediaUrl) {
    return { kind: "blocked", reason: "Cannot construct public HTTPS asset URL. Set APP_PUBLIC_URL or NEXT_PUBLIC_APP_URL." };
  }

  // Look up most recent credential
  const credential = await prisma.credentialVaultItem.findFirst({
    where: { tenantId: job.tenantId, provider: "INSTAGRAM", label: "instagram_oauth" },
    select: { id: true, encryptedBlob: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (!credential || (credential.expiresAt && credential.expiresAt < new Date())) {
    return { kind: "blocked", reason: "No valid Instagram credential in vault. Reconnect via OAuth." };
  }

  let accessToken: string;
  try {
    const decrypted = decryptJson<{ access_token: string }>(credential.encryptedBlob);
    accessToken = decrypted.access_token;
    if (!accessToken) throw new Error("missing access_token");
  } catch {
    return { kind: "blocked", reason: "Failed to decrypt Instagram credential." };
  }

  const socialAccount = await prisma.socialAccount.findFirst({
    where: { tenantId: job.tenantId, network: "INSTAGRAM" },
    select: { externalAccountId: true, scopes: true },
  });

  const igUserId = socialAccount?.externalAccountId;
  if (!igUserId) {
    return { kind: "blocked", reason: "Instagram account missing external account ID. Reconnect via OAuth." };
  }

  const hasPublishScope = socialAccount.scopes.includes("instagram_business_content_publish") || socialAccount.scopes.includes("content_publish");
  if (!hasPublishScope) {
    return { kind: "blocked", reason: "Instagram account is missing publish scope (instagram_business_content_publish)." };
  }

  const isVideo = primaryAsset.asset.kind === "VIDEO";
  const mediaType = isVideo ? "VIDEO" as const : "IMAGE" as const;

  try {
    const result = await publishInstagramMedia({
      igUserId,
      accessToken,
      mediaUrl,
      caption: draft.caption || draft.title,
      mediaType,
    });
    return { kind: "success", externalPostId: result.externalPostId, providerResponse: result.providerResponse };
  } catch (err) {
    return { kind: "attempted", error: err instanceof Error ? err.message : "Instagram publish failed" };
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
        data: { status: "PUBLISHED", attempts: { increment: 1 } },
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

        await prisma.publishingResult.upsert({
          where: { jobId: job.id },
          update: {
            ok: true,
            externalPostId: outcome.externalPostId,
            response: outcome.providerResponse as any,
          },
          create: {
            id: `pr_${job.id}`,
            jobId: job.id,
            provider: job.provider as any,
            externalPostId: outcome.externalPostId,
            ok: true,
            response: outcome.providerResponse as any,
          },
        });

        await prisma.publishingJob.updateMany({
          where: { id: job.id },
          data: { status: "PUBLISHED" },
        });

        if (job.postId && job.draft) {
          await prisma.contentDraft.update({
            where: { id: job.postId },
            data: {
              status: "PUBLISHED",
              publishedAt: new Date(),
              externalPostId: outcome.externalPostId,
            },
          });
        }

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
      } else if (outcome.kind === "attempted") {
        failed++;
        const msg = outcome.error;
        results.push(`FAIL ${job.id}: ${msg}`);

        await prisma.publishingResult.upsert({
          where: { jobId: job.id },
          update: { ok: false, response: { error: msg } as any },
          create: {
            id: `pr_${job.id}`,
            jobId: job.id,
            provider: job.provider as any,
            ok: false,
            response: { error: msg },
          },
        });

        const nextStatus = job.attempts + 1 >= MAX_ATTEMPTS ? "FAILED" : "SCHEDULED";
        await prisma.publishingJob.updateMany({
          where: { id: job.id },
          data: { status: nextStatus, lastError: msg.slice(0, 500) },
        });

        if (job.postId && job.draft) {
          try {
            await prisma.contentDraft.update({
              where: { id: job.postId },
              data: { status: "FAILED" },
            });
          } catch { /* best-effort */ }
        }
      } else {
        // kind === "blocked" — preflight failure, do NOT mark draft FAILED
        failed++;
        const msg = outcome.reason;
        results.push(`BLOCKED ${job.id}: ${msg}`);

        await prisma.publishingResult.upsert({
          where: { jobId: job.id },
          update: { ok: false, response: { error: msg } as any },
          create: {
            id: `pr_${job.id}`,
            jobId: job.id,
            provider: job.provider as any,
            ok: false,
            response: { error: msg },
          },
        });

        const nextStatus = job.attempts + 1 >= MAX_ATTEMPTS ? "FAILED" : "SCHEDULED";
        await prisma.publishingJob.updateMany({
          where: { id: job.id },
          data: { status: nextStatus, lastError: msg.slice(0, 500) },
        });
      }
    } catch (err) {
      failed++;
      const msg = (err as Error).message;
      results.push(`FAIL ${job.id}: ${msg}`);

      const nextStatus = job.attempts + 1 >= MAX_ATTEMPTS ? "FAILED" : "SCHEDULED";
      await prisma.publishingJob.updateMany({
        where: { id: job.id },
        data: {
          status: nextStatus,
          attempts: job.attempts + 1,
          lastError: msg.slice(0, 500),
        },
      });
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
