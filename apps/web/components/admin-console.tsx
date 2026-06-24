"use client";

import { useState } from "react";
import {
  BarChart3,
  Bot,
  Building2,
  Check,
  ClipboardList,
  DollarSign,
  Gauge,
  Info,
  PackageSearch,
  Save,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";
import { HeptaCoreWordmark } from "./heptacore-mark";
import { AdminIdentityPanel } from "./admin-identity-panel";
import type { AdminDashboardData } from "../lib/dashboard";

type LlmConfigState = {
  provider: string;
  model: string;
  apiKey: string;
};

const MODEL_RATES: Record<string, number> = {
  "gpt-4o": 0.0140,
  "gpt-4o-mini": 0.00084,
  "gpt-4.1": 0.0120,
  "gpt-4.1-mini": 0.0024,
  "gpt-4.1-nano": 0.00056,
  "o3-mini": 0.0062,
  "claude-3-5-haiku": 0.00544,
  "claude-3-5-sonnet": 0.0204,
  "claude-3-7-sonnet": 0.0204,
  "gemini-2.0-flash": 0.00056,
  "gemini-2.5-pro": 0.0130,
  "deepseek-chat": 0.00045,
  "deepseek-reasoner": 0.00304,
};

function getModelRate(provider: string, model: string): number {
  const key = model.toLowerCase().replace(/\./g, "-").replace(/\s+/g, "-");
  const direct = MODEL_RATES[key];
  if (direct) return direct;
  // Guess rate from model tier
  if (model.includes("mini") || model.includes("nano") || model.includes("flash") || model.includes("haiku")) return 0.001;
  if (model.includes("4o") || model.includes("sonnet") || model.includes("pro")) return 0.015;
  return 0.005;
}

function TenantLlmSection({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<LlmConfigState>({ provider: "deterministic", model: "", apiKey: "" });
  const [overheadFactor, setOverheadFactor] = useState(2.0);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [costSim, setCostSim] = useState<null | { provider: string; model: string; estTokens: number; estOutput: number; apiCost: number; tenantCost: number }>(null);

  async function loadConfig() {
    setOpen(!open);
    if (!open) {
      try {
        const res = await fetch(`/api/admin/llm-config?tenantSlug=${slug}`);
        if (res.ok) {
          const data = await res.json();
          setConfig({ provider: data.llmConfig.provider, model: data.llmConfig.model, apiKey: "" });
          setOverheadFactor(data.costConfig?.overheadFactor ?? 2.0);
        }
      } catch { /* ignore */ }
    }
  }

  async function saveConfig() {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/llm-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug: slug, ...config, overheadFactor }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="tool-button" onClick={loadConfig} style={{ fontSize: 12 }}>
        <Bot size={14} /> LLM
      </button>
      {open && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label={`Configuracion LLM ${name}`}>
          <button className="modal-backdrop" onClick={() => setOpen(false)} aria-label="Cerrar configuracion LLM" />
          <div className="modal-panel">
            <div className="modal-head">
              <div>
                <span className="section-label">Admin LLM</span>
                <h2>{name}</h2>
              </div>
              <button className="icon-button" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <div className="modal-body">
          <label>
            Provider
            <select
              value={config.provider}
              onChange={(e) => setConfig({ ...config, provider: e.target.value })}
            >
              <option value="deterministic">Deterministico (sin API)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Gemini</option>
              <option value="deepseek">DeepSeek</option>
            </select>
          </label>
          {config.provider !== "deterministic" && (
            <>
              <label>
                Modelo
                <input
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder="gpt-4o-mini"
                />
              </label>
              <label>
                API Key
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="sk-..."
                />
              </label>
            </>
          )}
          <label>
            <span><TrendingUp size={12} /> Overhead</span>
            <input
              type="number"
              step="0.1"
              min="1.0"
              max="10.0"
              value={overheadFactor}
              onChange={(e) => setOverheadFactor(parseFloat(e.target.value) || 2.0)}
            />
            <small style={{ fontSize: 10, color: "var(--hc-fog)" }}>
              (Utilidad: {((overheadFactor - 1) * 100).toFixed(0)}%)
            </small>
          </label>
          <AdminPricingTable overheadFactor={overheadFactor} />
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--hc-line)" }}>
                <button
                  onClick={() => {
                    const rate = getModelRate(config.provider, config.model);
                    const estTokens = 8000;
                    const estOutput = 3000;
                    const apiCost = estTokens * rate + estOutput * rate * 2;
                    setCostSim({
                      provider: config.provider,
                      model: config.model || "default",
                      estTokens,
                      estOutput,
                      apiCost,
                      tenantCost: apiCost * overheadFactor,
                    });
                  }}
                  style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", color: "var(--hc-ink)", cursor: "pointer" }}
                >
                  <DollarSign size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Simular costo de estrategia
                </button>
                {costSim && (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: "var(--hc-surface)", borderRadius: 6, fontSize: 11 }}>
                    <strong style={{ color: "var(--hc-teal)" }}>Estimacion {costSim.provider}/{costSim.model}</strong>
                    <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
                      <span>~{costSim.estTokens.toLocaleString()} tokens prompt + ~{costSim.estOutput.toLocaleString()} completion</span>
                      <span>API: <strong>${costSim.apiCost.toFixed(4)}</strong></span>
                      <span style={{ color: "var(--hc-teal)", fontWeight: 700 }}>
                        Tenant x{overheadFactor}: <strong>${costSim.tenantCost.toFixed(4)} USD</strong>
                      </span>
                    </div>
                    <small style={{ color: "var(--hc-fog)", display: "block", marginTop: 2 }}>
                      Basado en estrategia tipica (8K prompt + 3K completion). El costo real varia segun el tenant.
                    </small>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
            <button onClick={saveConfig} disabled={loading} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, background: "var(--hc-teal)", color: "#fff", border: "none" }}>
              <Save size={12} /> {loading ? "Guardando..." : "Guardar"}
            </button>
            {saved && <span style={{ fontSize: 11, color: "var(--hc-teal)", display: "flex", alignItems: "center" }}><Check size={12} /> Guardado</span>}
            <button onClick={() => setOpen(false)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, border: "1px solid var(--hc-line)", background: "var(--hc-bone)" }}>
              <X size={12} /> Cerrar
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCard({
  label,
  value,
  note,
  tone,
  onClick,
}: {
  label: string;
  value: string | number;
  note: string;
  tone?: "ok" | "warn";
  onClick?: () => void;
}) {
  const cls = tone === "ok" ? "status-ok" : tone === "warn" ? "status-warn" : "";
  return (
    <button
      className={`status-card ${cls}`}
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
        border: "none",
        background: "var(--hc-surface)",
        textAlign: "left",
        width: "100%",
        fontFamily: "inherit",
      }}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </button>
  );
}

