import { auth } from "../lib/auth";
import { redirect } from "next/navigation";

const DEFAULT_TENANT = "turpial-sound";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");

  if (session.user?.memberships?.some((membership) => membership.role === "SUPER_ADMIN")) {
    redirect("/admin");
  }

  redirect(`/tenant/${DEFAULT_TENANT}`);
}
