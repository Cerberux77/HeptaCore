import { Worker } from "bullmq";
import { processPublishDraft, processValidateAssets, processTestMode } from "./processor.js";
import { processCampaign } from "./campaign-processor.js";
import { prisma } from "./prisma.js";
import type { QueueJobResult, CampaignJob } from "./types.js";

const connection = {
  url: process.env.REDIS_URL || process.env.REDISCLOUD_URL || "redis://localhost:6379",
};

export function startWorker(): Worker {
  const worker = new Worker(
    "heptacore-publish",
    async (job) => {
      console.log(
        `[worker] processing publish-draft #${job.id} draft=${job.data.draftId} tenant=${job.data.tenantId}`,
      );
      return processPublishDraft(job.data);
    },
    {
      connection,
      concurrency: 1,
      limiter: { max: 5, duration: 60000 },
    },
  );

  const validateWorker = new Worker(
    "heptacore-validate",
    async (job) => {
      console.log(
        `[worker] processing validate-assets #${job.id} draft=${job.data.draftId}`,
      );
      return processValidateAssets(job.data);
    },
    { connection, concurrency: 2 },
  );

  const testWorker = new Worker(
    "heptacore-test",
    async (job) => {
      console.log(
        `[worker] processing test-mode #${job.id} tenant=${job.data.tenantId}`,
      );
      return processTestMode(job.data);
    },
    { connection, concurrency: 1 },
  );

  const campaignWorker = new Worker(
    "heptacore-campaign",
    async (job) => {
      console.log(
        `[worker] processing campaign #${job.id} name=${job.data.name} budget=${job.data.platformBudget} tenant=${job.data.tenantId}`,
      );
      return processCampaign(job.data as CampaignJob);
    },
    {
      connection,
      concurrency: 1,
      limiter: { max: 3, duration: 60000 },
    },
  );

  worker.on("completed", async (job, result: QueueJobResult) => {
    console.log(`[worker] completed #${job.id} ok=${result.ok}`);
    if (job.data.tenantId) {
      await prisma.auditLog.create({
        data: {
          tenantId: job.data.tenantId,
          action: "job_completed",
          target: `job:${job.id}`,
          metadata: { result } as any,
        },
      });
    }
  });

  worker.on("failed", async (job, error) => {
    console.error(`[worker] failed #${job?.id} attempts=${job?.attemptsMade} error=${error.message}`);
    if (job?.data.tenantId) {
      await prisma.auditLog.create({
        data: {
          tenantId: job.data.tenantId,
          action: "job_failed",
          target: `job:${job?.id}`,
          metadata: {
            error: error.message,
            attempts: job.attemptsMade,
          } as any,
        },
      });
    }
  });

  console.log("[worker] BullMQ workers started");
  console.log("[worker] Queues: heptacore-publish, heptacore-validate, heptacore-test, heptacore-campaign");
  return worker;
}
