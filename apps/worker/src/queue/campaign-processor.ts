import type { PublishDraftJob, QueueJobResult } from "./types.js";
import { prisma } from "./prisma.js";

export interface CampaignJob {
  tenantId: string;
  socialAccountId?: string;
  network?: string;
  name: string;
  objective: string;
  platformBudget: number;
  mode: "draft" | "dry-run" | "live";
}

function calcTotalCharge(platformBudget: number, overheadRate: number): number {
  return platformBudget * (1 + overheadRate);
}

export async function processCampaign(
  job: CampaignJob,
): Promise<QueueJobResult> {
  const { tenantId, socialAccountId, network, name, objective, platformBudget, mode } = job;
  const overheadRate = 0.35; // 35% HeptaCore overhead gate

  if (mode === "live") {
    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "campaign_live_blocked",
        target: `campaign:${name}`,
        metadata: {
          reason: "Real campaign spend is blocked by design. Requires explicit production unlock and Manuel approval.",
          attemptedMode: mode,
        } as any,
      },
    });

    return {
      ok: false,
      tenantId,
      error: "Live campaign spend blocked. Real ad spend requires explicit production unlock and Manuel approval.",
    };
  }

  if (platformBudget <= 0) {
    return { ok: false, tenantId, error: "Platform budget must be greater than zero" };
  }

  const totalCharge = calcTotalCharge(platformBudget, overheadRate);
  const overheadAmount = platformBudget * overheadRate;

  const campaign = await prisma.campaign.create({
    data: {
      tenantId,
      socialAccountId: socialAccountId ?? null,
      network: (network as any) ?? "INSTAGRAM",
      name,
      objective,
      platformBudget,
      overheadRate,
      totalCharge,
      status: "PROPOSED",
      recommendation: {
        breakdown: {
          platformSpend: platformBudget,
          heptaCoreOverhead: overheadAmount,
          overheadRate: `${(overheadRate * 100).toFixed(0)}%`,
          totalClientCharge: totalCharge,
        },
        notes: [
          "Campaign spend remains blocked until explicitly approved.",
          "HeptaCore overhead covers strategy, creative, scheduling, monitoring and reporting.",
          "Platform costs are charged directly by Meta/Instagram/Facebook.",
          "No real spend can execute from default environment configuration.",
        ],
        mode,
        requiresApproval: true,
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "campaign_proposed",
      target: `campaign:${campaign.id}`,
      metadata: {
        name,
        network,
        platformBudget,
        overheadRate,
        totalCharge,
        status: "PROPOSED",
        mode,
      } as any,
    },
  });

  console.log(
    `[campaign] Proposed: ${name} | Budget: $${platformBudget} | Overhead: $${overheadAmount.toFixed(2)} (35%) | Total: $${totalCharge.toFixed(2)} | Status: PROPOSED`,
  );

  return {
    ok: true,
    tenantId,
    action: "campaign_proposed",
    dryRun: true,
  };
}
