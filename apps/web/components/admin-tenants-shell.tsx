"use client";

import { Building2, PlusCircle, ShieldCheck } from "lucide-react";
import { HeptaCoreWordmark } from "./heptacore-mark";
import { AdminIdentityPanel } from "./admin-identity-panel";

export function AdminTenantsShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <HeptaCoreWordmark />
        </div>
        <div className="tenant-switcher">
          <span>Administracion</span>
          <strong>Tenants</strong>
          <small>Gestion global de cuentas</small>
        </div>
        <nav className="app-nav">
          <a className="nav-link" href="/admin"><ShieldCheck size={17} /> Consolidado</a>
          <a className="nav-link active" href="/admin/tenants"><Building2 size={17} /> Tenants</a>
        </nav>
        <div className="guardrail-box">
          <ShieldCheck size={17} />
          <span>Consola de administracion global. Controla tenants, miembros, invitaciones y estados de lifecycle.</span>
        </div>
        <div style={{ marginTop: "auto", padding: "12px 14px", borderTop: "1px solid var(--hc-line)" }}>
          <AdminIdentityPanel />
        </div>
      </aside>
      <section className="workspace">{children}</section>
    </main>
  );
}
