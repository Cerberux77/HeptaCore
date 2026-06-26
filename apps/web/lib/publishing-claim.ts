export function buildDeterministicScheduledJobId(draftId: string, network: string, scheduledFor: Date): string {
  const ts = scheduledFor.getTime().toString(36);
  return `pj_scheduled_${draftId}_${network}_${ts}`;
}

export function generateClaimToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ClaimResult {
  claimed: boolean;
  jobId: string;
  claimToken?: string;
  reason?: string;
}

export async function claimJob(
  prisma: {
    publishingJob: {
      updateMany(args: {
        where: { id: string; status: string };
        data: Record<string, unknown>;
      }): Promise<{ count: number }>;
    };
  },
  jobId: string,
  expectedStatus: string = "SCHEDULED"
): Promise<ClaimResult> {
  const token = generateClaimToken();
  const now = new Date();

  const result = await prisma.publishingJob.updateMany({
    where: { id: jobId, status: expectedStatus },
    data: {
      status: "IN_REVIEW",
      claimedAt: now,
      claimToken: token,
      updatedAt: now,
    },
  });

  if (result.count === 0) {
    return { claimed: false, jobId, reason: "Job not in expected status or already claimed." };
  }

  return { claimed: true, jobId, claimToken: token };
}

export function isClaimExpired(claimedAt: Date, now: Date, ttlMs: number = 300000): boolean {
  return now.getTime() - claimedAt.getTime() > ttlMs;
}

export function canReclaimExpiredJob(
  jobStatus: string,
  claimedAt: Date | null,
  providerAttemptStartedAt: Date | null,
  now: Date,
  ttlMs: number = 300000
): { canReclaim: boolean; reason?: string } {
  if (jobStatus !== "IN_REVIEW") {
    return { canReclaim: false, reason: `Job status is ${jobStatus}, not IN_REVIEW.` };
  }

  if (providerAttemptStartedAt) {
    return {
      canReclaim: false,
      reason: "Provider call already started. Requires manual reconciliation.",
    };
  }

  if (!claimedAt) {
    return { canReclaim: false, reason: "No claimedAt timestamp; claim data inconsistent." };
  }

  if (!isClaimExpired(claimedAt, now, ttlMs)) {
    return { canReclaim: false, reason: "Claim is still active." };
  }

  return { canReclaim: true };
}
