"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ShieldCheck, ShieldAlert, X, LogOut, ChevronDown, ChevronUp, Info, Check, AlertTriangle, Loader2 } from "lucide-react";

interface CapabilitiesData {
  user: {
    id: string;
    email: string;
    name: string | null;
    globalRole: string | null;
  };
  effectivePermissions: Array<{ permission: string; granted: boolean }>;
  tenant: {
    tenantId?: string;
    tenantSlug?: string;
    tenantName?: string;
    tenantStatus?: string;
    tenantRole?: string | null;
    lifecycleBlockedReason?: string | null;
    tenantPermissions?: Array<{ permission: string; granted: boolean }>;
  };
}

function permissionLabel(perm: string): string {
  const labels: Record<string, string> = {
    TENANT_READ: "Lectura del tenant",
    TENANT_CONFIG_UPDATE: "Actualizar configuracion",
    TENANT_STATUS_CHANGE: "Cambiar estado del tenant",
    MEMBERS_READ: "Ver miembros",
    MEMBERS_ADD: "Agregar miembros",
    MEMBERS_ROLE_UPDATE: "Cambiar rol de miembros",
    MEMBERS_REMOVE: "Eliminar miembros",
    INVITATIONS_READ: "Ver invitaciones",
    INVITATIONS_CREATE: "Crear invitaciones",
    INVITATIONS_REISSUE: "Reemitir invitaciones",
    INVITATIONS_REVOKE: "Revocar invitaciones",
    INTEGRATIONS_MANAGE: "Gestionar integraciones",
    SECURITY_MANAGE: "Gestionar seguridad",
    PROJECTS_WRITE: "Editar proyectos",
    CONTENT_WRITE: "Editar contenido",
    CONTENT_APPROVE: "Aprobar contenido",
    CONTENT_PUBLISH: "Publicar contenido",
    ANALYTICS_READ: "Ver analiticas",
  };
  return labels[perm] ?? perm;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PROVISIONING: "Provisionamiento",
    ACTIVE: "Activo",
    SUSPENDED: "Suspendido",
    ARCHIVED: "Archivado",
  };
  return labels[status] ?? status;
}

function safeError(res: Response, json: any): string {
  if (res.status === 401) return "Sesion expirada. Inicia sesion nuevamente.";
  if (res.status === 403) return "No tienes acceso a esta informacion.";
  if (json?.error?.message) return json.error.message;
  return "Error al cargar capacidades";
}

