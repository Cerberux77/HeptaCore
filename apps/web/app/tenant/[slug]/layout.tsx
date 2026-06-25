import type { Metadata } from "next";
import { TenantShell } from "../../../components/tenant-shell";

export const metadata: Metadata = {
  title: "HeptaCore | Tenant",
  description: "Consola del tenant",
};

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return <TenantShell>{children}</TenantShell>;
}
