"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  Circle,
  ClipboardList,
  FileText,
  Gauge,
  ImageIcon,
  LockKeyhole,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { HeptaCoreWordmark } from "./heptacore-mark";
import type { DashboardMetrics, DraftQueueItem } from "../lib/dashboard";

type View = "overview" | "queue" | "checklist" | "reports" | "readiness";

function assetUrl(path: string | null | undefined) {
  if (!path) return "";
  return `/api/tenant-assets/${path.replace(/^content\/inbox\//, "")}`;
}

function channelLabel(item: DraftQueueItem) {
  return `${item.network} / ${item.format}`;
}

function Thumb({ item }: { item: DraftQueueItem }) {
  const url = assetUrl(item.asset?.path);
  if (url) {
    return (
      <img
        src={url}
        alt={item.title}
        className={item.asset?.kind === "VIDEO" ? "thumb thumb-video" : "thumb"}
      />
    );
  }
  return <div className="thumb fallback"><ImageIcon size={20} /></div>;
}

function Risk({ level }: { level: string }) {
  const cls = level === "low" ? "risk-low" : level === "medium" ? "risk-medium" : "risk-high";
  return <span className={`risk ${cls}`}>{level}</span>;
}

function PanelTitle({
  icon,
  title,
  action,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-title">
      <span>{icon} {title}</span>
      {action && <button onClick={onAction}>{action}</button>}
    </div>
  );
}

function StatusCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string | number;
  note: string;
  tone?: "ok" | "warn";
}) {
  const cls = tone === "ok" ? "status-ok" : tone === "warn" ? "status-warn" : "";
  return (
    <div className={`status-card ${cls}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

export function DashboardConsole({
  metrics,
  queue,
  checklist,
  report,
  readiness,
  tenantSlug,
}: {
  metrics: DashboardMetrics | null;
  queue: DraftQueueItem[];
  checklist: Array<{ label: string; done: boolean }>;
  report: any;
  readiness: any;
  tenantSlug: string;
}) {
  const [view, setView] = useState<View>("overview");
  const [selectedId, setSelectedId] = useState(queue[0]?.id ?? "");
  const [localQueue, setLocalQueue] = useState(queue);
  const selected = localQueue.find((i) => i.id === selectedId) ?? localQueue[0];

  const pendingReview = localQueue.filter(
    (i) => i.status !== "PUBLISHED" && (i.requiresReview || i.riskLevel !== "low"),
  );
  const scheduled = localQueue
    .filter((i) => i.status !== "PUBLISHED")
    .sort((a, b) => (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? ""));
  const readyNow = scheduled.slice(0, 5);

  const nextDate = scheduled[0]?.scheduledFor?.slice(5) ?? "--";

  const updateLocalStatus = useCallback((id: string, newStatus: string) => {
    setLocalQueue((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d)));
  }, []);

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <HeptaCoreWordmark />
        </div>
        <div className="tenant-switcher">
          <span>Workspace</span>
          <strong>{metrics?.tenant.name ?? "Turpial Sound"}</strong>
          <small>Instagram + Facebook / {metrics?.tenant.mode ?? "draft"}</small>
        </div>
        <nav className="app-nav">
          <NavButton icon={<Gauge size={17} />} active={view === "overview"} onClick={() => setView("overview")}>Operaciones</NavButton>
          <NavButton icon={<ClipboardList size={17} />} active={view === "queue"} onClick={() => setView("queue")}>Cola de drafts</NavButton>
          <NavButton icon={<Check size={17} />} active={view === "checklist"} onClick={() => setView("checklist")}>Checklist</NavButton>
          <NavButton icon={<FileText size={17} />} active={view === "reports"} onClick={() => setView("reports")}>Reportes</NavButton>
          <NavButton icon={<LockKeyhole size={17} />} active={view === "readiness"} onClick={() => setView("readiness")}>Publicacion</NavButton>
        </nav>
        <div className="guardrail-box">
          <ShieldCheck size={17} />
          <span>Dry-run activo. Sin publicacion real. Todo pasa por aprobacion humana.</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <span className="section-label">Tenant: {tenantSlug}</span>
            <h1>Control de RRSS y APROBACIONES</h1>
          </div>
          <div className="header-actions">
            <button className="primary-action" onClick={() => setView("queue")}>
              <Check size={16} /> Revisar cola
            </button>
          </div>
        </header>

        {metrics && (
          <section className="status-strip">
            <StatusCard label="Total" value={metrics.counts.totalDrafts} note="drafts en DB" />
            <StatusCard label="Pendientes" value={pendingReview.length} note="requieren criterio" tone="warn" />
            <StatusCard label="Aprobados" value={metrics.counts.approved} note="listos para publicar" />
            <StatusCard label="Assets" value={metrics.counts.totalAssets} note="importados" tone="ok" />
            <StatusCard label="Proximo" value={nextDate} note="primer hito" />
          </section>
        )}

        {view === "overview" && (
          <div className="ops-grid">
            <section className="work-panel primary-work">
              <PanelTitle icon={<ClipboardList size={17} />} title="Aprobacion inmediata" action="Ver todo" onAction={() => setView("queue")} />
              <div className="compact-queue">
                {readyNow.map((item) => (
                  <button key={item.id} className="compact-row" onClick={() => { setSelectedId(item.id); setView("queue"); }}>
                    <Thumb item={item} />
                    <span>
                      <small>{channelLabel(item)} / {item.scheduledFor}</small>
                      <strong>{item.title}</strong>
                    </span>
                    <Risk level={item.riskLevel} />
                    <ChevronRight size={16} />
                  </button>
                ))}
                {readyNow.length === 0 && <p style={{ padding: 14 }}>No hay drafts pendientes.</p>}
              </div>
            </section>

            <section className="work-panel selected-preview">
              <PanelTitle icon={<ImageIcon size={17} />} title="Preview del siguiente post" />
              {selected && (
                <div className="post-preview">
                  <div className="post-preview-head">
                    <div>
                      <strong style={{ display: "block", fontSize: 15 }}>{selected.title}</strong>
                      <small style={{ color: "var(--hc-fog)", fontSize: 11 }}>{channelLabel(selected)}</small>
                    </div>
                    <Risk level={selected.riskLevel} />
                  </div>
                  <Thumb item={selected} />
                  <div className="caption-box">{selected.caption}</div>
                </div>
              )}
            </section>

            <section className="work-panel">
              <PanelTitle icon={<Bot size={17} />} title="Pilares activos" />
              <div className="dense-list" style={{ padding: 14 }}>
                {metrics?.pillars.map((p) => (
                  <li key={p.name}>
                    <strong>{p.name}</strong> - {p.count} drafts
                  </li>
                ))}
              </div>
            </section>

            <section className="work-panel">
              <PanelTitle icon={<AlertTriangle size={17} />} title="Bloqueos reales" />
              <ul className="dense-list">
                <li>OAuth real de Meta pendiente.</li>
                <li>Publicacion real bloqueada hasta aprobacion humana.</li>
                <li>Respuestas delicadas requieren cola de revision.</li>
                <li>Campanas pagas en modo recomendacion.</li>
              </ul>
            </section>
          </div>
        )}

        {view === "queue" && selected && (
          <div className="queue-workspace">
            <section className="work-panel queue-column">
              <PanelTitle icon={<ClipboardList size={17} />} title="Cola de publicaciones" />
              <div className="queue-scroll">
                {scheduled.map((item) => (
                  <button
                    key={item.id}
                    className={item.id === selected.id ? "queue-card active" : "queue-card"}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <Thumb item={item} />
                    <span>
                      <small>{channelLabel(item)} / {item.scheduledFor}</small>
                      <strong>{item.title}</strong>
                      <em>{item.status}</em>
                    </span>
                    <Risk level={item.riskLevel} />
                  </button>
                ))}
                {scheduled.length === 0 && <p style={{ padding: 14 }}>Cola vacia.</p>}
              </div>
            </section>
            <section className="work-panel detail-column">
              <div className="post-preview">
                <div className="post-preview-head">
                  <div>
                    <strong style={{ display: "block", fontSize: 15 }}>{selected.title}</strong>
                    <small style={{ color: "var(--hc-fog)", fontSize: 11 }}>
                      {channelLabel(selected)} / {selected.status} / {selected.scheduledFor}
                    </small>
                  </div>
                  <Risk level={selected.riskLevel} />
                </div>
                <Thumb item={selected} />
                <div className="caption-box">{selected.caption}</div>
                <div className="tag-row">
                  {selected.hashtags.map((h) => <span key={h}>{h}</span>)}
                </div>
                {selected.status === "DRAFT" || selected.status === "NEEDS_REVIEW" ? (
                  <ApprovalActions draftId={selected.id} onStatusChange={(s) => updateLocalStatus(selected.id, s)} />
                ) : (
                  <div className="approval-actions">
                    <span style={{ color: "var(--hc-fog)", fontSize: 12, padding: "8px 0" }}>
                      Estado: {selected.status}
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {view === "checklist" && (
          <div className="strategy-grid">
            <section className="work-panel span-2">
              <PanelTitle icon={<Check size={17} />} title="Checklist de preparacion" />
              <ul className="check-list">
                {checklist.map((item, i) => (
                  <li key={i}>
                    {item.done ? (
                      <CheckCircleIcon />
                    ) : (
                      <Circle size={17} style={{ color: "var(--hc-fog)", flexShrink: 0 }} />
                    )}
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {view === "reports" && report && (
          <div className="strategy-grid">
            <section className="work-panel span-2">
              <PanelTitle icon={<BarChart3 size={17} />} title={`Reporte: ${report.tenantName}`} />
              <div style={{ padding: 14 }}>
                <div className="status-strip" style={{ marginBottom: 14 }}>
                  <StatusCard label="Total drafts" value={report.total} note="en cola" />
                  <StatusCard label="Requieren revision" value={report.needsReview} note="humanos" tone="warn" />
                  <StatusCard label="Sin assets" value={report.pendingAssets} note="bloqueados" tone={report.pendingAssets > 0 ? "warn" : "ok"} />
                </div>
                <h3>Por estado</h3>
                <div className="tag-row" style={{ marginBottom: 14 }}>
                  {report.byStatus.map((s: any) => (
                    <span key={s.status}>{s.status}: {s.count}</span>
                  ))}
                </div>
                <h3>Por red</h3>
                <div className="tag-row" style={{ marginBottom: 14 }}>
                  {report.byNetwork.map((n: any) => (
                    <span key={n.network}>{n.network}: {n.count}</span>
                  ))}
                </div>
                <h3>Actividad reciente</h3>
                <ul className="dense-list">
                  {report.recentActivity.slice(0, 10).map((a: any, i: number) => (
                    <li key={i}>{a.at} — {a.action} ({a.target})</li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        )}

        {view === "readiness" && readiness && (
          <div className="strategy-grid">
            <section className="work-panel span-2">
              <PanelTitle icon={<LockKeyhole size={17} />} title={`Readiness Gate: ${readiness.tenantName}`} />
              <div style={{ padding: 14 }}>
                <div className={`status-card ${readiness.allPassed ? "status-ok" : "status-warn"}`} style={{ marginBottom: 14 }}>
                  <span>Estado</span>
                  <strong>{readiness.allPassed ? "LISTO" : "BLOQUEADO"}</strong>
                  <small>{readiness.summary}</small>
                </div>
                <h3>Gates de seguridad</h3>
                <ul className="check-list">
                  {readiness.gates.map((g: any, i: number) => (
                    <li key={i}>
                      {g.passed ? <CheckCircleIcon /> : <Circle size={17} style={{ color: "var(--hc-fog)", flexShrink: 0 }} />}
                      <span>{g.label}</span>
                    </li>
                  ))}
                </ul>
                {!readiness.allPassed && (
                  <>
                    <h3 style={{ marginTop: 14 }}>Plan de rollback</h3>
                    <ul className="dense-list">
                      {readiness.rollbackPlan.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function NavButton({
  icon,
  active,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--hc-teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ApprovalActions({
  draftId,
  onStatusChange,
}: {
  draftId: string;
  onStatusChange: (status: string) => void;
}) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function handleApprove() {
    setLoading("approve");
    try {
      const res = await fetch(`/api/drafts/${draftId}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.ok) onStatusChange("APPROVED");
      else alert(data.error || "Error");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    try {
      const res = await fetch(`/api/drafts/${draftId}/reject`, { method: "POST" });
      const data = await res.json();
      if (data.ok) onStatusChange("REJECTED");
      else alert(data.error || "Error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="approval-actions">
      <button className="approve" onClick={handleApprove} disabled={loading !== null}>
        <Check size={16} />
        {loading === "approve" ? "Aprobando..." : "Aprobar"}
      </button>
      <button onClick={handleReject} disabled={loading !== null}>
        <X size={16} />
        {loading === "reject" ? "Rechazando..." : "Rechazar"}
      </button>
    </div>
  );
}
