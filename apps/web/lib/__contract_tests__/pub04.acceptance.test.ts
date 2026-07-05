import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  type Pub04Context,
  type Pub04CronDeps,
  type Pub04CronInput,
  type Pub04Job,
  type Pub04Publisher,
  type Pub04ScheduleRepository,
} from "../../../../contracts/S-HC-PUB-04/pub04-contract.js";
import { executePublishingCron } from "../publishing-cron-executor.js";
import { schedulePublication } from "../publishing-scheduler-service.js";

const NOW = new Date("2026-06-26T12:30:00.000Z");

function baseJob(overrides: Partial<Pub04Job> = {}): Pub04Job {
  return {
    id: "job-1",
    tenantId: "tenant-1",
    postId: "draft-1",
    provider: "FACEBOOK",
    status: "SCHEDULED",
    scheduledFor: new Date("2026-06-26T12:00:00.000Z"),
    attempts: 0,
    claimedAt: null,
    claimToken: null,
    providerAttemptStartedAt: null,
    ...overrides,
  };
}

function baseContext(job: Pub04Job, overrides: Partial<Pub04Context> = {}): Pub04Context {
  return {
    job,
    tenant: {
      id: "tenant-1",
      status: "ACTIVE",
      automationMode: "AUTOPILOT_FULL",
    },
    draft: {
      id: "draft-1",
      tenantId: "tenant-1",
      status: "SCHEDULED",
      network: "FACEBOOK",
      format: "FACEBOOK_FEED",
      caption: "caption",
      title: "title",
      externalPostId: null,
      socialAccountId: "account-fixed",
      assets: [{ kind: "IMAGE", publicUrl: "https://cdn.example.test/image.jpg" }],
    },
    socialAccounts: [
      {
        id: "account-fixed",
        tenantId: "tenant-1",
        network: "FACEBOOK",
        status: "connected",
        scopes: ["pages_manage_posts"],
        externalAccountId: "page-1",
        updatedAt: new Date("2026-06-26T10:00:00.000Z"),
      },
    ],
    durableResult: null,
    publishedCountOnNetwork: 0,
    trialLimit: 5,
    ...overrides,
  };
}

type PublisherMode = "success" | "retryable" | "terminal" | "ambiguous";

