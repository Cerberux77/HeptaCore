import Link from "next/link";
import { redirect } from "next/navigation";
import { appLoginHref, resolveAppAccess } from "../../lib/access-routing";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

export default async function AppEntryPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(appLoginHref());

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: {
      tenantId: true,
      role: true,
      tenant: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  const access = resolveAppAccess(memberships);
  if (access.kind === "admin") redirect(access.href);
  if (access.kind === "tenant") redirect(access.href);
  if (access.kind === "access-required") redirect(access.href);

  return (
    <main className="login-shell">
      <section className="login-card app-resolver-card">
        <h1 className="login-title">Selecciona tenant</h1>
        <p className="login-subtitle">{session.user.email}</p>
        <div className="tenant-choice-list">
          {access.tenants.map((tenant) => (
            <Link key={tenant.tenantId} href={`/tenant/${tenant.slug}`} className="tenant-choice-link">
              <strong>{tenant.name}</strong>
              <span>{tenant.slug}</span>
              <small>{tenant.role}</small>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
