import Link from "next/link";
import { SignOutButton } from "../../components/sign-out-button";
import { auth } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function AccessRequiredPage({
  searchParams,
}: {
  searchParams?: Promise<{ tenant?: string }>;
}) {
  const session = await auth().catch(() => null);
  const params = await searchParams;
  const tenant = params?.tenant;

  return (
    <main className="login-shell">
      <section className="login-card access-required-card">
        <h1 className="login-title">Acceso requerido</h1>
        <p className="login-subtitle">
          La sesion actual no tiene una membresia activa{tenant ? ` para ${tenant}` : ""}.
        </p>

        <div className="access-required-detail">
          <span>Sesion</span>
          <strong>{session?.user?.email ?? "No autenticada"}</strong>
        </div>

        <div className="access-required-actions">
          <Link href="/app" className="login-button">
            Revisar acceso
          </Link>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