function makeHarness(options: {
  jobs?: Pub04Job[];
  contexts?: Map<string, Pub04Context>;
  publisherMode?: PublisherMode;
  invalidateTokenAfterClaim?: boolean;
  finalizeMode?: "committed" | "reconciliation_required";
  credentialOk?: boolean;
  nowSequence?: Date[];
} = {}) {
  const jobs = options.jobs ?? [baseJob()];
  const contexts =
    options.contexts ??
    new Map(jobs.map((job) => [job.id, baseContext(job)]));
  const writes: string[] = [];
  const publisherCalls: Array<{ accountId: string; jobId: string }> = [];
  let tokenCounter = 0;
  let nowIndex = 0;

  const publisher: Pub04Publisher = {
    textOnly: false,
    supportedFormats: [
      "FACEBOOK_FEED",
      "FACEBOOK_STORY",
      "FACEBOOK_REEL",
      "INSTAGRAM_FEED",
      "INSTAGRAM_STORY",
      "INSTAGRAM_REEL",
    ],
    requiredScopes: ["pages_manage_posts"],
    async publish() {
      const mode = options.publisherMode ?? "success";
      if (mode === "success") {
        return {
          kind: "success",
          externalPostId: "external-1",
          providerResponse: { ok: true },
        };
      }
      if (mode === "ambiguous") return { kind: "ambiguous", error: "timeout" };
      if (mode === "terminal") return { kind: "terminal_failure", error: "bad request" };
      return { kind: "retryable_failure", error: "temporary failure" };
    },
  };

  function findJob(id: string): Pub04Job {
    const job = jobs.find((item) => item.id === id);
    if (!job) throw new Error(`Missing fake job ${id}`);
    return job;
  }

  const deps: Pub04CronDeps = {
    repo: {
      async listCandidates({ now, limit }) {
        return jobs
          .filter((job) => job.scheduledFor <= now)
          .filter((job) => job.status === "SCHEDULED" || job.status === "IN_REVIEW")
          .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
          .slice(0, limit);
      },
      async countDue({ now }) {
        return jobs.filter((job) => job.scheduledFor <= now)
          .filter((job) => job.status === "SCHEDULED" || job.status === "IN_REVIEW")
          .length;
      },
      async loadContext(jobId) {
        return contexts.get(jobId) ?? null;
      },
      async claimScheduled({ jobId, claimToken, now }) {
        const job = findJob(jobId);
        if (job.status !== "SCHEDULED") return false;
        job.status = "IN_REVIEW";
        job.claimToken = claimToken;
        job.claimedAt = now;
        writes.push("claimScheduled");
        if (options.invalidateTokenAfterClaim) job.claimToken = "stolen-token";
        return true;
      },
      async reclaimExpiredPreProvider({ jobId, claimToken, now, leaseTtlMs }) {
        const job = findJob(jobId);
        if (
          job.status !== "IN_REVIEW" ||
          job.providerAttemptStartedAt ||
          !job.claimedAt ||
          now.getTime() - job.claimedAt.getTime() <= leaseTtlMs
        ) return false;
        job.claimToken = claimToken;
        job.claimedAt = now;
        writes.push("reclaimExpiredPreProvider");
        return true;
      },
      async markProviderAttemptStarted({ jobId, claimToken, now }) {
        const job = findJob(jobId);
        if (job.status !== "IN_REVIEW" || job.claimToken !== claimToken) return false;
        job.providerAttemptStartedAt = now;
        job.attempts += 1;
        writes.push("markProviderAttemptStarted");
        publisherCalls.push({ accountId: "pending", jobId });
        return true;
      },
      async recordPreProviderBlock({ jobId, claimToken, terminal }) {
        const job = findJob(jobId);
        if (job.claimToken !== claimToken) return;
        job.status = terminal ? "FAILED" : "SCHEDULED";
        job.claimToken = null;
        job.claimedAt = null;
        writes.push("recordPreProviderBlock");
      },
      async recordProviderFailure({ jobId, claimToken, retryable, maxAttempts }) {
        const job = findJob(jobId);
        if (job.claimToken !== claimToken) return;
        const canRetry = retryable && job.attempts < maxAttempts;
        job.status = canRetry ? "SCHEDULED" : "FAILED";
        job.claimToken = null;
        job.claimedAt = null;
        job.providerAttemptStartedAt = null;
        const ctx = contexts.get(jobId);
        if (ctx?.draft) ctx.draft.status = canRetry ? "SCHEDULED" : "FAILED";
        writes.push("recordProviderFailure");
      },
      async markReconciliation({ jobId }) {
        const job = findJob(jobId);
        job.status = "IN_REVIEW";
        writes.push("markReconciliation");
      },
      async finalizeSuccess({ jobId, claimToken }) {
        const job = findJob(jobId);
        if (job.claimToken !== claimToken) return "reconciliation_required";
        if (options.finalizeMode === "reconciliation_required") {
          writes.push("finalizeSuccess:reconciliation");
          return "reconciliation_required";
        }
        job.status = "PUBLISHED";
        const ctx = contexts.get(jobId);
        if (ctx?.draft) {
          ctx.draft.status = "PUBLISHED";
          ctx.draft.externalPostId = "external-1";
        }
        writes.push("finalizeSuccess");
        return "committed";
      },
      async reconcileDurableSuccess({ jobId, externalPostId }) {
        const job = findJob(jobId);
        const ctx = contexts.get(jobId);
        if (ctx?.draft?.externalPostId && ctx.draft.externalPostId !== externalPostId) {
          return "conflict";
        }
        job.status = "PUBLISHED";
        if (ctx?.draft) {
          ctx.draft.status = "PUBLISHED";
          ctx.draft.externalPostId = externalPostId;
        }
        writes.push("reconcileDurableSuccess");
        return "committed";
      },
    },
    getPublisher() {
      return publisher;
    },
    async resolveCredential({ socialAccountId }) {
      if (options.credentialOk === false) return { ok: false, code: "NO_CREDENTIAL" };
      publisherCalls.push({ accountId: socialAccountId, jobId: "credential" });
      return { ok: true, accessToken: "test-token", targetId: "page-1" };
    },
    now() {
      const sequence = options.nowSequence;
      if (sequence && sequence.length > 0) {
        const value = sequence[Math.min(nowIndex, sequence.length - 1)];
        nowIndex += 1;
        return new Date(value);
      }
      return new Date(NOW);
    },
    newClaimToken() {
      tokenCounter += 1;
      return `claim-${tokenCounter}`;
    },
  };

  return { deps, jobs, contexts, writes, publisherCalls };
}

