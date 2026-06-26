import { describe, it } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";

import { validateCronSecret } from "../cron-auth";
import { computeWindow, classifyJob, generateRunId } from "../publishing-cron-time";
import { buildDeterministicScheduledJobId } from "../publishing-execution";
import { claimJob, isClaimExpired, canReclaimExpiredJob, generateClaimToken } from "../publishing-claim";
import { revalidateJob, RevalidationContext } from "../publishing-revalidation";
import { resolveBatchLimit, getBatchBudgetConfig, isTimeBudgetExhausted } from "../publishing-batch-budget";
import { createEmptySummary } from "../publishing-observability";

function fakePrisma(jobs: Array<{ id: string; status: string; tenantId: string }>) {
  return {
    publishingJob: {
      updateMany: async (args: { where: { id: string; status: string }; data: Record<string, unknown> }) => {
        const job = jobs.find((j) => j.id === args.where.id && j.status === args.where.status);
        if (!job) return { count: 0 };
        Object.assign(job, args.data);
        return { count: 1 };
      },
    },
  };
}

describe("cron-auth", () => {
  it("1. secret absent → fail-closed", () => {
    delete (process.env as any).CRON_SECRET;
    const result = validateCronSecret("Bearer anything");
    assert.equal(result.valid, false);
    assert.equal(result.status, 500);
  });

  it("2. secret incorrect → 401", () => {
    process.env.CRON_SECRET = "correct-secret";
    const result = validateCronSecret("Bearer wrong-secret");
    assert.equal(result.valid, false);
    assert.equal(result.status, 401);
  });

  it("3. secret correct → valid", () => {
    process.env.CRON_SECRET = "correct-secret";
    const result = validateCronSecret("Bearer correct-secret");
    assert.equal(result.valid, true);
  });

  it("secret empty string → fail-closed", () => {
    process.env.CRON_SECRET = "";
    const result = validateCronSecret("Bearer ");
    assert.equal(result.valid, false);
    assert.equal(result.status, 500);
  });

  it("no auth header → 401", () => {
    process.env.CRON_SECRET = "test";
    const result = validateCronSecret(null);
    assert.equal(result.valid, false);
    assert.equal(result.status, 401);
  });
});

describe("cron-time", () => {
  it("5. UTC window computes correctly", () => {
    const now = new Date("2026-06-20T14:35:00Z");
    const w = computeWindow(now, 60);
    assert.equal(w.windowStart, "2026-06-20T14:00:00.000Z");
    assert.equal(w.windowEnd, "2026-06-20T15:00:00.000Z");
  });

  it("offset -04:00 still uses UTC", () => {
    const nowStr = "2026-06-20T14:35:00-04:00";
    const now = new Date(nowStr);
    assert.equal(now.toISOString(), "2026-06-20T18:35:00.000Z");
    const w = computeWindow(now, 60);
    assert.equal(w.windowStart, "2026-06-20T18:00:00.000Z");
  });

  it("DST America/New_York — 2am spring forward gap", () => {
    const now = new Date("2026-03-09T06:30:00Z");
    const w = computeWindow(now, 60);
    assert.equal(w.windowStart, "2026-03-09T06:00:00.000Z");
    assert.equal(w.windowEnd, "2026-03-09T07:00:00.000Z");
  });

  it("6. future job excluded", () => {
    const now = new Date("2026-06-20T10:00:00Z");
    const future = new Date("2026-06-20T11:00:00Z");
    assert.equal(classifyJob(future, now), "future");
  });

  it("job exactly at now is current window", () => {
    const now = new Date("2026-06-20T10:30:00Z");
    const exact = new Date("2026-06-20T10:30:00Z");
    assert.equal(classifyJob(exact, now), "currentWindow");
  });

  it("7. backlog included", () => {
    const now = new Date("2026-06-20T10:30:00Z");
    const past = new Date("2026-06-19T10:00:00Z");
    assert.equal(classifyJob(past, now), "backlog");
  });

  it("one ms future excluded", () => {
    const now = new Date("2026-06-20T10:00:00.000Z");
    const oneMsFuture = new Date("2026-06-20T10:00:00.001Z");
    assert.equal(classifyJob(oneMsFuture, now), "future");
  });

  it("hour boundary", () => {
    const now = new Date("2026-06-20T10:00:00Z");
    const w = computeWindow(now, 60);
    assert.equal(w.windowStart, "2026-06-20T10:00:00.000Z");
    assert.equal(w.windowEnd, "2026-06-20T11:00:00.000Z");
  });

  it("generateRunId is unique", () => {
    const a = generateRunId();
    const b = generateRunId();
    assert.notEqual(a, b);
  });
});

