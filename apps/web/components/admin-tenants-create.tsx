"use client";

import { useState, useRef } from "react";
import { Copy, Check, Loader2, ArrowLeft, Building2 } from "lucide-react";

interface CreateFormData {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerName: string;
  timezone: string;
  locale: string;
}

interface CreatedTenant {
  slug: string;
  name: string;
  ownerEmail: string;
  inviteLink?: string;
  ownerAccountState?: string;
}

const TIMEZONES = [
  "UTC", "America/Caracas", "America/New_York", "America/Chicago",
  "America/Denver", "America/Los_Angeles", "America/Bogota",
  "America/Lima", "America/Santiago", "America/Buenos_Aires",
  "America/Mexico_City", "America/Panama", "Europe/Madrid",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
];

const LOCALES = ["es", "en", "pt", "fr", "de", "it"];

function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function AdminTenantsCreate() {
  const [form, setForm] = useState<CreateFormData>({ name: "", slug: "", ownerEmail: "", ownerName: "", timezone: "UTC", locale: "es" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedTenant | null>(null);
  const [copied, setCopied] = useState(false);
  const slugInputRef = useRef<HTMLInputElement>(null);

  function handleSlugChange(value: string) {
    const normalized = normalizeSlug(value);
    setForm((p) => ({ ...p, slug: normalized }));
    if (errors.slug) setErrors((p) => { const n = { ...p }; delete n.slug; return n; });
  }

  function handleNameChange(value: string) {
    setForm((p) => ({ ...p, name: value }));
    if (!form.slug || form.slug === normalizeSlug(form.name)) {
      setForm((p) => ({ ...p, slug: normalizeSlug(value) }));
    }
    if (errors.name) setErrors((p) => { const n = { ...p }; delete n.name; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Nombre debe tener al menos 2 caracteres";
    if (!form.slug || form.slug.length < 3) e.slug = "Slug debe tener al menos 3 caracteres";
    if (form.slug && form.slug.length > 63) e.slug = "Slug maximo 63 caracteres";
    if (form.slug && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(form.slug)) e.slug = "Slug invalido: solo minusculas, numeros y guiones";
    if (form.slug?.includes("--")) e.slug = "No puede contener guiones dobles";
    if (!form.ownerEmail || !form.ownerEmail.includes("@")) e.ownerEmail = "Email del owner requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), slug: form.slug, ownerEmail: form.ownerEmail.trim().toLowerCase(), ownerName: form.ownerName.trim() || undefined, timezone: form.timezone, locale: form.locale }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        const code = json.error?.code;
        const msg = json.error?.message || "Error al crear tenant";
        if (code === "SLUG_TAKEN") setErrors({ slug: msg });
        else if (code === "INVALID_OWNER_EMAIL") setErrors({ ownerEmail: msg });
        else if (code === "INVALID_SLUG") setErrors({ slug: msg });
        else setApiError(msg);
        return;
      }
      setCreated(json.data);
    } catch {
      setApiError("Error de conexion al crear el tenant");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  }

  if (created) {
    return (
      <div>
        <header className="workspace-header">
          <div>
            <span className="section-label">Admin</span>
            <h1>Tenant creado</h1>
          </div>
        </header>
        <div style={{ background: "var(--hc-panel)", border: "1px solid var(--hc-line)", borderRadius: 6, padding: 20, maxWidth: 600 }}>
          <p style={{ fontSize: 14, color: "var(--hc-teal)", fontWeight: 600, margin: "0 0 12px" }}>
            <Building2 size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
            {created.name}
          </p>
          <div style={{ fontSize: 13, color: "var(--hc-graphite)", marginBottom: 14 }}>
            <p style={{ margin: "2px 0" }}>Slug: <strong>{created.slug}</strong></p>
            <p style={{ margin: "2px 0" }}>Owner: <strong>{created.ownerEmail}</strong></p>
          </div>
          {created.inviteLink && (
            <div style={{ background: "var(--hc-bone)", border: "1px solid var(--hc-line)", borderRadius: 6, padding: 12, marginBottom: 14 }}>
              {created.ownerAccountState === "INVITATION_REQUIRED" ? (
                <>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--hc-graphite)", margin: "0 0 8px" }}>Enlace de invitacion</p>
                  <p style={{ fontSize: 12, color: "var(--hc-fog)", margin: "0 0 8px" }}>
                    La cuenta no tiene credenciales. Comparte este enlace para que el owner configure su acceso.
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--hc-graphite)", margin: "0 0 8px" }}>
                  Acceso al tenant
                </p>
              )}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <code style={{ flex: 1, fontSize: 11, padding: "6px 8px", background: "var(--hc-panel)", borderRadius: 4, wordBreak: "break-all", border: "1px solid var(--hc-line)" }}>
                  {created.inviteLink}
                </code>
                <button
                  onClick={() => copyLink(created.inviteLink!)}
                  style={{ padding: "6px 10px", fontSize: 12, border: "1px solid var(--hc-line)", borderRadius: 4, background: copied ? "var(--hc-teal)" : "var(--hc-panel)", color: copied ? "#fff" : "var(--hc-ink)", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          )}
          <p style={{ fontSize: 12, color: "var(--hc-fog)", margin: "0 0 14px", fontStyle: "italic" }}>
            {created.ownerAccountState === "INVITATION_REQUIRED"
              ? "Invitacion creada. El envio automatico esta pendiente de configuracion."
              : "Acceso preparado. Comparte el enlace de inicio de sesion con el owner."}
          </p>
          <a
            href={`/admin/tenants/${created.slug}`}
            style={{ fontSize: 13, padding: "8px 16px", borderRadius: 6, background: "var(--hc-teal)", color: "#fff", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Ir al detalle del tenant
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="workspace-header">
        <div>
          <span className="section-label">Admin</span>
          <h1>Crear tenant</h1>
        </div>
        <div className="header-actions">
          <a className="tool-button" href="/admin/tenants">
            <ArrowLeft size={14} /> Volver
          </a>
        </div>
      </header>

      <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        {apiError && (
          <div style={{ padding: "10px 14px", background: "rgba(138,29,29,0.06)", borderLeft: "3px solid var(--hc-red)", borderRadius: 4, marginBottom: 14, fontSize: 13, color: "var(--hc-red)" }}>
            {apiError}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14, background: "var(--hc-panel)", border: "1px solid var(--hc-line)", borderRadius: 6, padding: 18 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--hc-graphite)" }}>Nombre del tenant</span>
            <input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Mi Empresa S.A."
              style={{ padding: "7px 10px", fontSize: 13, border: `1px solid ${errors.name ? "var(--hc-red)" : "var(--hc-line)"}`, borderRadius: 4, fontFamily: "inherit" }}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && <span id="name-error" style={{ fontSize: 11, color: "var(--hc-red)" }}>{errors.name}</span>}
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--hc-graphite)" }}>Slug</span>
            <input
              ref={slugInputRef}
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="mi-empresa"
              style={{ padding: "7px 10px", fontSize: 13, border: `1px solid ${errors.slug ? "var(--hc-red)" : "var(--hc-line)"}`, borderRadius: 4, fontFamily: "monospace" }}
              aria-invalid={!!errors.slug}
              aria-describedby={errors.slug ? "slug-error" : undefined}
            />
            {errors.slug && <span id="slug-error" style={{ fontSize: 11, color: "var(--hc-red)" }}>{errors.slug}</span>}
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--hc-graphite)" }}>Email del owner</span>
            <input
              type="email"
              value={form.ownerEmail}
              onChange={(e) => { setForm((p) => ({ ...p, ownerEmail: e.target.value })); if (errors.ownerEmail) setErrors((p) => { const n = { ...p }; delete n.ownerEmail; return n; }); }}
              placeholder="owner@empresa.com"
              style={{ padding: "7px 10px", fontSize: 13, border: `1px solid ${errors.ownerEmail ? "var(--hc-red)" : "var(--hc-line)"}`, borderRadius: 4, fontFamily: "inherit" }}
              aria-invalid={!!errors.ownerEmail}
              aria-describedby={errors.ownerEmail ? "owner-error" : undefined}
            />
            {errors.ownerEmail && <span id="owner-error" style={{ fontSize: 11, color: "var(--hc-red)" }}>{errors.ownerEmail}</span>}
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--hc-graphite)" }}>Nombre del owner (opcional)</span>
            <input
              value={form.ownerName}
              onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))}
              placeholder="Juan Perez"
              style={{ padding: "7px 10px", fontSize: 13, border: "1px solid var(--hc-line)", borderRadius: 4, fontFamily: "inherit" }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--hc-graphite)" }}>Timezone</span>
              <select
                value={form.timezone}
                onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
                style={{ padding: "7px 8px", fontSize: 13, border: "1px solid var(--hc-line)", borderRadius: 4, fontFamily: "inherit" }}
              >
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--hc-graphite)" }}>Locale</span>
              <select
                value={form.locale}
                onChange={(e) => setForm((p) => ({ ...p, locale: e.target.value }))}
                style={{ padding: "7px 8px", fontSize: 13, border: "1px solid var(--hc-line)", borderRadius: 4, fontFamily: "inherit" }}
              >
                {LOCALES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--hc-line)" }}>
            <a href="/admin/tenants" style={{ fontSize: 12, padding: "8px 18px", borderRadius: 6, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", color: "var(--hc-ink)", textDecoration: "none", fontFamily: "inherit", cursor: "pointer" }}>Cancelar</a>
            <button
              type="submit"
              disabled={loading}
              style={{ fontSize: 12, padding: "8px 18px", borderRadius: 6, border: "none", background: "var(--hc-teal)", color: "#fff", cursor: loading ? "default" : "pointer", fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
            >
              {loading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Creando...</> : "Crear tenant"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
