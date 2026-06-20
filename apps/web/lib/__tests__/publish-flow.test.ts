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
  return automationMode === "APPROVAL_REQUIRED" || automationMode === "DRAFT_ONLY";
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

  it("requires approval for DRAFT_ONLY with scheduled", () => {
    assert.equal(needsApproval("DRAFT_ONLY", "scheduled"), true);
  });

  it("does not require approval for dry_run", () => {
    assert.equal(needsApproval("APPROVAL_REQUIRED", "dry_run"), false);
  });

  it("does not require approval for AUTOPILOT_FULL", () => {
    assert.equal(needsApproval("AUTOPILOT_FULL", "immediate"), false);
  });

  it("does not require approval for AUTOPILOT_LIMITED", () => {
    assert.equal(needsApproval("AUTOPILOT_LIMITED", "immediate"), false);
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
