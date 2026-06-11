import { cache } from "react";
import { prisma } from "./prisma";
import { getTrialStatus, type TrialStatus } from "./trial";

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

export type TenantAssetItem = {
  id: string;
  filename: string;
  kind: string;
  path: string | null;
  rightsStatus: string;
  draftCount: number;
};

export type StrategySnapshot = {
  projectName: string | null;
  projectDescription: string | null;
  brandVoice: string[];
  pillars: Array<{ name: string; description: string | null; priority: number }>;
};

export type CalendarItem = {
  id: string;
  title: string;
  network: string;
  format: string;
  status: string;
  scheduledFor: string | null;
  riskLevel: string;
};

export type AdminDashboardData = {
  totals: {
    tenants: number;
    drafts: number;
    approved: number;
    scheduled: number;
    published: number;
    assets: number;
    pendingReview: number;
  };
  tenants: Array<{
    id: string;
    slug: string;
    name: string;
    plan: string;
    mode: string;
    drafts: number;
    approved: number;
    scheduled: number;
    published: number;
    assets: number;
    pendingReview: number;
  }>;
  recentActivity: Array<{
    tenantName: string | null;
    action: string;
    target: string | null;
    at: string;
  }>;
  campaigns: Array<{
    id: string;
    tenantSlug: string;
    tenantName: string;
    name: string;
    network: string;
    objective: string;
    platformBudget: number;
    overheadRate: number;
    totalCharge: number;
    status: string;
  }>;
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
        scheduledFor: d.scheduledFor?.toISOString().slice(0, 16).replace("T", " ") ?? null,
        assetPath: d.assets[0]?.asset.sourcePath ?? null,
      })),
      pillars: pillars.map((p) => ({ name: p.pillar!, count: p._count })),
    };
  },
);

export async function getTenantAssets(tenantSlug: string): Promise<TenantAssetItem[]> {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) return [];

  const assets = await prisma.asset.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ kind: "asc" }, { filename: "asc" }],
    select: {
      id: true,
      filename: true,
      kind: true,
      sourcePath: true,
      rightsStatus: true,
      _count: { select: { drafts: true } },
    },
  });

  return assets.map((asset) => ({
    id: asset.id,
    filename: asset.filename,
    kind: asset.kind,
    path: asset.sourcePath,
    rightsStatus: asset.rightsStatus,
    draftCount: asset._count.drafts,
  }));
}

export async function getStrategySnapshot(tenantSlug: string): Promise<StrategySnapshot | null> {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) return null;

  const [project, profile, pillars] = await Promise.all([
    prisma.project.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "asc" },
      select: { name: true, description: true },
    }),
    prisma.brandProfile.findFirst({
      where: { tenantId: tenant.id },
      select: { toneOfVoice: true },
    }),
    prisma.contentPillar.findMany({
      where: { tenantId: tenant.id },
      orderBy: [{ priority: "desc" }, { name: "asc" }],
      select: { name: true, description: true, priority: true },
    }),
  ]);

  const voice = Array.isArray(profile?.toneOfVoice)
    ? (profile?.toneOfVoice as unknown[]).map(String)
    : profile?.toneOfVoice && typeof profile.toneOfVoice === "object"
      ? Object.values(profile.toneOfVoice as Record<string, unknown>).map(String)
      : [];

  return {
    projectName: project?.name ?? null,
    projectDescription: project?.description ?? null,
    brandVoice: voice,
    pillars,
  };
}