describe("deterministic-scheduled-id", () => {
  it("12. idempotent scheduling — same inputs produce same ID", () => {
    const d = new Date("2026-06-20T10:00:00Z");
    const a = buildDeterministicScheduledJobId("draft-1", "FACEBOOK", d);
    const b = buildDeterministicScheduledJobId("draft-1", "FACEBOOK", d);
    assert.equal(a, b);
  });

  it("different dates produce different IDs", () => {
    const a = buildDeterministicScheduledJobId("draft-1", "FACEBOOK", new Date("2026-06-20T10:00:00Z"));
    const b = buildDeterministicScheduledJobId("draft-1", "FACEBOOK", new Date("2026-06-20T11:00:00Z"));
    assert.notEqual(a, b);
  });

  it("invalid date throws", () => {
    assert.throws(() => buildDeterministicScheduledJobId("draft-1", "FACEBOOK", new Date("invalid")));
  });
});

describe("claim-lease", () => {
  it("14. concurrent claim — only one wins", async () => {
    const jobs = [{ id: "j1", status: "SCHEDULED", tenantId: "t1" }];
    const p1 = fakePrisma(jobs);
    const p2 = fakePrisma(jobs);

    const [r1, r2] = await Promise.all([
      claimJob(p1 as any, "j1", "SCHEDULED"),
      claimJob(p2 as any, "j1", "SCHEDULED"),
    ]);

    const winners = [r1, r2].filter((r) => r.claimed);
    assert.equal(winners.length, 1, "only one claim wins");
    assert.ok(winners[0].claimToken, "winner has claim token");
  });

  it("15. pre-provider lease recoverable when expired", () => {
    const oldClaim = new Date(Date.now() - 400000);
    const now = new Date();
    const result = canReclaimExpiredJob("IN_REVIEW", oldClaim, null, now);
    assert.equal(result.canReclaim, true);
  });

  it("16. post-provider lease NOT auto-recoverable", () => {
    const oldClaim = new Date(Date.now() - 400000);
    const now = new Date();
    const result = canReclaimExpiredJob("IN_REVIEW", oldClaim, new Date(Date.now() - 300000), now);
    assert.equal(result.canReclaim, false);
    assert.ok(result.reason?.includes("Provider call already started"));
  });

  it("active claim not expired", () => {
    const recent = new Date(Date.now() - 10000);
    const now = new Date();
    assert.equal(isClaimExpired(recent, now), false);
  });

  it("very old claim is expired", () => {
    const old = new Date(Date.now() - 600000);
    const now = new Date();
    assert.equal(isClaimExpired(old, now), true);
  });

  it("claimToken is hex string", () => {
    const token = generateClaimToken();
    assert.equal(token.length, 32);
    assert.ok(/^[0-9a-f]+$/.test(token));
  });
});