export function AdminConsole({ data }: { data: AdminDashboardData }) {
  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

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
        <div style={{ padding: "6px 0 10px", width: "100%", minWidth: 0, boxSizing: "border-box" }}>
          <AdminIdentityPanel />
        </div>
        <nav className="app-nav">
          <a className="nav-link active" href="/admin"><ShieldCheck size={17} /> Consolidado</a>
          <a className="nav-link" href="/admin/tenants"><Building2 size={17} /> Tenants</a>
        </nav>
        <div className="guardrail-box">
          <ShieldCheck size={17} />
          <span>Admin global. Control de tenants y gates de publicacion. Los tenants en autopilot pueden publicar en real.</span>
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
          <StatusCard label="Tenants" value={data.totals.tenants} note="cuentas activas" onClick={() => scrollToSection("tenants-section")} />
          <StatusCard label="Drafts" value={data.totals.drafts} note="contenido total" onClick={() => scrollToSection("tenants-section")} />
          <StatusCard label="Aprobados" value={data.totals.approved} note="listos para dry-run" onClick={() => scrollToSection("tenants-section")} />
          <StatusCard label="Activos" value={data.totals.assets} note="assets cargados" tone="ok" onClick={() => scrollToSection("campaigns-section")} />
          <StatusCard label="Revision" value={data.totals.pendingReview} note="requieren criterio" tone="warn" onClick={() => scrollToSection("activity-section")} />
        </section>

        <div className="strategy-grid">
          <section className="work-panel span-2" id="tenants-section">
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
                <span>LLM</span>
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
                  <span><TenantLlmSection slug={tenant.slug} name={tenant.name} /></span>
                  <a className="tool-button" href={`/tenant/${tenant.slug}`}>Abrir</a>
                </div>
              ))}
            </div>
          </section>

          <section className="work-panel span-2" id="campaigns-section">
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
              Gasto real exige aprobacion, presupuesto y credenciales de plataforma. 35% overhead transparente.
            </div>
          </section>

          <section className="work-panel span-2" id="activity-section">
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

