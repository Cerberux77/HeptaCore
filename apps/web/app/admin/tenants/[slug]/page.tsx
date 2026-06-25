import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { resolveSuperAdminAccess } from "../../../../lib/tenant-access";
import { AdminTenantDetail } from "../../../../components/admin-tenant-detail";

export const dynamic = "force-dynamic";

export default async function AdminTenantDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/tenants");

  try {
    await resolveSuperAdminAccess(session.user.id, prisma as any);
  } catch {
    redirect("/access-required");
  }

  const { slug } = await params;
  return <AdminTenantDetail slug={slug} />;
}
