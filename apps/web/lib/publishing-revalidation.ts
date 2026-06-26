import type { OAuthProvider, PublishingJob, ContentDraft, Tenant, SocialAccount, Asset, ContentDraftAsset } from "@prisma/client";
import { TRIAL_POSTS_PER_NETWORK } from "./trial";

export type BlockCategory =
  | "retryable-before-provider"
  | "terminal-before-provider"
  | "reconciliation-required"
  | "provider-failure-retryable"
  | "provider-failure-terminal";

export type RevalidationCode =
  | "TENANT_NOT_FOUND"
  | "TENANT_SUSPENDED"
  | "TENANT_ARCHIVED"
  | "TENANT_DRAFT_ONLY"
  | "DRAFT_NOT_FOUND"
  | "DRAFT_NOT_SCHEDULED"
  | "NETWORK_MISMATCH"
  | "FORMAT_NOT_SUPPORTED_LIVE"
  | "EXTERNAL_POST_ID_EXISTS"
  | "DURABLE_RESULT_EXISTS"
  | "TRIAL_LIMIT_REACHED"
  | "ASSET_REQUIRED_MISSING"
  | "ASSET_URL_NOT_PUBLIC"
  | "SOCIAL_ACCOUNT_NOT_FOUND"
  | "SOCIAL_ACCOUNT_NOT_CONNECTED"
  | "MISSING_SCOPES"
  | "CREDENTIAL_UNRESOLVABLE"
  | "MAX_ATTEMPTS_REACHED";

export interface RevalidationBlock {
  code: RevalidationCode;
  category: BlockCategory;
  reason: string;
}

export interface RevalidationResult {
  valid: boolean;
  blocks: RevalidationBlock[];
}

export interface RevalidationContext {
  tenant: Tenant | null;
  draft: (ContentDraft & {
    assets: (ContentDraftAsset & { asset: Asset })[];
  }) | null;
  job: PublishingJob;
  socialAccount: (SocialAccount & { scopes: string[]; externalAccountId: string | null }) | null;
  credentialResolvable: boolean;
  publishedCountOnNetwork: number;
  formatSupportedForLive: boolean;
  assetUrlPublic: boolean;
  requiredScopesPresent: boolean;
  hasDurableResult: boolean;
  maxAttempts: number;
}

export function classifyBlock(code: RevalidationCode): BlockCategory {
  switch (code) {
    case "TENANT_NOT_FOUND":
    case "TENANT_SUSPENDED":
    case "TENANT_ARCHIVED":
    case "TENANT_DRAFT_ONLY":
    case "DRAFT_NOT_FOUND":
    case "DRAFT_NOT_SCHEDULED":
    case "NETWORK_MISMATCH":
    case "FORMAT_NOT_SUPPORTED_LIVE":
    case "EXTERNAL_POST_ID_EXISTS":
    case "DURABLE_RESULT_EXISTS":
    case "MAX_ATTEMPTS_REACHED":
      return "terminal-before-provider";
    case "TRIAL_LIMIT_REACHED":
    case "ASSET_REQUIRED_MISSING":
    case "ASSET_URL_NOT_PUBLIC":
    case "SOCIAL_ACCOUNT_NOT_FOUND":
    case "SOCIAL_ACCOUNT_NOT_CONNECTED":
    case "MISSING_SCOPES":
    case "CREDENTIAL_UNRESOLVABLE":
      return "retryable-before-provider";
  }
}

export function revalidateJob(ctx: RevalidationContext): RevalidationResult {
  const blocks: RevalidationBlock[] = [];
  const add = (code: RevalidationCode, reason: string) => {
    blocks.push({ code, category: classifyBlock(code), reason });
  };

  if (!ctx.tenant) {
    add("TENANT_NOT_FOUND", "Tenant not found.");
  } else if (ctx.tenant.status === "SUSPENDED") {
    add("TENANT_SUSPENDED", "Tenant is suspended.");
  } else if (ctx.tenant.status === "ARCHIVED") {
    add("TENANT_ARCHIVED", "Tenant is archived.");
  } else if (ctx.tenant.automationMode === "DRAFT_ONLY") {
    add("TENANT_DRAFT_ONLY", "Tenant is in DRAFT_ONLY mode.");
  }

  if (!ctx.draft) {
    add("DRAFT_NOT_FOUND", "Draft not found.");
  } else {
    if (ctx.draft.status !== "SCHEDULED") {
      add("DRAFT_NOT_SCHEDULED", `Draft status is ${ctx.draft.status}, expected SCHEDULED.`);
    }

    if (ctx.draft.network !== ctx.job.provider) {
      add("NETWORK_MISMATCH", `Draft network ${ctx.draft.network} does not match job provider ${ctx.job.provider}.`);
    }

    if (ctx.draft.externalPostId) {
      add("EXTERNAL_POST_ID_EXISTS", "Draft already has externalPostId.");
    }

    if (!ctx.formatSupportedForLive) {
      add("FORMAT_NOT_SUPPORTED_LIVE", "Format is not supported for live publishing.");
    }
  }

  if (ctx.hasDurableResult) {
    add("DURABLE_RESULT_EXISTS", "Durable provider success already exists.");
  }

  if (ctx.job.attempts >= ctx.maxAttempts) {
    add("MAX_ATTEMPTS_REACHED", `Max attempts (${ctx.maxAttempts}) reached.`);
  }

  if (ctx.publishedCountOnNetwork >= TRIAL_POSTS_PER_NETWORK) {
    add("TRIAL_LIMIT_REACHED", `Trial limit reached: ${ctx.publishedCountOnNetwork}/${TRIAL_POSTS_PER_NETWORK}.`);
  }

  const needsAsset = ctx.draft && ctx.draft.assets.length > 0;
  if (needsAsset && !ctx.draft) {
    add("ASSET_REQUIRED_MISSING", "Draft requires assets but none linked.");
  }

  if (!ctx.assetUrlPublic && needsAsset) {
    add("ASSET_URL_NOT_PUBLIC", "Asset URL is not publicly accessible via HTTPS.");
  }

  if (!ctx.socialAccount) {
    add("SOCIAL_ACCOUNT_NOT_FOUND", "No social account found.");
  } else {
    if (ctx.socialAccount.status !== "connected") {
      add("SOCIAL_ACCOUNT_NOT_CONNECTED", "Social account is not connected.");
    }
    if (!ctx.requiredScopesPresent) {
      add("MISSING_SCOPES", "Required publishing scopes are missing.");
    }
  }

  if (!ctx.credentialResolvable) {
    add("CREDENTIAL_UNRESOLVABLE", "Credential could not be resolved.");
  }

  return { valid: blocks.length === 0, blocks };
}
