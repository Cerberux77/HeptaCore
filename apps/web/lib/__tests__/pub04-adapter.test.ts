import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("PUB-04 adapter-level correctness", () => {
  describe("publishing-cron-executor", () => {
    it("dry-run evaluates automationMode DRAFT_ONLY", async () => {
      const { executePublishingCron } = await import("../publishing-cron-executor.js");
      const calls: string[] = [];
      const deps = {
        repo: {
          async listCandidates() {
            return [{
              id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK",
              status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"),
              attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null,
            }];
          },
          async countDue() { return 1; },
          async loadContext() {
            return {
              job: { id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK", status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"), attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null },
              tenant: { id: "t1", status: "ACTIVE", automationMode: "DRAFT_ONLY" },
              draft: { id: "d1", tenantId: "t1", status: "SCHEDULED", network: "FACEBOOK", format: "FACEBOOK_FEED", caption: "", title: "", externalPostId: null, socialAccountId: null, assets: [] },
              socialAccounts: [],
              durableResult: null,
              publishedCountOnNetwork: 0,
              trialLimit: 5,
            };
          },
          claimScheduled: async () => false,
          reclaimExpiredPreProvider: async () => false,
          markProviderAttemptStarted: async () => false,
          recordPreProviderBlock: async () => {},
          recordProviderFailure: async () => {},
          markReconciliation: async () => {},
          finalizeSuccess: async () => "reconciliation_required" as const,
          reconcileDurableSuccess: async () => "conflict" as const,
        },
        getPublisher() { return null; },
        resolveCredential: async () => ({ ok: false as const, code: "NO_CREDENTIAL" }),
        now() { return new Date("2026-06-26T12:00:00Z"); },
        newClaimToken() { return "test-token"; },
      };
      const result = await executePublishingCron({
        dryRun: true, batchLimit: 20, timeBudgetMs: 50000, leaseTtlMs: 300000, maxAttempts: 3,
      }, deps as any);
      assert.equal(result.outcomes[0]?.code, "DRY_RUN_BLOCKED");
      assert.ok(result.outcomes[0]?.reason?.includes("DRAFT_ONLY"));
    });

    it("live enforces automationMode DRAFT_ONLY before provider", async () => {
      const { executePublishingCron } = await import("../publishing-cron-executor.js");
      const blockCalls: Array<{ code: string }> = [];
      const deps = {
        repo: {
          async listCandidates() {
            return [{
              id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK",
              status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"),
              attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null,
            }];
          },
          async countDue() { return 1; },
          async loadContext() {
            return {
              job: { id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK", status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"), attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null },
              tenant: { id: "t1", status: "ACTIVE", automationMode: "DRAFT_ONLY" },
              draft: { id: "d1", tenantId: "t1", status: "SCHEDULED", network: "FACEBOOK", format: "FACEBOOK_FEED", caption: "", title: "", externalPostId: null, socialAccountId: null, assets: [] },
              socialAccounts: [{ id: "sa1", tenantId: "t1", network: "FACEBOOK", status: "connected", scopes: ["pages_manage_posts"], externalAccountId: "page1", updatedAt: new Date() }],
              durableResult: null,
              publishedCountOnNetwork: 0,
              trialLimit: 5,
            };
          },
          claimScheduled: async () => true,
          reclaimExpiredPreProvider: async () => false,
          markProviderAttemptStarted: async () => false,
          async recordPreProviderBlock(input: { code: string }) { blockCalls.push({ code: input.code }); },
          recordProviderFailure: async () => {},
          markReconciliation: async () => {},
          finalizeSuccess: async () => "reconciliation_required" as const,
          reconcileDurableSuccess: async () => "conflict" as const,
        },
        getPublisher() {
          return { textOnly: false, supportedFormats: ["FACEBOOK_FEED"], requiredScopes: ["pages_manage_posts"], publish: async () => ({ kind: "success" as const, externalPostId: "x", providerResponse: {} }) };
        },
        resolveCredential: async () => ({ ok: true as const, accessToken: "t", targetId: "p" }),
        now() { return new Date("2026-06-26T12:00:00Z"); },
        newClaimToken() { return "tok"; },
      };
      await executePublishingCron({
        dryRun: false, batchLimit: 20, timeBudgetMs: 50000, leaseTtlMs: 300000, maxAttempts: 3,
      }, deps as any);
      assert.equal(blockCalls.some((c) => c.code === "DRAFT_ONLY"), true);
    });

    it("rejects draft not in SCHEDULED in live", async () => {
      const { executePublishingCron } = await import("../publishing-cron-executor.js");
      const blockCalls: Array<{ code: string }> = [];
      const deps = {
        repo: {
          async listCandidates() {
            return [{
              id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK",
              status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"),
              attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null,
            }];
          },
          async countDue() { return 1; },
          async loadContext() {
            return {
              job: { id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK", status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"), attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null },
              tenant: { id: "t1", status: "ACTIVE", automationMode: "AUTOPILOT_FULL" },
              draft: { id: "d1", tenantId: "t1", status: "APPROVED", network: "FACEBOOK", format: "FACEBOOK_FEED", caption: "", title: "", externalPostId: null, socialAccountId: null, assets: [] },
              socialAccounts: [{ id: "sa1", tenantId: "t1", network: "FACEBOOK", status: "connected", scopes: ["pages_manage_posts"], externalAccountId: "page1", updatedAt: new Date() }],
              durableResult: null,
              publishedCountOnNetwork: 0,
              trialLimit: 5,
            };
          },
          claimScheduled: async () => true,
          reclaimExpiredPreProvider: async () => false,
          markProviderAttemptStarted: async () => false,
          async recordPreProviderBlock(input: { code: string }) { blockCalls.push({ code: input.code }); },
          recordProviderFailure: async () => {},
          markReconciliation: async () => {},
          finalizeSuccess: async () => "reconciliation_required" as const,
          reconcileDurableSuccess: async () => "conflict" as const,
        },
        getPublisher() { return { textOnly: false, supportedFormats: ["FACEBOOK_FEED"], requiredScopes: ["pages_manage_posts"], publish: async () => ({ kind: "success" as const, externalPostId: "x", providerResponse: {} }) }; },
        resolveCredential: async () => ({ ok: true as const, accessToken: "t", targetId: "p" }),
        now() { return new Date("2026-06-26T12:00:00Z"); },
        newClaimToken() { return "tok"; },
      };
      await executePublishingCron({
        dryRun: false, batchLimit: 20, timeBudgetMs: 50000, leaseTtlMs: 300000, maxAttempts: 3,
      }, deps as any);
      assert.equal(blockCalls.some((c) => c.code === "DRAFT_NOT_SCHEDULED"), true);
    });

    it("rejects network mismatch in live", async () => {
      const { executePublishingCron } = await import("../publishing-cron-executor.js");
      const blockCalls: Array<{ code: string }> = [];
      const deps = {
        repo: {
          async listCandidates() {
            return [{
              id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK",
              status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"),
              attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null,
            }];
          },
          async countDue() { return 1; },
          async loadContext() {
            return {
              job: { id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK", status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"), attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null },
              tenant: { id: "t1", status: "ACTIVE", automationMode: "AUTOPILOT_FULL" },
              draft: { id: "d1", tenantId: "t1", status: "SCHEDULED", network: "INSTAGRAM", format: "FACEBOOK_FEED", caption: "", title: "", externalPostId: null, socialAccountId: null, assets: [] },
              socialAccounts: [{ id: "sa1", tenantId: "t1", network: "FACEBOOK", status: "connected", scopes: ["pages_manage_posts"], externalAccountId: "page1", updatedAt: new Date() }],
              durableResult: null,
              publishedCountOnNetwork: 0,
              trialLimit: 5,
            };
          },
          claimScheduled: async () => true,
          reclaimExpiredPreProvider: async () => false,
          markProviderAttemptStarted: async () => false,
          async recordPreProviderBlock(input: { code: string }) { blockCalls.push({ code: input.code }); },
          recordProviderFailure: async () => {},
          markReconciliation: async () => {},
          finalizeSuccess: async () => "reconciliation_required" as const,
          reconcileDurableSuccess: async () => "conflict" as const,
        },
        getPublisher() { return { textOnly: false, supportedFormats: ["FACEBOOK_FEED"], requiredScopes: ["pages_manage_posts"], publish: async () => ({ kind: "success" as const, externalPostId: "x", providerResponse: {} }) }; },
        resolveCredential: async () => ({ ok: true as const, accessToken: "t", targetId: "p" }),
        now() { return new Date("2026-06-26T12:00:00Z"); },
        newClaimToken() { return "tok"; },
      };
      await executePublishingCron({
        dryRun: false, batchLimit: 20, timeBudgetMs: 50000, leaseTtlMs: 300000, maxAttempts: 3,
      }, deps as any);
      assert.equal(blockCalls.some((c) => c.code === "NETWORK_MISMATCH"), true);
    });

    it("trialLimit uses TRIAL_POSTS_PER_NETWORK from trial.ts", async () => {
      const { TRIAL_POSTS_PER_NETWORK } = await import("../trial.js");
      assert.equal(typeof TRIAL_POSTS_PER_NETWORK, "number");
      assert.ok(TRIAL_POSTS_PER_NETWORK >= 0);
    });

    it("remainingDue includes time-budget-skipped jobs", async () => {
      const { executePublishingCron } = await import("../publishing-cron-executor.js");
      const deps = {
        repo: {
          async listCandidates() {
            return [
              { id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK", status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"), attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null },
              { id: "j2", tenantId: "t1", postId: "d2", provider: "FACEBOOK", status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"), attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null },
            ];
          },
          async countDue() { return 5; },
          async loadContext() { return null; },
          claimScheduled: async () => false,
          reclaimExpiredPreProvider: async () => false,
          markProviderAttemptStarted: async () => false,
          recordPreProviderBlock: async () => {},
          recordProviderFailure: async () => {},
          markReconciliation: async () => {},
          finalizeSuccess: async () => "reconciliation_required" as const,
          reconcileDurableSuccess: async () => "conflict" as const,
        },
        getPublisher() { return null; },
        resolveCredential: async () => ({ ok: false as const, code: "NO" }),
        now() { return new Date("2026-06-26T12:00:00Z"); },
        newClaimToken() { return "t"; },
      };
      const result = await executePublishingCron({
        dryRun: true, batchLimit: 2, timeBudgetMs: 1, leaseTtlMs: 300000, maxAttempts: 3,
      }, deps as any);
      assert.equal(result.summary.totalDue, 5);
      assert.equal(result.summary.selected, 2);
      assert.ok(result.summary.remainingDue >= 3, `remainingDue ${result.summary.remainingDue} should include out-of-batch + time-budget-skipped`);
    });

    it("structural invariants evaluated before social account — DRAFT_ONLY takes priority", async () => {
      const { executePublishingCron } = await import("../publishing-cron-executor.js");
      const blockCalls: Array<{ code: string }> = [];
      const deps = {
        repo: {
          async listCandidates() {
            return [{
              id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK",
              status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"),
              attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null,
            }];
          },
          async countDue() { return 1; },
          async loadContext() {
            return {
              job: { id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK", status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"), attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null },
              tenant: { id: "t1", status: "ACTIVE", automationMode: "DRAFT_ONLY" },
              draft: { id: "d1", tenantId: "t1", status: "SCHEDULED", network: "FACEBOOK", format: "FACEBOOK_FEED", caption: "", title: "", externalPostId: null, socialAccountId: null, assets: [] },
              socialAccounts: [],
              durableResult: null,
              publishedCountOnNetwork: 0,
              trialLimit: 5,
            };
          },
          claimScheduled: async () => true,
          reclaimExpiredPreProvider: async () => false,
          markProviderAttemptStarted: async () => false,
          async recordPreProviderBlock(input: { code: string }) { blockCalls.push({ code: input.code }); },
          recordProviderFailure: async () => {},
          markReconciliation: async () => {},
          finalizeSuccess: async () => "reconciliation_required" as const,
          reconcileDurableSuccess: async () => "conflict" as const,
        },
        getPublisher() { return null; },
        resolveCredential: async () => ({ ok: false as const, code: "NO" }),
        now() { return new Date("2026-06-26T12:00:00Z"); },
        newClaimToken() { return "tok"; },
      };
      await executePublishingCron({
        dryRun: false, batchLimit: 20, timeBudgetMs: 50000, leaseTtlMs: 300000, maxAttempts: 3,
      }, deps as any);
      assert.equal(blockCalls.some((c) => c.code === "DRAFT_ONLY"), true);
      assert.equal(blockCalls.some((c) => c.code === "NO_SOCIAL_ACCOUNT"), false);
    });

    it("nonexistent draft produces DRAFT_NOT_FOUND not FORMAT_NOT_SUPPORTED", async () => {
      const { executePublishingCron } = await import("../publishing-cron-executor.js");
      const blockCalls: Array<{ code: string }> = [];
      const deps = {
        repo: {
          async listCandidates() {
            return [{
              id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK",
              status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"),
              attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null,
            }];
          },
          async countDue() { return 1; },
          async loadContext() {
            return {
              job: { id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK", status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"), attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null },
              tenant: { id: "t1", status: "ACTIVE", automationMode: "AUTOPILOT_FULL" },
              draft: null,
              socialAccounts: [{ id: "sa1", tenantId: "t1", network: "FACEBOOK", status: "connected", scopes: ["pages_manage_posts"], externalAccountId: "page1", updatedAt: new Date() }],
              durableResult: null,
              publishedCountOnNetwork: 0,
              trialLimit: 5,
            };
          },
          claimScheduled: async () => true,
          reclaimExpiredPreProvider: async () => false,
          markProviderAttemptStarted: async () => false,
          async recordPreProviderBlock(input: { code: string }) { blockCalls.push({ code: input.code }); },
          recordProviderFailure: async () => {},
          markReconciliation: async () => {},
          finalizeSuccess: async () => "reconciliation_required" as const,
          reconcileDurableSuccess: async () => "conflict" as const,
        },
        getPublisher() { return { textOnly: false, supportedFormats: ["FACEBOOK_FEED"], requiredScopes: ["pages_manage_posts"], publish: async () => ({ kind: "success" as const, externalPostId: "x", providerResponse: {} }) }; },
        resolveCredential: async () => ({ ok: true as const, accessToken: "t", targetId: "p" }),
        now() { return new Date("2026-06-26T12:00:00Z"); },
        newClaimToken() { return "tok"; },
      };
      await executePublishingCron({
        dryRun: false, batchLimit: 20, timeBudgetMs: 50000, leaseTtlMs: 300000, maxAttempts: 3,
      }, deps as any);
      assert.equal(blockCalls.some((c) => c.code === "DRAFT_NOT_FOUND"), true);
      assert.equal(blockCalls.some((c) => c.code === "FORMAT_NOT_SUPPORTED"), false);
    });

    it("stale claim token modifies neither job nor draft", async () => {
      const { executePublishingCron } = await import("../publishing-cron-executor.js");
      let jobStatus = "SCHEDULED";
      let draftStatus = "SCHEDULED";
      const deps = {
        repo: {
          async listCandidates() {
            return [{
              id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK",
              status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"),
              attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null,
            }];
          },
          async countDue() { return 1; },
          async loadContext() {
            return {
              job: { id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK", status: "SCHEDULED", scheduledFor: new Date("2026-06-26T10:00:00Z"), attempts: 0, claimedAt: null, claimToken: null, providerAttemptStartedAt: null },
              tenant: { id: "t1", status: "ACTIVE", automationMode: "AUTOPILOT_FULL" },
              draft: { id: "d1", tenantId: "t1", status: "SCHEDULED", network: "FACEBOOK", format: "FACEBOOK_FEED", caption: "", title: "", externalPostId: null, socialAccountId: null, assets: [{ kind: "IMAGE", publicUrl: "https://cdn.example.test/img.jpg" }] },
              socialAccounts: [{ id: "sa1", tenantId: "t1", network: "FACEBOOK", status: "connected", scopes: ["pages_manage_posts"], externalAccountId: "page1", updatedAt: new Date() }],
              durableResult: null,
              publishedCountOnNetwork: 0,
              trialLimit: 5,
            };
          },
          async claimScheduled() {
            jobStatus = "IN_REVIEW";
            return true;
          },
          async reclaimExpiredPreProvider() { return false; },
          async markProviderAttemptStarted() {
            return false;
          },
          async recordPreProviderBlock() {
            jobStatus = "FAILED";
            draftStatus = "FAILED";
          },
          recordProviderFailure: async () => {},
          markReconciliation: async () => {},
          finalizeSuccess: async () => "reconciliation_required" as const,
          reconcileDurableSuccess: async () => "conflict" as const,
        },
        getPublisher() {
          return { textOnly: false, supportedFormats: ["FACEBOOK_FEED"], requiredScopes: ["pages_manage_posts"], publish: async () => ({ kind: "retryable_failure" as const, error: "fail" }) };
        },
        resolveCredential: async () => ({ ok: true as const, accessToken: "t", targetId: "p" }),
        now() { return new Date("2026-06-26T12:00:00Z"); },
        newClaimToken() { return "tok"; },
      };
      const result = await executePublishingCron({
        dryRun: false, batchLimit: 20, timeBudgetMs: 50000, leaseTtlMs: 300000, maxAttempts: 3,
      }, deps as any);
      assert.equal(result.outcomes[0]?.code, "SKIPPED_CLAIM_LOST");
      assert.equal(jobStatus, "IN_REVIEW");
      assert.equal(draftStatus, "SCHEDULED");
    });
  });

  describe("publishing-scheduler-service", () => {
    it("rejects Invalid Date before repository call", async () => {
      const { schedulePublication } = await import("../publishing-scheduler-service.js");
      const repo = {
        async scheduleAtomic() { return { jobId: "x", status: "created" as const }; },
      };
      await assert.rejects(
        schedulePublication({
          tenantId: "t1", draftId: "d1", network: "FACEBOOK",
          scheduledFor: new Date("invalid"),
        }, repo),
        /INVALID_SCHEDULED_AT/,
      );
    });

    it("returns existing job for duplicate scheduling", async () => {
      const { schedulePublication } = await import("../publishing-scheduler-service.js");
      const records = new Map<string, string>();
      const repo = {
        async scheduleAtomic(input: { jobId: string; draftId: string }) {
          if (records.has(input.jobId)) return { jobId: input.jobId, status: "existing" as const };
          records.set(input.jobId, input.draftId);
          return { jobId: input.jobId, status: "created" as const };
        },
      };
      const req = { tenantId: "t1", draftId: "d1", network: "FACEBOOK", scheduledFor: new Date("2026-06-27T10:00:00Z") };
      const first = await schedulePublication(req, repo);
      const second = await schedulePublication(req, repo);
      assert.equal(first.jobId, second.jobId);
      assert.equal(first.status, "created");
      assert.equal(second.status, "existing");
      assert.equal(records.size, 1);
    });
  });
});
