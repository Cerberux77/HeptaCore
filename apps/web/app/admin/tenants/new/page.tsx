import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { AdminTenantsCreate } from "../../../../components/admin-tenants-create";

export const dynamic = "force-dynamic";

export default async function AdminTenantsNewPage() {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect("/login?callbackUrl=/admin/tenants/new");

  const isGlobalAdmin = session.user.memberships?.some((m: { role: string }) => m.role === "SUPER_ADMIN");
  if (!isGlobalAdmin) redirect("/access-required");

  return <AdminTenantsCreate />;
}
