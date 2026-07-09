import { redirect } from "next/navigation";
import { AdminConsole } from "../../components/admin-console";
import { auth } from "../../lib/auth";
import { getAdminDashboard } from "../../lib/dashboard";
import { isPlatformSuperAdmin } from "../../lib/role-model";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect("/login?callbackUrl=/admin");

  const isGlobalAdmin = isPlatformSuperAdmin(session.user.platformRole);
  if (!isGlobalAdmin) redirect("/access-required");

  const data = await getAdminDashboard();
  return <AdminConsole data={data} />;
}
