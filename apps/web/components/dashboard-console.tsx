"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  ClipboardList,
  DollarSign,
  FileText,
  Gauge,
  ImageIcon,
  Info,
  LockKeyhole,
  MessageSquareText,
  PackageSearch,
  Pencil,
  Settings2,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";
import { HeptaCoreWordmark } from "./heptacore-mark";
import { AssistantFab } from "./assistant-fab";
import type {
  CalendarItem,
  DashboardMetrics,
  DraftQueueItem,
  StrategySnapshot,
  TenantAssetItem,
} from "../lib/dashboard";
import type { TrialStatus } from "../lib/trial";

type View = "overview" | "strategy" | "queue" | "assets" | "calendar" | "checklist" | "reports" | "readiness";
type CalendarView = "list" | "week" | "month";

const SUPPORTED_NETWORKS = ["INSTAGRAM", "FACEBOOK", "YOUTUBE", "TIKTOK", "LINKEDIN"] as const;

const TIMEZONES = [
  { value: "America/Caracas", label: "Venezuela (UTC-4)" },
  { value: "America/Bogota", label: "Colombia (UTC-5)" },
  { value: "America/Lima", label: "Peru (UTC-5)" },
  { value: "America/Santiago", label: "Chile (UTC-4/-3)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (UTC-3)" },
  { value: "America/Mexico_City", label: "Mexico (UTC-6)" },
  { value: "America/New_York", label: "US Eastern (UTC-5/-4)" },
  { value: "America/Chicago", label: "US Central (UTC-6/-5)" },
  { value: "America/Denver", label: "US Mountain (UTC-7/-6)" },
  { value: "America/Los_Angeles", label: "US Pacific (UTC-8/-7)" },
  { value: "Europe/Madrid", label: "Espana (UTC+1/+2)" },
  { value: "Europe/London", label: "UK (UTC+0/+1)" },
  { value: "UTC", label: "UTC" },
] as const;
const NETWORK_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
  LINKEDIN: "LinkedIn",
  X: "X",
};

function tenantAssetSlug(tenantSlug: string): string {
  return tenantSlug === "turpial-sound" ? "turpial" : tenantSlug;
}