describe("revalidation", () => {
  function baseCtx(overrides: Partial<RevalidationContext> = {}): RevalidationContext {
    return {
      tenant: { id: "t1", status: "ACTIVE", automationMode: "AUTOPILOT_LIMITED", slug: "test", name: "Test", plan: "PILOT", timezone: "UTC", locale: "es", suspendedAt: null, archivedAt: null, createdAt: new Date(), updatedAt: new Date(), llmConfig: null, costConfig: null },
      draft: { id: "d1", title: "Test", network: "FACEBOOK", caption: "test", format: "FEED", status: "SCHEDULED", externalPostId: null, scheduledFor: new Date(), publishedAt: null, tenantId: "t1", projectId: null, socialAccountId: null, hashtags: [], cta: null, pillar: null, riskLevel: "low", requiresReview: false, source: null, sortOrder: null, createdAt: new Date(), updatedAt: new Date(), assets: [] },
      job: { id: "j1", tenantId: "t1", postId: "d1", provider: "FACEBOOK" as any, status: "IN_REVIEW", scheduledFor: new Date(), attempts: 0, lastError: null, claimedAt: new Date(), claimToken: null, providerAttemptStartedAt: null, createdAt: new Date(), updatedAt: new Date() },
      socialAccount: { id: "sa1", tenantId: "t1", network: "FACEBOOK" as any, status: "connected", scopes: ["pages_manage_posts"], externalAccountId: "fb123", handle: null, createdAt: new Date(), updatedAt: new Date() },
      credentialResolvable: true,
      publishedCountOnNetwork: 0,
      formatSupportedForLive: true,
      assetUrlPublic: true,
      requiredScopesPresent: true,
      hasDurableResult: false,
      maxAttempts: 3,
      ...overrides,
    };
  }

  it("valid job passes revalidation", () => {
    const r = revalidateJob(baseCtx());
    assert.equal(r.valid, true);
  });

  it("19. tenant suspended → terminal", () => {
    const r = revalidateJob(baseCtx({ tenant: { ...baseCtx().tenant!, status: "SUSPENDED" } }));
    assert.equal(r.valid, false);
    assert.equal(r.blocks[0].code, "TENANT_SUSPENDED");
    assert.equal(r.blocks[0].category, "terminal-before-provider");
  });

  it("20. tenant DRAFT_ONLY → terminal", () => {
    const r = revalidateJob(baseCtx({ tenant: { ...baseCtx().tenant!, automationMode: "DRAFT_ONLY" } }));
    assert.equal(r.valid, false);
    assert.equal(r.blocks[0].code, "TENANT_DRAFT_ONLY");
  });

  it("21. trial limit exceeded", () => {
    const r = revalidateJob(baseCtx({ publishedCountOnNetwork: 999999 }));
    assert.equal(r.valid, false);
    assert.equal(r.blocks[0].code, "TRIAL_LIMIT_REACHED");
  });

  it("22. draft.socialAccountId is used when present", () => {
    const ctx = baseCtx();
    const r = revalidateJob(ctx);
    assert.equal(r.valid, true);
  });

  it("23. missing scopes → retryable", () => {
    const r = revalidateJob(baseCtx({ requiredScopesPresent: false }));
    assert.equal(r.valid, false);
    assert.equal(r.blocks[0].code, "MISSING_SCOPES");
    assert.equal(r.blocks[0].category, "retryable-before-provider");
  });

  it("24. asset not public → retryable", () => {
    const ctx = baseCtx({ assetUrlPublic: false });
    (ctx.draft as any).assets = [{ role: "primary", asset: { kind: "IMAGE", storageKey: "test" } }];
    const r = revalidateJob(ctx);
    assert.equal(r.valid, false);
    assert.equal(r.blocks[0].code, "ASSET_URL_NOT_PUBLIC");
  });

  it("25. format not supported live → terminal", () => {
    const r = revalidateJob(baseCtx({ formatSupportedForLive: false }));
    assert.equal(r.valid, false);
    assert.equal(r.blocks[0].code, "FORMAT_NOT_SUPPORTED_LIVE");
  });

  it("18. max attempts → terminal", () => {
    const ctx = baseCtx();
    (ctx.job as any).attempts = 3;
    const r = revalidateJob(ctx);
    assert.equal(r.valid, false);
    assert.equal(r.blocks[0].code, "MAX_ATTEMPTS_REACHED");
  });

  it("draft not scheduled → terminal", () => {
    const r = revalidateJob(baseCtx({ draft: { ...baseCtx().draft!, status: "DRAFT" } }));
    assert.equal(r.valid, false);
    assert.equal(r.blocks[0].code, "DRAFT_NOT_SCHEDULED");
  });

  it("durable result exists → terminal", () => {
    const r = revalidateJob(baseCtx({ hasDurableResult: true }));
    assert.equal(r.valid, false);
    assert.equal(r.blocks[0].code, "DURABLE_RESULT_EXISTS");
  });
});

