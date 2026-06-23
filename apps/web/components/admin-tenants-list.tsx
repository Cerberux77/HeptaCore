"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, PlusCircle, Search, ChevronRight } from "lucide-react";
import { LifecycleBadge } from "./admin-tenant-lifecycle-badge";
import { AdminTenantPagination } from "./admin-tenant-pagination";
import { EmptyState, InlineError } from "./admin-tenant-feedback";

interface TenantItem {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
  timezone: string;
  locale: string;
  createdAt: string;
  ownerEmail: string;
}

interface TenantsData {
  items: TenantItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type FetchState = "loading" | "success" | "error" | "empty";

export function AdminTenantsList() {
  const [data, setData] = useState<TenantsData | null>(null);
  const [state, setState] = useState<FetchState>("loading");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchTenants = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/tenants?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error?.message || "Error al cargar tenants");
        setState("error");
        return;
      }
      setData(json.data);
      setState(json.data.items.length === 0 ? "empty" : "success");
    } catch {
      setError("Error de conexion al cargar tenants");
      setState("error");
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTenants();
  };

  return (
    <div>
      <header className="workspace-header">
        <div>
          <span className="section-label">Admin</span>
          <h1>Tenants</h1>
        </div>
        <div className="header-actions">
          <a className="primary-action" href="/admin/tenants/new">
            <PlusCircle size={16} /> Crear tenant
          </a>
        </div>
      </header>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 6 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o slug..."
            style={{ padding: "5px 10px", fontSize: 12, border: "1px solid var(--hc-line)", borderRadius: 4, width: 220, fontFamily: "inherit" }}
            aria-label="Buscar tenants"
          />
          <button type="submit" style={{ padding: "5px 10px", fontSize: 12, border: "1px solid var(--hc-line)", borderRadius: 4, background: "var(--hc-panel)", color: "var(--hc-ink)", cursor: "pointer", fontFamily: "inherit" }}>
            <Search size={14} />
          </button>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: "5px 8px", fontSize: 12, border: "1px solid var(--hc-line)", borderRadius: 4, fontFamily: "inherit", color: "var(--hc-ink)" }}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          <option value="PROVISIONING">Provisioning</option>
          <option value="ACTIVE">Activo</option>
          <option value="SUSPENDED">Suspendido</option>
          <option value="ARCHIVED">Archivado</option>
        </select>
      </div>

      {state === "loading" && (
        <div style={{ padding: "40px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ height: 44, background: "var(--hc-bone)", borderRadius: 6, opacity: 0.6 }} />
          ))}
        </div>
      )}

      {state === "error" && <InlineError message={error} onRetry={fetchTenants} />}

      {state === "empty" && !search && !statusFilter && (
        <EmptyState message="No hay tenants creados. Crea el primer tenant para comenzar." action={{ label: "Crear tenant", onClick: () => window.location.href = "/admin/tenants/new" }} />
      )}

      {state === "empty" && (search || statusFilter) && (
        <EmptyState message="Ningun tenant coincide con los filtros." />
      )}

      {state === "success" && data && (
        <>
          <div style={{ fontSize: 12, color: "var(--hc-fog)", marginBottom: 8 }}>
            {data.total} tenant{data.total !== 1 ? "s" : ""} encontrado{data.total !== 1 ? "s" : ""}
          </div>
          <div className="tenant-table" style={{ border: "1px solid var(--hc-line)", borderRadius: 6, overflow: "hidden" }}>
            <div className="tenant-row tenant-head" style={{ padding: "8px 14px", gridTemplateColumns: "minmax(200px,1.2fr) 180px 110px 80px 80px 120px 36px" }}>
              <span>Tenant</span>
              <span>Owner</span>
              <span>Estado</span>
              <span>Locale</span>
              <span>Timezone</span>
              <span>Creado</span>
              <span></span>
            </div>
            {data.items.map((tenant) => (
              <a
                key={tenant.id}
                className="tenant-row"
                href={`/admin/tenants/${tenant.slug}`}
                style={{
                  padding: "10px 14px",
                  gridTemplateColumns: "minmax(200px,1.2fr) 180px 110px 80px 80px 120px 36px",
                  textDecoration: "none",
                  color: "inherit",
                  borderTop: "1px solid var(--hc-line)",
                  cursor: "pointer",
                  display: "grid",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong style={{ fontSize: 13, display: "block" }}>{tenant.name}</strong>
                  <small style={{ color: "var(--hc-fog)", fontSize: 11 }}>{tenant.slug}</small>
                </div>
                <span style={{ fontSize: 12, color: "var(--hc-graphite)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenant.ownerEmail}</span>
                <span><LifecycleBadge status={tenant.status} /></span>
                <span style={{ fontSize: 12, color: "var(--hc-fog)" }}>{tenant.locale?.toUpperCase()}</span>
                <span style={{ fontSize: 12, color: "var(--hc-fog)" }}>{tenant.timezone}</span>
                <span style={{ fontSize: 12, color: "var(--hc-fog)" }}>{new Date(tenant.createdAt).toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" })}</span>
                <ChevronRight size={16} color="var(--hc-fog)" />
              </a>
            ))}
          </div>
          <AdminTenantPagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
