import { auth } from "../lib/auth";
import { getDashboardMetrics, getDraftQueue, getChecklist } from "../lib/dashboard";
import { DashboardConsole } from "../components/dashboard-console";
import { redirect } from "next/navigation";

const DEFAULT_TENANT = "turpial-sound";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");

  const slug = DEFAULT_TENANT;
  const [metrics, queue, checklist] = await Promise.all([
    getDashboardMetrics(slug),
    getDraftQueue(slug),
    getChecklist(slug),
  ]);

  return (
    <DashboardConsole
      metrics={metrics}
      queue={queue}
      checklist={checklist}
      tenantSlug={slug}
    />
  );
}