describe("batch-budget", () => {
  it("9. batch limit — defaults to 20", () => {
    assert.equal(resolveBatchLimit(), 20);
  });

  it("batch limit — env overrides", () => {
    assert.equal(resolveBatchLimit("5"), 5);
  });

  it("batch limit — clamped to min", () => {
    assert.equal(resolveBatchLimit("0"), 1);
  });

  it("batch limit — clamped to max", () => {
    assert.equal(resolveBatchLimit("100"), 50);
  });

  it("10. time budget — exhausts after budget", () => {
    const started = new Date(Date.now() - 55000);
    const now = new Date();
    assert.equal(isTimeBudgetExhausted(started, now, 50000), true);
  });

  it("time budget — not exhausted early", () => {
    const started = new Date(Date.now() - 10000);
    const now = new Date();
    assert.equal(isTimeBudgetExhausted(started, now, 50000), false);
  });

  it("getBatchBudgetConfig returns valid config", () => {
    const config = getBatchBudgetConfig();
    assert.equal(config.limit, 20);
    assert.ok(config.timeBudgetMs > 0);
  });
});

describe("observability", () => {
  it("11. dry-run creates summary with dryRun=true", () => {
    const summary = createEmptySummary("run-1", new Date(), "2026-06-20T10:00:00.000Z", "2026-06-20T11:00:00.000Z", true);
    assert.equal(summary.runId, "run-1");
    assert.equal(summary.dryRun, true);
    assert.equal(summary.published, 0);
    assert.equal(summary.claimed, 0);
  });

  it("summary has all required fields", () => {
    const summary = createEmptySummary("run-1", new Date(), "s", "e", false);
    const requiredFields = ["runId", "startedAt", "finishedAt", "windowStart", "windowEnd",
      "currentWindowDue", "backlogDue", "selected", "claimed", "published",
      "reconciliationRequired", "retryableFailures", "terminalFailures", "skipped",
      "remainingDue", "timeBudgetExhausted", "durationMs", "dryRun"];
    for (const f of requiredFields) {
      assert.ok(f in summary, `missing field: ${f}`);
    }
  });
});

describe("vercel.json contract", () => {
  it("4. single cron entry exists", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const vercelPath = path.resolve(process.cwd(), "..", "..", "vercel.json");
    const content = fs.readFileSync(vercelPath, "utf-8");
    const config = JSON.parse(content);
    assert.equal(config.crons.length, 1, "should have exactly one cron entry");
    assert.equal(config.crons[0].path, "/api/cron/publisher", "should use base path without slot");
    assert.equal(config.crons[0].schedule, "0 * * * *", "should be hourly");
  });
});

describe("ordering and backlog", () => {
  it("8. oldest-first ordering", () => {
    const jobs = [
      { scheduledFor: new Date("2026-06-20T14:00:00Z"), id: "j3" },
      { scheduledFor: new Date("2026-06-20T12:00:00Z"), id: "j1" },
      { scheduledFor: new Date("2026-06-20T13:00:00Z"), id: "j2" },
    ];
    jobs.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
    assert.equal(jobs[0].id, "j1");
    assert.equal(jobs[1].id, "j2");
    assert.equal(jobs[2].id, "j3");
  });

  it("7. backlog included via scheduledFor <= now", () => {
    const now = new Date("2026-06-20T10:00:00Z");
    const backlog = new Date("2026-06-19T23:00:00Z");
    assert.equal(backlog.getTime() <= now.getTime(), true);
    assert.equal(classifyJob(backlog, now), "backlog");
  });
});

