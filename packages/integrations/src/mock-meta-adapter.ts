import type { SocialNetworkAdapter, PublishDraft, PublishResult } from "./index.js";
import type { SocialNetwork, ApprovalStatus } from "@heptacore/core";

export class MockMetaAdapter implements SocialNetworkAdapter {
  readonly network: SocialNetwork = "instagram";
  private readonly mode: "draft" | "dry-run";

  constructor(mode: "draft" | "dry-run" = "dry-run") {
    this.mode = mode;
  }

  async publish(draft: PublishDraft): Promise<PublishResult> {
    // Gate 1: Approval required for publishing
    if (draft.approvalStatus !== "approved") {
      return {
        ok: false,
        error: `Draft not approved (status: ${draft.approvalStatus}). Requires human approval.`,
      };
    }

    // Gate 2: Real publishing blocked in draft/dry-run modes
    if (this.mode === "draft" || this.mode === "dry-run") {
      const mockId = `mock_${draft.network}_${Date.now().toString(36)}`;
      return {
        ok: true,
        externalPostId: mockId,
        dryRun: true,
      };
    }

    // Gate 3: No real tokens — live mode blocked
    return {
      ok: false,
      error: "Live publishing requires real OAuth tokens (not available in sandbox).",
    };
  }

  async fetchMetrics(externalPostId: string): Promise<Record<string, number>> {
    if (externalPostId.startsWith("mock_")) {
      return {
        likes: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 20),
        shares: Math.floor(Math.random() * 10),
        impressions: Math.floor(Math.random() * 1000),
      };
    }
    return {};
  }
}

export class MockFacebookAdapter implements SocialNetworkAdapter {
  readonly network: SocialNetwork = "facebook";
  private readonly mode: "draft" | "dry-run";

  constructor(mode: "draft" | "dry-run" = "dry-run") {
    this.mode = mode;
  }

  async publish(draft: PublishDraft): Promise<PublishResult> {
    if (draft.approvalStatus !== "approved") {
      return {
        ok: false,
        error: `Draft not approved (status: ${draft.approvalStatus}). Requires human approval.`,
      };
    }

    if (this.mode === "draft" || this.mode === "dry-run") {
      const mockId = `mock_${draft.network}_${Date.now().toString(36)}`;
      return { ok: true, externalPostId: mockId };
    }

    return {
      ok: false,
      error: "Live publishing requires real OAuth tokens.",
    };
  }

  async fetchMetrics(externalPostId: string): Promise<Record<string, number>> {
    if (externalPostId.startsWith("mock_")) {
      return {
        likes: Math.floor(Math.random() * 80),
        comments: Math.floor(Math.random() * 15),
        shares: Math.floor(Math.random() * 5),
      };
    }
    return {};
  }
}
