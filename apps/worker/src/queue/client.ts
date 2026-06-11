import { Queue, type JobsOptions } from "bullmq";
import type { PublishDraftJob, ValidateAssetsJob, TestModeJob, CampaignJob, QueueStats } from "./types.js";

function redisUrl(): string {
  return process.env.REDIS_URL || process.env.REDISCLOUD_URL || "redis://localhost:6379";
}

const connection = { url: redisUrl() };

const defaultJobOpts: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: { age: 3600 * 24 },
  removeOnFail: { age: 3600 * 24 * 7 },
};

const _publishQueue = new Queue<PublishDraftJob>("heptacore-publish", {
  connection,
  defaultJobOptions: defaultJobOpts,
});

const _validateQueue = new Queue<ValidateAssetsJob>("heptacore-validate", {
  connection,
  defaultJobOptions: defaultJobOpts,
});

const _testQueue = new Queue<TestModeJob>("heptacore-test", {
  connection,
  defaultJobOptions: defaultJobOpts,
});

const _campaignQueue = new Queue<CampaignJob>("heptacore-campaign", {
  connection,
  defaultJobOptions: defaultJobOpts,
});

export const publishQueue = _publishQueue;
export const validateQueue = _validateQueue;
export const testQueue = _testQueue;
export const campaignQueue = _campaignQueue;

export async function getQueueStats() {
  const [pub, val, tst, camp] = await Promise.all([
    _publishQueue.getJobCounts(),
    _validateQueue.getJobCounts(),
    _testQueue.getJobCounts(),
    _campaignQueue.getJobCounts(),
  ]);
  return {
    publish: pub as unknown as QueueStats,
    validate: val as unknown as QueueStats,
    test: tst as unknown as QueueStats,
    campaign: camp as unknown as QueueStats,
  };
}

export async function closeQueues(): Promise<void> {
  await Promise.all([
    _publishQueue.close(),
    _validateQueue.close(),
    _testQueue.close(),
    _campaignQueue.close(),
  ]);
}
