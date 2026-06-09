import { cache } from "react";
import { prisma } from "./prisma";

export type DashboardMetrics = {
  tenant: {
    id: string;
    slug: string;
    name: string;
    plan: string;
    mode: string;
  };
  counts: {
    totalDrafts: number;
    drafts: number;
    approved: number;
    needsReview: number;
    scheduled: number;
    published: number;
    failed: number;
    totalAssets: number;
  };
  nextUp: Array<{
    id: string;
    title: string;
    network: string;
    format: string;
    status: string;
    riskLevel: string;
    scheduledFor: string | null;
    assetPath: string | null;
  }>;
  pillars: Array<{ name: string; count: number }>;
};

export type DraftQueueItem = {
  id: string;
  title: string;
  caption: string;
  network: string;
  format: string;
  pillar: string | null;
  status: string;
  riskLevel: string;
  requiresReview: boolean;
  scheduledFor: string | null;
  hashtags: string[];
  cta: string | null;
  source: string | null;
  asset: { filename: string; path: string | null; kind: string } | null;
};

export const getDashboardMetrics = cache(
  async (tenantSlug: string): Promise<DashboardMetrics | null> => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: tenantSlug },
    });
    if (!tenant) return null;

    const [
      totalDrafts,
      drafts,
      approved,
      needsReview,
      scheduled,
      published,
      failed,
      totalAssets,
      nextUp,
      pillars,
    ] = await Promise.all([
      prisma.contentDraft.count({ where: { tenantId: tenant.id } }),
      prisma.contentDraft.count({ where: { tenantId: tenant.id, status: "DRAFT" } }),
      prisma.contentDraft.count({ where: { tenantId: tenant.id, status: "APPROVED" } }),
      prisma.contentDraft.count({ where: { tenantId: tenant.id, status: "NEEDS_REVIEW" } }),
      prisma.contentDraft.count({ where: { tenantId: tenant.id, status: "SCHEDULED" } }),
      prisma.contentDraft.count({ where: { tenantId: tenant.id, status: "PUBLISHED" } }),
      prisma.contentDraft.count({ where: { tenantId: tenant.id, status: "FAILED" } }),
      prisma.asset.count({ where: { tenantId: tenant.id } }),
      prisma.contentDraft.findMany({
        where: { tenantId: tenant.id, status: { in: ["DRAFT", "APPROVED", "SCHEDULED"] } },
        orderBy: { scheduledFor: "asc" },
        take: 10,
        select: {
          id: true,
          title: true,
          network: true,
          format: true,
          status: true,
          riskLevel: true,
          scheduledFor: true,
          assets: { take: 1, select: { asset: { select: { sourcePath: true } } } },
        },
      }),
      prisma.contentDraft.groupBy({
        by: ["pillar"],
        where: { tenantId: tenant.id, pillar: { not: null } },
        _count: true,
        orderBy: { _count: { pillar: "desc" } },
      }),
    ]);

    return {
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
        mode: tenant.automationMode,
      },
      counts: {
        totalDrafts,
        drafts,
        approved,
        needsReview,
        scheduled,
        published,
        failed,
        totalAssets,
      },
      nextUp: nextUp.map((d) => ({
        id: d.id,
        title: d.title,
        network: d.network,
        format: d.format,
        status: d.status,
        riskLevel: d.riskLevel,
        scheduledFor: d.scheduledFor?.toISOString().slice(0, 10) ?? null,
        assetPath: d.assets[0]?.asset.sourcePath ?? null,
      })),
      pillars: pillars.map((p) => ({ name: p.pillar!, count: p._count })),
    };
  },
);

export const getDraftQueue = cache(
  async (tenantSlug: string): Promise<DraftQueueItem[]> => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    if (!tenant) return [];

    const drafts = await prisma.contentDraft.findMany({
      where: { tenantId: tenant.id },
      orderBy: { scheduledFor: "asc" },
      select: {
        id: true,
        title: true,
        caption: true,
        network: true,
        format: true,
        pillar: true,
        status: true,
        riskLevel: true,
        requiresReview: true,
        scheduledFor: true,
        hashtags: true,
        cta: true,
        source: true,
        assets: { take: 1, select: { asset: { select: { filename: true, sourcePath: true, kind: true } } } },
      },
    });

    return drafts.map((d) => ({
      id: d.id,
      title: d.title,
      caption: d.caption,
      network: d.network,
      format: d.format,
      pillar: d.pillar,
      status: d.status,
      riskLevel: d.riskLevel,
      requiresReview: d.requiresReview,
      scheduledFor: d.scheduledFor?.toISOString().slice(0, 10) ?? null,
      hashtags: d.hashtags,
      cta: d.cta,
      source: d.source,
      asset: d.assets[0]?.asset
        ? {
            filename: d.assets[0].asset.filename,
            path: d.assets[0].asset.sourcePath,
            kind: d.assets[0].asset.kind,
          }
        : null,
    }));
  },
);

export async function getChecklist(tenantSlug: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true, name: true },
  });
  if (!tenant) return [];

  const [project, profile, accounts, minDrafts] = await Promise.all([
    prisma.project.findFirst({ where: { tenantId: tenant.id } }),
    prisma.brandProfile.findFirst({ where: { tenantId: tenant.id } }),
    prisma.socialAccount.count({ where: { tenantId: tenant.id } }),
    prisma.contentDraft.count({ where: { tenantId: tenant.id, status: "APPROVED" } }),
  ]);

  return [
    { label: "Perfil de marca completado", done: !!profile },
    { label: "Proyecto definido", done: !!project },
    { label: "Cuentas sociales conectadas", done: accounts > 0 },
    { label: "Al menos 1 draft aprobado", done: minDrafts > 0 },
    { label: "Credenciales OAuth configuradas", done: false },
    { label: "Voz de marca y CTA definidos", done: !!profile },
    { label: "Assets validados", done: minDrafts > 0 },
    { label: "Ventanas horarias configuradas", done: minDrafts > 0 },
  ];
}
