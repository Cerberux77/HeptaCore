import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LandingV1 } from "../components/landing-v1";
import { auth } from "../lib/auth";

const DEFAULT_TENANT = "turpial-sound";

export default async function Home() {
  const cookieStore = await cookies();
  const hasSessionCookie =
    cookieStore.has("authjs.session-token") ||
    cookieStore.has("__Secure-authjs.session-token") ||
    cookieStore.has("next-auth.session-token") ||
    cookieStore.has("__Secure-next-auth.session-token");
  const session = hasSessionCookie ? await auth().catch(() => null) : null;

  if (session?.user?.id) {
    if (session.user?.memberships?.some((m) => m.role === "SUPER_ADMIN")) redirect("/admin");
    redirect(`/tenant/${DEFAULT_TENANT}`);
  }

  return <LandingV1 />;
}
