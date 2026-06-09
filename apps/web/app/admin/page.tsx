import { redirect } from "next/navigation";
import { AdminConsole } from "../../components/admin-console";
import { auth } from "../../lib/auth";
import { getAdminDashboard } from "../../lib/dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isGlobalAdmin = session.user.memberships?.some((membership) => membership.role === "SUPER_ADMIN");
  if (!isGlobalAdmin) redirect("/");

  const data = await getAdminDashboard();
  return <AdminConsole data={data} />;
}