function assetUrl(path: string | null | undefined, slug: string) {
  if (!path) return "";
  const folder = tenantAssetSlug(slug);
  const cleanPath = path.replace(/^content\/inbox\//, "").replace(/\\/g, "/");
  if (cleanPath.includes("..")) return "";
  return `/tenant-assets/${folder}/${cleanPath}`;
}

function channelLabel(item: DraftQueueItem) {
  return `${item.network} / ${item.format}`;
}

function getPlatformFrameClass(item: DraftQueueItem) {
  const ch = item.network.toLowerCase();
  const fmt = item.format?.toLowerCase() ?? "feed";
  if (ch === "instagram" && (fmt === "story" || fmt === "reel")) return "frame-ig-vertical";
  if (ch === "instagram" && fmt === "feed") return "frame-ig-square";
  if (ch === "instagram" && fmt === "carousel") return "frame-ig-portrait";
  if (ch === "tiktok" || (ch === "youtube" && (fmt === "short" || fmt === "vertical_video"))) return "frame-ig-vertical";
  if (ch === "youtube") return "frame-youtube";
  if (ch === "linkedin") return "frame-linkedin";
  return "frame-facebook";
}

function isVideoAsset(item: DraftQueueItem | { asset?: { path: string | null; kind: string } | null }) {
  const path = item.asset?.path?.toLowerCase() ?? "";
  return item.asset?.kind === "VIDEO" || path.endsWith(".mp4") || path.endsWith(".mov") || path.endsWith(".webm");
}

function Thumb({ item, slug }: { item: DraftQueueItem; slug: string }) {
  const url = assetUrl(item.asset?.path, slug);
  if (url) {
    if (isVideoAsset(item)) {
      return <video src={url} className="thumb thumb-video" muted playsInline preload="metadata" />;
    }
    return <img src={url} alt={item.title} className="thumb" />;
  }
  return <div className="thumb fallback"><ImageIcon size={20} /></div>;
}

function Risk({ level, onAction }: { level: string; onAction?: () => void }) {
  const cls = level === "low" ? "risk-low" : level === "medium" ? "risk-medium" : "risk-high";
  const explain = {
    low: "Bajo riesgo: contenido apto para publicacion automatica sin revision humana",
    medium: "Riesgo medio: requiere revision ligera antes de publicar",
    high: "Riesgo alto: requiere revision humana obligatoria antes de publicar",
  }[level] ?? level;
  return (
    <span
      className={`risk ${cls} risk-chip`}
      title={explain}
      onClick={onAction}
      style={{ cursor: onAction ? "pointer" : "default" }}
    >
      {level}
    </span>
  );
}

function PanelTitle({
  icon,
  title,
  action,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  onAction?: () => void;
}) {
  return (
    <div className="panel-title">
      <span>{icon} {title}</span>
      {action && (typeof action === "string" ? <button onClick={onAction}>{action}</button> : action)}
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

export function DashboardConsole({
  metrics,
  queue,
  assets,
  strategy,
  calendar,
  checklist,
  report,
  readiness,
  tenantSlug,
  adminMode = false,
  trial,
}: {
  metrics: DashboardMetrics | null;
  queue: DraftQueueItem[];
  assets: TenantAssetItem[];
  strategy: StrategySnapshot | null;
  calendar: CalendarItem[];
  checklist: Array<{ label: string; done: boolean }>;
  report: any;
  readiness: any;
  tenantSlug: string;
  adminMode?: boolean;
  trial?: TrialStatus;
}) {
  const [view, setView] = useState<View>("overview");
  const [selectedId, setSelectedId] = useState(queue[0]?.id ?? "");
  const [localQueue, setLocalQueue] = useState(queue);
  const [manualApproval, setManualApproval] = useState(false);
  const [publishMode, setPublishMode] = useState<"dry_run" | "scheduled" | "immediate">("dry_run");
  const tenantAutoPilot =
    metrics?.tenant.mode === "AUTOPILOT_FULL" || metrics?.tenant.mode === "AUTOPILOT_LIMITED";
  const tenantNeedsManual =
    metrics?.tenant.mode === "APPROVAL_REQUIRED" || metrics?.tenant.mode === "DRAFT_ONLY";
  const [publishState, setPublishState] = useState<"idle" | "loading" | "published" | "scheduled" | "dry_run_ok" | "blocked" | "failed">("idle");
  const [publishMessage, setPublishMessage] = useState("");

  useEffect(() => {
    setManualApproval(false);
    setPublishState("idle");
    setPublishMessage("");
  }, [selectedId, publishMode]);

  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>("list");
  const [strategyEdit, setStrategyEdit] = useState(false);
  const [strategyName, setStrategyName] = useState("");
  const [strategyDesc, setStrategyDesc] = useState("");
  const [strategyVoice, setStrategyVoice] = useState("");
  const [strategySaving, setStrategySaving] = useState(false);
  const [llmProvider, setLlmProvider] = useState("deterministic");
  const [llmModel, setLlmModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmOpen, setLlmOpen] = useState(false);
  const [strategyGenerating, setStrategyGenerating] = useState(false);
  const [strategyResult, setStrategyResult] = useState<null | { provider: string; strategy: any; cost?: any }>(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetReplacing, setAssetReplacing] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [networkSaving, setNetworkSaving] = useState(false);
  const [strategyTimezone, setStrategyTimezone] = useState("America/Caracas");
  const [renamingAssetId, setRenamingAssetId] = useState("");
  const [renameFilename, setRenameFilename] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [newPubOpen, setNewPubOpen] = useState(false);
  const [newPubTitle, setNewPubTitle] = useState("");
  const [newPubCaption, setNewPubCaption] = useState("");
  const [newPubNetwork, setNewPubNetwork] = useState("INSTAGRAM");
  const [newPubAssetId, setNewPubAssetId] = useState("");
  const [newPubSaving, setNewPubSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selected = localQueue.find((i) => i.id === selectedId) ?? localQueue[0];
  const activeNetworks = metrics?.tenant.activeNetworks?.length ? metrics.tenant.activeNetworks : ["INSTAGRAM", "FACEBOOK"];
  const missingCoreNetworks = SUPPORTED_NETWORKS.filter((network) => !activeNetworks.includes(network));

  const pendingReview = localQueue.filter(
    (i) => i.status !== "PUBLISHED" && (i.requiresReview || i.riskLevel !== "low"),
  );
  const scheduled = localQueue
    .filter((i) => i.status !== "PUBLISHED")
    .sort((a, b) => (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? ""));
  const readyNow = scheduled.slice(0, 5);

  const nextItem = scheduled[0] ?? null;
  const nextDate = nextItem?.scheduledFor?.slice(5) ?? "--";
  const nextTitle = nextItem?.title ? (nextItem.title.length > 25 ? nextItem.title.slice(0, 25) + "…" : nextItem.title) : null;
  const nextNote = nextItem
    ? `${nextItem.network} · ${nextItem.status === "APPROVED" ? "Listo" : nextItem.status === "NEEDS_REVIEW" ? "Pendiente revision" : nextItem.status}`
    : "No hay programados";

  const updateLocalStatus = useCallback((id: string, newStatus: string, extra?: Partial<DraftQueueItem>) => {
    setLocalQueue((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStatus, ...extra } : d)));
  }, []);

  function resolvePublishTarget(): DraftQueueItem | null {
    if (!selected) return null;
    if (selected.status === "PUBLISHED") return null;
    if (publishMode === "immediate" && selected.status !== "APPROVED") return null;
    if (publishMode === "scheduled" && selected.status !== "APPROVED") return null;
    return selected;
  }

  const publishTarget = resolvePublishTarget();

  async function handlePublish() {
    if (!publishTarget) return;
    setPublishState("loading");
    setPublishMessage("");
    try {
      const effectiveMode = publishMode;
      const res = await fetch("/api/publishing/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          draftId: publishTarget.id,
          manualApproval: manualApproval || tenantAutoPilot,
          mode: effectiveMode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPublishState(data.code === "LIVE_BLOCKED_TRIAL_LIMIT" || data.code?.startsWith("LIVE_BLOCKED") ? "blocked" : "failed");
        setPublishMessage(data.error || data.action || "No se pudo ejecutar la publicacion.");
        return;
      }
      const newStatus = data.mode === "immediate" ? "PUBLISHED" : data.mode === "scheduled" ? "SCHEDULED" : "APPROVED";
      const extra = data.externalPostId ? { externalPostId: data.externalPostId } as Partial<DraftQueueItem> : {};
      updateLocalStatus(publishTarget.id, newStatus, extra);
      if (data.mode === "dry_run") {
        setPublishState("dry_run_ok");
      } else if (data.mode === "scheduled") {
        setPublishState("scheduled");
      } else {
        setPublishState("published");
      }
      const externalIdPart = data.externalPostId ? ` (ID: ${data.externalPostId})` : "";
      setPublishMessage(
        data.mode === "immediate"
          ? `Publicado en vivo: ${publishTarget.title}.${externalIdPart}`
          : data.mode === "scheduled"
            ? `Programado: ${publishTarget.title} (${data.scheduledFor ? new Date(data.scheduledFor).toLocaleString() : "pronto"}).`
            : `Dry-run validado: ${publishTarget.title}.`,
      );
    } catch (error) {
      setPublishState("failed");
      setPublishMessage(error instanceof Error ? error.message : "Error de red.");
    }
  }

  const publishEligibility = !selected
    ? { eligible: false as const, reason: "No hay draft seleccionado. Selecciona uno en la cola.", target: null }
    : selected.status === "PUBLISHED"
      ? { eligible: false as const, reason: "Este draft ya fue publicado. No puede volver a publicarse.", target: null }
      : publishMode === "immediate" && selected.status !== "APPROVED"
        ? { eligible: false as const, reason: `El draft debe estar APROBADO para publicacion inmediata. Estado actual: ${selected.status}.`, target: null }
        : publishMode === "scheduled" && selected.status !== "APPROVED"
          ? { eligible: false as const, reason: `El draft debe estar APROBADO para programar. Estado actual: ${selected.status}.`, target: null }
          : { eligible: true as const, reason: "", target: selected };

  function startEdit() {
    setEditTitle(selected?.title ?? "");
    setEditCaption(selected?.caption ?? "");
    setEditHashtags(selected?.hashtags.join(" ") ?? "");
    setEditMode(true);
  }

  function startStrategyEdit() {
    setStrategyName(strategy?.projectName ?? metrics?.tenant.name ?? "");
    setStrategyDesc(strategy?.projectDescription ?? "");
    setStrategyVoice(strategy?.brandVoice.join(" / ") ?? "");
    setStrategyEdit(true);
  }

  async function handleSaveStrategy() {
    setStrategySaving(true);
    try {
      const voiceList = strategyVoice.split("/").map((v) => v.trim()).filter(Boolean);
      const res = await fetch("/api/strategy/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          projectName: strategyName,
          projectDescription: strategyDesc,
          brandVoice: voiceList,
          pillars: strategy?.pillars.map((p) => ({ name: p.name, description: p.description, priority: p.priority })) ?? [],
        }),
      });
      if (!res.ok) {
        alert("Error al guardar estrategia");
        return;
      }
      setStrategyEdit(false);
    } finally {
      setStrategySaving(false);
    }
  }

  async function handleGenerateStrategy() {
    setStrategyGenerating(true);
    setStrategyResult(null);
    try {
      const res = await fetch("/api/strategy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          preferredNetworks: activeNetworks.map((network) => network.toLowerCase()),
          providerConfig: { provider: llmProvider, model: llmModel, apiKey: llmApiKey },
          timezone: strategyTimezone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Error al generar estrategia");
        return;
      }
      setStrategyResult(data);
    } finally {
      setStrategyGenerating(false);
    }
  }

  async function handleEnableMissingNetworks() {
    if (missingCoreNetworks.length === 0) return;
    setNetworkSaving(true);
    try {
      const res = await fetch("/api/tenant-networks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug, networks: missingCoreNetworks }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "No se pudieron activar las redes.");
        return;
      }
      window.location.reload();
    } finally {
      setNetworkSaving(false);
    }
  }

  function cancelEdit() {
    setEditMode(false);
  }

  async function handleMoveItem(id: string, direction: "up" | "down") {
    try {
      const res = await fetch("/api/drafts/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, direction }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch { /* ignore */ }
  }

  async function handleSaveEdit() {
    if (!selected) return;
    setEditSaving(true);
    try {
      const hashtagList = editHashtags
        .split(/[\s,]+/)
        .map((h) => h.trim())
        .filter((h) => h.length > 0);

      const res = await fetch(`/api/drafts/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          caption: editCaption,
          hashtags: hashtagList,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "Error al guardar");
        return;
      }
      updateLocalStatus(selected.id, data.draft.status);
      setLocalQueue((prev) => prev.map((d) => d.id === selected.id ? {
        ...d,
        title: editTitle,
        caption: editCaption,
        hashtags: hashtagList,
        status: data.draft.status,
      } : d));
      setEditMode(false);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleReplaceAsset(newAssetId: string) {
    if (!selected) return;
    setAssetReplacing(true);
    try {
      const res = await fetch(`/api/drafts/${selected.id}/asset`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: newAssetId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "Error al reemplazar asset");
        return;
      }
      window.location.reload();
    } finally {
      setAssetReplacing(false);
      setAssetPickerOpen(false);
    }
  }

  async function handleNewPublication() {
    if (!newPubTitle.trim()) return;
    setNewPubSaving(true);
    try {
      const res = await fetch("/api/drafts/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPubTitle.trim(),
          caption: newPubCaption.trim(),
          network: newPubNetwork,
          assetId: newPubAssetId || undefined,
          tenantSlug,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "Error al crear publicacion");
        return;
      }
      window.location.reload();
    } finally {
      setNewPubSaving(false);
    }
  }

  async function handleUploadAsset() {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("tenantSlug", tenantSlug);
      const res = await fetch("/api/assets/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "Error al subir asset");
        return;
      }
      window.location.reload();
    } finally {
      setUploading(false);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRenameAsset(assetId: string) {
    if (!renameFilename.trim()) return;
    setRenameSaving(true);
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: renameFilename.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "Error al renombrar asset");
        return;
      }
      window.location.reload();
    } finally {
      setRenameSaving(false);
      setRenamingAssetId("");
      setRenameFilename("");
    }
  }

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <HeptaCoreWordmark />
        </div>
        <div className="tenant-switcher">
          <span>Workspace</span>
          <strong>{metrics?.tenant.name ?? "Turpial Sound"}</strong>
          <small>{activeNetworks.map((network) => NETWORK_LABELS[network] ?? network).join(" + ")} / {metrics?.tenant.mode ?? "draft"}</small>
        </div>
        <nav className="app-nav">
          <NavButton icon={<Gauge size={17} />} active={view === "overview"} onClick={() => setView("overview")}>Operaciones</NavButton>
          <NavButton icon={<Bot size={17} />} active={view === "strategy"} onClick={() => setView("strategy")}>Estrategia</NavButton>
          <NavButton icon={<ClipboardList size={17} />} active={view === "queue"} onClick={() => setView("queue")}>Cola de drafts</NavButton>
          <NavButton icon={<PackageSearch size={17} />} active={view === "assets"} onClick={() => setView("assets")}>Activos</NavButton>
          <NavButton icon={<CalendarDays size={17} />} active={view === "calendar"} onClick={() => setView("calendar")}>Cronograma</NavButton>
          <NavButton icon={<Check size={17} />} active={view === "checklist"} onClick={() => setView("checklist")}>Checklist</NavButton>
          <NavButton icon={<FileText size={17} />} active={view === "reports"} onClick={() => setView("reports")}>Reportes</NavButton>
          <NavButton icon={<LockKeyhole size={17} />} active={view === "readiness"} onClick={() => setView("readiness")}>Publicacion</NavButton>
          {adminMode && <a className="nav-link" href="/admin"><ShieldCheck size={17} /> Admin global</a>}
        </nav>
        <div className="guardrail-box">
          <ShieldCheck size={17} />
          <span>
            {metrics?.tenant.mode === "AUTOPILOT_FULL"
              ? "Autopilot completo. Publicacion real habilitada sin gates manuales."
              : metrics?.tenant.mode === "AUTOPILOT_LIMITED"
                ? "Autopilot limitado. Publicacion real con gates minimos de seguridad."
                : "Modo revision. Dry-run disponible; live depende de readiness por red."}
          </span>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <span className="section-label">Tenant: {tenantSlug}</span>
            <h1>Control de RRSS y APROBACIONES</h1>
          </div>
          <div className="header-actions">
            <button className="tool-button" onClick={() => setNewPubOpen(true)}>
              <FileText size={16} /> Nueva publicacion
            </button>
            {adminMode && (
              <a className="tool-button" href="/admin">
                <ShieldCheck size={16} /> Admin
              </a>
            )}
            <button className="primary-action" onClick={() => setView("queue")}>
              <Check size={16} /> Revisar cola
            </button>
          </div>
        </header>

        {metrics && (
          <section className="status-strip">
            <StatusCard label="Total" value={metrics.counts.totalDrafts} note="drafts en DB" onClick={() => setView("queue")} />
            <StatusCard label="Pendientes" value={pendingReview.length} note="requieren criterio" tone="warn" onClick={() => setView("queue")} />
            <StatusCard label="Aprobados" value={metrics.counts.approved} note="listos para publicar" onClick={() => setView("readiness")} />
            <StatusCard label="Assets" value={metrics.counts.totalAssets} note="importados" tone="ok" onClick={() => setView("assets")} />
            <StatusCard label="Proximo" value={nextTitle ?? nextDate} note={nextNote} onClick={() => setView("calendar")} />
          </section>
        )}
        {trial && !trial.trialActive && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", margin: "0 0 12px 0", background: "var(--hc-sand)", borderRadius: 8, fontSize: 12 }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, color: "var(--hc-ink)" }} />
            <span style={{ flex: 1 }}>Periodo de prueba agotado ({trial.totalPublished} posts publicados, limite {trial.limitPerNetwork} por red).</span>
            <button onClick={() => setPaymentModalOpen(true)} style={{ fontWeight: 700, padding: "6px 16px", borderRadius: 6, border: "none", background: "var(--hc-teal)", color: "#fff", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>
              Activar plan
            </button>
          </div>
        )}
        {trial && trial.trialActive && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", margin: "0 0 12px 0", background: "var(--hc-bone)", borderRadius: 8, fontSize: 11, color: "var(--hc-fog)" }}>
            <Info size={14} />
            <span>Periodo de prueba activo. {Object.entries(trial.postsRemaining).filter(([,r]) => r > 0).map(([n, r]) => `${n.toLowerCase()} (${r} libre${r !== 1 ? "s" : ""})`).join(", ")}</span>
          </div>
        )}

        {paymentModalOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setPaymentModalOpen(false)} />
            <div style={{ position: "relative", background: "var(--hc-surface)", borderRadius: 12, padding: 24, maxWidth: 440, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", maxHeight: "90vh", overflow: "auto", zIndex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 16 }}>Activar HeptaCore</h2>
                <button onClick={() => setPaymentModalOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, color: "var(--hc-fog)" }}><X size={20} /></button>
              </div>
              <p style={{ fontSize: 13, color: "var(--hc-fog)", marginBottom: 16 }}>
                Contacta por WhatsApp para activar tu plan y continuar publicando sin limites.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: 12, background: "var(--hc-bone)", borderRadius: 8 }}>
                  <strong style={{ fontSize: 13 }}>Pago Movil</strong>
                  <p style={{ fontSize: 12, margin: "4px 0", color: "var(--hc-fog)" }}>Banco Mercantil · CI V-13894619 · Telf 04141333305</p>
                </div>
                <div style={{ padding: 12, background: "var(--hc-bone)", borderRadius: 8 }}>
                  <strong style={{ fontSize: 13 }}>Transferencia</strong>
                  <p style={{ fontSize: 12, margin: "4px 0", color: "var(--hc-fog)" }}>Mercantil 01050187331187028916 · Turpial Sound · V-13894619</p>
                </div>
                <div style={{ padding: 12, background: "var(--hc-bone)", borderRadius: 8 }}>
                  <strong style={{ fontSize: 13 }}>Binance Pay</strong>
                  <p style={{ fontSize: 12, margin: "4px 0", color: "var(--hc-fog)" }}>Pay ID 11757221 · manuelverax</p>
                </div>
                <a
                  href="https://wa.me/584168017844"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 8, background: "#25D366", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14, marginTop: 4 }}
                >
                  Contactar por WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}

        {newPubOpen && (
          <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Nueva publicacion">
            <button className="modal-backdrop" onClick={() => setNewPubOpen(false)} aria-label="Cerrar" />
            <div className="modal-panel">
              <div className="modal-head">
                <div>
                  <span className="section-label">Publicacion</span>
                  <h2>Nueva publicacion</h2>
                </div>
                <button className="icon-button" onClick={() => setNewPubOpen(false)} aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <label>
                  Titulo
                  <input value={newPubTitle} onChange={(e) => setNewPubTitle(e.target.value)} placeholder="Titulo de la publicacion" />
                </label>
                <label>
                  Caption
                  <textarea value={newPubCaption} onChange={(e) => setNewPubCaption(e.target.value)} placeholder="Texto del post (opcional)" rows={3} />
                </label>
                <label>
                  Red
                  <select value={newPubNetwork} onChange={(e) => setNewPubNetwork(e.target.value)}>
                    {activeNetworks.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label>
                  Asset (opcional)
                  <select value={newPubAssetId} onChange={(e) => setNewPubAssetId(e.target.value)}>
                    <option value="">Sin asset</option>
                    {assets.map((a) => <option key={a.id} value={a.id}>{a.filename}</option>)}
                  </select>
                </label>
              </div>
              <div className="modal-actions">
                <button className="tool-button" onClick={() => setNewPubOpen(false)}>Cancelar</button>
                <button className="primary-action" onClick={handleNewPublication} disabled={newPubSaving || !newPubTitle.trim()} style={{ fontSize: 13, padding: "6px 14px" }}>
                  {newPubSaving ? "Creando..." : "Crear publicacion"}
                </button>
              </div>
            </div>
          </div>
        )}

        {view === "overview" && (
          <div className="ops-grid">
            <section className="work-panel primary-work">
              <PanelTitle icon={<ClipboardList size={17} />} title="Aprobacion inmediata" action="Ver todo" onAction={() => setView("queue")} />
              <div className="compact-queue">
                {readyNow.map((item) => (
                  <button key={item.id} className="compact-row" onClick={() => { setSelectedId(item.id); setView("queue"); }}>
                    <Thumb item={item} slug={tenantSlug} />
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
                  <div className={`platform-preview ${getPlatformFrameClass(selected)}`}>
                    <div className="platform-chrome">
                      <span>{selected.network.charAt(0).toUpperCase() + selected.network.slice(1)}</span>
                      <strong>{selected.format}</strong>
                    </div>
                    <div className="platform-media">
                      <img src={assetUrl(selected.asset?.path, tenantSlug)} alt={selected.title} />
                    </div>
                    <div className="platform-caption">
                      <strong>{metrics?.tenant.name ?? "Tenant"}</strong>
                      <span>{selected.caption}</span>
                    </div>
                  </div>
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
              <PanelTitle icon={<AlertTriangle size={17} />} title="Estado de publicacion" />
              <ul className="dense-list">
                <li>Modo del tenant: <strong>{metrics?.tenant.mode ?? "draft"}</strong></li>
                {metrics?.tenant.mode === "AUTOPILOT_FULL" && (
                  <li>Publicacion real habilitada sin gates manuales.</li>
                )}
                {metrics?.tenant.mode === "AUTOPILOT_LIMITED" && (
                  <li>Publicacion real con gates minimos de seguridad.</li>
                )}
                {(metrics?.tenant.mode === "DRAFT_ONLY" || metrics?.tenant.mode === "APPROVAL_REQUIRED") && (
                  <>
                    <li>Live depende de credenciales y permisos por red.</li>
                    <li>La aprobacion humana habilita pruebas reales cuando la red esta completa.</li>
                  </>
                )}
                <li>Respuestas delicadas requieren cola de revision.</li>
                <li>Campanas pagas en modo recomendacion.</li>
              </ul>
            </section>
          </div>
        )}

        {view === "strategy" && (
          <div className="strategy-grid">
            <section className="work-panel span-2">
              <PanelTitle icon={<Bot size={17} />} title="Generar estrategia con IA" />
              <div style={{ padding: 14 }}>
                <div className="network-scope">
                  <div>
                    <span className="section-label">RRSS en alcance</span>
                    <strong>{activeNetworks.map((network) => NETWORK_LABELS[network] ?? network).join(" / ")}</strong>
                    <small>El LLM adapta narrativa, formatos, campana, CTAs y assets a cada red seleccionada.</small>
                  </div>
                  {missingCoreNetworks.length > 0 && (
                    <button className="tool-button" onClick={handleEnableMissingNetworks} disabled={networkSaving}>
                      <Check size={14} />
                      {networkSaving ? "Activando..." : `Incorporar ${missingCoreNetworks.map((network) => NETWORK_LABELS[network]).join(", ")}`}
                    </button>
                  )}
                </div>
                <button onClick={() => setLlmOpen(!llmOpen)} style={{ marginBottom: 12, fontSize: 12, padding: "6px 14px", borderRadius: 6, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", color: "var(--hc-ink)" }}>
                  <Settings2 size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Configurar LLM
                </button>
                {llmOpen && (
                  <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Configuracion LLM">
                    <button className="modal-backdrop" onClick={() => setLlmOpen(false)} aria-label="Cerrar configuracion LLM" />
                    <div className="modal-panel">
                      <div className="modal-head">
                        <div>
                          <span className="section-label">Admin</span>
                          <h2>Configuracion LLM</h2>
                        </div>
                        <button className="icon-button" onClick={() => setLlmOpen(false)} aria-label="Cerrar">
                          <X size={18} />
                        </button>
                      </div>
                      <div className="modal-body">
                        <label>
                          Provider
                          <select value={llmProvider} onChange={(e) => setLlmProvider(e.target.value)}>
                            <option value="deterministic">Deterministico (sin API)</option>
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic (Claude)</option>
                            <option value="gemini">Gemini</option>
                            <option value="deepseek">DeepSeek</option>
                          </select>
                        </label>
                        {llmProvider !== "deterministic" && (
                          <>
                            <label>
                              Modelo
                              <input value={llmModel} onChange={(e) => setLlmModel(e.target.value)} placeholder={llmProvider === "openai" ? "gpt-4o" : llmProvider === "anthropic" ? "claude-3-5-haiku-latest" : llmProvider === "gemini" ? "gemini-2.0-flash" : "deepseek-chat"} />
                            </label>
                            <label>
                              API Key
                              <input type="password" value={llmApiKey} onChange={(e) => setLlmApiKey(e.target.value)} placeholder="sk-..." />
                            </label>
                            <LlmCostEstimate provider={llmProvider} model={llmModel} />
                          </>
                        )}
                      </div>
                      <div className="modal-actions">
                        <button className="tool-button" onClick={() => setLlmOpen(false)}>Listo</button>
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--hc-fog)" }}>Zona horaria:</span>
                  <select
                    value={strategyTimezone}
                    onChange={(e) => setStrategyTimezone(e.target.value)}
                    style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", color: "var(--hc-ink)" }}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                  <small style={{ color: "var(--hc-fog)" }}>
                    {new Date().toLocaleTimeString("es", { timeZone: strategyTimezone, hour: "2-digit", minute: "2-digit" })}
                  </small>
                </div>
                <button className="primary-action" onClick={handleGenerateStrategy} disabled={strategyGenerating} style={{ fontSize: 14, padding: "10px 24px" }}>
                  <Bot size={18} style={{ marginRight: 6 }} />
                  {strategyGenerating ? "Generando estrategia..." : "Generar estrategia"}
                </button>
                {strategyResult && (
                  <div style={{ marginTop: 12, padding: 10, background: "var(--hc-bone)", borderRadius: 8, fontSize: 12 }}>
                    <strong style={{ color: "var(--hc-teal)" }}>Estrategia generada con: {strategyResult.provider}</strong>
                    {strategyResult.cost && (
                      <div style={{ marginTop: 6, padding: "6px 8px", background: "var(--hc-surface)", borderRadius: 6, fontSize: 11, display: "flex", flexWrap: "wrap", gap: 12 }}>
                        <span><strong>{strategyResult.cost.modelLabel}</strong>{strategyResult.cost.reasoning ? " (razonador)" : ""}</span>
                        <span>{strategyResult.cost.promptTokens.toLocaleString()} + {strategyResult.cost.completionTokens.toLocaleString()} tokens</span>
                        <span>API: ${strategyResult.cost.apiCost.toFixed(6)}</span>
                        <span style={{ color: "var(--hc-teal)", fontWeight: 700 }}>
                          x{strategyResult.cost.overheadFactor} = ${strategyResult.cost.tenantCost.toFixed(4)} USD
                        </span>
                      </div>
                    )}
                    <div style={{ marginTop: 4, maxHeight: 200, overflow: "auto" }}>
                      <pre style={{ fontSize: 10, whiteSpace: "pre-wrap" }}>{JSON.stringify(strategyResult.strategy, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="work-panel span-2">
              <PanelTitle
                icon={<Bot size={17} />}
                title="Estrategia activa"
                action={
                  strategyEdit ? (
                    <span style={{ display: "flex", gap: 4 }}>
                      <button onClick={handleSaveStrategy} disabled={strategySaving} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, border: "none", background: "var(--hc-teal)", color: "#fff" }}>
                        <Check size={14} style={{ verticalAlign: "middle" }} /> {strategySaving ? "Guardando..." : "Guardar"}
                      </button>
                      <button onClick={() => setStrategyEdit(false)} style={{ fontSize: 11, padding: "2px 8px" }}>
                        <X size={14} style={{ verticalAlign: "middle" }} /> Cancelar
                      </button>
                    </span>
                  ) : (
                    <button onClick={startStrategyEdit} style={{ fontSize: 11 }}>
                      <Settings2 size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                      Editar estrategia
                    </button>
                  )
                }
              />
              {strategyEdit ? (
                <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ fontSize: 12, color: "var(--hc-fog)" }}>
                    Nombre del proyecto
                    <input style={{ width: "100%", marginTop: 4, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--hc-line)", fontSize: 13 }} value={strategyName} onChange={(e) => setStrategyName(e.target.value)} />
                  </label>
                  <label style={{ fontSize: 12, color: "var(--hc-fog)" }}>
                    Oferta / Descripcion
                    <textarea style={{ width: "100%", marginTop: 4, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--hc-line)", fontSize: 13, minHeight: 60, resize: "vertical" }} value={strategyDesc} onChange={(e) => setStrategyDesc(e.target.value)} />
                  </label>
                  <label style={{ fontSize: 12, color: "var(--hc-fog)" }}>
                    Voz de marca (separada por /)
                    <input style={{ width: "100%", marginTop: 4, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--hc-line)", fontSize: 13 }} value={strategyVoice} onChange={(e) => setStrategyVoice(e.target.value)} placeholder="Criterio tecnico / Confianza / Comunidad" />
                  </label>
                </div>
              ) : (
                <dl className="strategy-defs">
                  <dt>Proyecto</dt>
                  <dd>{strategy?.projectName ?? metrics?.tenant.name ?? "Tenant"}</dd>
                  <dt>Oferta</dt>
                  <dd>{strategy?.projectDescription ?? "Estrategia pendiente de completar."}</dd>
                  <dt>Voz</dt>
                  <dd>{strategy?.brandVoice.length ? strategy.brandVoice.join(" / ") : "Criterio tecnico, confianza, comunidad y conversion por WhatsApp."}</dd>
                </dl>
              )}
            </section>
            <section className="work-panel span-2">
              <PanelTitle icon={<MessageSquareText size={17} />} title="Pilares de contenido" />
              <div className="market-grid pillars-grid">
                {(strategy?.pillars.length ? strategy.pillars : metrics?.pillars ?? []).map((pillar: any) => (
                  <div className="market-card" key={pillar.name}>
                    <strong>{pillar.name}</strong>
                    <small>{pillar.description ?? `${pillar.count ?? pillar.priority ?? 0} piezas planificadas`}</small>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {view === "queue" && selected && (
          <div className="queue-workspace">
            <section className="work-panel queue-column">
              <PanelTitle icon={<ClipboardList size={17} />} title="Cola de publicaciones" />
              <div className="queue-scroll">
                {scheduled.map((item, idx) => (
                  <div key={item.id} style={{ position: "relative" }}>
                    <button
                      className={item.id === selected.id ? "queue-card active" : "queue-card"}
                      onClick={() => setSelectedId(item.id)}
                      style={{ width: "100%", textAlign: "left" }}
                    >
                      <Thumb item={item} slug={tenantSlug} />
                      <span>
                        <small>{channelLabel(item)} / {item.scheduledFor}</small>
                        <strong>{item.title}</strong>
                        <em>{item.status}</em>
                      </span>
                      <Risk level={item.riskLevel} />
                    </button>
                    <div style={{ position: "absolute", right: 6, top: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); startEdit(); }}
                        style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, border: "1px solid var(--hc-teal)", background: "var(--hc-bone)", color: "var(--hc-teal)", cursor: "pointer", lineHeight: "16px", fontWeight: 700 }}
                        title="Editar este draft"
                      >
                        EDITAR
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveItem(item.id, "up"); }}
                        disabled={idx === 0}
                        style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.3 : 1, lineHeight: "16px" }}
                        title="Mover arriba"
                      >
                        &#9650;
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveItem(item.id, "down"); }}
                        disabled={idx === scheduled.length - 1}
                        style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", cursor: idx === scheduled.length - 1 ? "default" : "pointer", opacity: idx === scheduled.length - 1 ? 0.3 : 1, lineHeight: "16px" }}
                        title="Mover abajo"
                      >
                        &#9660;
                      </button>
                    </div>
                  </div>
                ))}
                {scheduled.length === 0 && <p style={{ padding: 14 }}>Cola vacia.</p>}
              </div>
            </section>
            <section className="work-panel detail-column">
              <div className="post-preview">
                <div className="post-preview-head">
                  <div>
                    <strong style={{ display: "block", fontSize: 15 }}>{editMode ? "Editando" : selected.title}</strong>
                    <small style={{ color: "var(--hc-fog)", fontSize: 11 }}>
                      {channelLabel(selected)} / {selected.status} / {selected.scheduledFor}
                    </small>
                  </div>
                  <Risk level={selected.riskLevel} />
                </div>
                <div className={`platform-preview ${getPlatformFrameClass(selected)}`}>
                  <div className="platform-chrome">
                    <span>{NETWORK_LABELS[selected.network] ?? selected.network}</span>
                    <strong>{selected.format}</strong>
                  </div>
                  <div className="platform-media">
                    {isVideoAsset(selected) ? (
                      <video src={assetUrl(selected.asset?.path, tenantSlug)} controls preload="metadata" />
                    ) : (
                      <img src={assetUrl(selected.asset?.path, tenantSlug)} alt={selected.title} />
                    )}
                  </div>
                  <div className="platform-caption">
                    <strong>{metrics?.tenant.name ?? "Tenant"}</strong>
                    <span>{editMode ? editCaption : selected.caption}</span>
                  </div>
                </div>
                <div style={{ padding: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--hc-fog)" }}>
                    Asset: <strong>{selected.asset?.filename ?? "Sin asset"}</strong> ({selected.asset?.kind ?? "N/A"})
                  </span>
                  <button
                    onClick={() => setAssetPickerOpen(!assetPickerOpen)}
                    style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", color: "var(--hc-ink)", cursor: "pointer" }}
                  >
                    Reemplazar
                  </button>
                </div>
                {assetPickerOpen && (
                  <div style={{ padding: "8px 8px 4px 8px", background: "var(--hc-bone)", borderTop: "1px solid var(--hc-line)" }}>
                    <strong style={{ fontSize: 11 }}>Seleccionar nuevo asset:</strong>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, maxHeight: 160, overflowY: "auto" }}>
                       {assets
                         .filter((a) => a.filename !== selected.asset?.filename)
                         .slice(0, 20)
                        .map((asset) => (
                          <button
                            key={asset.id}
                            onClick={() => handleReplaceAsset(asset.id)}
                            disabled={assetReplacing}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 2,
                              padding: 4,
                              borderRadius: 4,
                              border: "1px solid var(--hc-line)",
                              background: "var(--hc-surface)",
                              cursor: "pointer",
                              fontSize: 10,
                              maxWidth: 100,
                            }}
                          >
                            {asset.path ? (
                              <img src={assetUrl(asset.path, tenantSlug)} alt={asset.filename} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 3 }} />
                            ) : (
                              <div style={{ width: 60, height: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--hc-bone)", borderRadius: 3 }}>
                                <PackageSearch size={18} />
                              </div>
                            )}
                            <span style={{ fontSize: 9, textAlign: "center", lineHeight: 1.1 }}>{asset.filename.slice(0, 20)}</span>
                            <small style={{ color: "var(--hc-fog)", fontSize: 8 }}>{asset.kind}</small>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                {editMode ? (
                  <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 12, color: "var(--hc-fog)" }}>
                      Titulo
                      <input
                        style={{ width: "100%", marginTop: 4, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--hc-line)", fontSize: 13 }}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </label>
                    <label style={{ fontSize: 12, color: "var(--hc-fog)" }}>
                      Caption
                      <textarea
                        style={{ width: "100%", marginTop: 4, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--hc-line)", fontSize: 13, minHeight: 80, resize: "vertical" }}
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                      />
                    </label>
                    <label style={{ fontSize: 12, color: "var(--hc-fog)" }}>
                      Hashtags
                      <input
                        style={{ width: "100%", marginTop: 4, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--hc-line)", fontSize: 13 }}
                        value={editHashtags}
                        onChange={(e) => setEditHashtags(e.target.value)}
                        placeholder="#studio #grabacion #caracas"
                      />
                    </label>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button className="approve" onClick={handleSaveEdit} disabled={editSaving}>
                        <Check size={16} />
                        {editSaving ? "Guardando..." : "Guardar"}
                      </button>
                      <button onClick={cancelEdit}>
                        <X size={16} /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="caption-box">{selected.caption}</div>
                    <div className="tag-row">
                      {selected.hashtags.map((h) => <span key={h}>{h}</span>)}
                    </div>
                  </>
                )}
                {!editMode && (selected.status === "DRAFT" || selected.status === "NEEDS_REVIEW" || selected.status === "APPROVED") && (
                  <div style={{ padding: 8 }}>
                    <button onClick={startEdit} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", color: "var(--hc-ink)" }}>
                      <Settings2 size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                      Editar
                    </button>
                  </div>
                )}
                {!editMode && (selected.status === "DRAFT" || selected.status === "NEEDS_REVIEW" || selected.status === "REJECTED" ? (
                  <ApprovalActions draftId={selected.id} onStatusChange={(s) => updateLocalStatus(selected.id, s)} />
                ) : (
                  <div className="approval-actions">
                    <span style={{ color: "var(--hc-fog)", fontSize: 12, padding: "8px 0" }}>
                      Estado: {selected.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {view === "assets" && (
          <div className="strategy-grid">
            {Array.isArray(readiness?.networks) && (
              <section className="work-panel span-2">
                <PanelTitle icon={<AlertTriangle size={17} />} title="Assets y configuraciones pendientes" />
                <div className="network-readiness-grid">
                  {readiness.networks
                    .filter((network: any) => !network.liveReady)
                    .map((network: any) => (
                      <article key={network.network} className="network-card">
                        <div>
                          <strong>{NETWORK_LABELS[network.network] ?? network.network}</strong>
                          <small>{network.action}</small>
                        </div>
                        <p><strong>Formato:</strong> {network.requirements?.formats}</p>
                        <p><strong>Activo:</strong> {network.requirements?.asset}</p>
                        <p><strong>Guideline:</strong> {network.requirements?.guideline}</p>
                      </article>
                    ))}
                  {readiness.networks.every((network: any) => network.liveReady) && (
                    <p style={{ padding: 14 }}>Todas las redes seleccionadas tienen readiness live completo.</p>
                  )}
                </div>
              </section>
            )}
            <section className="work-panel">
              <PanelTitle icon={<PackageSearch size={17} />} title="Especificaciones por plataforma" />
              <div style={{ padding: 14 }}>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                    <ImageIcon size={14} /> Instagram
                  </strong>
                  <ul className="dense-list" style={{ marginTop: 4 }}>
                    <li>Feed: 1080x1080 (1:1) JPG/PNG</li>
                    <li>Story: 1080x1920 (9:16) JPG/PNG</li>
                    <li>Reel: 1080x1920 (9:16) MP4, max 90s</li>
                    <li>Carousel: 1080x1080 (1:1) JPG/PNG, 2-10 slides</li>
                  </ul>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ fontSize: 13 }}>Facebook</strong>
                  <ul className="dense-list" style={{ marginTop: 4 }}>
                    <li>Feed: 1200x630 (1.91:1) JPG/PNG</li>
                    <li>Video: 1080p MP4, max 240min</li>
                    <li>Carousel: 1080x1080 (1:1) JPG/PNG</li>
                  </ul>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ fontSize: 13 }}>TikTok</strong>
                  <ul className="dense-list" style={{ marginTop: 4 }}>
                    <li>Video: 1080x1920 (9:16) MP4, 5s-10min</li>
                    <li>Carousel: 1080x1920 (9:16) JPG</li>
                  </ul>
                </div>
                <div>
                  <strong style={{ fontSize: 13 }}>YouTube</strong>
                  <ul className="dense-list" style={{ marginTop: 4 }}>
                    <li>Video: 1920x1080 (16:9) MP4</li>
                    <li>Short: 1080x1920 (9:16) MP4, max 60s</li>
                    <li>Thumbnail: 1280x720 JPG</li>
                  </ul>
                </div>
                <div style={{ marginTop: 12 }}>
                  <strong style={{ fontSize: 13 }}>LinkedIn</strong>
                  <ul className="dense-list" style={{ marginTop: 4 }}>
                    <li>Post: imagen 1200x627 JPG/PNG</li>
                    <li>Documento: PDF o carrusel exportado</li>
                    <li>Video: MP4 horizontal o cuadrado, enfoque negocio/confianza</li>
                  </ul>
                </div>
              </div>
            </section>
            <section className="work-panel">
              <PanelTitle icon={<PackageSearch size={17} />} title="Activos del tenant" />
              <div style={{ display: "flex", gap: 8, padding: "0 4px 8px 4px", alignItems: "center" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/mp4,audio/*,.pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  style={{ fontSize: 11 }}
                />
                <button
                  onClick={handleUploadAsset}
                  disabled={uploading || !uploadFile}
                  className="primary-action"
                  style={{ fontSize: 12, padding: "4px 12px" }}
                >
                  {uploading ? "Subiendo..." : "Subir"}
                </button>
              </div>
              <div className="market-grid">
                {assets.map((asset) => (
                  <div className="market-card" key={asset.id}>
                    {asset.path ? (
                      asset.kind === "VIDEO" || asset.path.toLowerCase().endsWith(".mp4") ? (
                        <video src={assetUrl(asset.path, tenantSlug)} className="asset-tile" controls preload="metadata" />
                      ) : (
                        <img src={assetUrl(asset.path, tenantSlug)} alt={asset.filename} className="asset-tile" />
                      )
                    ) : (
                      <div className="asset-tile asset-empty"><PackageSearch size={22} /></div>
                    )}
                    {renamingAssetId === asset.id ? (
                      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                        <input
                          autoFocus
                          style={{ flex: 1, padding: "3px 6px", borderRadius: 4, border: "1px solid var(--hc-line)", fontSize: 12 }}
                          value={renameFilename}
                          onChange={(e) => setRenameFilename(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleRenameAsset(asset.id); if (e.key === "Escape") setRenamingAssetId(""); }}
                        />
                        <button onClick={() => handleRenameAsset(asset.id)} disabled={renameSaving} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid var(--hc-line)", background: "var(--hc-ink)", color: "#fff", cursor: "pointer", fontSize: 11 }}>{renameSaving ? "..." : "Guardar"}</button>
                        <button onClick={() => { setRenamingAssetId(""); setRenameFilename(""); }} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", cursor: "pointer", fontSize: 11 }}>Cancelar</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <strong>{asset.filename}</strong>
                        <button
                          onClick={() => { setRenamingAssetId(asset.id); setRenameFilename(asset.filename); }}
                          title="Renombrar"
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--hc-fog)", fontSize: 12 }}
                        ><Pencil size={12} /></button>
                      </div>
                    )}
                    <small>{asset.kind} / {asset.rightsStatus} / {asset.draftCount} drafts</small>
                  </div>
                ))}
                {assets.length === 0 && <p style={{ padding: 14 }}>No hay activos cargados.</p>}
              </div>
            </section>
          </div>
        )}

        {view === "calendar" && (
          <div className="strategy-grid">
            <section className="work-panel span-2">
              <PanelTitle
                icon={<CalendarDays size={17} />}
                title="Cronograma"
                action={
                  <span style={{ display: "flex", gap: "4px" }}>
                    <button
                      onClick={() => setCalendarView("list")}
                      style={{
                        fontWeight: calendarView === "list" ? 700 : 400,
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                        border: "1px solid var(--hc-line)",
                        background: calendarView === "list" ? "var(--hc-ink)" : "var(--hc-bone)",
                        color: calendarView === "list" ? "#fff" : "var(--hc-ink)",
                      }}
                    >
                      Lista
                    </button>
                    <button
                      onClick={() => setCalendarView("week")}
                      style={{
                        fontWeight: calendarView === "week" ? 700 : 400,
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                        border: "1px solid var(--hc-line)",
                        background: calendarView === "week" ? "var(--hc-ink)" : "var(--hc-bone)",
                        color: calendarView === "week" ? "#fff" : "var(--hc-ink)",
                      }}
                    >
                      Semana
                    </button>
                    <button
                      onClick={() => setCalendarView("month")}
                      style={{
                        fontWeight: calendarView === "month" ? 700 : 400,
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                        border: "1px solid var(--hc-line)",
                        background: calendarView === "month" ? "var(--hc-ink)" : "var(--hc-bone)",
                        color: calendarView === "month" ? "#fff" : "var(--hc-ink)",
                      }}
                    >
                      Mes
                    </button>
                  </span>
                }
              />
              {calendarView === "list" && (
                <div className="calendar-list">
                  {calendar.map((item) => (
                    <button
                      key={item.id}
                      className="calendar-row"
                      onClick={() => {
                        setSelectedId(item.id);
                        setView("queue");
                      }}
                    >
                      <span>{item.scheduledFor ?? "Sin fecha"}</span>
                      <strong>{item.title}</strong>
                      <small>{item.network} / {item.format} / {item.status}</small>
                      <Risk level={item.riskLevel} />
                    </button>
                  ))}
                  {calendar.length === 0 && <p style={{ padding: 14 }}>No hay cronograma cargado.</p>}
                </div>
              )}
              {calendarView === "week" && (
                <div style={{ padding: 14, overflowX: "auto" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, minWidth: 700 }}>
                    {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((day) => (
                      <div key={day} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--hc-fog)", padding: "4px 0", borderBottom: "1px solid var(--hc-line)" }}>
                        {day}
                      </div>
                    ))}
                    {calendar.map((item) => {
                      const d = item.scheduledFor ? new Date(item.scheduledFor) : null;
                      const dayOfWeek = d ? (d.getDay() + 6) % 7 : null;
                      return dayOfWeek !== null ? (
                        <div
                          key={item.id}
                          onClick={() => { setSelectedId(item.id); setView("queue"); }}
                          style={{
                            gridColumn: dayOfWeek + 1,
                            padding: "4px 6px",
                            fontSize: 10,
                            borderRadius: 4,
                            border: "1px solid var(--hc-line)",
                            background: "var(--hc-bone)",
                            cursor: "pointer",
                          }}
                        >
                          <strong>{d?.toLocaleDateString("es", { weekday: "short", day: "numeric" })}</strong>
                          <small style={{ display: "block" }}>{d?.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</small>
                          <span>{item.title.slice(0, 20)}</span>
                          <Risk level={item.riskLevel} />
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              {calendarView === "month" && (
                <div style={{ padding: 14, overflowX: "auto" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, minWidth: 700 }}>
                    {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((day) => (
                      <div key={day} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--hc-fog)", padding: "2px" }}>
                        {day}
                      </div>
                    ))}
                    {Array.from({ length: 31 }, (_, i) => {
                      const day = i + 1;
                      const dayItems = calendar.filter((item) => {
                        const d = item.scheduledFor ? new Date(item.scheduledFor) : null;
                        return d && d.getDate() === day;
                      });

  return (
                        <div
                          key={day}
                          style={{
                            minHeight: 50,
                            padding: 2,
                            border: "1px solid var(--hc-line)",
                            borderRadius: 4,
                            background: dayItems.length > 0 ? "var(--hc-bone)" : "transparent",
                            fontSize: 10,
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: 10 }}>{day}</span>
                          {dayItems.slice(0, 2).map((item) => (
                            <div
                              key={item.id}
                              onClick={() => { setSelectedId(item.id); setView("queue"); }}
                              style={{
                                padding: "1px 3px",
                                marginTop: 1,
                                borderRadius: 2,
                                background: "var(--hc-teal)",
                                color: "#fff",
                                fontSize: 9,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {item.title.slice(0, 15)}
                            </div>
                          ))}
                          {dayItems.length > 2 && (
                            <span style={{ fontSize: 9, color: "var(--hc-fog)" }}>+{dayItems.length - 2}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                  <StatusCard label="Total drafts" value={report.total} note="en cola" onClick={() => setView("queue")} />
                  <StatusCard label="Requieren revision" value={report.needsReview} note="humanos" tone="warn" onClick={() => setView("queue")} />
                  <StatusCard label="Sin assets" value={report.pendingAssets} note="bloqueados" tone={report.pendingAssets > 0 ? "warn" : "ok"} onClick={() => setView("assets")} />
                </div>
                <h3>Por estado</h3>
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                  {report.byStatus.map((s: any) => {
                    const pct = report.total > 0 ? Math.round((s.count / report.total) * 100) : 0;
                    return (
                      <div key={s.status} style={{ flex: "1 1 100px", minWidth: 80 }}>
                        <div style={{ fontSize: 10, color: "var(--hc-fog)", marginBottom: 2 }}>{s.status}</div>
                        <div style={{ background: "var(--hc-bone)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "var(--hc-teal)", borderRadius: 4, transition: "width .3s" }} />
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>{s.count}</div>
                      </div>
                    );
                  })}
                </div>
                <h3>Por red</h3>
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                  {report.byNetwork.map((n: any) => {
                    const max = Math.max(...report.byNetwork.map((x: any) => x.count), 1);
                    const pct = Math.round((n.count / max) * 100);
                    return (
                      <div key={n.network} style={{ flex: "1 1 80px", minWidth: 60 }}>
                        <div style={{ fontSize: 10, color: "var(--hc-fog)", marginBottom: 2 }}>{n.network}</div>
                        <div style={{ background: "var(--hc-bone)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: pct >= 80 ? "var(--hc-teal)" : pct >= 40 ? "var(--hc-warn)" : "var(--hc-fog)", borderRadius: 4, transition: "width .3s" }} />
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>{n.count}</div>
                      </div>
                    );
                  })}
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
                  <small>
                    {readiness.summary} Credenciales: {readiness.credentialCount ?? 0}. Programados: {readiness.scheduledDrafts ?? 0}.
                  </small>
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
                {Array.isArray(readiness.networks) && (
                  <>
                    <h3 style={{ marginTop: 14 }}>Readiness por red</h3>
                    <div className="network-readiness-grid">
                      {readiness.networks.map((network: any) => (
                        <article key={network.network} className={network.liveReady ? "network-card ready" : "network-card"}>
                          <div>
                            <strong>{NETWORK_LABELS[network.network] ?? network.network}</strong>
                            <small>{network.liveReady ? "Lista para live" : network.action}</small>
                          </div>
                          <div className="network-checks">
                            <span className={network.accountReady ? "ok" : ""}>Cuenta</span>
                            <span className={network.authReady ? "ok" : ""}>Token</span>
                            <span className={network.assetsReady ? "ok" : ""}>Assets</span>
                            <span className={network.approvedDrafts > 0 ? "ok" : ""}>Drafts {network.approvedDrafts}</span>
                          </div>
                          <p>{network.requirements?.asset}</p>
                          <p>{network.requirements?.guideline}</p>
                        </article>
                      ))}
                    </div>
                  </>
                )}
                <label className="gate-check" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "var(--hc-ink)" }}>Modo de publicacion:</span>
                  <select
                    value={publishMode}
                    onChange={(e) => setPublishMode(e.target.value as "dry_run" | "scheduled" | "immediate")}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--hc-line)", fontSize: 13 }}
                  >
                    <option value="dry_run">Dry-run (validar, no publicar)</option>
                    <option value="scheduled">Programar (cron publica despues)</option>
                    <option value="immediate">Inmediata (publicar ahora)</option>
                  </select>
                </label>
                <div className="publish-gate">
                  {tenantNeedsManual && (
                    <label className="gate-check">
                      <input
                        type="checkbox"
                        checked={manualApproval}
                        onChange={(event) => setManualApproval(event.target.checked)}
                      />
                      Manuel aprueba ejecutar este {publishMode === "immediate" ? "intento de publicacion real" : publishMode === "scheduled" ? "intento de programacion" : "dry-run controlado"}.
                    </label>
                  )}
                  {tenantAutoPilot && publishMode === "immediate" && (
                    <label className="gate-check">
                      <input
                        type="checkbox"
                        checked={manualApproval}
                        onChange={(event) => setManualApproval(event.target.checked)}
                      />
                      Confirmo que quiero publicar en redes reales. Esta accion no es reversible.
                    </label>
                  )}
                  <button
                    className="primary-action"
                    onClick={handlePublish}
                    disabled={publishState === "loading" || !publishEligibility.eligible}
                  >
                    <LockKeyhole size={16} />
                    {publishState === "loading"
                      ? "Ejecutando..."
                      : publishMode === "immediate"
                        ? "Publicar en redes reales"
                        : publishMode === "scheduled"
                          ? "Programar publicacion"
                          : "Ejecutar dry-run"}
                  </button>
                  {publishEligibility.target && (
                    <small style={{ marginTop: 6, display: "block" }}>
                      Draft seleccionado: <strong>{publishEligibility.target.title}</strong> ({publishEligibility.target.id})<br />
                      Red: {NETWORK_LABELS[publishEligibility.target.network] ?? publishEligibility.target.network} · Estado: {publishEligibility.target.status} · Modo: {publishMode}
                    </small>
                  )}
                  {!publishEligibility.eligible && (
                    <small style={{ color: "var(--hc-sand)", display: "block", marginTop: 6 }}>{publishEligibility.reason}</small>
                  )}
                  {publishMessage && (
                    <p className={publishState === "failed" || publishState === "blocked" ? "login-error" : "publish-ok"}>
                      {publishMessage}
                    </p>
                  )}
                </div>
                <h3 style={{ marginTop: 14 }}>Plan de rollback</h3>
                <ul className="dense-list">
                  {readiness.rollbackPlan.map((step: string, i: number) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
                {!readiness.allPassed && (
                  <p style={{ marginTop: 8, color: "var(--hc-sand)", fontSize: 12 }}>
                    Completa los gates de seguridad antes de ejecutar el dry-run.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </section>
      <AssistantFab />
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

const MODEL_PRICING_TABLE: Array<{
  provider: string;
  model: string;
  label: string;
  reasoning: boolean;
  estCost: number;
  tier: string;
  speed: string;
}> = [
  { provider: "openai", model: "gpt-4o", label: "GPT-4o", reasoning: false, estCost: 0.0140, tier: "Premium", speed: "Medio" },
  { provider: "openai", model: "gpt-4o-mini", label: "GPT-4o Mini", reasoning: false, estCost: 0.00084, tier: "Económico", speed: "Rápido" },
  { provider: "openai", model: "gpt-4.1", label: "GPT-4.1", reasoning: false, estCost: 0.0120, tier: "Premium", speed: "Medio" },
  { provider: "openai", model: "gpt-4.1-mini", label: "GPT-4.1 Mini", reasoning: false, estCost: 0.0024, tier: "Balance", speed: "Rápido" },
  { provider: "openai", model: "gpt-4.1-nano", label: "GPT-4.1 Nano", reasoning: false, estCost: 0.00056, tier: "Económico", speed: "Muy rápido" },
  { provider: "openai", model: "o3-mini", label: "o3 Mini", reasoning: true, estCost: 0.0062, tier: "Balance", speed: "Lento" },
  { provider: "anthropic", model: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", reasoning: false, estCost: 0.00544, tier: "Económico", speed: "Rápido" },
  { provider: "anthropic", model: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet", reasoning: false, estCost: 0.0204, tier: "Premium", speed: "Medio" },
  { provider: "anthropic", model: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet", reasoning: true, estCost: 0.0204, tier: "Premium", speed: "Lento" },
  { provider: "gemini", model: "gemini-2.0-flash", label: "Gemini 2.0 Flash", reasoning: false, estCost: 0.00056, tier: "Económico", speed: "Muy rápido" },
  { provider: "gemini", model: "gemini-2.5-pro", label: "Gemini 2.5 Pro", reasoning: true, estCost: 0.0130, tier: "Premium", speed: "Lento" },
  { provider: "deepseek", model: "deepseek-chat", label: "DeepSeek Chat", reasoning: false, estCost: 0.00045, tier: "Económico", speed: "Rápido" },
  { provider: "deepseek", model: "deepseek-reasoner", label: "DeepSeek Reasoner", reasoning: true, estCost: 0.00304, tier: "Balance", speed: "Lento" },
];

function LlmCostEstimate({ provider, model }: { provider: string; model: string }) {
  const [open, setOpen] = useState(false);
  const selected = MODEL_PRICING_TABLE.find((m) => m.model === model && m.provider === provider);
  const filtered = MODEL_PRICING_TABLE.filter((m) => m.provider === provider);

  const estWithOverhead = selected ? (selected.estCost * 2.0).toFixed(4) : "0.00";

  return (
    <div style={{ marginTop: 8, fontSize: 11 }}>
      {selected && (
        <div style={{ padding: "6px 8px", background: "var(--hc-surface)", borderRadius: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span><strong>{selected.label}</strong> {selected.reasoning ? "🧠" : ""}</span>
          <span style={{ color: "var(--hc-fog)" }}>API: <strong>${selected.estCost.toFixed(6)}</strong>/estrategia</span>
          <span style={{ color: "var(--hc-teal)", fontWeight: 700 }}>
            <TrendingUp size={12} style={{ verticalAlign: "middle" }} /> ~${estWithOverhead} c/overhead
          </span>
          <span style={{ fontSize: 10, color: "var(--hc-fog)" }}>{selected.tier} · {selected.speed}</span>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        style={{ marginTop: 6, fontSize: 10, padding: "3px 8px", borderRadius: 4, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", color: "var(--hc-fog)", cursor: "pointer" }}
      >
        <Info size={10} style={{ verticalAlign: "middle", marginRight: 3 }} />
        {open ? "Ocultar" : "Ver"} comparativa de costos
      </button>
      {open && (
        <div style={{ marginTop: 6, border: "1px solid var(--hc-line)", borderRadius: 6, overflow: "hidden", fontSize: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 65px 70px 65px", gap: 0, background: "var(--hc-ink)", color: "#fff", padding: "4px 8px", fontWeight: 700 }}>
            <span>Modelo</span>
            <span>API/est</span>
            <span>Tier</span>
            <span>Velocidad</span>
            <span>Razonador</span>
          </div>
          {filtered.map((m) => (
            <div
              key={m.model}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 70px 65px 70px 65px",
                gap: 0,
                padding: "4px 8px",
                borderTop: "1px solid var(--hc-line)",
                background: m.model === model ? "var(--hc-teal)" : "var(--hc-surface)",
                color: m.model === model ? "#fff" : "var(--hc-ink)",
              }}
            >
              <span style={{ fontWeight: m.model === model ? 700 : 400 }}>{m.label}</span>
              <span>${m.estCost.toFixed(6)}</span>
              <span>{m.tier}</span>
              <span>{m.speed}</span>
              <span>{m.reasoning ? "Sí" : "No"}</span>
            </div>
          ))}
          <div style={{ padding: "4px 8px", background: "var(--hc-bone)", fontSize: 9, color: "var(--hc-fog)" }}>
            Estimado basado en ~800 prompt + ~1200 completion tokens por estrategia. Costo tenant = API × overhead (2x default).
          </div>
        </div>
      )}
    </div>
  );
}
