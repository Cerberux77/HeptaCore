import assert from "node:assert/strict";
import test from "node:test";
import { executePublishingCron } from "../publishing-cron-executor.js";
import type { Pub04CronDeps, Pub04Context, Pub04Job, Pub04Publisher } from "../../../../contracts/S-HC-PUB-04/pub04-contract.js";

function makeJob(): Pub04Job {
  return {
    id: "job-youtube-short-1",
    tenantId: "tenant-1",
    postId: "draft-1",
    provider: "YOUTUBE",
    status: "SCHEDULED",
    scheduledFor: new Date("2026-09-10T12:00:00.000Z"),
    attempts: 0,
    claimedAt: null,
    claimToken: null,
    providerAttemptStartedAt: null,
  };
}

function makeContext(job: Pub04Job): Pub04Context {
  return {
    job,
    tenant: { id: "tenant-1", status: "ACTIVE", automationMode: "AUTOPILOT_FULL" },
    draft: {
      id: "draft-1",
      tenantId: "tenant-1",
      status: "SCHEDULED",
      network: "YOUTUBE",
      format: "YOUTUBE_SHORT",
      caption: "Scheduled Shorts description",
      title: "Scheduled Shorts title",
      externalPostId: null,
      socialAccountId: "sa-youtube",
      assets: [
        { kind: "VIDEO", publicUrl: "https://cdn.example.test/short.mp4", role: "primary" },
        { kind: "IMAGE", publicUrl: "https://cdn.example.test/thumb.jpg", role: "thumbnail" },
      ],
    },
    socialAccounts: [{
      id: "sa-youtube",
      tenantId: "tenant-1",
      network: "YOUTUBE",
      status: "connected",
      scopes: ["https://www.googleapis.com/auth/youtube.upload"],
      externalAccountId: "channel-1",
      updatedAt: new Date("2026-09-10T11:00:00.000Z"),
    }],
    durableResult: null,
    publishedCountOnNetwork: 0,
    trialLimit: 10,
  };
}

test("PUB-07 scheduled execution transports YouTube metadata, thumbnail and credential label", async () => {
  const job = makeJob();
  const context = makeContext(job);
  let publishInput: any = null;
  let credentialInput: any = null;

  const publisher: Pub04Publisher = {
    textOnly: false,
    credentialLabel: "youtube_oauth",
    supportedFormats: ["YOUTUBE_VIDEO", "YOUTUBE_SHORT"],
    requiredScopes: ["https://www.googleapis.com/auth/youtube.upload"],
    async publish(input) {
      publishInput = input;
      return { kind: "success", externalPostId: "yt-real-id", providerResponse: { id: "yt-real-id" } };
    },
  };

  const deps: Pub04CronDeps = {
    repo: {
      async listCandidates() { return [job]; },
      async countDue() { return 1; },
      async loadContext() { return context; },
      async claimScheduled() { return true; },
      async reclaimExpiredPreProvider() { return false; },
      async markProviderAttemptStarted() { return true; },
      async recordPreProviderBlock() { throw new Error("unexpected pre-provider block"); },
      async recordProviderFailure() { throw new Error("unexpected provider failure"); },
      async markReconciliation() { throw new Error("unexpected reconciliation"); },
      async finalizeSuccess() { return "committed"; },
      async reconcileDurableSuccess() { return "conflict"; },
    },
    getPublisher(network) { return network === "YOUTUBE" ? publisher : null; },
    async resolveCredential(input) {
      credentialInput = input;
      return { ok: true, accessToken: "token", targetId: "channel-1" };
    },
    now() { return new Date("2026-09-10T12:30:00.000Z"); },
    newClaimToken() { return "claim-1"; },
  };

  const result = await executePublishingCron({
    dryRun: false,
    batchLimit: 20,
    timeBudgetMs: 50000,
    leaseTtlMs: 300000,
    maxAttempts: 3,
  }, deps);

  assert.equal(result.summary.published, 1);
  assert.equal(credentialInput.credentialLabel, "youtube_oauth");
  assert.equal(publishInput.targetId, "channel-1");
  assert.equal(publishInput.mediaUrl, "https://cdn.example.test/short.mp4");
  assert.equal(publishInput.thumbnailUrl, "https://cdn.example.test/thumb.jpg");
  assert.equal(publishInput.mediaType, "VIDEO");
  assert.equal(publishInput.format, "YOUTUBE_SHORT");
  assert.equal(publishInput.title, "Scheduled Shorts title");
  assert.equal(publishInput.description, "Scheduled Shorts description");
});

test("PUB-07 scheduled dry-run recognizes YouTube formats without calling provider", async () => {
  const job = makeJob();
  const context = makeContext(job);
  let providerCalls = 0;
  const publisher: Pub04Publisher = {
    textOnly: false,
    credentialLabel: "youtube_oauth",
    supportedFormats: ["YOUTUBE_VIDEO", "YOUTUBE_SHORT"],
    requiredScopes: ["https://www.googleapis.com/auth/youtube.upload"],
    async publish() {
      providerCalls += 1;
      return { kind: "success", externalPostId: "never", providerResponse: {} };
    },
  };
  const deps: Pub04CronDeps = {
    repo: {
      async listCandidates() { return [job]; },
      async countDue() { return 1; },
      async loadContext() { return context; },
      async claimScheduled() { return false; },
      async reclaimExpiredPreProvider() { return false; },
      async markProviderAttemptStarted() { return false; },
      async recordPreProviderBlock() {},
      async recordProviderFailure() {},
      async markReconciliation() {},
      async finalizeSuccess() { return "reconciliation_required"; },
      async reconcileDurableSuccess() { return "conflict"; },
    },
    getPublisher(network) { return network === "YOUTUBE" ? publisher : null; },
    async resolveCredential() { throw new Error("dry-run must not resolve credentials"); },
    now() { return new Date("2026-09-10T12:30:00.000Z"); },
    newClaimToken() { return "claim-2"; },
  };
  const result = await executePublishingCron({ dryRun: true, batchLimit: 20, timeBudgetMs: 50000, leaseTtlMs: 300000, maxAttempts: 3 }, deps);
  assert.equal(result.outcomes[0]?.code, "DRY_RUN_ELIGIBLE");
  assert.equal(providerCalls, 0);
});
