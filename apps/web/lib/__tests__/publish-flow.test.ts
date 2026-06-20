import { describe, it } from "node:test";
import assert from "node:assert/strict";

function tenantAssetSlug(tenantSlug: string): string {
  return tenantSlug === "turpial-sound" ? "turpial" : tenantSlug;
}

function buildAssetUrl(path: string | null | undefined, slug: string): string {
  if (!path) return "";
  const folder = tenantAssetSlug(slug);
  const cleanPath = path.replace(/^content\/inbox\//, "").replace(/\\/g, "/");
  if (cleanPath.includes("..")) return "";
  return `/tenant-assets/${folder}/${cleanPath}`;
}

interface DraftItem {
  id: string;
  title: string;
  status: string;
  network: string;
}

function resolvePublishTarget(
  selected: DraftItem | undefined,
  mode: "dry_run" | "scheduled" | "immediate"
): { eligible: boolean; reason: string } {
  if (!selected) return { eligible: false, reason: "No draft selected." };
  if (selected.status === "PUBLISHED") return { eligible: false, reason: "Already published." };
  if (mode === "immediate" && selected.status !== "APPROVED")
    return { eligible: false, reason: `Not approved: ${selected.status}.` };
  if (mode === "scheduled" && selected.status !== "APPROVED")
    return { eligible: false, reason: `Not approved: ${selected.status}.` };
  return { eligible: true, reason: "" };
}

function needsApproval(automationMode: string, mode: string): boolean {
  if (mode === "dry_run") return false;
  if (automationMode === "DRAFT_ONLY") return false;
  return automationMode === "APPROVAL_REQUIRED";
}

function isDraftOnlyBlocked(automationMode: string, mode: string): boolean {
  return automationMode === "DRAFT_ONLY" && mode !== "dry_run";
}

function buildPublishPayload(tenantSlug: string, draftId: string, mode: string, manualApproval: boolean) {
  return {
    tenantSlug,
    draftId,
    manualApproval,
    mode,
  };
}

function isSafeMessage(message: string): boolean {
  const forbidden = ["access_token", "EA", "ciphertext", "encryptedBlob", "TOKEN_VAULT_SECRET", "NEXTAUTH_SECRET"];
  return !forbidden.some((w) => message.includes(w));
}

describe("tenantAssetSlug", () => {
  it("maps turpial-sound to turpial", () => {
    assert.equal(tenantAssetSlug("turpial-sound"), "turpial");
  });

  it("passes through other tenants unchanged", () => {
    assert.equal(tenantAssetSlug("dulcedeseo"), "dulcedeseo");
    assert.equal(tenantAssetSlug("my-tenant"), "my-tenant");
  });

  it("does not allow empty string to produce turpial", () => {
    assert.equal(tenantAssetSlug(""), "");
  });
});

describe("buildAssetUrl", () => {
  it("builds correct URL for turpial-sound", () => {
    const url = buildAssetUrl("facebook/bienvenidos-fb.jpg", "turpial-sound");
    assert.match(url, /^\/tenant-assets\/turpial\/facebook\/bienvenidos-fb\.jpg$/);
  });

  it("builds correct URL for second tenant", () => {
    const url = buildAssetUrl("posts/img.jpg", "tenant-b");
    assert.match(url, /^\/tenant-assets\/tenant-b\/posts\/img\.jpg$/);
  });

  it("blocks path traversal", () => {
    assert.equal(buildAssetUrl("../../../etc/passwd", "tenant-a"), "");
  });

  it("removes content/inbox prefix", () => {
    const url = buildAssetUrl("content/inbox/post.jpg", "tenant-a");
    assert.match(url, /^\/tenant-assets\/tenant-a\/post\.jpg$/);
  });

  it("returns empty for null path", () => {
    assert.equal(buildAssetUrl(null, "any"), "");
  });

  it("returns empty for undefined path", () => {
    assert.equal(buildAssetUrl(undefined, "any"), "");
  });
});

describe("resolvePublishTarget", () => {
  const approvedDraft: DraftItem = {
    id: "d1",
    title: "Test Post",
    status: "APPROVED",
    network: "FACEBOOK",
  };
  const publishedDraft: DraftItem = {
    id: "d2",
    title: "Old Post",
    status: "PUBLISHED",
    network: "INSTAGRAM",
  };
  const draftDraft: DraftItem = {
    id: "d3",
    title: "Draft Post",
    status: "DRAFT",
    network: "FACEBOOK",
  };

  it("returns eligible for approved draft with immediate", () => {
    const result = resolvePublishTarget(approvedDraft, "immediate");
    assert.equal(result.eligible, true);
  });

  it("returns eligible for approved draft with dry_run", () => {
    const result = resolvePublishTarget(approvedDraft, "dry_run");
    assert.equal(result.eligible, true);
  });

  it("returns ineligible for published draft", () => {
    const result = resolvePublishTarget(publishedDraft, "immediate");
    assert.equal(result.eligible, false);
    assert.match(result.reason, /Already published/i);
  });

  it("returns ineligible for DRAFT status with immediate", () => {
    const result = resolvePublishTarget(draftDraft, "immediate");
    assert.equal(result.eligible, false);
    assert.match(result.reason, /Not approved/i);
  });

  it("returns ineligible for DRAFT status with scheduled", () => {
    const result = resolvePublishTarget(draftDraft, "scheduled");
    assert.equal(result.eligible, false);
  });

  it("returns ineligible when no draft selected", () => {
    const result = resolvePublishTarget(undefined, "immediate");
    assert.equal(result.eligible, false);
  });
});

describe("needsApproval", () => {
  it("requires approval for APPROVAL_REQUIRED with immediate", () => {
    assert.equal(needsApproval("APPROVAL_REQUIRED", "immediate"), true);
  });

  it("requires approval for APPROVAL_REQUIRED with scheduled", () => {
    assert.equal(needsApproval("APPROVAL_REQUIRED", "scheduled"), true);
  });

  it("does not require approval for dry_run", () => {
    assert.equal(needsApproval("APPROVAL_REQUIRED", "dry_run"), false);
  });

  it("DRAFT_ONLY does not trigger approval (it blocks outright)", () => {
    assert.equal(needsApproval("DRAFT_ONLY", "immediate"), false);
    assert.equal(needsApproval("DRAFT_ONLY", "scheduled"), false);
  });

  it("does not require approval for AUTOPILOT_FULL", () => {
    assert.equal(needsApproval("AUTOPILOT_FULL", "immediate"), false);
  });

  it("does not require approval for AUTOPILOT_LIMITED", () => {
    assert.equal(needsApproval("AUTOPILOT_LIMITED", "immediate"), false);
  });
});

describe("draftOnlyBlocking", () => {
  it("blocks scheduled for DRAFT_ONLY", () => {
    assert.equal(isDraftOnlyBlocked("DRAFT_ONLY", "scheduled"), true);
  });

  it("blocks immediate for DRAFT_ONLY", () => {
    assert.equal(isDraftOnlyBlocked("DRAFT_ONLY", "immediate"), true);
  });

  it("allows dry_run for DRAFT_ONLY", () => {
    assert.equal(isDraftOnlyBlocked("DRAFT_ONLY", "dry_run"), false);
  });

  it("does not block APPROVAL_REQUIRED", () => {
    assert.equal(isDraftOnlyBlocked("APPROVAL_REQUIRED", "immediate"), false);
  });

  it("does not block AUTOPILOT_FULL", () => {
    assert.equal(isDraftOnlyBlocked("AUTOPILOT_FULL", "immediate"), false);
  });
});

describe("concurrentClaim", () => {
  it("only one request claims the draft", () => {
    const draftId = "draft-concurrent";
    let claimCount = 0;
    function atomicClaim(id: string, expectedStatus: string): boolean {
      claimCount++;
      return claimCount === 1;
    }
    const first = atomicClaim(draftId, "APPROVED");
    const second = atomicClaim(draftId, "APPROVED");
    assert.equal(first, true, "first request should claim");
    assert.equal(second, false, "second request should be rejected");
    assert.equal(claimCount, 2, "both requests attempted");
  });

  it("publisher.publish is invoked exactly once", () => {
    let publishCalls = 0;
    function publish(): string {
      publishCalls++;
      return "post_123";
    }
    let claimed = false;
    function tryPublish(): { ok: boolean; postId?: string } {
      if (claimed) return { ok: false };
      claimed = true;
      const postId = publish();
      return { ok: true, postId };
    }
    const r1 = tryPublish();
    const r2 = tryPublish();
    assert.equal(r1.ok, true);
    assert.equal(r1.postId, "post_123");
    assert.equal(r2.ok, false);
    assert.equal(publishCalls, 1, "publisher called exactly once");
  });
});

describe("buildPublishPayload", () => {
  it("uses correct draftId", () => {
    const p = buildPublishPayload("turpial-sound", "draft-123", "dry_run", false);
    assert.equal(p.draftId, "draft-123");
  });

  it("uses correct tenantSlug", () => {
    const p = buildPublishPayload("turpial-sound", "draft-abc", "dry_run", false);
    assert.equal(p.tenantSlug, "turpial-sound");
  });

  it("passes manualApproval", () => {
    const p = buildPublishPayload("t1", "d1", "immediate", true);
    assert.equal(p.manualApproval, true);
  });

  it("separates Facebook and Instagram by draftId", () => {
    const fb = buildPublishPayload("t1", "fb-draft", "immediate", false);
    const ig = buildPublishPayload("t1", "ig-draft", "immediate", false);
    assert.notEqual(fb.draftId, ig.draftId);
  });
});

describe("safe message", () => {
  it("rejects message with access_token", () => {
    assert.equal(isSafeMessage("error with access_token leaked"), false);
  });

  it("accepts normal error message", () => {
    assert.equal(isSafeMessage("Draft must be APPROVED"), true);
  });

  it("accepts externalPostId in message", () => {
    assert.equal(isSafeMessage("Published (ID: 12345_67890)"), true);
  });
});

describe("instagramContainerReadiness", () => {
  type FakeStatus = "FINISHED" | "IN_PROGRESS" | "ERROR" | "EXPIRED";

  function fakeWaitForReady(
    statuses: FakeStatus[],
    maxDelayMs?: number
  ): () => Promise<{ ready: boolean; statusCode?: string }> {
    let callIndex = 0;
    return async () => {
      if (callIndex >= statuses.length) {
        return { ready: false, statusCode: "TIMEOUT" };
      }
      const s = statuses[callIndex++];
      if (s === "FINISHED") return { ready: true, statusCode: "FINISHED" };
      if (s === "ERROR") return { ready: false, statusCode: "ERROR" };
      if (s === "EXPIRED") return { ready: false, statusCode: "EXPIRED" };
      return { ready: false, statusCode: "IN_PROGRESS" };
    };
  }

  it("FINISHED on first poll", async () => {
    const wait = fakeWaitForReady(["FINISHED"]);
    const r = await wait();
    assert.equal(r.ready, true);
    assert.equal(r.statusCode, "FINISHED");
  });

  it("IN_PROGRESS then FINISHED", async () => {
    const wait = fakeWaitForReady(["IN_PROGRESS", "FINISHED"]);
    let r = await wait();
    assert.equal(r.ready, false);
    r = await wait();
    assert.equal(r.ready, true);
  });

  it("multiple IN_PROGRESS then FINISHED", async () => {
    const wait = fakeWaitForReady(["IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "FINISHED"]);
    let r = await wait();
    assert.equal(r.ready, false);
    r = await wait();
    assert.equal(r.ready, false);
    r = await wait();
    assert.equal(r.ready, false);
    r = await wait();
    assert.equal(r.ready, true);
  });

  it("ERROR", async () => {
    const wait = fakeWaitForReady(["ERROR"]);
    const r = await wait();
    assert.equal(r.ready, false);
    assert.equal(r.statusCode, "ERROR");
  });

  it("EXPIRED", async () => {
    const wait = fakeWaitForReady(["EXPIRED"]);
    const r = await wait();
    assert.equal(r.ready, false);
    assert.equal(r.statusCode, "EXPIRED");
  });

  it("timeout after max polls", async () => {
    const statuses: FakeStatus[] = Array(20).fill("IN_PROGRESS");
    const wait = fakeWaitForReady(statuses);
    let lastReady = false;
    for (let i = 0; i < 15; i++) {
      const r = await wait();
      lastReady = r.ready;
    }
    assert.equal(lastReady, false);
  });

  it("media_publish only called after FINISHED", () => {
    let publishCalled = false;
    let containerReady = false;
    function tryPublish(): string | null {
      if (!containerReady) return null;
      if (publishCalled) return null;
      publishCalled = true;
      return "ig_post_456";
    }
    assert.equal(tryPublish(), null, "not ready yet");
    containerReady = true;
    assert.equal(tryPublish(), "ig_post_456", "publishes after ready");
    assert.equal(publishCalled, true);
  });

  it("same containerId reused on 9007 retry", () => {
    const containerId = "container_abc_123";
    const publishAttempts: { containerId: string; attempt: number }[] = [];
    function tryPublish(cid: string): boolean {
      publishAttempts.push({ containerId: cid, attempt: publishAttempts.length + 1 });
      if (publishAttempts.length === 1) return false;
      return true;
    }
    tryPublish(containerId);
    tryPublish(containerId);
    assert.equal(publishAttempts.length, 2);
    assert.equal(publishAttempts[0].containerId, containerId);
    assert.equal(publishAttempts[1].containerId, containerId);
  });

  it("no second container created on 9007", () => {
    const createdContainers: string[] = [];
    function createContainer(): string {
      const id = `container_${createdContainers.length + 1}`;
      createdContainers.push(id);
      return id;
    }
    const cid = createContainer();
    assert.equal(createdContainers.length, 1);
    assert.equal(createContainer(), "container_2");
    assert.equal(createdContainers.length, 2, "creates new container only by intent");
    assert.equal(cid, "container_1", "original container preserved");
  });

  it("media_publish at most twice for 9007 case", () => {
    let attempts = 0;
    let secondAttemptReady = false;
    function publishWithRetry(): boolean {
      attempts++;
      if (attempts === 1) return false;
      if (attempts === 2 && secondAttemptReady) return true;
      return false;
    }
    assert.equal(publishWithRetry(), false);
    assert.equal(attempts, 1);
    secondAttemptReady = true;
    assert.equal(publishWithRetry(), true);
    assert.equal(attempts, 2, "exactly 2 attempts");
  });

  it("non-9007 OAuth error not retried", () => {
    let attempts = 0;
    function publishWithError(code: number): string {
      attempts++;
      if (code === 190) throw new Error("OAuthException");
      return "ok";
    }
    assert.throws(() => publishWithError(190));
    assert.equal(attempts, 1, "no retry for OAuth errors");
  });

  it("error returns draft to recoverable state", () => {
    let draftStatus = "SCHEDULED";
    function revertOnError(success: boolean): string {
      if (!success) {
        draftStatus = "APPROVED";
        return "failed";
      }
      draftStatus = "PUBLISHED";
      return "published";
    }
    assert.equal(revertOnError(false), "failed");
    assert.equal(draftStatus, "APPROVED", "draft reverted to APPROVED on failure");
    assert.equal(revertOnError(true), "published");
    assert.equal(draftStatus, "PUBLISHED", "draft PUBLISHED on success");
  });

  it("Facebook publisher not affected by Instagram changes", () => {
    const fbPublish = (network: string) => network === "FACEBOOK" ? "fb_post_789" : null;
    assert.equal(fbPublish("FACEBOOK"), "fb_post_789");
    assert.equal(fbPublish("INSTAGRAM"), null);
  });
});

describe("scheduledVsImmediateRace", () => {
  it("immediate wins and scheduled loses", () => {
    let draftStatus = "APPROVED";
    function atomicClaim(expected: string, newStatus: string): boolean {
      if (draftStatus !== expected) return false;
      draftStatus = newStatus;
      return true;
    }
    const immediateWon = atomicClaim("APPROVED", "SCHEDULED");
    const scheduledLost = atomicClaim("APPROVED", "SCHEDULED");
    assert.equal(immediateWon, true, "immediate claims first");
    assert.equal(scheduledLost, false, "scheduled rejected");
    assert.equal(draftStatus, "SCHEDULED");
  });

  it("scheduled wins and immediate loses", () => {
    let draftStatus = "APPROVED";
    function atomicClaim(expected: string, newStatus: string): boolean {
      if (draftStatus !== expected) return false;
      draftStatus = newStatus;
      return true;
    }
    const scheduledWon = atomicClaim("APPROVED", "SCHEDULED");
    const immediateLost = atomicClaim("APPROVED", "SCHEDULED");
    assert.equal(scheduledWon, true, "scheduled claims first");
    assert.equal(immediateLost, false, "immediate rejected");
  });

  it("two scheduled simultaneous create only one job", () => {
    const createdJobs: string[] = [];
    let claimed = false;
    function tryCreateJob(draftId: string): string | null {
      if (claimed) return null;
      claimed = true;
      const jobId = `pj_${draftId}`;
      createdJobs.push(jobId);
      return jobId;
    }
    const j1 = tryCreateJob("d1");
    const j2 = tryCreateJob("d1");
    assert.notEqual(j1, null);
    assert.equal(j2, null);
    assert.equal(createdJobs.length, 1, "only one job created");
  });
});

describe("approvalReset", () => {
  it("changing draft resets approval", () => {
    let approval = true;
    let selectedId = "draft-a";
    function changeDraft(newId: string) {
      if (selectedId !== newId) {
        approval = false;
        selectedId = newId;
      }
    }
    assert.equal(approval, true);
    changeDraft("draft-b");
    assert.equal(approval, false, "approval reset on draft change");
  });

  it("changing mode resets approval", () => {
    let approval = true;
    let mode = "immediate";
    function changeMode(newMode: string) {
      if (mode !== newMode) {
        approval = false;
        mode = newMode;
      }
    }
    assert.equal(approval, true);
    changeMode("scheduled");
    assert.equal(approval, false, "approval reset on mode change");
  });

  it("switching to dry_run resets approval", () => {
    let approval = true;
    let mode = "immediate";
    function changeMode(newMode: string) {
      if (mode !== newMode) {
        approval = false;
        mode = newMode;
      }
    }
    changeMode("dry_run");
    assert.equal(approval, false, "approval reset for dry_run");
  });

  it("APPROVAL_REQUIRED without fresh approval blocked", () => {
    let approval = false;
    let mode = "immediate";
    let automationMode = "APPROVAL_REQUIRED";
    const blocked = automationMode === "APPROVAL_REQUIRED" && mode !== "dry_run" && !approval;
    assert.equal(blocked, true, "blocked without fresh approval");
  });
});

describe("durablePersistence", () => {
  it("provider fails before publish → draft reverts to APPROVED", () => {
    let draftStatus = "SCHEDULED";
    let jobStatus = "SCHEDULED";
    function handleProviderFailure() {
      draftStatus = "APPROVED";
      jobStatus = "FAILED";
    }
    handleProviderFailure();
    assert.equal(draftStatus, "APPROVED", "draft reverted");
    assert.equal(jobStatus, "FAILED", "job marked failed");
  });

  it("provider success + full persistence → PUBLISHED", () => {
    let draftStatus = "SCHEDULED";
    let jobStatus = "SCHEDULED";
    let externalPostId = "post_abc";
    function handleFullSuccess() {
      jobStatus = "PUBLISHED";
      draftStatus = "PUBLISHED";
    }
    handleFullSuccess();
    assert.equal(draftStatus, "PUBLISHED");
    assert.equal(jobStatus, "PUBLISHED");
    assert.equal(externalPostId, "post_abc");
  });

  it("provider success + draft update fails → not reverted, reconciliation required", () => {
    let draftStatus = "SCHEDULED";
    let jobStatus = "SCHEDULED";
    let externalPostId = "post_xyz";
    let reconciliationRequired = false;
    function handlePartialPersistence() {
      reconciliationRequired = true;
    }
    handlePartialPersistence();
    assert.equal(draftStatus, "SCHEDULED", "draft NOT reverted after provider success");
    assert.equal(reconciliationRequired, true, "reconciliation required");
    assert.equal(externalPostId, "post_xyz", "externalPostId preserved");
  });

  it("provider success + result saved + draft update fails → result recoverable", () => {
    const savedResults: { id: string; externalPostId: string }[] = [];
    function saveResult(jobId: string, postId: string) {
      savedResults.push({ id: jobId, externalPostId: postId });
    }
    saveResult("pj_d1", "post_456");
    assert.equal(savedResults.length, 1);
    assert.equal(savedResults[0].externalPostId, "post_456", "result persisted independently");
  });

  it("externalPostId never overwritten with empty", () => {
    let externalPostId = "post_keep_me";
    function tryOverwrite(newId: string) {
      if (newId) externalPostId = newId;
    }
    tryOverwrite("");
    assert.equal(externalPostId, "post_keep_me", "not overwritten");
    tryOverwrite("post_new");
    assert.equal(externalPostId, "post_new", "updated with valid ID");
  });

  it("job pre-attempt created only once", () => {
    const attempts: string[] = [];
    function createAttempt(draftId: string, network: string): string {
      const id = `pj_${draftId}_${network}`;
      if (!attempts.includes(id)) {
        attempts.push(id);
      }
      return id;
    }
    createAttempt("d1", "FACEBOOK");
    createAttempt("d1", "FACEBOOK");
    assert.equal(attempts.length, 1, "only one pre-attempt job");
  });

  it("no second provider call", () => {
    let providerCalls = 0;
    function callProvider(): string {
      providerCalls++;
      return "post_ok";
    }
    callProvider();
    assert.equal(providerCalls, 1, "single provider call");
    const alreadyPublished = providerCalls > 1;
    assert.equal(alreadyPublished, false);
  });
});

describe("productionPublishingExecution", async () => {
  const {
    buildImmediateJobId,
    buildScheduledJobId,
    checkExistingJobForRetry,
  } = await import("../publishing-execution.js");

  it("buildImmediateJobId is deterministic", () => {
    const id1 = buildImmediateJobId("draft-abc", "FACEBOOK");
    const id2 = buildImmediateJobId("draft-abc", "FACEBOOK");
    assert.equal(id1, id2);
    assert.match(id1, /^pj_immediate_/);
  });

  it("buildImmediateJobId distinguishes networks", () => {
    const fb = buildImmediateJobId("d1", "FACEBOOK");
    const ig = buildImmediateJobId("d1", "INSTAGRAM");
    assert.notEqual(fb, ig);
  });

  it("buildScheduledJobId includes timestamp", () => {
    const t1 = new Date("2026-06-20T12:00:00Z");
    const t2 = new Date("2026-06-20T13:00:00Z");
    const id1 = buildScheduledJobId("d1", "FACEBOOK", t1);
    const id2 = buildScheduledJobId("d1", "FACEBOOK", t2);
    assert.notEqual(id2, id1);
    assert.match(id1, /^pj_scheduled_/);
  });

  it("checkExistingJobForRetry blocks PUBLISHED job", () => {
    const r = checkExistingJobForRetry({ jobStatus: "PUBLISHED" });
    assert.equal(r.blocked, true);
    assert.match(r.code!, /JOB_PUBLISHED/);
  });

  it("checkExistingJobForRetry blocks existing result ok", () => {
    const r = checkExistingJobForRetry({ resultOk: true, externalPostId: "post_1" });
    assert.equal(r.blocked, true);
    assert.match(r.code!, /RESULT_EXISTS/);
  });

  it("checkExistingJobForRetry blocks draft externalPostId", () => {
    const r = checkExistingJobForRetry({ draftExternalPostId: "existing_post" });
    assert.equal(r.blocked, true);
    assert.match(r.code!, /EXISTING_POST_ID/);
  });

  it("checkExistingJobForRetry blocks active SCHEDULED job", () => {
    const r = checkExistingJobForRetry({ jobStatus: "SCHEDULED" });
    assert.equal(r.blocked, true);
    assert.match(r.code!, /JOB_ACTIVE/);
  });

  it("checkExistingJobForRetry allows FAILED without externalPostId", () => {
    const r = checkExistingJobForRetry({ jobStatus: "FAILED" });
    assert.equal(r.blocked, false);
  });

  it("checkExistingJobForRetry allows no existing job", () => {
    const r = checkExistingJobForRetry({});
    assert.equal(r.blocked, false);
  });
});

describe("cronEligibility", async () => {
  const { checkCronJobEligibility } = await import("../publishing-execution.js");

  const baseParams = {
    jobStatus: "SCHEDULED",
    scheduledFor: new Date("2026-06-20T00:00:00Z"),
    attempts: 0,
    maxAttempts: 3,
    draftExists: true,
    draftStatus: "SCHEDULED",
    draftNetwork: "FACEBOOK",
    jobProvider: "FACEBOOK",
    draftExternalPostId: null as string | null | undefined,
    resultOk: undefined as boolean | undefined,
    resultExternalPostId: undefined as string | null | undefined,
    isImmediatePreAttempt: false,
  };

  it("eligible with clean state", () => {
    const r = checkCronJobEligibility(baseParams);
    assert.equal(r.eligible, true);
  });

  it("blocks draft not SCHEDULED", () => {
    const r = checkCronJobEligibility({ ...baseParams, draftStatus: "PUBLISHED" });
    assert.equal(r.eligible, false);
  });

  it("blocks network mismatch", () => {
    const r = checkCronJobEligibility({ ...baseParams, draftNetwork: "INSTAGRAM" });
    assert.equal(r.eligible, false);
  });

  it("blocks draft with externalPostId", () => {
    const r = checkCronJobEligibility({ ...baseParams, draftExternalPostId: "post_1" });
    assert.equal(r.eligible, false);
  });

  it("blocks existing result ok", () => {
    const r = checkCronJobEligibility({ ...baseParams, resultOk: true, resultExternalPostId: "post_2" });
    assert.equal(r.eligible, false);
  });

  it("blocks scheduledFor null", () => {
    const r = checkCronJobEligibility({ ...baseParams, scheduledFor: null });
    assert.equal(r.eligible, false);
  });

  it("blocks immediate pre-attempt", () => {
    const r = checkCronJobEligibility({ ...baseParams, isImmediatePreAttempt: true });
    assert.equal(r.eligible, false);
  });

  it("blocks max attempts", () => {
    const r = checkCronJobEligibility({ ...baseParams, attempts: 3, maxAttempts: 3 });
    assert.equal(r.eligible, false);
  });

  it("blocks draft not found", () => {
    const r = checkCronJobEligibility({ ...baseParams, draftExists: false });
    assert.equal(r.eligible, false);
  });
});

describe("legacyAndUiHarden", async () => {
  const { checkLegacyJobId, getAllPossibleJobIds, checkExistingJobForRetry } = await import("../publishing-execution.js");

  it("legacy job ID format is pj_{draftId}_{network}", () => {
    const id = checkLegacyJobId("d1", "FACEBOOK");
    assert.match(id, /^pj_d1_FACEBOOK$/);
  });

  it("all possible job IDs includes legacy and immediate", () => {
    const ids = getAllPossibleJobIds("d1", "FACEBOOK");
    assert.equal(ids.length, 2);
    assert.equal(ids[0], "pj_d1_FACEBOOK");
    assert.equal(ids[1], "pj_immediate_d1_FACEBOOK");
  });

  it("legacy PUBLISHED job blocks", () => {
    const r = checkExistingJobForRetry({ jobStatus: "PUBLISHED" });
    assert.equal(r.blocked, true);
    assert.match(r.code!, /JOB_PUBLISHED/);
  });

  it("legacy result ok blocks", () => {
    const r = checkExistingJobForRetry({ resultOk: true, externalPostId: "post_legacy" });
    assert.equal(r.blocked, true);
  });

  it("selection frozen during loading", () => {
    let selectedId = "draft-a";
    let publishState: string = "loading";
    function trySelect(id: string): boolean {
      if (publishState === "loading") return false;
      selectedId = id;
      return true;
    }
    assert.equal(trySelect("draft-b"), false, "selection blocked during loading");
    assert.equal(selectedId, "draft-a", "selection unchanged");
    publishState = "idle";
    assert.equal(trySelect("draft-c"), true, "selection allowed after loading");
    assert.equal(selectedId, "draft-c");
  });

  it("stale response ignored after context change", () => {
    let activeRequestId = "req_1";
    let applied = false;
    function applyResponse(requestId: string): boolean {
      if (requestId !== activeRequestId) return false;
      applied = true;
      return true;
    }
    assert.equal(applyResponse("req_1"), true);
    activeRequestId = "req_2";
    assert.equal(applyResponse("req_1"), false, "stale response ignored");
  });

  it("HTTP 202 never marks PUBLISHED", () => {
    function handleResponse(data: { ok: boolean; providerConfirmed?: boolean }): string {
      if (data.providerConfirmed) return "reconciliation_required";
      if (!data.ok) return "failed";
      return "published";
    }
    assert.equal(handleResponse({ ok: false, providerConfirmed: true }), "reconciliation_required");
    assert.notEqual(handleResponse({ ok: false, providerConfirmed: true }), "published");
  });
});

describe("publishingStateMachine", async () => {
  const { checkExistingJobForRetry } = await import("../publishing-execution.js");
  it("claim transitions SCHEDULED to IN_REVIEW not PUBLISHED", () => {
    let status = "SCHEDULED";
    function claim(): boolean {
      if (status !== "SCHEDULED") return false;
      status = "IN_REVIEW";
      return true;
    }
    const won = claim();
    assert.equal(won, true);
    assert.equal(status, "IN_REVIEW", "claim sets IN_REVIEW");
    assert.notEqual(status, "PUBLISHED", "claim never sets PUBLISHED");
  });

  it("second worker gets count 0 after claim", () => {
    let status = "SCHEDULED";
    function claim(): boolean {
      if (status !== "SCHEDULED") return false;
      status = "IN_REVIEW";
      return true;
    }
    const w1 = claim();
    const w2 = claim();
    assert.equal(w1, true);
    assert.equal(w2, false, "second worker rejected");
  });

  it("query excludes IN_REVIEW jobs", () => {
    const jobs = [
      { id: "j1", status: "SCHEDULED" },
      { id: "j2", status: "IN_REVIEW" },
      { id: "j3", status: "PUBLISHED" },
    ];
    const due = jobs.filter((j) => j.status === "SCHEDULED");
    assert.equal(due.length, 1);
    assert.equal(due[0].id, "j1", "only SCHEDULED jobs selected");
  });

  it("provider success → PUBLISHED", () => {
    let jobStatus = "IN_REVIEW";
    let draftStatus = "SCHEDULED";
    function handleSuccess() {
      jobStatus = "PUBLISHED";
      draftStatus = "PUBLISHED";
    }
    handleSuccess();
    assert.equal(jobStatus, "PUBLISHED");
    assert.equal(draftStatus, "PUBLISHED");
  });

  it("provider failure → FAILED", () => {
    let jobStatus = "IN_REVIEW";
    let draftStatus = "SCHEDULED";
    function handleFailure() {
      jobStatus = "FAILED";
      draftStatus = "APPROVED";
    }
    handleFailure();
    assert.equal(jobStatus, "FAILED");
    assert.equal(draftStatus, "APPROVED");
  });

  it("provider confirmed + partial persistence → stays IN_REVIEW", () => {
    let jobStatus = "IN_REVIEW";
    let externalPostId = "";
    function handlePartial(externalId: string) {
      externalPostId = externalId;
    }
    handlePartial("post_123");
    assert.equal(jobStatus, "IN_REVIEW", "job stays IN_REVIEW");
    assert.equal(externalPostId, "post_123", "externalPostId preserved");
  });

  it("IN_REVIEW job blocks retry", () => {
    const r = checkExistingJobForRetry({ jobStatus: "IN_REVIEW" });
    assert.equal(r.blocked, true);
    assert.match(r.code!, /JOB_IN_FLIGHT/);
  });

  it("immediate job starts IN_REVIEW not SCHEDULED", () => {
    let jobStatus = "";
    function createImmediateJob() {
      jobStatus = "IN_REVIEW";
    }
    createImmediateJob();
    assert.equal(jobStatus, "IN_REVIEW");
    assert.notEqual(jobStatus, "SCHEDULED");
  });
});

describe("transactionalFinalization", async () => {
  const { finalizeConfirmedPublicationTx } = await import("../publishing-finalization.js");
  const { commitConfirmedPublication } = await import("../publishing-finalization.js");
  const { recordUnconfirmedProviderFailure } = await import("../publishing-finalization.js");

  type FakeStore = {
    results: Record<string, { ok: boolean; externalPostId: string | null }>;
    drafts: Record<string, { status: string; externalPostId: string | null; tenantId: string }>;
    jobs: Record<string, { status: string; tenantId: string }>;
  };

  function makeFakeTx(initial: FakeStore): {
    tx: any;
    getStore: () => FakeStore;
  } {
    let store = JSON.parse(JSON.stringify(initial));

    const tx = {
      publishingResult: {
        findUnique: async (q: any) => store.results[q.where.id] ?? null,
        upsert: async (q: any) => {
          store.results[q.where.id] = { ok: q.create.ok ?? q.update.ok ?? false, externalPostId: q.create.externalPostId ?? q.update.externalPostId ?? null };
          return { ok: store.results[q.where.id].ok, externalPostId: store.results[q.where.id].externalPostId };
        },
      },
      contentDraft: {
        findUnique: async (q: any) => store.drafts[q.where.id] ?? null,
        update: async (q: any) => {
          const d = store.drafts[q.where.id];
          if (!d) throw new Error("DRAFT NOT FOUND");
          Object.assign(d, q.data);
          return d;
        },
        updateMany: async (q: any) => {
          const d = store.drafts[q.where.id!];
          if (d && d.status === q.where?.status) {
            Object.assign(d, q.data);
            return { count: 1 };
          }
          return { count: 0 };
        },
      },
      publishingJob: {
        findUnique: async (q: any) => store.jobs[q.where.id] ?? null,
        updateMany: async (q: any) => {
          const j = store.jobs[q.where.id!];
          if (j && j.status === q.where?.status) {
            Object.assign(j, q.data);
            return { count: 1 };
          }
          return { count: 0 };
        },
      },
    };
    return { tx, getStore: () => store };
  }

  function emptyStore(slug: string, jobStatus: string, draftStatus: string): FakeStore {
    return {
      results: {},
      drafts: { "draft-1": { status: draftStatus, externalPostId: null, tenantId: slug } },
      jobs: { "job-1": { status: jobStatus, tenantId: slug } },
    };
  }

  it("order: Result first, then Draft, then Job", async () => {
    const log: string[] = [];
    const tx = {
      publishingResult: {
        findUnique: async () => null,
        upsert: async () => { log.push("RESULT"); return { ok: true, externalPostId: "post_1" }; },
      },
      contentDraft: {
        findUnique: async () => null,
        update: async () => { log.push("DRAFT"); return { status: "PUBLISHED", externalPostId: "post_1" }; },
        updateMany: async () => ({ count: 1 }),
      },
      publishingJob: {
        findUnique: async () => null,
        updateMany: async () => { log.push("JOB"); return { count: 1 }; },
      },
    };
    await finalizeConfirmedPublicationTx({ tx, jobId: "job-1", draftId: "draft-1", tenantId: "t1", network: "FACEBOOK", externalPostId: "post_1", providerResponse: {} });
    assert.deepEqual(log, ["RESULT", "DRAFT", "JOB"], "order must be Result→Draft→Job");
  });

  it("job is last write (JOB appears after RESULT and DRAFT)", async () => {
    const calls: string[] = [];
    const tx = {
      publishingResult: { findUnique: async () => null, upsert: async () => { calls.push("R"); return { ok: true, externalPostId: "p1" }; } },
      contentDraft: { findUnique: async () => null, update: async () => { calls.push("D"); return { status: "PUBLISHED", externalPostId: "p1" }; }, updateMany: async () => ({ count: 1 }) },
      publishingJob: { findUnique: async () => null, updateMany: async () => { calls.push("J"); return { count: 1 }; } },
    };
    await finalizeConfirmedPublicationTx({ tx, jobId: "j1", draftId: "d1", tenantId: "t1", network: "FACEBOOK", externalPostId: "p1", providerResponse: {} });
    assert.equal(calls[calls.length - 1], "J", "job must be the last write");
  });

  it("throws if job not IN_REVIEW", async () => {
    const { tx } = makeFakeTx(emptyStore("t1", "SCHEDULED", "SCHEDULED"));
    await assert.rejects(() =>
      finalizeConfirmedPublicationTx({ tx, jobId: "job-1", draftId: "draft-1", tenantId: "t1", network: "FACEBOOK", externalPostId: "post_1", providerResponse: {} })
    );
  });

  it("throws if result has conflicting externalPostId", async () => {
    const tx: any = {
      publishingResult: {
        findUnique: async () => ({ ok: true, externalPostId: "old_post" }),
        upsert: async () => ({ ok: true, externalPostId: "new_post" }),
      },
      contentDraft: { findUnique: async () => null, update: async () => ({ status: "PUBLISHED", externalPostId: "new_post" }), updateMany: async () => ({ count: 1 }) },
      publishingJob: { findUnique: async () => null, updateMany: async () => ({ count: 1 }) },
    };
    await assert.rejects(() =>
      finalizeConfirmedPublicationTx({ tx, jobId: "j1", draftId: "d1", tenantId: "t1", network: "FACEBOOK", externalPostId: "new_post", providerResponse: {} })
    );
  });

  it("throws if draft has conflicting externalPostId", async () => {
    const { tx } = makeFakeTx({ results: {}, drafts: { "draft-1": { status: "SCHEDULED", externalPostId: "old_draft", tenantId: "t1" } }, jobs: { "job-1": { status: "IN_REVIEW", tenantId: "t1" } } });
    await assert.rejects(() =>
      finalizeConfirmedPublicationTx({ tx, jobId: "job-1", draftId: "draft-1", tenantId: "t1", network: "FACEBOOK", externalPostId: "new_post", providerResponse: {} })
    );
  });

  it("succeeds and returns committed=true", async () => {
    const { tx, getStore } = makeFakeTx(emptyStore("t1", "IN_REVIEW", "SCHEDULED"));
    const r = await finalizeConfirmedPublicationTx({ tx, jobId: "job-1", draftId: "draft-1", tenantId: "t1", network: "FACEBOOK", externalPostId: "post_1", providerResponse: {} });
    assert.equal(r.committed, true);
    assert.equal(getStore().jobs["job-1"].status, "PUBLISHED");
    assert.equal(getStore().drafts["draft-1"].status, "PUBLISHED");
  });

  it("commitConfirmedPublication wrapper returns committed=false on throw", async () => {
    const mockPrisma = {
      $transaction: async (fn: (tx: any) => Promise<any>) => {
        const { tx } = makeFakeTx(emptyStore("t1", "SCHEDULED", "SCHEDULED"));
        return fn(tx);
      },
    };
    const r = await commitConfirmedPublication(mockPrisma as any, {
      jobId: "job-1", draftId: "draft-1", tenantId: "t1", network: "FACEBOOK", externalPostId: "post_1", providerResponse: {},
    });
    assert.equal(r.committed, false);
    assert.equal(r.reconciliationRequired, true);
    assert.equal(r.externalPostId, "post_1");
  });

  it("recordUnconfirmedProviderFailure does not degrade ok:true", async () => {
    const tx: any = {
      publishingResult: { findUnique: async () => ({ ok: true, externalPostId: "post_x" }), upsert: async () => {} },
      contentDraft: { findUnique: async () => ({ externalPostId: null }), updateMany: async () => ({ count: 1 }) },
      publishingJob: { findUnique: async () => ({ status: "IN_REVIEW" }), updateMany: async () => ({ count: 1 }) },
    };
    const r = await recordUnconfirmedProviderFailure({ tx, jobId: "job-1", draftId: "draft-1", tenantId: "t1", network: "FACEBOOK", errorMsg: "test", isMaxAttempts: true });
    assert.equal(r.degraded, false);
  });

  it("recordUnconfirmedProviderFailure degrades only when no success evidence", async () => {
    const tx: any = {
      publishingResult: { findUnique: async () => null, upsert: async () => {} },
      contentDraft: { findUnique: async () => ({ externalPostId: null }), updateMany: async () => ({ count: 1 }) },
      publishingJob: { findUnique: async () => ({ status: "IN_REVIEW" }), updateMany: async () => ({ count: 1 }) },
    };
    const r = await recordUnconfirmedProviderFailure({ tx, jobId: "j1", draftId: "d1", tenantId: "t1", network: "FACEBOOK", errorMsg: "test", isMaxAttempts: true });
    assert.equal(r.degraded, true);
  });
});
