"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Building2, Users, Mail, Settings, Info, Loader2, Check, X, Copy, RefreshCw } from "lucide-react";
import { LifecycleBadge } from "./admin-tenant-lifecycle-badge";
import { RoleBadge } from "./admin-tenant-role-badge";
import { ConfirmDialog } from "./admin-tenant-confirm-dialog";
import { AdminTenantPagination } from "./admin-tenant-pagination";
import { EmptyState, InlineError } from "./admin-tenant-feedback";

/* ─────────────────── Types ─────────────────── */
interface TenantData {
  id: string; slug: string; name: string; plan: string; status: string; timezone: string; locale: string;
  createdAt: string; ownerEmail: string;
}

interface PaginatedResult<T> { items: T[]; total: number; page: number; limit: number; totalPages: number; }
interface Member { id: string; userId: string; email: string; name: string | null; role: string; createdAt: string; }
interface Invitation { id: string; email: string; role: string; accepted: boolean; expiresAt: string; createdAt: string; }

type TabId = "overview" | "members" | "invitations" | "config";

/* ─── Timezones & Locales (mirrors server-side) ─── */
const TIMEZONES = ["UTC", "America/Caracas", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Bogota", "America/Lima", "America/Santiago", "America/Buenos_Aires", "America/Mexico_City", "America/Panama", "Europe/Madrid", "Europe/London", "Europe/Paris", "Europe/Berlin"];
const LOCALES = ["es", "en", "pt", "fr", "de", "it"];

/* ─── Helpers ─── */
function apiFetch<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: { code: string; message: string } }> {
  return fetch(url, init).then((r) => r.json());
}

const ROLE_OPTIONS = ["OWNER", "ADMIN", "TENANT_ADMIN", "STRATEGIST", "EDITOR", "APPROVER", "PUBLISHER", "ANALYST", "VIEWER"];

/* ─── Component ─── */
export function AdminTenantDetail({ slug }: { slug: string }) {
  const [tab, setTab] = useState<TabId>("overview");
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTenant = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<TenantData>(`/api/admin/tenants/${slug}`);
      if (!res.ok) { setError(res.error?.message || "Error al cargar tenant"); return; }
      setTenant(res.data!);
    } catch { setError("Error de conexion"); }
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { fetchTenant(); }, [fetchTenant]);

  if (loading) {
    return <div style={{ padding: "40px 0" }}>
      <div style={{ height: 36, width: 200, background: "var(--hc-bone)", borderRadius: 6, marginBottom: 8 }} />
      <div style={{ height: 200, background: "var(--hc-bone)", borderRadius: 6, opacity: 0.6 }} />
    </div>;
  }

  if (error || !tenant) {
    return <div style={{ padding: 20 }}>
      <InlineError message={error || "Tenant no encontrado"} onRetry={fetchTenant} />
      <a href="/admin/tenants" style={{ fontSize: 13, color: "var(--hc-teal)", marginTop: 10, display: "inline-block" }}><ArrowLeft size={14} /> Volver al listado</a>
    </div>;
  }

  return (
    <div>
      <header className="workspace-header">
        <div>
          <span className="section-label">Admin / Tenants</span>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Building2 size={20} /> {tenant.name}
            <LifecycleBadge status={tenant.status} />
          </h1>
        </div>
        <div className="header-actions">
          <a className="tool-button" href="/admin/tenants"><ArrowLeft size={14} /> Listado</a>
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--hc-line)", marginBottom: 18 }} aria-label="Secciones del tenant">
        {([
          ["overview", Info, "Resumen"],
          ["members", Users, "Miembros"],
          ["invitations", Mail, "Invitaciones"],
          ["config", Settings, "Configuracion"],
        ] as const).map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: tab === id ? 600 : 400,
              color: tab === id ? "var(--hc-ink)" : "var(--hc-fog)",
              background: "transparent",
              border: "none",
              borderBottom: tab === id ? "2px solid var(--hc-ink)" : "2px solid transparent",
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: -1,
            }}
            role="tab"
            aria-selected={tab === id}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>

      <div role="tabpanel">
        {tab === "overview" && <OverviewTab tenant={tenant} onRefresh={fetchTenant} />}
        {tab === "members" && <MembersTab slug={slug} tenantStatus={tenant.status} />}
        {tab === "invitations" && <InvitationsTab slug={slug} tenantStatus={tenant.status} />}
        {tab === "config" && <ConfigTab tenant={tenant} slug={slug} onRefresh={fetchTenant} />}
      </div>
    </div>
  );
}

