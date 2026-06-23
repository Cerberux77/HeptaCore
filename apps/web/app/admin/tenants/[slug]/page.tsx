import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { AdminTenantDetail } from "../../../../components/admin-tenant-detail";

export const dynamic = "force-dynamic";

export default async function AdminTenantDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect("/login?callbackUrl=/admin/tenants");

  const isGlobalAdmin = session.user.memberships?.some((m) => m.role === "SUPER_ADMIN");
  if (!isGlobalAdmin) redirect("/access-required");

  const { slug } = await params;
  return <AdminTenantDetail slug={slug} />;
}