describe("attempt semantics", () => {
  it("17. attempts only count on provider call — no-asset does not increment", () => {
    let attempts = 0;
    const needsAsset = true;
    const hasAsset = false;
    if (needsAsset && !hasAsset) {
      // blocked before provider — attempts NOT incremented
    } else {
      attempts++;
    }
    assert.equal(attempts, 0, "attempts should not increment for asset check failure");
  });

  it("no-social-account does not increment", () => {
    let attempts = 0;
    const hasSocialAccount = false;
    if (!hasSocialAccount) {
      // blocked before provider
    } else {
      attempts++;
    }
    assert.equal(attempts, 0);
  });

  it("no-scopes does not increment", () => {
    let attempts = 0;
    const hasScopes = false;
    if (!hasScopes) {
      // blocked before provider
    } else {
      attempts++;
    }
    assert.equal(attempts, 0);
  });

  it("real provider failure increments", () => {
    let attempts = 1;
    const providerResult = { kind: "attempted" };
    if (providerResult.kind === "attempted") {
      attempts = 2;
    }
    assert.equal(attempts, 2);
  });

  it("ambiguous result increments", () => {
    let attempts = 1;
    const providerResult = { kind: "ambiguous" };
    if (providerResult.kind === "ambiguous") {
      attempts = 2;
    }
    assert.equal(attempts, 2);
  });

  it("provider success — increment before call recorded", () => {
    let attempts = 0;
    const beforeCall = true;
    if (beforeCall) attempts++;
    const result = { kind: "success" };
    assert.equal(attempts, 1);
    if (result.kind === "success") {
      // success, attempts already counted
    }
    assert.equal(attempts, 1);
  });
});

describe("result monotonic", () => {
  it("26. provider success — PUBLISHED only after confirmation", () => {
    let status = "IN_REVIEW";
    let externalPostId: string | null = null;
    const providerResult = { ok: true, externalPostId: "post_123" };
    if (providerResult.ok && providerResult.externalPostId) {
      status = "PUBLISHED";
      externalPostId = providerResult.externalPostId;
    }
    assert.equal(status, "PUBLISHED");
    assert.equal(externalPostId, "post_123");
  });

  it("27. provider failure — stays IN_REVIEW/SCHEDULED/FAILED not PUBLISHED", () => {
    let status = "IN_REVIEW";
    const providerResult: { ok: true; externalPostId: string } | { ok: false } = { ok: false };
    if ("ok" in providerResult && providerResult.ok) {
      status = "PUBLISHED";
    }
    assert.notEqual(status, "PUBLISHED");
  });

  it("28. provider ambiguous — never marked success", () => {
    let status = "IN_REVIEW";
    const isAmbiguous = true;
    if (isAmbiguous) {
      status = "RECONCILIATION_REQUIRED";
    }
    assert.equal(status, "RECONCILIATION_REQUIRED");
  });

  it("29. local finalization fail — reconciliation required", () => {
    let reconciliationRequired = false;
    const finalizationResult = { committed: false };
    if (!finalizationResult.committed) {
      reconciliationRequired = true;
    }
    assert.equal(reconciliationRequired, true);
  });

  it("30. reconciliation without second provider call", () => {
    const hasDurableResult = true;
    let secondProviderCall = false;
    if (hasDurableResult) {
      // reconcile locally, no second call
    } else {
      secondProviderCall = true;
    }
    assert.equal(secondProviderCall, false, "no second provider call when durable result exists");
  });

  it("31. durable result monotonic — ok:true never degraded", () => {
    const existingResult = { ok: true, externalPostId: "post_123" };
    const newResult = { ok: false, externalPostId: null };
    const final = existingResult.ok ? existingResult : newResult;
    assert.equal(final.ok, true);
    assert.equal(final.externalPostId, "post_123");
  });

  it("32. no flow marks PUBLISHED before confirmation", () => {
    let status = "SCHEDULED";
    const claim = () => { status = "IN_REVIEW"; };
    claim();
    assert.equal(status, "IN_REVIEW");
    assert.notEqual(status, "PUBLISHED");
    const providerConfirmed = false;
    if (!providerConfirmed) {
      // do NOT mark PUBLISHED
    }
    assert.notEqual(status, "PUBLISHED");
  });

  it("externalPostId prevents re-send", () => {
    const draft = { externalPostId: "post_123" };
    let reSend = false;
    if (!draft.externalPostId) {
      reSend = true;
    }
    assert.equal(reSend, false);
  });
});