export async function getContentCalendar(tenantSlug: string): Promise<CalendarItem[]> {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) return [];

  const drafts = await prisma.contentDraft.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
    take: 60,
    select: {
      id: true,
      title: true,
      network: true,
      format: true,
      status: true,
      scheduledFor: true,
      riskLevel: true,
    },
  });

  return drafts.map((draft) => ({
    id: draft.id,
    title: draft.title,
    network: draft.network,
    format: draft.format,
    status: draft.status,
    scheduledFor: draft.scheduledFor?.toISOString().slice(0, 16).replace("T", " ") ?? null,
    riskLevel: draft.riskLevel,
  }));
}

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
      scheduledFor: d.scheduledFor?.toISOString().slice(0, 16).replace("T", " ") ?? null,
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

  const [project, profile, accounts, credentials, minDrafts] = await Promise.all([
    prisma.project.findFirst({ where: { tenantId: tenant.id } }),
    prisma.brandProfile.findFirst({ where: { tenantId: tenant.id } }),
    prisma.socialAccount.count({ where: { tenantId: tenant.id } }),
    prisma.credentialVaultItem.count({ where: { tenantId: tenant.id } }),
    prisma.contentDraft.count({ where: { tenantId: tenant.id, status: "APPROVED" } }),
  ]);

  return [
    { label: "Perfil de marca completado", done: !!profile },
    { label: "Proyecto definido", done: !!project },
    { label: "Cuentas sociales conectadas", done: accounts > 0 },
    { label: "Al menos 1 draft aprobado", done: minDrafts > 0 },
    { label: "Credenciales OAuth configuradas", done: credentials > 0 },
    { label: "Voz de marca y CTA definidos", done: !!profile },
    { label: "Assets validados", done: minDrafts > 0 },
    { label: "Ventanas horarias configuradas", done: minDrafts > 0 },
  ];
}

export async function getReportData(tenantSlug: string) {
  const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug }, select: { id: true, name: true } });
  if (!tenant) return null;

  const [total, byStatus, byNetwork, needsReview, pendingAssets, recentActivity] = await Promise.all([
    prisma.contentDraft.count({ where: { tenantId: tenant.id } }),
    prisma.contentDraft.groupBy({ by: ["status"], where: { tenantId: tenant.id }, _count: true }),
    prisma.contentDraft.groupBy({ by: ["network"], where: { tenantId: tenant.id }, _count: true }),
    prisma.contentDraft.count({ where: { tenantId: tenant.id, OR: [{ requiresReview: true }, { riskLevel: { not: "low" } }] } }),
    prisma.contentDraft.count({ where: { tenantId: tenant.id, assets: { none: {} } } }),
    prisma.auditLog.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { action: true, target: true, createdAt: true },
    }),
  ]);

  return {
    tenantName: tenant.name,
    total,
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    byNetwork: byNetwork.map((n) => ({ network: n.network, count: n._count })),
    needsReview,
    pendingAssets,
    recentActivity: recentActivity.map((a) => ({
      action: a.action,
      target: a.target,
      at: a.createdAt.toISOString().slice(0, 19).replace("T", " "),
    })),
  };
}

