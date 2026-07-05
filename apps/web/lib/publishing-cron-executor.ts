import type {
  Pub04CronDeps,
  Pub04CronInput,
  Pub04CronResult,
  Pub04CronSummary,
  Pub04JobOutcome,
  Pub04Context,
  Pub04Job,
  Pub04Publisher,
} from "../../../contracts/S-HC-PUB-04/pub04-contract.js";
import type { ReconciliationReportEntry } from "./publishing-observability.js";

function findSocialAccount(ctx: Pub04Context): Pub04Context["socialAccounts"][0] | null {
  const draft = ctx.draft;
  if (draft?.socialAccountId) {
    const fixed = ctx.socialAccounts.find(
      (a) => a.id === draft.socialAccountId && a.network === ctx.job.provider && a.status === "connected"
    );
    if (fixed) return fixed;
    return null;
  }
  const fallback = ctx.socialAccounts.find(
    (a) => a.network === ctx.job.provider && a.status === "connected"
  );
  if (fallback) return fallback;
  return null;
}

function checkFormatSupported(publisher: Pub04Publisher, draft: Pub04Context["draft"]): boolean {
  if (!draft) return false;
  const format = draft.format;
  if (publisher.supportedFormats.includes(format)) return true;
  if (publisher.textOnly && draft.assets.length === 0) return true;
  return false;
}

