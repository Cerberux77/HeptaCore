import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { resolveSuperAdminAccess } from "../../../../lib/tenant-access";
import { AdminTenantsCreate } from "../../../../components/admin-tenants-create";

export const dynamic = "force-dynamic";

export default async function AdminTenantsNewPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/tenants/new");

  try {
    await resolveSuperAdminAccess(session.user.id, prisma as any);
  } catch {
    redirect("/access-required");
  }

  return <AdminTenantsCreate />;
}
