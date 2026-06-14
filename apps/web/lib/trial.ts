/**
 * HeptaCore — Trial Gate
 *
 * Cada tenant tiene 2 publicaciones gratis por red social.
 * Al alcanzar el límite, se bloquea la publicación y se muestra CTA de pago.
 */

import { prisma } from "./prisma";

const TRIAL_POSTS_PER_NETWORK = 999999;

export interface TrialStatus {
  trialActive: boolean;
  postsRemaining: Record<string, number>;
  exhaustedNetworks: string[];
  totalPublished: number;
  limitPerNetwork: number;
}

export async function getTrialStatus(tenantId: string): Promise<TrialStatus> {
  const published = await prisma.contentDraft.groupBy({
    by: ["network"],
    where: { tenantId, status: "PUBLISHED" },
    _count: true,
  });

  const postsRemaining: Record<string, number> = {};
  const exhaustedNetworks: string[] = [];
  let totalPublished = 0;

  const allNetworks = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "LINKEDIN", "X"];

  for (const network of allNetworks) {
    const count = published.find((p) => p.network === network)?._count ?? 0;
    totalPublished += count;
    const remaining = Math.max(0, TRIAL_POSTS_PER_NETWORK - count);
    postsRemaining[network] = remaining;
    if (remaining === 0) exhaustedNetworks.push(network);
  }

  const trialActive = exhaustedNetworks.length < 2; // trial active if at least 2 networks still have posts

  return {
    trialActive,
    postsRemaining,
    exhaustedNetworks,
    totalPublished,
    limitPerNetwork: TRIAL_POSTS_PER_NETWORK,
  };
}

export { TRIAL_POSTS_PER_NETWORK };