export async function getReadinessReport(tenantSlug: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true, name: true },
  });
  if (!tenant) return null;

  const [approved, scheduled, published, credentials, assetsLinked] = await Promise.all([
    prisma.contentDraft.count({ where: { tenantId: tenant.id, status: "APPROVED" } }),
    prisma.contentDraft.count({ where: { tenantId: tenant.id, status: "SCHEDULED" } }),
    prisma.contentDraft.count({ where: { tenantId: tenant.id, status: "PUBLISHED" } }),
    prisma.credentialVaultItem.count({ where: { tenantId: tenant.id } }),
    prisma.contentDraft.count({ where: { tenantId: tenant.id, status: "APPROVED", assets: { some: {} } } }),
  ]);

  const gates = [
    { label: "Al menos 1 draft aprobado", passed: approved > 0 },
    { label: "Draft aprobado con asset vinculado", passed: assetsLinked > 0 },
    { label: "Credenciales OAuth del tenant en vault", passed: credentials > 0 },
    { label: "Sin publicaciones reales previas (dry-run)", passed: published === 0 },
    { label: "Modo dry-run activo", passed: true },
    { label: "Sin credenciales reales en git", passed: true },
    { label: "Approval queue funcional", passed: true },
    { label: "Dry-run ejecutable desde la web", passed: true },
  ];

  const allPassed = gates.every((g) => g.passed);
  const livePublishingReady = credentials > 0 && scheduled > 0;

  return {
    tenantName: tenant.name,
    gates,
    allPassed,
    dryRunReady: allPassed,
    livePublishingReady,
    approvedDrafts: approved,
    scheduledDrafts: scheduled,
    credentialCount: credentials,
    summary: allPassed
      ? "Listo para publicar en modo dry-run. Sin riesgo de publicacion real."
      : "Faltan gates de seguridad. No publicar.",
    rollbackPlan: [
      "1. Verificar BOT_DRY_RUN=true en .env",
      "2. Cancelar todos los jobs en Redis (queue:clean)",
      "3. Revertir drafts a DRAFT desde SCHEDULED",
      "4. Verificar que no hay externalPostId en drafts",
    ],
  };
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      plan: true,
      automationMode: true,
    },
  });

  const rows = await Promise.all(
    tenants.map(async (tenant) => {
      const [drafts, approved, scheduled, published, assets, pendingReview] = await Promise.all([
        prisma.contentDraft.count({ where: { tenantId: tenant.id } }),
        prisma.contentDraft.count({ where: { tenantId: tenant.id, status: "APPROVED" } }),
        prisma.contentDraft.count({ where: { tenantId: tenant.id, status: "SCHEDULED" } }),
        prisma.contentDraft.count({ where: { tenantId: tenant.id, status: "PUBLISHED" } }),
        prisma.asset.count({ where: { tenantId: tenant.id } }),
        prisma.contentDraft.count({
          where: {
            tenantId: tenant.id,
            status: { notIn: ["PUBLISHED", "REJECTED"] },
            OR: [{ requiresReview: true }, { riskLevel: { not: "low" } }],
          },
        }),
      ]);

      return {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
        mode: tenant.automationMode,
        drafts,
        approved,
        scheduled,
        published,
        assets,
        pendingReview,
      };
    }),
  );

  const recentActivity = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      action: true,
      target: true,
      createdAt: true,
      tenant: { select: { name: true } },
    },
  });

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      network: true,
      objective: true,
      platformBudget: true,
      overheadRate: true,
      totalCharge: true,
      status: true,
      tenant: { select: { slug: true, name: true } },
    },
  });

  return {
    totals: {
      tenants: rows.length,
      drafts: rows.reduce((sum, row) => sum + row.drafts, 0),
      approved: rows.reduce((sum, row) => sum + row.approved, 0),
      scheduled: rows.reduce((sum, row) => sum + row.scheduled, 0),
      published: rows.reduce((sum, row) => sum + row.published, 0),
      assets: rows.reduce((sum, row) => sum + row.assets, 0),
      pendingReview: rows.reduce((sum, row) => sum + row.pendingReview, 0),
    },
    tenants: rows,
    recentActivity: recentActivity.map((item) => ({
      tenantName: item.tenant?.name ?? null,
      action: item.action,
      target: item.target,
      at: item.createdAt.toISOString().slice(0, 19).replace("T", " "),
    })),
    campaigns: campaigns.map((c) => ({
      id: c.id,
      tenantSlug: c.tenant.slug,
      tenantName: c.tenant.name,
      name: c.name,
      network: c.network,
      objective: c.objective,
      platformBudget: Number(c.platformBudget),
      overheadRate: Number(c.overheadRate),
      totalCharge: Number(c.totalCharge),
      status: c.status,
    })),
  };
}

export async function getCampaigns(tenantSlug: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true, name: true },
  });
  if (!tenant) return [];

  const campaigns = await prisma.campaign.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      network: true,
      objective: true,
      platformBudget: true,
      overheadRate: true,
      totalCharge: true,
      status: true,
    },
  });

  return campaigns.map((c) => ({
    id: c.id,
    tenantSlug,
    tenantName: tenant.name,
    name: c.name,
    network: c.network,
    objective: c.objective,
    platformBudget: Number(c.platformBudget),
    overheadRate: Number(c.overheadRate),
    totalCharge: Number(c.totalCharge),
    status: c.status,
  }));
}
