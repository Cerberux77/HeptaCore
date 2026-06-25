import type { Metadata } from "next";
import { AdminTenantsShell } from "../../../components/admin-tenants-shell";

export const metadata: Metadata = {
  title: "HeptaCore | Admin Tenants",
  description: "Consola de administracion global de tenants",
};

export default function AdminTenantsLayout({ children }: { children: React.ReactNode }) {
  return <AdminTenantsShell>{children}</AdminTenantsShell>;
}
