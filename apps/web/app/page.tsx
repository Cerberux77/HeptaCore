import { auth } from "../lib/auth";
import { getDashboardMetrics, getDraftQueue, getChecklist, getReportData, getReadinessReport } from "../lib/dashboard";
import { DashboardConsole } from "../components/dashboard-console";
import { redirect } from "next/navigation";

const DEFAULT_TENANT = "turpial-sound";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");

  const slug = DEFAULT_TENANT;
  const [metrics, queue, checklist, report, readiness] = await Promise.all([
    getDashboardMetrics(slug),
    getDraftQueue(slug),
    getChecklist(slug),
    getReportData(slug),
    getReadinessReport(slug),
  ]);

  return (
    <DashboardConsole
      metrics={metrics}
      queue={queue}
      checklist={checklist}
      report={report}
      readiness={readiness}
      tenantSlug={slug}
    />
  );
}