function AdminPricingTable({ overheadFactor }: { overheadFactor: number }) {
  const [open, setOpen] = useState(false);

  const rows = [
    { provider: "OpenAI", models: [
      { label: "GPT-4o", cost: 0.0140, tier: "Premium", speed: "Medio", reasoning: false },
      { label: "GPT-4o Mini", cost: 0.00084, tier: "Económico", speed: "Rápido", reasoning: false },
      { label: "GPT-4.1", cost: 0.0120, tier: "Premium", speed: "Medio", reasoning: false },
      { label: "GPT-4.1 Mini", cost: 0.0024, tier: "Balance", speed: "Rápido", reasoning: false },
      { label: "GPT-4.1 Nano", cost: 0.00056, tier: "Económico", speed: "Muy rápido", reasoning: false },
      { label: "o3 Mini", cost: 0.0062, tier: "Balance", speed: "Lento", reasoning: true },
    ]},
    { provider: "Anthropic", models: [
      { label: "Claude 3.5 Haiku", cost: 0.00544, tier: "Económico", speed: "Rápido", reasoning: false },
      { label: "Claude 3.5 Sonnet", cost: 0.0204, tier: "Premium", speed: "Medio", reasoning: false },
      { label: "Claude 3.7 Sonnet", cost: 0.0204, tier: "Premium", speed: "Lento", reasoning: true },
    ]},
    { provider: "Gemini", models: [
      { label: "Gemini 2.0 Flash", cost: 0.00056, tier: "Económico", speed: "Muy rápido", reasoning: false },
      { label: "Gemini 2.5 Pro", cost: 0.0130, tier: "Premium", speed: "Lento", reasoning: true },
    ]},
    { provider: "DeepSeek", models: [
      { label: "DeepSeek Chat", cost: 0.00045, tier: "Económico", speed: "Rápido", reasoning: false },
      { label: "DeepSeek Reasoner", cost: 0.00304, tier: "Balance", speed: "Lento", reasoning: true },
    ]},
  ];

  return (
    <div style={{ fontSize: 10 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", color: "var(--hc-fog)", cursor: "pointer" }}
      >
        <Info size={10} style={{ verticalAlign: "middle", marginRight: 2 }} />
        {open ? "Ocultar tabla de costos" : "Ver tabla de costos por modelo"}
      </button>
      {open && (
        <div style={{ marginTop: 6, border: "1px solid var(--hc-line)", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 55px 60px 55px 65px", gap: 0, background: "var(--hc-ink)", color: "#fff", padding: "3px 6px", fontWeight: 700, fontSize: 9 }}>
            <span>Modelo</span>
            <span>API/est</span>
            <span>Tier</span>
            <span>Velocidad</span>
            <span>Razonador</span>
            <span>x{overheadFactor}</span>
          </div>
          {rows.map((group) => (
            <div key={group.provider}>
              <div style={{ padding: "2px 6px", background: "var(--hc-bone)", fontWeight: 700, fontSize: 9, color: "var(--hc-fog)" }}>
                {group.provider}
              </div>
              {group.models.map((m) => (
                <div
                  key={m.label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 70px 55px 60px 55px 65px",
                    gap: 0,
                    padding: "3px 6px",
                    borderTop: "1px solid var(--hc-line)",
                    background: "var(--hc-surface)",
                    fontSize: 9,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{m.label}</span>
                  <span>${m.cost.toFixed(6)}</span>
                  <span>{m.tier}</span>
                  <span>{m.speed}</span>
                  <span>{m.reasoning ? "Sí" : "No"}</span>
                  <span style={{ color: "var(--hc-teal)", fontWeight: 700 }}>${(m.cost * overheadFactor).toFixed(4)}</span>
                </div>
              ))}
            </div>
          ))}
          <div style={{ padding: "4px 6px", background: "var(--hc-bone)", fontSize: 8, color: "var(--hc-fog)" }}>
            ~2000 tokens/estrategia. Costo tenant = API × overhead. El tenant paga la última columna.
          </div>
        </div>
      )}
    </div>
  );
}