const input: Pub04CronInput = {
  dryRun: false,
  batchLimit: 20,
  timeBudgetMs: 50_000,
  leaseTtlMs: 300_000,
  maxAttempts: 3,
};

describe("PUB-04 immutable acceptance contract", () => {
  it("dry-run uses real context but performs no writes and never reports PUBLISHED", async () => {
    const h = makeHarness();
    const result = await executePublishingCron({ ...input, dryRun: true }, h.deps);
    assert.deepEqual(h.writes, []);
    assert.equal(h.jobs[0].attempts, 0);
    assert.equal(h.publisherCalls.filter((x) => x.jobId !== "credential").length, 0);
    assert.equal(result.summary.published, 0);
    assert.equal(result.outcomes[0]?.code, "DRY_RUN_ELIGIBLE");
  });

  it("missing required asset blocks before provider and does not increment attempts", async () => {
    const job = baseJob();
    const ctx = baseContext(job);
    ctx.draft!.assets = [];
    const h = makeHarness({ jobs: [job], contexts: new Map([[job.id, ctx]]) });
    const result = await executePublishingCron(input, h.deps);
    assert.equal(job.attempts, 0);
    assert.equal(h.publisherCalls.filter((x) => x.jobId === job.id).length, 0);
    assert.equal(result.outcomes[0]?.code, "PRE_PROVIDER_BLOCKED");
  });

  it("missing credential blocks before provider and does not increment attempts", async () => {
    const h = makeHarness({ credentialOk: false });
    const result = await executePublishingCron(input, h.deps);
    assert.equal(h.jobs[0].attempts, 0);
    assert.equal(h.publisherCalls.filter((x) => x.jobId === h.jobs[0].id).length, 0);
    assert.equal(result.outcomes[0]?.code, "PRE_PROVIDER_BLOCKED");
  });

  it("missing scopes blocks before provider and does not increment attempts", async () => {
    const job = baseJob();
    const ctx = baseContext(job);
    ctx.socialAccounts[0].scopes = [];
    const h = makeHarness({ jobs: [job], contexts: new Map([[job.id, ctx]]) });
    await executePublishingCron(input, h.deps);
    assert.equal(job.attempts, 0);
    assert.equal(h.publisherCalls.filter((x) => x.jobId === job.id).length, 0);
  });

  it("a fixed socialAccountId never falls back to another account", async () => {
    const job = baseJob();
    const ctx = baseContext(job);
    ctx.draft!.socialAccountId = "missing-fixed";
    ctx.socialAccounts = [{
      id: "fallback-account",
      tenantId: "tenant-1",
      network: "FACEBOOK",
      status: "connected",
      scopes: ["pages_manage_posts"],
      externalAccountId: "page-fallback",
      updatedAt: NOW,
    }];
    const h = makeHarness({ jobs: [job], contexts: new Map([[job.id, ctx]]) });
    await executePublishingCron(input, h.deps);
    assert.equal(job.attempts, 0);
    assert.equal(
      h.publisherCalls.some((x) => x.accountId === "fallback-account"),
      false,
    );
  });

  it("Instagram Story can execute live", async () => {
    const job = baseJob({ provider: "INSTAGRAM" });
    const ctx = baseContext(job);
    ctx.draft!.network = "INSTAGRAM";
    ctx.draft!.format = "INSTAGRAM_STORY";
    ctx.socialAccounts[0].network = "INSTAGRAM";
    const h = makeHarness({ jobs: [job], contexts: new Map([[job.id, ctx]]) });
    const result = await executePublishingCron(input, h.deps);
    assert.equal(job.attempts, 1);
    assert.equal(result.outcomes[0]?.code, "PUBLISHED");
  });

  it("Facebook Reel can execute live", async () => {
    const job = baseJob({ provider: "FACEBOOK" });
    const ctx = baseContext(job);
    ctx.draft!.network = "FACEBOOK";
    ctx.draft!.format = "FACEBOOK_REEL";
    ctx.draft!.assets = [{ kind: "VIDEO", publicUrl: "https://cdn.example.test/reel.mp4" }];
    const h = makeHarness({ jobs: [job], contexts: new Map([[job.id, ctx]]) });
    const result = await executePublishingCron(input, h.deps);
    assert.equal(job.attempts, 1);
    assert.equal(result.outcomes[0]?.code, "PUBLISHED");
  });

  it("a real provider call increments attempts exactly once and finalizes success", async () => {
    const h = makeHarness();
    const result = await executePublishingCron(input, h.deps);
    assert.equal(h.jobs[0].attempts, 1);
    assert.equal(h.writes.filter((x) => x === "markProviderAttemptStarted").length, 1);
    assert.equal(h.writes.filter((x) => x === "finalizeSuccess").length, 1);
    assert.equal(result.summary.published, 1);
    assert.equal(result.outcomes[0]?.code, "PUBLISHED");
  });

  it("a lost claim token prevents provider call and finalization", async () => {
    const h = makeHarness({ invalidateTokenAfterClaim: true });
    const result = await executePublishingCron(input, h.deps);
    assert.equal(h.jobs[0].attempts, 0);
    assert.equal(h.writes.includes("finalizeSuccess"), false);
    assert.equal(result.outcomes[0]?.code, "SKIPPED_CLAIM_LOST");
  });

  it("an expired pre-provider lease is reclaimed and can publish", async () => {
    const old = new Date(NOW.getTime() - 600_000);
    const job = baseJob({
      status: "IN_REVIEW",
      claimedAt: old,
      claimToken: "old-token",
      providerAttemptStartedAt: null,
    });
    const h = makeHarness({ jobs: [job], contexts: new Map([[job.id, baseContext(job)]]) });
    const result = await executePublishingCron(input, h.deps);
    assert.equal(h.writes.includes("reclaimExpiredPreProvider"), true);
    assert.equal(result.outcomes[0]?.code, "PUBLISHED");
  });

  it("an expired post-provider lease is never automatically retried", async () => {
    const old = new Date(NOW.getTime() - 600_000);
    const job = baseJob({
      status: "IN_REVIEW",
      claimedAt: old,
      claimToken: "old-token",
      providerAttemptStartedAt: old,
      attempts: 1,
    });
    const h = makeHarness({ jobs: [job], contexts: new Map([[job.id, baseContext(job)]]) });
    const result = await executePublishingCron(input, h.deps);
    assert.equal(job.attempts, 1);
    assert.equal(h.writes.includes("reclaimExpiredPreProvider"), false);
    assert.equal(result.outcomes[0]?.code, "RECONCILIATION_REQUIRED");
  });

  it("a retryable provider failure leaves job and draft compatible with the next cron", async () => {
    const h = makeHarness({ publisherMode: "retryable" });
    const first = await executePublishingCron(input, h.deps);
    assert.equal(first.outcomes[0]?.code, "RETRYABLE_FAILURE");
    assert.equal(h.jobs[0].status, "SCHEDULED");
    assert.equal(h.contexts.get(h.jobs[0].id)!.draft!.status, "SCHEDULED");
    const second = await executePublishingCron(input, h.deps);
    assert.equal(h.jobs[0].attempts, 2);
    assert.equal(second.outcomes[0]?.code, "RETRYABLE_FAILURE");
  });

  it("an ambiguous provider result requires reconciliation and is not published", async () => {
    const h = makeHarness({ publisherMode: "ambiguous" });
    const result = await executePublishingCron(input, h.deps);
    assert.equal(result.summary.published, 0);
    assert.equal(result.summary.reconciliationRequired, 1);
    assert.equal(result.outcomes[0]?.code, "RECONCILIATION_REQUIRED");
  });

  it("durable success is reconciled locally without a second provider call", async () => {
    const job = baseJob();
    const ctx = baseContext(job, {
      durableResult: { ok: true, externalPostId: "durable-external" },
    });
    const h = makeHarness({ jobs: [job], contexts: new Map([[job.id, ctx]]) });
    const result = await executePublishingCron(input, h.deps);
    assert.equal(job.attempts, 0);
    assert.equal(h.writes.includes("reconcileDurableSuccess"), true);
    assert.equal(result.outcomes[0]?.code, "PUBLISHED");
  });

  it("max-attempt jobs never make another provider call", async () => {
    const job = baseJob({ attempts: 3 });
    const h = makeHarness({ jobs: [job], contexts: new Map([[job.id, baseContext(job)]]) });
    const result = await executePublishingCron(input, h.deps);
    assert.equal(job.attempts, 3);
    assert.equal(result.outcomes[0]?.code, "SKIPPED_MAX_ATTEMPTS");
  });

  it("remainingDue includes jobs outside the selected batch", async () => {
    const jobs = [
      baseJob({ id: "job-1", postId: "draft-1" }),
      baseJob({ id: "job-2", postId: "draft-2", scheduledFor: new Date("2026-06-26T11:00:00Z") }),
      baseJob({ id: "job-3", postId: "draft-3", scheduledFor: new Date("2026-06-26T10:00:00Z") }),
    ];
    const contexts = new Map(jobs.map((job) => [job.id, baseContext(job, {
      draft: { ...baseContext(job).draft!, id: job.postId },
    })]));
    const h = makeHarness({ jobs, contexts });
    const result = await executePublishingCron({ ...input, batchLimit: 1 }, h.deps);
    assert.equal(result.summary.totalDue, 3);
    assert.equal(result.summary.selected, 1);
    assert.equal(result.summary.remainingDue, 2);
  });

  it("provider-confirmed but locally uncommitted success is reconciliation, not published", async () => {
    const h = makeHarness({ finalizeMode: "reconciliation_required" });
    const result = await executePublishingCron(input, h.deps);
    assert.equal(result.summary.published, 0);
    assert.equal(result.summary.reconciliationRequired, 1);
  });
});