export function AdminIdentityPanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CapabilitiesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const tenantSlug = useMemo(() => {
    const match = pathname?.match(/^\/admin\/tenants\/([^/]+)/);
    return match ? match[1] : undefined;
  }, [pathname]);

  const fetchCapabilities = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
      const res = await fetch(`/api/admin/capabilities${params}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(safeError(res, json));
        return;
      }
      setData(json.data);
      setError("");
    } catch {
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchCapabilities();
  }, [fetchCapabilities]);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const user = data?.user;
  const tenant = data?.tenant;
  const isSuperAdmin = user?.globalRole === "SUPER_ADMIN";

  let displayRole = "—";
  if (isSuperAdmin) displayRole = "SUPER_ADMIN";
  else if (tenant?.tenantRole) displayRole = tenant.tenantRole;

  let displayName = "—";
  if (user?.name) displayName = user.name;
  else if (user?.email) displayName = user.email.split("@")[0];
  else if (loading) displayName = "";
  else displayName = "Usuario";

  const hasError = !!error;
  const showLoadingBadge = loading && !data && !hasError;

  return (
    <div className="identity-panel-root">
      <button
        ref={triggerRef}
        type="button"
        className="identity-panel-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="identity-panel"
        aria-label={`Identidad de ${displayName || "cargando"}, rol ${displayRole}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 6,
          border: "1px solid var(--hc-line)",
          background: open ? "var(--hc-bone)" : "var(--hc-panel)",
          color: hasError ? "var(--hc-red)" : "var(--hc-ink)",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 12,
          fontWeight: 500,
          minWidth: 120,
          justifyContent: "center",
        }}
      >
        {showLoadingBadge ? (
          <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <>
            <span className="identity-panel-trigger-text" style={{ color: isSuperAdmin ? "var(--hc-teal)" : "var(--hc-graphite)", fontWeight: 700 }}>
              {displayName}
            </span>
            <span style={{ color: "var(--hc-fog)", fontSize: 10, flexShrink: 0 }}>
              · {displayRole}
            </span>
          </>
        )}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div
          id="identity-panel"
          ref={panelRef}
          className="identity-panel-content"
          role="dialog"
          aria-label="Panel de identidad y permisos"
        >
          {hasError && (
            <div style={{ padding: "14px 16px", fontSize: 12, color: "var(--hc-red)", borderBottom: "1px solid var(--hc-line)", display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {!hasError && loading && !data && (
            <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--hc-fog)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
              Cargando...
            </div>
          )}

          {data && (
            <>
              <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--hc-line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--hc-ink)", marginBottom: 2 }}>
                      {user?.name || "Sin nombre"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--hc-fog)" }}>{user?.email}</div>
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <ShieldCheck size={12} color={isSuperAdmin ? "var(--hc-teal)" : "var(--hc-fog)"} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: isSuperAdmin ? "var(--hc-teal)" : "var(--hc-fog)" }}>
                        {isSuperAdmin ? "SUPER_ADMIN" : "Usuario sin privilegios globales"}
                      </span>
                    </div>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Cerrar panel de identidad"
                    style={{
                      padding: 2,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "var(--hc-fog)",
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {tenant?.tenantId && (
                <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--hc-line)", background: "var(--hc-bone)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--hc-graphite)", marginBottom: 4 }}>
                    <Info size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
                    Tenant actual
                  </div>
                  <div style={{ fontSize: 12, color: "var(--hc-ink)" }}>
                    <strong>{tenant.tenantName}</strong>
                    <span style={{ color: "var(--hc-fog)", marginLeft: 6, fontSize: 11 }}>
                      {tenant.tenantSlug}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center" }}>
                    {tenant.tenantRole && (
                      <span style={{ fontSize: 10, background: "var(--hc-teal)", color: "#fff", padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>
                        {tenant.tenantRole}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: "var(--hc-fog)" }}>
                      {statusLabel(tenant.tenantStatus || "")}
                    </span>
                  </div>
                  {tenant.lifecycleBlockedReason && (
                    <div style={{ marginTop: 4, fontSize: 10, color: "var(--hc-warn)", display: "flex", alignItems: "flex-start", gap: 4 }}>
                      <AlertTriangle size={10} style={{ marginTop: 1, flexShrink: 0 }} />
                      <span>{tenant.lifecycleBlockedReason}</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ padding: "10px 16px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--hc-graphite)", marginBottom: 6 }}>
                  Permisos efectivos
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {(tenant?.tenantPermissions || data.effectivePermissions).map((p) => (
                    <div key={p.permission} className="identity-permission-row" style={{ color: p.granted ? "var(--hc-ink)" : "var(--hc-fog)" }}>
                      {p.granted ? (
                        <Check size={10} color="var(--hc-teal)" style={{ flexShrink: 0 }} />
                      ) : (
                        <X size={10} color="var(--hc-fog)" style={{ flexShrink: 0 }} />
                      )}
                      <span className="perm-label">{permissionLabel(p.permission)}</span>
                      <span
                        className="identity-permission-badge"
                        style={{
                          color: p.granted ? "var(--hc-teal)" : "var(--hc-fog)",
                          background: p.granted ? "rgba(11,117,111,0.1)" : "rgba(107,107,107,0.1)",
                        }}
                      >
                        {p.granted ? "SI" : "NO"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: "10px 16px", borderTop: "1px solid var(--hc-line)" }}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void signOut({ redirectTo: "/login" });
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 12px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid var(--hc-red)",
                    background: "rgba(138,29,29,0.06)",
                    color: "var(--hc-red)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <LogOut size={14} />
                  Cerrar sesion
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