/* ─────────────────── Overview ─────────────────── */
function OverviewTab({ tenant, onRefresh }: { tenant: TenantData; onRefresh: () => void }) {
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  async function changeStatus(newStatus: string) {
    setShowConfirm(null);
    setStatusLoading(true);
    setStatusError("");
    try {
      const res = await apiFetch<TenantData>(`/api/admin/tenants/${tenant.slug}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { setStatusError(res.error?.message || "Error al cambiar estado"); return; }
      onRefresh();
    } catch { setStatusError("Error de conexion"); }
    finally { setStatusLoading(false); }
  }

  const allowedTransitions: Record<string, string[]> = {
    PROVISIONING: ["ACTIVE", "ARCHIVED"],
    ACTIVE: ["SUSPENDED", "ARCHIVED"],
    SUSPENDED: ["ACTIVE", "ARCHIVED"],
    ARCHIVED: ["ACTIVE"],
  };

  const available = allowedTransitions[tenant.status] ?? [];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        <InfoCard label="Slug" value={tenant.slug} />
        <InfoCard label="Owner" value={tenant.ownerEmail} />
        <InfoCard label="Plan" value={tenant.plan} />
        <InfoCard label="Timezone" value={tenant.timezone} />
        <InfoCard label="Locale" value={tenant.locale?.toUpperCase()} />
        <InfoCard label="Creado" value={new Date(tenant.createdAt).toLocaleDateString("es", { year: "numeric", month: "long", day: "numeric" })} />
      </div>

      <section style={{ background: "var(--hc-panel)", border: "1px solid var(--hc-line)", borderRadius: 6, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>Estado del lifecycle</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: "var(--hc-fog)" }}>Actual:</span>
          <LifecycleBadge status={tenant.status} />
        </div>

        {statusError && <InlineError message={statusError} />}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {available.map((s) => {
            const needsConfirm = s === "SUSPENDED" || s === "ARCHIVED";
            return (
              <button
                key={s}
                onClick={() => needsConfirm ? setShowConfirm(s) : changeStatus(s)}
                disabled={statusLoading}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid var(--hc-line)",
                  background: s === "ARCHIVED" ? "rgba(138,29,29,0.08)" : s === "SUSPENDED" ? "rgba(138,95,0,0.08)" : "rgba(11,117,111,0.08)",
                  color: s === "ARCHIVED" ? "var(--hc-red)" : s === "SUSPENDED" ? "var(--hc-warn)" : "var(--hc-teal)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 600,
                }}
              >
                {statusLoading ? <Loader2 size={12} /> : null}
                {s === "PROVISIONING" ? "" : "Marcar "}{s === "ACTIVE" ? "Activo" : s === "SUSPENDED" ? "Suspendido" : s === "ARCHIVED" ? "Archivado" : s}
              </button>
            );
          })}
          {available.length === 0 && <span style={{ fontSize: 12, color: "var(--hc-fog)" }}>No hay transiciones disponibles desde {tenant.status}.</span>}
        </div>
      </section>

      <ConfirmDialog
        open={!!showConfirm}
        title={`Confirmar transicion a ${showConfirm}`}
        message={
          showConfirm === "SUSPENDED"
            ? `Vas a suspender el tenant ${tenant.name}. Los usuarios no podran operar hasta que se reactive. Las publicaciones programadas se pausaran.`
            : `Vas a archivar el tenant ${tenant.name}. Esta accion puede desactivar integraciones y publicaciones. Se puede reactivar posteriormente.`
        }
        confirmLabel={`Marcar como ${showConfirm === "SUSPENDED" ? "Suspendido" : "Archivado"}`}
        danger={showConfirm === "ARCHIVED"}
        loading={statusLoading}
        onConfirm={() => changeStatus(showConfirm!)}
        onCancel={() => setShowConfirm(null)}
      />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "10px 14px", border: "1px solid var(--hc-line)", borderRadius: 6, background: "var(--hc-panel)" }}>
      <span style={{ fontSize: 11, color: "var(--hc-fog)", display: "block", marginBottom: 2, textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--hc-ink)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/* ─────────────────── Members ─────────────────── */
function MembersTab({ slug, tenantStatus }: { slug: string; tenantStatus: string }) {
  const [data, setData] = useState<PaginatedResult<Member> | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error" | "empty">("loading");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("VIEWER");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [showRemove, setShowRemove] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [changeError, setChangeError] = useState("");

  const fetchMembers = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const res = await apiFetch<PaginatedResult<Member>>(`/api/admin/tenants/${slug}/members?page=${page}&limit=20`);
      if (!res.ok) { setError(res.error?.message || "Error al cargar miembros"); setState("error"); return; }
      setData(res.data!);
      setState(res.data!.items.length === 0 ? "empty" : "success");
    } catch { setError("Error de conexion"); setState("error"); }
  }, [slug, page]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!addEmail.includes("@")) { setAddError("Email invalido"); return; }
    setAddLoading(true);
    try {
      const res = await apiFetch<Member>(`/api/admin/tenants/${slug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail, role: addRole }),
      });
      if (!res.ok) { setAddError(res.error?.message || "Error al agregar miembro"); return; }
      setShowAdd(false);
      setAddEmail("");
      setAddRole("VIEWER");
      fetchMembers();
    } catch { setAddError("Error de conexion"); }
    finally { setAddLoading(false); }
  }

  async function handleRemove(membershipId: string) {
    setShowRemove(null);
    setRemoveLoading(true);
    setRemoveError("");
    try {
      const res = await fetch(`/api/admin/tenants/${slug}/members/${membershipId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) { setRemoveError(json.error?.message || "Error al eliminar"); return; }
      if (data && data.items.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchMembers();
      }
    } catch { setRemoveError("Error de conexion"); }
    finally { setRemoveLoading(false); }
  }

  async function handleChangeRole(membershipId: string, newRole: string) {
    setChangingRole(membershipId);
    setChangeError("");
    try {
      const res = await apiFetch<Member>(`/api/admin/tenants/${slug}/members/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) { setChangeError(res.error?.message || "Error al cambiar rol"); return; }
      fetchMembers();
    } catch { setChangeError("Error de conexion"); }
    finally { setChangingRole(null); }
  }

  const isProvisioning = tenantStatus === "PROVISIONING";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Miembros</span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ padding: "5px 12px", fontSize: 12, borderRadius: 6, border: "1px solid var(--hc-line)", background: "var(--hc-panel)", color: "var(--hc-ink)", cursor: "pointer", fontFamily: "inherit" }}
        >
          + Agregar miembro
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} style={{ padding: "12px 16px", border: "1px solid var(--hc-line)", borderRadius: 6, background: "var(--hc-bone)", marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>Email</span>
            <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="usuario@email.com" style={{ padding: "5px 8px", fontSize: 12, border: "1px solid var(--hc-line)", borderRadius: 4, width: 200, fontFamily: "inherit" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>Rol</span>
            <select value={addRole} onChange={(e) => setAddRole(e.target.value)} style={{ padding: "5px 6px", fontSize: 12, border: "1px solid var(--hc-line)", borderRadius: 4, fontFamily: "inherit" }}>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <button type="submit" disabled={addLoading} style={{ padding: "5px 14px", fontSize: 12, borderRadius: 4, border: "none", background: "var(--hc-teal)", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            {addLoading ? "..." : "Agregar"}
          </button>
          <button type="button" onClick={() => setShowAdd(false)} style={{ padding: "5px 10px", fontSize: 12, borderRadius: 4, border: "1px solid var(--hc-line)", background: "var(--hc-panel)", cursor: "pointer", fontFamily: "inherit" }}>
            Cancelar
          </button>
          {addError && <span style={{ fontSize: 11, color: "var(--hc-red)", flexBasis: "100%" }}>{addError}</span>}
          {isProvisioning && <span style={{ fontSize: 11, color: "var(--hc-fog)", flexBasis: "100%" }}>Tenant en PROVISIONING: los miembros agregados deben tener cuenta activa.</span>}
        </form>
      )}

      {removeError && <InlineError message={removeError} />}
      {changeError && <InlineError message={changeError} />}

      {state === "loading" && <div style={{ padding: 20, textAlign: "center", color: "var(--hc-fog)", fontSize: 13 }}>Cargando miembros...</div>}
      {state === "error" && <InlineError message={error} onRetry={fetchMembers} />}
      {state === "empty" && <EmptyState message="No hay miembros en este tenant." />}

      {state === "success" && data && (
        <>
          <div style={{ border: "1px solid var(--hc-line)", borderRadius: 6, overflow: "hidden" }}>
            <div className="tenant-row tenant-head" style={{ padding: "8px 14px", gridTemplateColumns: "1fr 180px 100px 80px" }}>
              <span>Usuario</span>
              <span>Email</span>
              <span>Rol</span>
              <span></span>
            </div>
            {data.items.map((m) => (
              <div key={m.id} className="tenant-row" style={{ padding: "8px 14px", gridTemplateColumns: "1fr 180px 100px 80px", borderTop: "1px solid var(--hc-line)", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{m.name || "(sin nombre)"}</span>
                <span style={{ fontSize: 12, color: "var(--hc-fog)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</span>
                <span>
                  <select
                    value={m.role}
                    onChange={(e) => handleChangeRole(m.id, e.target.value)}
                    disabled={changingRole === m.id}
                    style={{ padding: "2px 4px", fontSize: 11, border: "1px solid var(--hc-line)", borderRadius: 4, fontFamily: "inherit", color: "var(--hc-ink)" }}
                    aria-label={`Cambiar rol de ${m.email}`}
                  >
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </span>
                <button
                  onClick={() => setShowRemove(m.id)}
                  disabled={removeLoading}
                  style={{ fontSize: 11, padding: "3px 8px", border: "1px solid var(--hc-red)", borderRadius: 4, background: "transparent", color: "var(--hc-red)", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
          <AdminTenantPagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!showRemove}
        title="Quitar miembro"
        message="Vas a quitar a este miembro del tenant. Si es el ultimo OWNER, la operacion sera rechazada."
        confirmLabel="Quitar"
        danger
        loading={removeLoading}
        onConfirm={() => handleRemove(showRemove!)}
        onCancel={() => setShowRemove(null)}
      />
    </div>
  );
}

/* ─────────────────── Invitations ─────────────────── */
function InvitationsTab({ slug, tenantStatus }: { slug: string; tenantStatus: string }) {
  const [data, setData] = useState<PaginatedResult<Invitation> | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error" | "empty">("loading");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState("VIEWER");
  const [invError, setInvError] = useState("");
  const [invLoading, setInvLoading] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resendId, setResendId] = useState<string | null>(null);
  const [resendLink, setResendLink] = useState("");
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchInvitations = useCallback(async () => {
    setState("loading"); setError("");
    try {
      const res = await apiFetch<PaginatedResult<Invitation>>(`/api/admin/tenants/${slug}/invitations?page=${page}&limit=20`);
      if (!res.ok) { setError(res.error?.message || "Error al cargar invitaciones"); setState("error"); return; }
      setData(res.data!);
      setState(res.data!.items.length === 0 ? "empty" : "success");
    } catch { setError("Error de conexion"); setState("error"); }
  }, [slug, page]);

  useEffect(() => { fetchInvitations(); }, [fetchInvitations]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setInvError("");
    if (!invEmail.includes("@")) { setInvError("Email invalido"); return; }
    setInvLoading(true);
    try {
      const res = await apiFetch<{ id: string; inviteLink: string }>(`/api/admin/tenants/${slug}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: invEmail, role: invRole }),
      });
      if (!res.ok) { setInvError(res.error?.message || "Error al crear invitacion"); return; }
      setShowCreate(false); setInvEmail(""); setInvRole("VIEWER");
      if (res.data?.inviteLink) {
        setResendLink(res.data.inviteLink);
        setResendId(res.data.id);
      }
      fetchInvitations();
    } catch { setInvError("Error de conexion"); }
    finally { setInvLoading(false); }
  }

  async function handleResend(invitationId: string) {
    setActionLoading(true); setActionError("");
    try {
      const res = await fetch(`/api/admin/tenants/${slug}/invitations/${invitationId}/resend`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setActionError(json.error?.message || "Error al reemitir invitacion");
        return;
      }
      if (json.data?.inviteLink) {
        setResendLink(json.data.inviteLink);
        setResendId(json.data.id);
      }
      fetchInvitations();
    } catch { setActionError("Error de conexion"); }
    finally { setActionLoading(false); }
  }

  async function handleRevoke(id: string) {
    setRevokeId(null);
    setActionLoading(true); setActionError("");
    try {
      const res = await fetch(`/api/admin/tenants/${slug}/invitations/${id}`, { method: "DELETE" });
      if (!res.ok) { const json = await res.json(); setActionError(json.error?.message || "Error al revocar"); return; }
      if (data && data.items.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchInvitations();
      }
    } catch { setActionError("Error de conexion"); }
    finally { setActionLoading(false); }
  }

  async function copyLink(link: string, id: string) {
    try { await navigator.clipboard.writeText(link); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); } catch { /* noop */ }
  }

  const isProvisioning = tenantStatus === "PROVISIONING";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Invitaciones</span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{ padding: "5px 12px", fontSize: 12, borderRadius: 6, border: "1px solid var(--hc-line)", background: "var(--hc-panel)", color: "var(--hc-ink)", cursor: "pointer", fontFamily: "inherit" }}
        >
          + Nueva invitacion
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ padding: "12px 16px", border: "1px solid var(--hc-line)", borderRadius: 6, background: "var(--hc-bone)", marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>Email</span>
            <input value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="invitado@email.com" style={{ padding: "5px 8px", fontSize: 12, border: "1px solid var(--hc-line)", borderRadius: 4, width: 200, fontFamily: "inherit" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>Rol</span>
            <select value={invRole} onChange={(e) => setInvRole(e.target.value)} style={{ padding: "5px 6px", fontSize: 12, border: "1px solid var(--hc-line)", borderRadius: 4, fontFamily: "inherit" }}>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          {isProvisioning && invRole !== "OWNER" && (
            <span style={{ fontSize: 11, color: "var(--hc-warn)", flexBasis: "100%" }}>Tenant en PROVISIONING: solo se permiten invitaciones con rol OWNER.</span>
          )}
          <button type="submit" disabled={invLoading} style={{ padding: "5px 14px", fontSize: 12, borderRadius: 4, border: "none", background: "var(--hc-teal)", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            {invLoading ? "..." : "Crear"}
          </button>
          <button type="button" onClick={() => setShowCreate(false)} style={{ padding: "5px 10px", fontSize: 12, borderRadius: 4, border: "1px solid var(--hc-line)", background: "var(--hc-panel)", cursor: "pointer", fontFamily: "inherit" }}>
            Cancelar
          </button>
          {invError && <span style={{ fontSize: 11, color: "var(--hc-red)", flexBasis: "100%" }}>{invError}</span>}
        </form>
      )}

      {actionError && <InlineError message={actionError} />}

      {resendLink && (
        <div style={{ padding: "10px 14px", border: "1px solid var(--hc-teal)", borderRadius: 6, background: "rgba(11,117,111,0.06)", marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--hc-teal)", margin: "0 0 6px" }}>Enlace de invitacion generado</p>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <code style={{ flex: 1, fontSize: 11, padding: "5px 8px", background: "var(--hc-panel)", borderRadius: 4, wordBreak: "break-all", border: "1px solid var(--hc-line)" }}>{resendLink}</code>
            <button onClick={() => copyLink(resendLink, resendId || "new")} style={{ padding: "5px 10px", fontSize: 11, border: "1px solid var(--hc-line)", borderRadius: 4, background: copiedId === resendId ? "var(--hc-teal)" : "var(--hc-panel)", color: copiedId === resendId ? "#fff" : "var(--hc-ink)", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
              {copiedId === resendId ? <Check size={14} /> : <Copy size={14} />}
              {copiedId === resendId ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--hc-fog)", margin: "6px 0 0", fontStyle: "italic" }}>
            Enlace manual — el envio automatico esta pendiente de configuracion. Si reemites, el enlace anterior quedara invalidado.
          </p>
        </div>
      )}

      {state === "loading" && <div style={{ padding: 20, textAlign: "center", color: "var(--hc-fog)", fontSize: 13 }}>Cargando invitaciones...</div>}
      {state === "error" && <InlineError message={error} onRetry={fetchInvitations} />}
      {state === "empty" && <EmptyState message="No hay invitaciones pendientes." />}

      {state === "success" && data && (
        <>
          <div style={{ border: "1px solid var(--hc-line)", borderRadius: 6, overflow: "hidden" }}>
            <div className="tenant-row tenant-head" style={{ padding: "8px 14px", gridTemplateColumns: "1fr 90px 80px 120px 110px 110px" }}>
              <span>Email</span>
              <span>Rol</span>
              <span>Estado</span>
              <span>Creado</span>
              <span>Expira</span>
              <span></span>
            </div>
            {data.items.map((inv) => (
              <div key={inv.id} className="tenant-row" style={{ padding: "8px 14px", gridTemplateColumns: "1fr 90px 80px 120px 110px 110px", borderTop: "1px solid var(--hc-line)", alignItems: "center" }}>
                <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.email}</span>
                <span><RoleBadge role={inv.role} size="sm" /></span>
                <span style={{ fontSize: 11, color: inv.accepted ? "var(--hc-teal)" : "var(--hc-fog)" }}>
                  {inv.accepted ? "Aceptada" : "Pendiente"}
                </span>
                <span style={{ fontSize: 11, color: "var(--hc-fog)" }}>{new Date(inv.createdAt).toLocaleDateString("es")}</span>
                <span style={{ fontSize: 11, color: new Date(inv.expiresAt) < new Date() ? "var(--hc-red)" : "var(--hc-fog)" }}>
                  {new Date(inv.expiresAt).toLocaleDateString("es")}
                </span>
                <span style={{ display: "flex", gap: 4 }}>
                  {!inv.accepted && (
                    <>
                      <button onClick={() => handleResend(inv.id)} disabled={actionLoading} style={{ fontSize: 10, padding: "2px 6px", border: "1px solid var(--hc-line)", borderRadius: 4, background: "var(--hc-panel)", cursor: "pointer", fontFamily: "inherit" }}>
                        <RefreshCw size={11} /> Reemitir
                      </button>
                      <button onClick={() => setRevokeId(inv.id)} disabled={actionLoading} style={{ fontSize: 10, padding: "2px 6px", border: "1px solid var(--hc-red)", borderRadius: 4, background: "transparent", color: "var(--hc-red)", cursor: "pointer", fontFamily: "inherit" }}>
                        Revocar
                      </button>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
          <AdminTenantPagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!revokeId}
        title="Revocar invitacion"
        message="La invitacion sera eliminada. El enlace actual dejara de funcionar."
        confirmLabel="Revocar"
        danger
        loading={actionLoading}
        onConfirm={() => handleRevoke(revokeId!)}
        onCancel={() => setRevokeId(null)}
      />
    </div>
  );
}

/* ─────────────────── Config ─────────────────── */
function ConfigTab({ tenant, slug, onRefresh }: { tenant: TenantData; slug: string; onRefresh: () => void }) {
  const [name, setName] = useState(tenant.name);
  const [timezone, setTimezone] = useState(tenant.timezone);
  const [locale, setLocale] = useState(tenant.locale);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setName(tenant.name);
    setTimezone(tenant.timezone);
    setLocale(tenant.locale);
    setDirty(false);
  }, [tenant]);

  function markDirty() { setDirty(true); setError(""); setSuccess(false); }

  function reset() {
    setName(tenant.name);
    setTimezone(tenant.timezone);
    setLocale(tenant.locale);
    setDirty(false);
    setError("");
  }

  async function handleSave() {
    if (!name.trim()) { setError("El nombre no puede estar vacio"); return; }
    setLoading(true); setError(""); setSuccess(false);
    try {
      const res = await apiFetch<TenantData>(`/api/admin/tenants/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), timezone, locale }),
      });
      if (!res.ok) { setError(res.error?.message || "Error al guardar"); return; }
      setSuccess(true);
      setDirty(false);
      onRefresh();
    } catch { setError("Error de conexion"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, background: "var(--hc-panel)", border: "1px solid var(--hc-line)", borderRadius: 6, padding: 18 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--hc-graphite)" }}>Nombre</span>
          <input value={name} onChange={(e) => { setName(e.target.value); markDirty(); }} style={{ padding: "7px 10px", fontSize: 13, border: "1px solid var(--hc-line)", borderRadius: 4, fontFamily: "inherit" }} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--hc-graphite)" }}>Timezone</span>
            <select value={timezone} onChange={(e) => { setTimezone(e.target.value); markDirty(); }} style={{ padding: "7px 8px", fontSize: 13, border: "1px solid var(--hc-line)", borderRadius: 4, fontFamily: "inherit" }}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--hc-graphite)" }}>Locale</span>
            <select value={locale} onChange={(e) => { setLocale(e.target.value); markDirty(); }} style={{ padding: "7px 8px", fontSize: 13, border: "1px solid var(--hc-line)", borderRadius: 4, fontFamily: "inherit" }}>
              {LOCALES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
          </label>
        </div>

        {error && <span style={{ fontSize: 11, color: "var(--hc-red)" }}>{error}</span>}
        {success && <span style={{ fontSize: 11, color: "var(--hc-teal)", display: "flex", alignItems: "center", gap: 4 }}><Check size={14} /> Configuracion guardada</span>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--hc-line)" }}>
          {dirty && (
            <button onClick={reset} disabled={loading} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", color: "var(--hc-ink)", cursor: "pointer", fontFamily: "inherit" }}>
              Cancelar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || loading}
            style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, border: "none", background: !dirty || loading ? "var(--hc-bone)" : "var(--hc-teal)", color: !dirty || loading ? "var(--hc-fog)" : "#fff", cursor: !dirty || loading ? "default" : "pointer", fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
          >
            {loading ? <Loader2 size={14} /> : <Check size={14} />}
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
