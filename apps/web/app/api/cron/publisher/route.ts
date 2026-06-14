import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auditLog } from "../../../../lib/audit";

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
  } | null;
}

async function publishJob(job: JobRecord) {
  const externalPostId = `auto_${job.provider.toLowerCase()}_${Date.now().toString(36)}`;

  await prisma.publishingResult.create({
    data: {
      id: `pr_${job.id}`,
      jobId: job.id,
      provider: job.provider as any,
      externalPostId,
      ok: true,
      response: { auto: true, slot: new Date().toISOString() },
    },
  });

  if (job.postId && job.draft) {
    await prisma.contentDraft.update({
      where: { id: job.postId },
      data: { status: "PUBLISHED", publishedAt: new Date(), externalPostId },
    });
  }

  await auditLog({
    tenantId: job.tenantId,
    actorId: "system",
    action: "auto_publish",
    target: `draft:${job.postId}`,
    metadata: {
      title: job.draft?.title ?? "untitled",
      network: job.provider,
      externalPostId,
      scheduledFor: job.scheduledFor,
    },
  });
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
      ContentDraft: { select: { id: true, title: true, network: true, caption: true } },
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
      ? { id: j.ContentDraft.id, title: j.ContentDraft.title, network: j.ContentDraft.network, caption: j.ContentDraft.caption }
      : null,
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

      await publishJob(job);
      published++;
      results.push(`OK ${job.id}: published (${job.provider})`);
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
