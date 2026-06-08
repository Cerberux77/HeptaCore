import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type TenantSession = {
  userId: string;
  tenantSlug: string;
  role: string;
};

const sessionCookieName = "heptacore_session";

export async function getTenantSession(): Promise<TenantSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(sessionCookieName)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as TenantSession;
    if (!parsed.userId || !parsed.tenantSlug || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function requireTenantSession() {
  const session = await getTenantSession();
  if (!session) redirect("/login");
  return session;
}

export function assertTenantAccess(session: TenantSession, tenantSlug: string) {
  if (session.tenantSlug !== tenantSlug && session.role !== "SUPER_ADMIN") {
    throw new Error("Tenant access denied");
  }
}

