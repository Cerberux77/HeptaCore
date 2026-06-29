export type TenantId = string;

export type AutomationMode =
  | "draft_only"
  | "approval_required"
  | "autopilot_limited"
  | "autopilot_full";

export type SocialNetwork =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "x";

export type ApprovalStatus =
  | "draft"
  | "needs_review"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published"
  | "failed";

export const sensitiveActionTypes = [
  "publish_content",
  "spend_campaign_budget",
  "send_sensitive_reply",
  "run_paid_scraper",
  "change_credentials",
  "bulk_message",
  "delete_content"
] as const;

export type SensitiveActionType = (typeof sensitiveActionTypes)[number];

export function requiresHumanApproval(action: SensitiveActionType, mode: AutomationMode) {
  if (mode === "draft_only" || mode === "approval_required") return true;
  if (mode === "autopilot_limited") return action !== "publish_content";
  return true;
}

export * from "./pricing";
export * from "./reconciliation";
export * from "./llm-governance";
