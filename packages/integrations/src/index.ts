import type { ApprovalStatus, SocialNetwork, TenantId } from "@heptacore/core";

export type PublishDraft = {
  tenantId: TenantId;
  network: SocialNetwork;
  externalAccountId: string;
  caption: string;
  mediaAssetIds: string[];
  approvalStatus: ApprovalStatus;
  scheduledFor?: string;
};

export type PublishResult = {
  ok: boolean;
  externalPostId?: string;
  error?: string;
  dryRun?: boolean;
};

export interface SocialNetworkAdapter {
  network: SocialNetwork;
  publish(draft: PublishDraft): Promise<PublishResult>;
  fetchMetrics(externalPostId: string): Promise<Record<string, number>>;
}

export { MockMetaAdapter, MockFacebookAdapter } from "./mock-meta-adapter.js";
export { DiscoveryAdapter, MockDiscoveryAdapter } from "./discovery-adapter.js";
export type { DiscoverySource, DiscoveryResult, DiscoveryItem, DiscoveryMode } from "./discovery-adapter.js";