describe("PUB-04 deterministic scheduling contract", () => {
  function makeScheduleRepo(): Pub04ScheduleRepository & { records: Map<string, string> } {
    const records = new Map<string, string>();
    return {
      records,
      async scheduleAtomic(input) {
        const existing = records.get(input.jobId);
        if (existing) return { jobId: input.jobId, status: "existing" };
        await Promise.resolve();
        if (records.has(input.jobId)) return { jobId: input.jobId, status: "existing" };
        records.set(input.jobId, input.draftId);
        return { jobId: input.jobId, status: "created" };
      },
    };
  }

  it("identical scheduling returns the same deterministic job", async () => {
    const repo = makeScheduleRepo();
    const request = {
      tenantId: "tenant-1",
      draftId: "draft-1",
      network: "FACEBOOK",
      scheduledFor: new Date("2026-06-27T10:00:00Z"),
    };
    const first = await schedulePublication(request, repo);
    const second = await schedulePublication(request, repo);
    assert.equal(first.jobId, second.jobId);
    assert.equal(first.status, "created");
    assert.equal(second.status, "existing");
    assert.equal(repo.records.size, 1);
  });

  it("concurrent identical scheduling creates one job", async () => {
    const repo = makeScheduleRepo();
    const request = {
      tenantId: "tenant-1",
      draftId: "draft-1",
      network: "FACEBOOK",
      scheduledFor: new Date("2026-06-27T10:00:00Z"),
    };
    const [a, b] = await Promise.all([
      schedulePublication(request, repo),
      schedulePublication(request, repo),
    ]);
    assert.equal(a.jobId, b.jobId);
    assert.equal(repo.records.size, 1);
    assert.deepEqual(new Set([a.status, b.status]), new Set(["created", "existing"]));
  });

  it("invalid scheduledFor is rejected before repository mutation", async () => {
    const repo = makeScheduleRepo();
    await assert.rejects(
      schedulePublication({
        tenantId: "tenant-1",
        draftId: "draft-1",
        network: "FACEBOOK",
        scheduledFor: new Date("invalid"),
      }, repo),
      /INVALID_SCHEDULED_AT/,
    );
    assert.equal(repo.records.size, 0);
  });
});
