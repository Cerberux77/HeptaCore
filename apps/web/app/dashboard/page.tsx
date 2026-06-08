import { requireTenantSession } from "../../lib/tenant-auth";

export default async function DashboardPage() {
  const session = await requireTenantSession();

  return (
    <main style={{ padding: "32px", fontFamily: "system-ui, sans-serif" }}>
      <h1>HeptaCore Dashboard</h1>
      <p>Tenant: {session.tenantSlug}</p>
      <p>Role: {session.role}</p>
      <p>Auth, tenant switching, approvals and publishing jobs are scaffolded for the SaaS foundation.</p>
    </main>
  );
}