async function processJob(
  job: Pub04Job,
  deps: Pub04CronDeps,
  input: Pub04CronInput,
  dryRun: boolean
): Promise<{ outcome: Pub04JobOutcome; publishedCount: number; reconciliationCount: number; reconciliationAlerts: ReconciliationReportEntry[] }> {
  let publishedCount = 0;
  let reconciliationCount = 0;
  const reconciliationAlerts: ReconciliationReportEntry[] = [];

  const now = deps.now();
  const claimToken = deps.newClaimToken();

    if (dryRun) {
    const ctx = await deps.repo.loadContext(job.id);
    if (!ctx) {
      return { outcome: { jobId: job.id, code: "DRY_RUN_BLOCKED", reason: "Context not found" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
    }
    const publisher = deps.getPublisher(ctx.job.provider);
    const account = findSocialAccount(ctx);
    const preflightErrors: string[] = [];

    if (!ctx.tenant) {
      preflightErrors.push("Tenant not found");
    } else if (ctx.tenant.status !== "ACTIVE") {
      preflightErrors.push("Tenant not active");
    } else if (ctx.tenant.automationMode === "DRAFT_ONLY") {
      preflightErrors.push("Tenant is DRAFT_ONLY");
    }

    if (!ctx.draft) {
      preflightErrors.push("Draft not found");
    } else {
      if (ctx.draft.status !== "SCHEDULED") {
        preflightErrors.push("Draft not scheduled");
      }
      if (ctx.draft.network !== ctx.job.provider) {
        preflightErrors.push("Network mismatch");
      }
      if (ctx.draft.externalPostId) {
        preflightErrors.push("Already has externalPostId");
      }
    }

    if (ctx.durableResult?.ok) {
      preflightErrors.push("Durable result exists");
    }

    if (job.attempts >= input.maxAttempts) {
      preflightErrors.push("Max attempts reached");
    }

    if (ctx.publishedCountOnNetwork >= ctx.trialLimit) {
      preflightErrors.push("Trial limit reached");
    }

    if (!publisher) {
      preflightErrors.push("Publisher not implemented");
    } else {
      if (!checkFormatSupported(publisher, ctx.draft)) {
        preflightErrors.push("Format not supported");
      }

      const hasRequiredScopes = account
        ? publisher.requiredScopes.every(
            (s) => account.scopes.includes(s) || account.scopes.includes(s.replace("instagram_business_", ""))
          )
        : false;
      if (!hasRequiredScopes) {
        preflightErrors.push("Missing required scopes");
      }

      const needsAsset = !publisher.textOnly || (ctx.draft?.assets?.length ?? 0) > 0;
      if (needsAsset && (!ctx.draft?.assets || ctx.draft.assets.length === 0)) {
        preflightErrors.push("Missing required asset");
      } else if (needsAsset && ctx.draft?.assets) {
        const hasPublicUrl = ctx.draft.assets.some((a) => a.publicUrl && a.publicUrl.startsWith("https://"));
        if (!hasPublicUrl) {
          preflightErrors.push("Asset URL not public");
        }
      }
    }

    if (!account) {
      preflightErrors.push("No connected social account");
    }

    if (preflightErrors.length === 0) {
      return { outcome: { jobId: job.id, code: "DRY_RUN_ELIGIBLE" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
    }
    return { outcome: { jobId: job.id, code: "DRY_RUN_BLOCKED", reason: preflightErrors.join(", ") }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  let claimed = false;
  let activeClaimToken = claimToken;

  if (job.status === "IN_REVIEW" && job.claimedAt && !job.providerAttemptStartedAt) {
    const reclaimed = await deps.repo.reclaimExpiredPreProvider({
      jobId: job.id,
      claimToken,
      now,
      leaseTtlMs: input.leaseTtlMs,
    });
    if (reclaimed) {
      claimed = true;
    }
  }

  if (!claimed && job.status === "SCHEDULED") {
    const claimResult = await deps.repo.claimScheduled({
      jobId: job.id,
      claimToken,
      now,
    });
    if (claimResult) {
      claimed = true;
    }
  }

  if (!claimed) {
    if (job.status === "IN_REVIEW" && job.providerAttemptStartedAt) {
      await deps.repo.markReconciliation({ jobId: job.id, claimToken: job.claimToken, code: "RECONCILIATION_REQUIRED", now });
      reconciliationAlerts.push({
        jobId: job.id,
        draftId: "",
        case: "CASE_C_BLOCK",
        reason: "Lease post-proveedor expiro sin confirmacion. Sin evidencia suficiente.",
        committed: false,
        requiresHumanReview: true,
      });
      return { outcome: { jobId: job.id, code: "RECONCILIATION_REQUIRED", reason: "Post-provider lease expired" }, publishedCount: 0, reconciliationCount: 1, reconciliationAlerts };
    }
    return { outcome: { jobId: job.id, code: "SKIPPED_CLAIM_LOST", reason: "Claim lost" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  if (job.attempts >= input.maxAttempts) {
    await deps.repo.recordPreProviderBlock({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: "MAX_ATTEMPTS",
      terminal: true,
      now,
    });
    return { outcome: { jobId: job.id, code: "SKIPPED_MAX_ATTEMPTS" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  const ctx = await deps.repo.loadContext(job.id);
  if (!ctx) {
    await deps.repo.recordPreProviderBlock({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: "CONTEXT_NOT_FOUND",
      terminal: true,
      now,
    });
    return { outcome: { jobId: job.id, code: "PRE_PROVIDER_BLOCKED", reason: "Context not found" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  if (ctx.durableResult?.ok && ctx.durableResult.externalPostId) {
    const reconciled = await deps.repo.reconcileDurableSuccess({
      jobId: job.id,
      externalPostId: ctx.durableResult.externalPostId,
      now,
    });
    if (reconciled === "committed") {
      reconciliationAlerts.push({
        jobId: job.id,
        draftId: ctx.draft?.id ?? "",
        case: "CASE_A_AUTO",
        reason: "Reconciliacion automatica exitosa desde PublishingResult.",
        committed: true,
        requiresHumanReview: false,
      });
      return { outcome: { jobId: job.id, code: "PUBLISHED" }, publishedCount: 1, reconciliationCount: 0, reconciliationAlerts };
    }
    reconciliationAlerts.push({
      jobId: job.id,
      draftId: ctx.draft?.id ?? "",
      case: "CASE_A_AUTO",
      reason: "Conflicto en reconciliacion de resultado durable.",
      committed: false,
      requiresHumanReview: false,
    });
    return { outcome: { jobId: job.id, code: "RECONCILIATION_REQUIRED", reason: "Durable success conflict" }, publishedCount: 0, reconciliationCount: 1, reconciliationAlerts };
  }

  const publisher = deps.getPublisher(ctx.job.provider);

  // Structural invariants — evaluated before social accounts and format
  if (!ctx.tenant || ctx.tenant.status !== "ACTIVE") {
    await deps.repo.recordPreProviderBlock({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: "TENANT_INVALID",
      terminal: true,
      now,
    });
    return { outcome: { jobId: job.id, code: "PRE_PROVIDER_BLOCKED", reason: "Tenant not active" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  if (ctx.tenant.automationMode === "DRAFT_ONLY") {
    await deps.repo.recordPreProviderBlock({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: "DRAFT_ONLY",
      terminal: true,
      now,
    });
    return { outcome: { jobId: job.id, code: "PRE_PROVIDER_BLOCKED", reason: "Tenant is DRAFT_ONLY" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  if (!ctx.draft || ctx.draft.status !== "SCHEDULED") {
    await deps.repo.recordPreProviderBlock({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: ctx.draft ? "DRAFT_NOT_SCHEDULED" : "DRAFT_NOT_FOUND",
      terminal: true,
      now,
    });
    return { outcome: { jobId: job.id, code: "PRE_PROVIDER_BLOCKED", reason: ctx.draft ? "Draft not in SCHEDULED" : "Draft not found" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  if (ctx.draft.network !== ctx.job.provider) {
    await deps.repo.recordPreProviderBlock({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: "NETWORK_MISMATCH",
      terminal: true,
      now,
    });
    return { outcome: { jobId: job.id, code: "PRE_PROVIDER_BLOCKED", reason: "Network mismatch" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  if (ctx.draft.externalPostId) {
    await deps.repo.recordPreProviderBlock({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: "ALREADY_PUBLISHED",
      terminal: true,
      now,
    });
    reconciliationAlerts.push({
      jobId: job.id,
      draftId: ctx.draft.id,
      case: "CASE_B_ALERT",
      reason: "Draft tiene externalPostId pero no existe PublishingResult. Requiere revision humana.",
      committed: false,
      requiresHumanReview: true,
    });
    return { outcome: { jobId: job.id, code: "PRE_PROVIDER_BLOCKED", reason: "Draft already published" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  if (ctx.publishedCountOnNetwork >= ctx.trialLimit) {
    await deps.repo.recordPreProviderBlock({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: "TRIAL_LIMIT",
      terminal: false,
      now,
    });
    return { outcome: { jobId: job.id, code: "PRE_PROVIDER_BLOCKED", reason: "Trial limit reached" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  if (!publisher) {
    await deps.repo.recordPreProviderBlock({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: "NO_PUBLISHER",
      terminal: true,
      now,
    });
    return { outcome: { jobId: job.id, code: "PRE_PROVIDER_BLOCKED", reason: "Publisher not implemented" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  const account = findSocialAccount(ctx);
  if (!account) {
    await deps.repo.recordPreProviderBlock({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: "NO_SOCIAL_ACCOUNT",
      terminal: false,
      now,
    });
    return { outcome: { jobId: job.id, code: "PRE_PROVIDER_BLOCKED", reason: "No connected social account" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  if (!checkFormatSupported(publisher, ctx.draft)) {
    await deps.repo.recordPreProviderBlock({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: "FORMAT_NOT_SUPPORTED",
      terminal: true,
      now,
    });
    return { outcome: { jobId: job.id, code: "PRE_PROVIDER_BLOCKED", reason: "Format not supported for live" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  const hasRequiredScopes = publisher.requiredScopes.every(
    (s) => account.scopes.includes(s) || account.scopes.includes(s.replace("instagram_business_", ""))
  );
  if (!hasRequiredScopes) {
    await deps.repo.recordPreProviderBlock({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: "MISSING_SCOPES",
      terminal: false,
      now,
    });
    return { outcome: { jobId: job.id, code: "PRE_PROVIDER_BLOCKED", reason: "Missing required scopes" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  const needsAsset = !publisher.textOnly || (ctx.draft?.assets?.length ?? 0) > 0;
  if (needsAsset && (!ctx.draft?.assets || ctx.draft.assets.length === 0)) {
    await deps.repo.recordPreProviderBlock({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: "MISSING_ASSET",
      terminal: false,
      now,
    });
    return { outcome: { jobId: job.id, code: "PRE_PROVIDER_BLOCKED", reason: "Missing required asset" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  if (needsAsset && ctx.draft?.assets) {
    const hasPublicUrl = ctx.draft.assets.some((a) => a.publicUrl && a.publicUrl.startsWith("https://"));
    if (!hasPublicUrl) {
      await deps.repo.recordPreProviderBlock({
        jobId: job.id,
        claimToken: activeClaimToken,
        code: "ASSET_NOT_PUBLIC",
        terminal: false,
        now,
      });
      return { outcome: { jobId: job.id, code: "PRE_PROVIDER_BLOCKED", reason: "Asset URL not public" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
    }
  }

  if (!account.externalAccountId) {
    await deps.repo.recordPreProviderBlock({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: "NO_EXTERNAL_ID",
      terminal: false,
      now,
    });
    return { outcome: { jobId: job.id, code: "PRE_PROVIDER_BLOCKED", reason: "Missing external account ID" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  const credential = await deps.resolveCredential({
    tenantId: job.tenantId,
    provider: job.provider,
    socialAccountId: account.id,
  });
  if (!credential.ok) {
    await deps.repo.recordPreProviderBlock({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: credential.code,
      terminal: false,
      now,
    });
    return { outcome: { jobId: job.id, code: "PRE_PROVIDER_BLOCKED", reason: credential.code }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  const started = await deps.repo.markProviderAttemptStarted({
    jobId: job.id,
    claimToken: activeClaimToken,
    now,
  });
  if (!started) {
    return { outcome: { jobId: job.id, code: "SKIPPED_CLAIM_LOST", reason: "Claim token invalid after validation" }, publishedCount: 0, reconciliationCount: 0, reconciliationAlerts };
  }

  const mediaAsset = ctx.draft?.assets?.find((a) => a.publicUrl?.startsWith("https://"));
  const mediaUrl = mediaAsset?.publicUrl ?? undefined;

  let providerResult: Awaited<ReturnType<Pub04Publisher["publish"]>>;
  try {
    providerResult = await publisher.publish({
      targetId: credential.targetId,
      accessToken: credential.accessToken,
      caption: ctx.draft?.caption ?? ctx.draft?.title ?? "",
      mediaUrl,
      mediaType: mediaAsset ? (mediaAsset.kind === "VIDEO" ? "VIDEO" : "IMAGE") : undefined,
      format: ctx.draft?.format,
    });
  } catch {
    providerResult = { kind: "terminal_failure", error: "Publisher threw unexpectedly" };
  }

  if (providerResult.kind === "success") {
    const finalizeResult = await deps.repo.finalizeSuccess({
      jobId: job.id,
      claimToken: activeClaimToken,
      externalPostId: providerResult.externalPostId,
      providerResponse: providerResult.providerResponse,
      now,
    });
    if (finalizeResult === "committed") {
      return { outcome: { jobId: job.id, code: "PUBLISHED" }, publishedCount: 1, reconciliationCount: 0, reconciliationAlerts };
    }
    await deps.repo.markReconciliation({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: "FINALIZE_FAILED",
      now,
    });
    reconciliationAlerts.push({
      jobId: job.id,
      draftId: ctx.draft?.id ?? "",
      case: "CASE_A_AUTO",
      reason: "Proveedor confirmo pero la persistencia local fallo. Requiere reconciliacion.",
      committed: false,
      requiresHumanReview: false,
    });
    return { outcome: { jobId: job.id, code: "RECONCILIATION_REQUIRED", reason: "Provider confirmed but local persistence failed" }, publishedCount: 0, reconciliationCount: 1, reconciliationAlerts };
  }

  if (providerResult.kind === "ambiguous") {
    await deps.repo.markReconciliation({
      jobId: job.id,
      claimToken: activeClaimToken,
      code: "AMBIGUOUS",
      now,
    });
    reconciliationAlerts.push({
      jobId: job.id,
      draftId: ctx.draft?.id ?? "",
      case: "CASE_C_BLOCK",
      reason: `Resultado ambiguo del proveedor: ${providerResult.error}. Sin evidencia suficiente.`,
      committed: false,
      requiresHumanReview: true,
    });
    return { outcome: { jobId: job.id, code: "RECONCILIATION_REQUIRED", reason: providerResult.error }, publishedCount: 0, reconciliationCount: 1, reconciliationAlerts };
  }

  const isRetryable = providerResult.kind === "retryable_failure";
  await deps.repo.recordProviderFailure({
    jobId: job.id,
    claimToken: activeClaimToken,
    error: providerResult.error,
    retryable: isRetryable,
    maxAttempts: input.maxAttempts,
    now,
  });

  return {
    outcome: {
      jobId: job.id,
      code: isRetryable ? "RETRYABLE_FAILURE" : "TERMINAL_FAILURE",
      reason: providerResult.error,
    },
    publishedCount: 0,
    reconciliationCount: 0,
    reconciliationAlerts,
  };
}

export async function executePublishingCron(
  input: Pub04CronInput,
  deps: Pub04CronDeps
): Promise<Pub04CronResult> {
  const now = deps.now();
  const start = now.getTime();

  const totalDue = await deps.repo.countDue({ now });
  const candidates = await deps.repo.listCandidates({
    now,
    limit: input.batchLimit,
    leaseTtlMs: input.leaseTtlMs,
  });

  const outcomes: Pub04JobOutcome[] = [];
  const allReconciliationAlerts: ReconciliationReportEntry[] = [];
  let published = 0;
  let reconciliationRequired = 0;
  let retryableFailures = 0;
  let terminalFailures = 0;
  let skipped = 0;
  let claimed = 0;

  for (const job of candidates) {
    const elapsed = deps.now().getTime() - start;
    if (elapsed >= input.timeBudgetMs) {
      outcomes.push({ jobId: job.id, code: "SKIPPED_TIME_BUDGET", reason: "Time budget exhausted" });
      skipped++;
      continue;
    }

    const result = await processJob(job, deps, input, input.dryRun);
    outcomes.push(result.outcome);
    published += result.publishedCount;
    reconciliationRequired += result.reconciliationCount;
    allReconciliationAlerts.push(...result.reconciliationAlerts);

    switch (result.outcome.code) {
      case "RETRYABLE_FAILURE":
        retryableFailures++;
        break;
      case "TERMINAL_FAILURE":
        terminalFailures++;
        break;
      case "SKIPPED_CLAIM_LOST":
      case "SKIPPED_ACTIVE_CLAIM":
      case "SKIPPED_MAX_ATTEMPTS":
      case "SKIPPED_TIME_BUDGET":
        skipped++;
        break;
      case "PUBLISHED":
      case "RECONCILIATION_REQUIRED":
      case "PRE_PROVIDER_BLOCKED":
      case "DRY_RUN_ELIGIBLE":
      case "DRY_RUN_BLOCKED":
        if (
          result.outcome.code === "DRY_RUN_ELIGIBLE" ||
          result.outcome.code === "DRY_RUN_BLOCKED"
        ) {
          // dry-run outcomes are not counted as skipped/published
        }
        break;
    }
    if (
      result.outcome.code === "PUBLISHED" ||
      result.outcome.code === "RECONCILIATION_REQUIRED" ||
      result.outcome.code === "RETRYABLE_FAILURE" ||
      result.outcome.code === "TERMINAL_FAILURE" ||
      result.outcome.code === "PRE_PROVIDER_BLOCKED"
    ) {
      claimed++;
    }
  }

  const timeBudgetSkips = outcomes.filter((o) => o.code === "SKIPPED_TIME_BUDGET").length;
  const remainingDue = Math.max(0, totalDue - candidates.length) + timeBudgetSkips;

  const summary: Pub04CronSummary = {
    totalDue,
    selected: candidates.length,
    claimed,
    published,
    reconciliationRequired,
    retryableFailures,
    terminalFailures,
    skipped,
    remainingDue: Math.max(0, remainingDue),
    timeBudgetExhausted: outcomes.some((o) => o.code === "SKIPPED_TIME_BUDGET"),
    reconciliationAlerts: allReconciliationAlerts,
  };

  return { summary, outcomes };
}
