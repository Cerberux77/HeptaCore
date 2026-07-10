import { notFound, redirect } from "next/navigation";
import { DashboardConsole } from "../../../components/dashboard-console";
import { tenantAccessRequiredHref, tenantLoginHref } from "../../../lib/access-routing";
import { auth } from "../../../lib/auth";
import {
  getChecklist,
  getContentCalendar,
  getDashboardMetrics,
  getDraftQueue,
  getReadinessReport,
  getReportData,
  getStrategySnapshot,
  getTenantAssets,
} from "../../../lib/dashboard";
import { prisma } from "../../../lib/prisma";
import { isPlatformSuperAdmin } from "../../../lib/role-model";
import { getTrialStatus } from "../../../lib/trial";

export const dynamic = "force-dynamic";

export default async function TenantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(tenantLoginHref(slug));

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!tenant) notFound();

  const isGlobalAdmin = isPlatformSuperAdmin(session.user.platformRole);

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      tenantId: tenant.id,
    },
    select: { role: true },
  });
  if (!membership && !isGlobalAdmin) redirect(tenantAccessRequiredHref(slug));

  const [metrics, queue, assets, strategy, calendar, checklist, report, readiness] = await Promise.all([
    getDashboardMetrics(slug),
    getDraftQueue(slug),
    getTenantAssets(slug),
    getStrategySnapshot(slug),
    getContentCalendar(slug),
    getChecklist(slug),
    getReportData(slug),
    getReadinessReport(slug),
  ]);

  if (!metrics) notFound();

  const trial = await getTrialStatus(metrics.tenant.id);

  return (
    <DashboardConsole
      metrics={metrics}
      queue={queue}
      assets={assets}
      strategy={strategy}
      calendar={calendar}
      checklist={checklist}
      report={report}
      readiness={readiness}
      tenantSlug={slug}
      adminMode={isGlobalAdmin}
      trial={trial}
    />
  );
}
