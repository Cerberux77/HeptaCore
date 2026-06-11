"use client";

import {
  BarChart3,
  Building2,
  Check,
  ClipboardList,
  DollarSign,
  Gauge,
  PackageSearch,
  ShieldCheck,
  X,
} from "lucide-react";
import { HeptaCoreWordmark } from "./heptacore-mark";
import type { AdminDashboardData } from "../lib/dashboard";

function StatusCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <div className="status-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

export function AdminConsole({ data }: { data: AdminDashboardData }) {
  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <HeptaCoreWordmark />
        </div>
        <div className="tenant-switcher">
          <span>Operacion</span>
          <strong>Admin global</strong>
          <small>Todos los tenants / control central</small>
        </div>
        <nav className="app-nav">
          <a className="nav-link active" href="/admin"><ShieldCheck size={17} /> Consolidado</a>
          <a className="nav-link" href="/tenant/turpial-sound"><Building2 size={17} /> Turpial Sound</a>
        </nav>
        <div className="guardrail-box">
          <ShieldCheck size={17} />
          <span>Publicacion real bloqueada. El admin consolida tenants y ejecuta solo gates controlados.</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <span className="section-label">Admin</span>
            <h1>Operacion HeptaCore</h1>
          </div>
          <div className="header-actions">
            <a className="primary-action" href="/tenant/turpial-sound">
              <Gauge size={16} /> Abrir tenant piloto
            </a>
          </div>
        </header>

        <section className="status-strip">
          <StatusCard label="Tenants" value={data.totals.tenants} note="cuentas activas" />
          <StatusCard label="Drafts" value={data.totals.drafts} note="contenido total" />
          <StatusCard label="Aprobados" value={data.totals.approved} note="listos para dry-run" />
          <StatusCard label="Activos" value={data.totals.assets} note="assets cargados" />
          <StatusCard label="Revision" value={data.totals.pendingReview} note="requieren criterio" />
        </section>

        <div className="strategy-grid">
          <section className="work-panel span-2">
            <div className="panel-title">
              <span><Building2 size={17} /> Tenants</span>
            </div>
            <div className="tenant-table">
              <div className="tenant-row tenant-head">
                <span>Tenant</span>
                <span>Modo</span>
                <span>Drafts</span>
                <span>Aprobados</span>
                <span>Agenda</span>
                <span>Activos</span>
                <span></span>
              </div>
              {data.tenants.map((tenant) => (
                <div className="tenant-row" key={tenant.id}>
                  <strong>{tenant.name}<small>{tenant.slug}</small></strong>
                  <span>{tenant.mode}</span>
                  <span><ClipboardList size={14} /> {tenant.drafts}</span>
                  <span><Check size={14} /> {tenant.approved}</span>
                  <span><BarChart3 size={14} /> {tenant.scheduled}</span>
                  <span><PackageSearch size={14} /> {tenant.assets}</span>
                  <a className="tool-button" href={`/tenant/${tenant.slug}`}>Abrir</a>
                </div>
              ))}
            </div>
          </section>

          <section className="work-panel span-2">
            <div className="panel-title">
              <span><DollarSign size={17} /> Campanas pagas</span>
            </div>
            {data.campaigns.length === 0 ? (
              <p style={{ padding: 14, color: "var(--hc-fog)", fontSize: 13 }}>No hay campanas registradas.</p>
            ) : (
              <div className="tenant-table">
                <div className="tenant-row tenant-head">
                  <span>Campana</span>
                  <span>Tenant</span>
                  <span>Red</span>
                  <span>Budget plataforma</span>
                  <span>Total (+35%)</span>
                  <span>Estado</span>
                </div>
                {data.campaigns.map((c) => (
                  <div className="tenant-row" key={c.id}>
                    <strong>{c.name}<small>{c.objective}</small></strong>
                    <span>{c.tenantName}</span>
                    <span>{c.network}</span>
                    <span>${c.platformBudget.toFixed(2)}</span>
                    <span><DollarSign size={12} /> ${c.totalCharge.toFixed(2)}</span>
                    <span className={c.status === "APPROVED" ? "risk-low" : c.status === "REJECTED" ? "risk-high" : "risk-medium"}>
                      {c.status === "PROPOSED" ? "Propuesta" : c.status === "NEEDS_APPROVAL" ? "Revision" : c.status === "APPROVED" ? "Aprobada" : c.status === "REJECTED" ? "Rechazada" : c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ padding: "8px 14px", fontSize: 12, color: "var(--hc-fog)", borderTop: "1px solid var(--hc-line)" }}>
              Gasto real bloqueado. Sin ejecucion sin aprobacion. 35% overhead transparente.
            </div>
          </section>

          <section className="work-panel span-2">
            <div className="panel-title">
              <span><BarChart3 size={17} /> Actividad reciente</span>
            </div>
            <ul className="dense-list">
              {data.recentActivity.map((item, index) => (
                <li key={`${item.at}-${index}`}>
                  {item.at} - {item.tenantName ?? "Global"} - {item.action} ({item.target ?? "sin target"})
                </li>
              ))}
              {data.recentActivity.length === 0 && <li>Sin actividad registrada todavia.</li>}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
