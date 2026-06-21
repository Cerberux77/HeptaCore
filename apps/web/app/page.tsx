import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CodexLanding } from "../components/codex-landing";
import { auth } from "../lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const hasSessionCookie =
    cookieStore.has("authjs.session-token") ||
    cookieStore.has("__Secure-authjs.session-token") ||
    cookieStore.has("next-auth.session-token") ||
    cookieStore.has("__Secure-next-auth.session-token");
  const session = hasSessionCookie ? await auth().catch(() => null) : null;

  if (session?.user?.id) {
    redirect("/app");
  }

  return <CodexLanding />;
}
