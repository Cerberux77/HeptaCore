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
};

export interface SocialNetworkAdapter {
  network: SocialNetwork;
  publish(draft: PublishDraft): Promise<PublishResult>;
  fetchMetrics(externalPostId: string): Promise<Record<string, number>>;
}
