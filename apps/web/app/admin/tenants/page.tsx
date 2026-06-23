import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import { AdminTenantsList } from "../../../components/admin-tenants-list";

export const dynamic = "force-dynamic";

export default async function AdminTenantsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect("/login?callbackUrl=/admin/tenants");

  const isGlobalAdmin = session.user.memberships?.some((m) => m.role === "SUPER_ADMIN");
  if (!isGlobalAdmin) redirect("/access-required");

  return <AdminTenantsList />;
}
