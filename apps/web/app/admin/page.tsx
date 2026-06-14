import { redirect } from "next/navigation";
import { AdminConsole } from "../../components/admin-console";
import { CodexLanding } from "../../components/codex-landing";
import { auth } from "../../lib/auth";
import { getAdminDashboard } from "../../lib/dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth().catch(() => null);
  if (!session?.user) return <CodexLanding loginHref="/login?callbackUrl=/admin" />;

  const isGlobalAdmin = session.user.memberships?.some((membership) => membership.role === "SUPER_ADMIN");
  if (!isGlobalAdmin) redirect("/");

  const data = await getAdminDashboard();
  return <AdminConsole data={data} />;
}
