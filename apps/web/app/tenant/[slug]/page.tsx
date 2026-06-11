import { redirect } from "next/navigation";
import { DashboardConsole } from "../../../components/dashboard-console";
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
import { getTrialStatus } from "../../../lib/trial";

export const dynamic = "force-dynamic";

export default async function TenantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { slug } = await params;
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

  if (!metrics) redirect("/");

  const isGlobalAdmin = session.user.memberships?.some((membership) => membership.role === "SUPER_ADMIN");
  const hasTenantAccess = session.user.memberships?.some((membership) => membership.tenantId === metrics.tenant.id);
  if (!isGlobalAdmin && !hasTenantAccess) redirect("/");

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
