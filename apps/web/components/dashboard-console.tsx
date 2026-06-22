"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload as uploadBlob } from "@vercel/blob/client";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bot,
  CalendarDays,
  Check,
  ChevronLeft,
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
  Trash2,
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
import {
  buildPublishPayload,
  mergeDraftQueueItem,
  readApprovalResponse,
  resolvePublishTargetFromQueue,
  selectedDraftFromQueue,
  type DraftQueuePatch,
} from "../lib/dashboard-queue";
import { calendarDisplayState } from "../lib/calendar-state";
import type { TrialStatus } from "../lib/trial";
import {
  MULTIFORMAT_VALUES,
  PUBLISHING_FORMAT_CONFIGS,
  validateFormatAssets,
  type DraftFormatAsset,
  type MultiformatDryRunResult,
  type PublishingFormat,
} from "../lib/publishing-formats";
import { extractAssetMetadataFromFile, normalizeTechnicalAssetMetadata } from "../lib/asset-metadata";
import { waitForRegisteredAsset, type WaitForRegisteredAssetResult } from "../lib/asset-upload";
import AssetCollectionPicker from "./asset-collection-picker";
import {
  ASSET_COMPATIBILITY_CONFIGS,
  ASSET_COMPATIBILITY_TARGETS,
  compatibilityTargetFromPublishingFormat,
  evaluateAssetCompatibility,
  type AssetCompatibilityInput,
  type AssetCompatibilityStatus,
  type AssetCompatibilityTarget,
} from "../lib/asset-compatibility";

type View = "overview" | "strategy" | "queue" | "assets" | "calendar" | "checklist" | "reports" | "readiness";
type CalendarView = "list" | "week" | "month";
type UploadFileState = "PENDING" | "UPLOADING" | "REGISTERING" | "READY" | "FAILED";
type UploadQueueItem = {
  id: string;
  file: File;
  state: UploadFileState;
  progress: number;
  error?: string;
  errorCode?: string;
  lastStatus?: number;
  attempts?: number;
  folder?: string;
  pathname?: string;
  url?: string;
  filename?: string;
  storageKey?: string;
  asset?: TenantAssetItem;
};

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

function assetUrl(path: string | null | undefined, slug: string) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) return path;
  const cleanPath = path.replace(/^content\/inbox\//, "").replace(/\\/g, "/");
  if (cleanPath.includes("..")) return "";
  return `/tenant-assets/${slug}/${cleanPath}`;
}

function channelLabel(item: DraftQueueItem) {
  return `${NETWORK_LABELS[item.network] ?? item.network} / ${PUBLISHING_FORMAT_CONFIGS[item.format]?.label ?? item.format}`;
}

function getPlatformFrameClass(item: DraftQueueItem) {
  if (item.format === "INSTAGRAM_STORY") return "frame-ig-vertical";
  if (item.format === "INSTAGRAM_CAROUSEL") return "frame-ig-portrait";
  if (item.format === "INSTAGRAM_FEED") return "frame-ig-square";
  if (item.format === "FACEBOOK_FEED") return "frame-facebook";
  const ch = item.network.toLowerCase();
  const fmt = String(item.format ?? "").toLowerCase();
  if (ch === "tiktok" || (ch === "youtube" && (fmt === "short" || fmt === "vertical_video"))) return "frame-ig-vertical";
  if (ch === "youtube") return "frame-youtube";
  if (ch === "linkedin") return "frame-linkedin";
  return "frame-facebook";
}

function isVideoPath(path?: string | null, kind?: string | null, mimeType?: string | null) {
  const cleanPath = path?.toLowerCase() ?? "";
  return kind === "VIDEO" || mimeType?.startsWith("video/") || cleanPath.endsWith(".mp4") || cleanPath.endsWith(".mov") || cleanPath.endsWith(".webm");
}

function assetLabel(asset: DraftFormatAsset) {
  return asset.filename ?? asset.id;
}

function formatBytes(value?: number | null) {
  if (!value) return "tamano pendiente";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function formatDuration(value?: number | null) {
  if (value == null) return null;
  const seconds = Math.round(value);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}:${String(rest).padStart(2, "0")}` : `${seconds}s`;
}

function aspectRatioText(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const ratio = value as { label?: unknown; value?: unknown };
    if (typeof ratio.label === "string") return ratio.label;
    if (typeof ratio.value === "number") return ratio.value.toFixed(2);
  }
  if (typeof value === "number") return value.toFixed(2);
  if (typeof value === "string" && value.trim()) return value;
  return "Sin analizar";
}

function assetCompatibilityInput(asset: TenantAssetItem | DraftFormatAsset): AssetCompatibilityInput {
  return {
    kind: asset.kind ?? null,
    mimeType: asset.mimeType ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    sizeBytes: asset.sizeBytes ?? null,
    durationSeconds: asset.durationSeconds ?? null,
    orientation: "orientation" in asset ? asset.orientation as any : null,
    aspectRatio: ("aspectRatio" in asset ? asset.aspectRatio : null) as AssetCompatibilityInput["aspectRatio"],
    metadata: "metadata" in asset ? asset.metadata ?? null : null,
  };
}

function compatibilityLabel(status: AssetCompatibilityStatus) {
  if (status === "IDEAL") return "Ideal";
  if (status === "USABLE") return "Usable";
  if (status === "INCOMPATIBLE") return "No compatible";
  return "Sin analizar";
}

function Thumb({ item, slug }: { item: DraftQueueItem; slug: string }) {
  const first = item.assets?.[0];
  const url = assetUrl(first?.url ?? item.asset?.path, slug);
  if (url) {
    if (isVideoPath(first?.url ?? item.asset?.path, first?.kind ?? item.asset?.kind, first?.mimeType)) {
      return <video src={url} className="thumb thumb-video" muted playsInline preload="metadata" />;
    }
    return <img src={url} alt={item.title} className="thumb" />;
  }
  return <div className="thumb fallback"><ImageIcon size={20} /></div>;
}

function PlatformPreview({
  item,
  tenantSlug,
  tenantName,
  captionOverride,
  carouselIndex,
  setCarouselIndex,
}: {
  item: DraftQueueItem;
  tenantSlug: string;
  tenantName: string;
  captionOverride?: string;
  carouselIndex: number;
  setCarouselIndex: (index: number) => void;
}) {
  const assets = item.assets?.length ? item.assets : item.asset ? [{
    id: item.asset.filename,
    url: item.asset.path,
    filename: item.asset.filename,
    mimeType: null,
    width: null,
    height: null,
    sizeBytes: null,
    order: 1,
    kind: item.asset.kind,
  }] : [];
  const activeIndex = item.format === "INSTAGRAM_CAROUSEL"
    ? Math.min(Math.max(carouselIndex, 0), Math.max(assets.length - 1, 0))
    : 0;
  const activeAsset = assets[activeIndex];
  const activeUrl = assetUrl(activeAsset?.url, tenantSlug);
  const caption = captionOverride ?? item.caption;
  const config = PUBLISHING_FORMAT_CONFIGS[item.format];

  return (
    <div className={`platform-preview ${getPlatformFrameClass(item)}`}>
      <div className="platform-chrome">
        <span>{NETWORK_LABELS[item.network] ?? item.network}</span>
        <strong>{config?.label ?? item.format}</strong>
      </div>
      <div className="platform-media">
        {activeUrl ? (
          isVideoPath(activeAsset?.url, activeAsset?.kind, activeAsset?.mimeType) ? (
            <video src={activeUrl} controls preload="metadata" />
          ) : (
            <img src={activeUrl} alt={activeAsset ? assetLabel(activeAsset) : item.title} />
          )
        ) : (
          <div className="platform-empty"><ImageIcon size={24} /></div>
        )}
        {item.format === "INSTAGRAM_STORY" && (
          <div className="story-safe-areas" aria-hidden="true">
            <span className="story-safe-top" />
            <span className="story-safe-bottom" />
            <span className="story-safe-left" />
            <span className="story-safe-right" />
          </div>
        )}
      </div>
      {item.format === "INSTAGRAM_CAROUSEL" && (
        <div className="carousel-controls">
          <button
            className="icon-button"
            onClick={() => setCarouselIndex(Math.max(activeIndex - 1, 0))}
            disabled={activeIndex === 0}
            aria-label="Asset anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span>{assets.length ? `${activeIndex + 1} / ${assets.length}` : "0 / 0"}</span>
          <button
            className="icon-button"
            onClick={() => setCarouselIndex(Math.min(activeIndex + 1, assets.length - 1))}
            disabled={activeIndex >= assets.length - 1}
            aria-label="Asset siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      <div className="platform-caption">
        <strong>{tenantName}</strong>
        <span>{caption}</span>
      </div>
    </div>
  );
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

function InspectorContent({
  inspectorAsset,
  tenantSlug,
  assetFolders,
  onClose,
  onRename,
  onMove,
  onReplace,
  onDelete,
  onUpdateFolder,
}: {
  inspectorAsset: TenantAssetItem;
  tenantSlug: string;
  assetFolders: string[];
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  onMove: (id: string, folder: string) => void;
  onReplace: (id: string, file: File) => void;
  onDelete: (id: string) => void;
  onUpdateFolder: (id: string, folder: string) => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <strong style={{ fontSize: 14, color: "var(--hc-ink)" }}>Inspector de asset</strong>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--hc-fog)", fontSize: 18, lineHeight: 1 }}><X size={20} /></button>
      </div>
      {inspectorAsset.path && (
        <div style={{ marginBottom: 16 }}>
          {inspectorAsset.kind === "VIDEO" || (inspectorAsset.path ?? "").toLowerCase().endsWith(".mp4") ? (
            <video src={assetUrl(inspectorAsset.path, tenantSlug)} controls style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 8 }} preload="metadata" />
          ) : (
            <img src={assetUrl(inspectorAsset.path, tenantSlug)} alt={inspectorAsset.filename} style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 8 }} crossOrigin="anonymous" />
          )}
        </div>
      )}
      <div style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--hc-ink)" }}>
        <div><strong>Archivo:</strong> {inspectorAsset.filename}</div>
        <div><strong>ID:</strong> <code style={{ fontSize: 10 }}>{inspectorAsset.id}</code></div>
        <div><strong>Tipo:</strong> {inspectorAsset.kind} / {inspectorAsset.mimeType ?? "N/D"}</div>
        <div><strong>Resolucion:</strong> {inspectorAsset.width && inspectorAsset.height ? `${inspectorAsset.width}x${inspectorAsset.height}` : "Sin analizar"}</div>
        <div><strong>Tamano:</strong> {formatBytes(inspectorAsset.sizeBytes)}</div>
        {inspectorAsset.durationSeconds != null && <div><strong>Duracion:</strong> {formatDuration(inspectorAsset.durationSeconds)}</div>}
        <div><strong>Orientacion:</strong> {inspectorAsset.orientation ?? "pendiente"}</div>
        <div><strong>Aspect ratio:</strong> {aspectRatioText(inspectorAsset.aspectRatio)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <strong>Coleccion:</strong>
          <AssetCollectionPicker
            currentFolder={inspectorAsset.folder ?? ""}
            tenantSlug={tenantSlug}
            folders={assetFolders}
            onSelect={(folder) => onUpdateFolder(inspectorAsset.id, folder)}
          />
        </div>
        <div><strong>Storage key:</strong> <code style={{ fontSize: 10, wordBreak: "break-all" }}>{inspectorAsset.storageKey ?? "N/D"}</code></div>
        <div><strong>Drafts:</strong> {inspectorAsset.draftCount}</div>
      </div>
      <div style={{ marginTop: 16 }}>
        <strong style={{ fontSize: 12, color: "var(--hc-ink)" }}>Matriz de compatibilidad</strong>
        <div style={{ display: "grid", gap: 4, marginTop: 6 }}>
          {ASSET_COMPATIBILITY_TARGETS.map((target) => {
            const result = evaluateAssetCompatibility(assetCompatibilityInput(inspectorAsset), target);
            return (
              <div key={target} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 4, background: result.status === "IDEAL" ? "#e8f7ef" : result.status === "USABLE" ? "#fff8e1" : result.status === "INCOMPATIBLE" ? "#fff1f0" : "var(--hc-bone)", fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: result.status === "IDEAL" ? "#0f6e3f" : result.status === "USABLE" ? "#f5a623" : result.status === "INCOMPATIBLE" ? "#b42318" : "var(--hc-fog)", flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{ASSET_COMPATIBILITY_CONFIGS[target].label}</span>
                <span style={{ fontWeight: 600 }}>{compatibilityLabel(result.status)}</span>
                <small style={{ color: "var(--hc-fog)", fontSize: 10 }}>{result.reasons.join("; ")}</small>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 18, flexWrap: "wrap" }}>
        <button onClick={() => { onClose(); onRename(inspectorAsset.id, inspectorAsset.filename); }} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", cursor: "pointer", fontSize: 12, color: "var(--hc-ink)" }}>Renombrar</button>
        <button onClick={() => { onClose(); onMove(inspectorAsset.id, inspectorAsset.folder ?? ""); }} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", cursor: "pointer", fontSize: 12, color: "var(--hc-ink)" }}>Mover</button>
        <label style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", cursor: "pointer", fontSize: 12, color: "var(--hc-ink)" }}>
          Reemplazar
          <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" hidden onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f) { onClose(); onReplace(inspectorAsset.id, f); } }} />
        </label>
        <button onClick={() => { onClose(); onDelete(inspectorAsset.id); }} disabled={inspectorAsset.draftCount > 0} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid var(--hc-line)", background: inspectorAsset.draftCount > 0 ? "var(--hc-bone)" : "#fff1f0", color: inspectorAsset.draftCount > 0 ? "var(--hc-fog)" : "#b42318", cursor: inspectorAsset.draftCount > 0 ? "not-allowed" : "pointer", fontSize: 12 }}>Eliminar</button>
      </div>
    </>
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
  const [selectedId, setSelectedIdRaw] = useState(queue[0]?.id ?? "");
  const [publishDraftId, setPublishDraftId] = useState("");
  const [localQueue, setLocalQueue] = useState(queue);
  const router = useRouter();
  const [manualApproval, setManualApproval] = useState(false);
  const [publishMode, setPublishMode] = useState<"dry_run" | "scheduled" | "immediate">("dry_run");
  const tenantAutoPilot =
    metrics?.tenant.mode === "AUTOPILOT_FULL" || metrics?.tenant.mode === "AUTOPILOT_LIMITED";
  const tenantNeedsManual =
    metrics?.tenant.mode === "APPROVAL_REQUIRED" || metrics?.tenant.mode === "DRAFT_ONLY";
  const [publishState, setPublishState] = useState<"idle" | "loading" | "published" | "scheduled" | "dry_run_ok" | "blocked" | "failed" | "reconciliation_required">("idle");
  const [publishMessage, setPublishMessage] = useState("");
  const [dryRunResult, setDryRunResult] = useState<MultiformatDryRunResult | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const activeRequestRef = useRef<{ draftId: string; mode: string; requestId: string } | null>(null);

  const setSelectedId = useCallback((id: string) => {
    if (publishState === "loading") return;
    setSelectedIdRaw(id);
  }, [publishState]);

  useEffect(() => {
    setManualApproval(false);
    setPublishState("idle");
    setPublishMessage("");
    setDryRunResult(null);
    activeRequestRef.current = null;
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
  const [assetPickerTarget, setAssetPickerTarget] = useState<{ mode: "add" | "replace"; order?: number }>({ mode: "replace", order: 1 });
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
  const [newPubFormat, setNewPubFormat] = useState<PublishingFormat>("INSTAGRAM_FEED");
  const [newPubAssetId, setNewPubAssetId] = useState("");
  const [newPubSaving, setNewPubSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadFolder, setUploadFolder] = useState("");
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [assetMessage, setAssetMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [localAssets, setLocalAssets] = useState<TenantAssetItem[]>(assets);
  const [assetKindFilter, setAssetKindFilter] = useState("ALL");
  const [assetFolderFilter, setAssetFolderFilter] = useState("ALL");
  const [assetOrientationFilter, setAssetOrientationFilter] = useState("ALL");
  const [assetTargetFilter, setAssetTargetFilter] = useState<AssetCompatibilityTarget | "ALL">("ALL");
  const [assetCompatibilityFilter, setAssetCompatibilityFilter] = useState<AssetCompatibilityStatus | "ALL">("ALL");
  const [movingAssetId, setMovingAssetId] = useState("");
  const [moveFolder, setMoveFolder] = useState("");
  const [replaceAssetId, setReplaceAssetId] = useState("");
  const [deletingAssetId, setDeletingAssetId] = useState("");
  const [uploadQueueItems, setUploadQueueItems] = useState<UploadQueueItem[]>([]);
  const [uploadErrorExpanded, setUploadErrorExpanded] = useState<Set<string>>(new Set());
  const [assetViewMode, setAssetViewMode] = useState<"grid" | "list">("grid");
  const [assetSearchFilter, setAssetSearchFilter] = useState("");
  const [assetUsageFilter, setAssetUsageFilter] = useState<"ALL" | "IN_USE" | "FREE">("ALL");
  const [assetSortOrder, setAssetSortOrder] = useState<"NOMBRE" | "FECHA" | "TAMANO">("NOMBRE");
  const [inspectorAsset, setInspectorAsset] = useState<TenantAssetItem | null>(null);
  const analyzedAssetIdsRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selected = selectedDraftFromQueue(localQueue, selectedId);
  const selectedValidation = selected ? validateFormatAssets(selected.format, selected.assets ?? []) : null;
  const activeNetworks = metrics?.tenant.activeNetworks?.length ? metrics.tenant.activeNetworks : ["INSTAGRAM", "FACEBOOK"];
  const missingCoreNetworks = SUPPORTED_NETWORKS.filter((network) => !activeNetworks.includes(network));
  const assetFolders = useMemo(() => {
    const folders = new Set(localAssets.map((asset) => asset.folder ?? "").filter(Boolean));
    return [...folders].sort();
  }, [localAssets]);
  const visibleAssets = useMemo(() => {
    let filtered = localAssets.filter((asset) => {
      const kindOk = assetKindFilter === "ALL" || asset.kind === assetKindFilter;
      const folderOk = assetFolderFilter === "ALL" || (asset.folder ?? "") === assetFolderFilter;
      const orientationOk = assetOrientationFilter === "ALL" || asset.orientation === assetOrientationFilter;
      const searchOk = !assetSearchFilter || asset.filename.toLowerCase().includes(assetSearchFilter.toLowerCase());
      const usageOk = assetUsageFilter === "ALL" || (assetUsageFilter === "IN_USE" ? asset.draftCount > 0 : asset.draftCount === 0);
      return kindOk && folderOk && orientationOk && searchOk && usageOk;
    });
    if (assetTargetFilter !== "ALL" || assetCompatibilityFilter !== "ALL") {
      filtered = filtered.filter((asset) => {
        if (assetTargetFilter === "ALL") {
          return ASSET_COMPATIBILITY_TARGETS.some((target) => evaluateAssetCompatibility(assetCompatibilityInput(asset), target).status === assetCompatibilityFilter);
        }
        const result = evaluateAssetCompatibility(assetCompatibilityInput(asset), assetTargetFilter);
        return assetCompatibilityFilter === "ALL" || result.status === assetCompatibilityFilter;
      });
    }
    if (assetSortOrder === "FECHA") {
      filtered = [...filtered].sort((a, b) => String(b.id).localeCompare(String(a.id)));
    } else if (assetSortOrder === "TAMANO") {
      filtered = [...filtered].sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0));
    }
    return filtered;
  }, [assetCompatibilityFilter, assetFolderFilter, assetKindFilter, assetOrientationFilter, assetTargetFilter, localAssets, assetSearchFilter, assetUsageFilter, assetSortOrder]);

  useEffect(() => {
    setLocalAssets(assets);
  }, [assets]);

  const pendingReview = localQueue.filter(
    (i) => i.status !== "PUBLISHED" && (i.requiresReview || i.riskLevel !== "low"),
  );
  const scheduled = localQueue
    .filter((i) => i.status !== "PUBLISHED")
    .sort((a, b) => (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? ""));
  const readyNow = scheduled.slice(0, 5);
  const nextItem = metrics?.nextUp?.[0] ?? null;
  const nextTitle = nextItem ? (nextItem.title.length > 25 ? `${nextItem.title.slice(0, 25)}…` : nextItem.title) : "Sin proximas";
  const nextNote = nextItem ? `${nextItem.network} · SCHEDULED · ${nextItem.scheduledFor ?? ""}` : "No hay publicaciones futuras programadas";

  const mergeLocalDraft = useCallback((patch: DraftQueuePatch) => {
    setLocalQueue((prev) => mergeDraftQueueItem(prev, patch));
  }, []);

  const updateLocalStatus = useCallback((id: string, newStatus: string, extra?: Partial<DraftQueueItem>) => {
    mergeLocalDraft({ id, status: newStatus, ...extra });
  }, [mergeLocalDraft]);

  const approvedDrafts = useMemo(
    () => localQueue.filter((draft) => draft.operationalState === "READY_TO_PUBLISH"),
    [localQueue],
  );

  const reconciliationDrafts = useMemo(
    () => localQueue.filter((draft) => draft.operationalState === "RECONCILIATION_REQUIRED"),
    [localQueue],
  );

  const reviewRequiredDrafts = useMemo(
    () => localQueue.filter((draft) => draft.operationalState === "REVIEW_REQUIRED"),
    [localQueue],
  );

  const publishTarget = useMemo(
    () => approvedDrafts.find((draft) => draft.id === publishDraftId) ?? approvedDrafts[0] ?? null,
    [approvedDrafts, publishDraftId],
  );

  useEffect(() => {
    setManualApproval(false);
    setPublishState("idle");
    setPublishMessage("");
    setDryRunResult(null);
    activeRequestRef.current = null;
  }, [selectedId]);

  useEffect(() => {
    setManualApproval(false);
    setPublishState("idle");
    setPublishMessage("");
    setDryRunResult(null);
  }, [publishDraftId, publishMode]);

  useEffect(() => {
    setCarouselIndex(0);
  }, [selectedId, selected?.assets?.length, selected?.format]);

  useEffect(() => {
    const currentStillApproved = approvedDrafts.some((draft) => draft.id === publishDraftId);
    if (!currentStillApproved) {
      setPublishDraftId(approvedDrafts[0]?.id ?? "");
    }
  }, [approvedDrafts, publishDraftId]);

  async function handlePublish() {
    const target = publishTarget;
    if (!target) return;
    const requestDraftId = target.id;
    const requestMode = publishMode;
    const requestId = `${requestDraftId}_${requestMode}_${Date.now().toString(36)}`;
    activeRequestRef.current = { draftId: requestDraftId, mode: requestMode, requestId };
    setPublishState("loading");
    setPublishMessage("");
    try {
      const res = await fetch("/api/publishing/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPublishPayload(
          tenantSlug,
          requestDraftId,
          requestMode,
          manualApproval || tenantAutoPilot,
        )),
      });
      const data = await res.json();

      if (activeRequestRef.current?.requestId !== requestId) {
        return;
      }

      if (data.mode === "dry_run" && data.previewData) {
        setDryRunResult(data as MultiformatDryRunResult);
        setPublishState(data.valid ? "dry_run_ok" : "blocked");
        setPublishMessage(
          data.valid
            ? `Dry-run validado: ${target.title}. Sin llamadas a provider.`
            : `Dry-run bloqueado: ${(data.errors ?? []).length} error(es), ${(data.warnings ?? []).length} warning(s). Sin llamadas a provider.`,
        );
        return;
      }

      if (data.providerConfirmed === true && data.code === "LIVE_RECONCILIATION_REQUIRED") {
        setPublishState("reconciliation_required");
        const extIdPart = data.externalPostId ? ` ID externo: ${data.externalPostId}.` : "";
        setPublishMessage(`${data.error}${extIdPart} ${data.action}`);
        router.refresh();
        return;
      }

      if (data.providerOutcomeUnknown === true || data.status === "RECONCILIATION_REQUIRED" || data.code === "LIVE_RECONCILIATION_REQUIRED") {
        setPublishState("reconciliation_required");
        setPublishMessage(data.action || data.error || "Meta pudo haber publicado. El intento quedo bloqueado para reconciliacion.");
        router.refresh();
        return;
        return;
      }

      if (!res.ok || !data.ok) {
        setPublishState(data.code === "LIVE_BLOCKED_TRIAL_LIMIT" || data.code?.startsWith("LIVE_BLOCKED") ? "blocked" : "failed");
        setPublishMessage(data.error || data.action || "No se pudo ejecutar la publicacion.");
        return;
      }
      const newStatus = data.mode === "immediate" ? "PUBLISHED" : data.mode === "scheduled" ? "SCHEDULED" : "APPROVED";
      const extra = data.externalPostId ? { externalPostId: data.externalPostId } as Partial<DraftQueueItem> : {};
      updateLocalStatus(requestDraftId, newStatus, extra);
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
          ? `Publicado en vivo: ${target.title}.${externalIdPart}`
          : data.mode === "scheduled"
            ? `Programado: ${target.title} (${data.scheduledFor ? new Date(data.scheduledFor).toLocaleString() : "pronto"}).`
            : `Dry-run validado: ${target.title}.`,
      );
      if (data.mode === "immediate" || data.mode === "scheduled") {
        router.refresh();
      }
    } catch (error) {
      setPublishState("failed");
      setPublishMessage(error instanceof Error ? error.message : "Error de red.");
    }
  }

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
      router.refresh();
    } finally {
      setEditSaving(false);
    }
  }

  async function handleFormatChange(format: PublishingFormat) {
    if (!selected) return;
    const previousFormat = selected.format;
    const nextNetwork = PUBLISHING_FORMAT_CONFIGS[format].platform;
    mergeLocalDraft({ id: selected.id, format, network: nextNetwork });
    try {
      const res = await fetch(`/api/drafts/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "Error al cambiar formato");
        mergeLocalDraft({ id: selected.id, format: previousFormat, network: selected.network });
        return;
      }
      mergeLocalDraft({ id: selected.id, format, network: nextNetwork, status: data.draft.status });
      setDryRunResult(null);
      router.refresh();
    } catch (error) {
      mergeLocalDraft({ id: selected.id, format: previousFormat, network: selected.network });
      alert(error instanceof Error ? error.message : "Error de red");
    }
  }

  async function handleUpdateDraftAssets(nextAssetIds: string[]) {
    if (!selected) return;
    setAssetReplacing(true);
    try {
      const res = await fetch(`/api/drafts/${selected.id}/asset`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: nextAssetIds }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "Error al actualizar assets");
        return;
      }
      const first = data.assets?.[0];
      mergeLocalDraft({
        id: selected.id,
        assets: data.assets ?? [],
        asset: first ? { filename: first.filename ?? first.id, path: first.url, kind: first.kind ?? "IMAGE" } : null,
        status: data.statusChanged ? "NEEDS_REVIEW" : selected.status,
        requiresReview: data.statusChanged ? true : selected.requiresReview,
      });
      setDryRunResult(null);
    } finally {
      setAssetReplacing(false);
      setAssetPickerOpen(false);
    }
  }

  async function handlePickAsset(assetId: string) {
    if (!selected) return;
    const currentIds = (selected.assets ?? []).map((asset) => asset.id);
    if (assetPickerTarget.mode === "add") {
      await handleUpdateDraftAssets([...currentIds, assetId]);
      return;
    }
    const index = Math.max((assetPickerTarget.order ?? 1) - 1, 0);
    const next = currentIds.length ? [...currentIds] : [];
    next[index] = assetId;
    await handleUpdateDraftAssets(next.filter(Boolean));
  }

  async function handleRemoveDraftAsset(order: number) {
    if (!selected) return;
    const next = (selected.assets ?? []).filter((asset) => asset.order !== order).map((asset) => asset.id);
    await handleUpdateDraftAssets(next);
  }

  async function handleMoveDraftAsset(order: number, direction: "up" | "down") {
    if (!selected) return;
    const assets = [...(selected.assets ?? [])].sort((a, b) => a.order - b.order);
    const index = assets.findIndex((asset) => asset.order === order);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= assets.length) return;
    const next = [...assets];
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    await handleUpdateDraftAssets(next.map((asset) => asset.id));
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
          network: PUBLISHING_FORMAT_CONFIGS[newPubFormat].platform,
          format: newPubFormat,
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

  function sanitizeClientFilename(name: string) {
    return (name.replace(/\\/g, "/").split("/").pop() || "asset")
      .normalize("NFKD")
      .replace(/[^\w.\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/^\.+/, "")
      .slice(0, 120) || "asset";
  }

  async function refreshTenantAssets() {
    const res = await fetch(`/api/tenants/${tenantSlug}/assets`, { headers: { Accept: "application/json" } });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Error al refrescar assets");
    setLocalAssets(data.assets ?? []);
    return data.assets ?? [];
  }

  const registeredStorageKeysRef = useRef<Set<string>>(new Set());

  async function handleUploadAsset() {
    if (uploadFiles.length === 0 || !metrics?.tenant.id) return;
    setUploading(true);
    setAssetMessage(null);
    const registered: string[] = [];
    const failed: string[] = [];
    const pending: string[] = [];

    async function uploadOne(file: File): Promise<void> {
      const uid = crypto.randomUUID();
      const safeName = sanitizeClientFilename(file.name);
      const pathname = `tenants/${metrics!.tenant.id}/assets/${uid}/${safeName}`;
      const technicalMetadata = await extractAssetMetadataFromFile(file);

      const qItem: UploadQueueItem = {
        id: uid,
        file,
        state: "UPLOADING",
        progress: 0,
        storageKey: pathname,
        folder: uploadFolder,
        filename: safeName,
        pathname,
      };
      setUploadQueueItems((prev) => [...prev, qItem]);

      try {
        await uploadBlob(pathname, file, {
          access: "public",
          handleUploadUrl: `/api/tenants/${tenantSlug}/assets/upload`,
          multipart: file.size > 4.5 * 1024 * 1024,
          clientPayload: JSON.stringify({
            originalFilename: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            folder: uploadFolder,
            technicalMetadata,
          }),
          onUploadProgress: ({ percentage }) => {
            setUploadProgress((prev) => ({ ...prev, [file.name]: Math.round(percentage) }));
            setUploadQueueItems((prev) => prev.map((item) => item.id === uid ? { ...item, progress: Math.round(percentage) } : item));
          },
        });

        setUploadQueueItems((prev) => prev.map((item) => item.id === uid ? { ...item, state: "REGISTERING" } : item));

        if (!registeredStorageKeysRef.current.has(pathname)) {
          const result = await waitForRegisteredAsset(tenantSlug, pathname);
          if (result.found && result.asset) {
            registeredStorageKeysRef.current.add(pathname);
            setUploadQueueItems((prev) => prev.map((item) => item.id === uid ? { ...item, state: "READY", asset: result.asset, attempts: result.attempts } : item));
            registered.push(file.name);
          } else {
            setUploadQueueItems((prev) => prev.map((item) => item.id === uid ? { ...item, state: "FAILED", error: result.lastError ?? "Archivo subido, pero su registro sigue pendiente. Reintentar sincronizacion.", errorCode: result.lastStatus ? String(result.lastStatus) : "UNKNOWN", lastStatus: result.lastStatus, attempts: result.attempts, url: result.asset?.path ?? undefined } : item));
            pending.push(file.name);
          }
        } else {
          setUploadQueueItems((prev) => prev.map((item) => item.id === uid ? { ...item, state: "READY" } : item));
          registered.push(file.name);
        }
      } catch (error) {
        setUploadQueueItems((prev) => prev.map((item) => item.id === uid ? { ...item, state: "FAILED", error: error instanceof Error ? error.message : "Error al subir", errorCode: "NETWORK_ERROR" } : item));
        failed.push(file.name);
      }
    }

    const semaphore = (tasks: (() => Promise<void>)[], limit: number) => {
      const results: Promise<void>[] = [];
      const executing: Promise<void>[] = [];
      for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);
        if (limit <= tasks.length) {
          const e = p.then(() => { executing.splice(executing.indexOf(e), 1); });
          executing.push(e);
          if (executing.length >= limit) {
            results.push(Promise.race(executing) as Promise<void>);
          }
        }
      }
      return Promise.allSettled(results);
    };

    try {
      const tasks = uploadFiles.map((file) => () => uploadOne(file));
      await semaphore(tasks, 3);
      await refreshTenantAssets();
      const parts: string[] = [];
      if (registered.length > 0) parts.push(`${registered.length} cargado(s)`);
      if (pending.length > 0) parts.push(`${pending.length} pendiente(s)`);
      if (failed.length > 0) parts.push(`${failed.length} fallido(s)`);
      setAssetMessage({ kind: registered.length > 0 ? "success" : "error", text: parts.join(", ") || "Sin cambios" });
    } catch (error) {
      setAssetMessage({ kind: "error", text: error instanceof Error ? error.message : "Error al subir assets" });
    } finally {
      setUploading(false);
      setUploadFiles([]);
      setUploadProgress({});
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleUploadFiles(files: File[]) {
    if (files.length === 0 || !metrics?.tenant.id) return;
    setUploading(true);
    setAssetMessage(null);
    setUploadQueueItems([]);
    const registered: string[] = [];
    const pending: string[] = [];
    const failed: string[] = [];

    async function uploadOne(file: File): Promise<void> {
      const uid = crypto.randomUUID();
      const safeName = sanitizeClientFilename(file.name);
      const pathname = `tenants/${metrics!.tenant.id}/assets/${uid}/${safeName}`;
      const technicalMetadata = await extractAssetMetadataFromFile(file);

      const qItem: UploadQueueItem = {
        id: uid,
        file,
        state: "UPLOADING",
        progress: 0,
        storageKey: pathname,
        folder: uploadFolder,
        filename: safeName,
        pathname,
      };
      setUploadQueueItems((prev) => [...prev, qItem]);

      try {
        await uploadBlob(pathname, file, {
          access: "public",
          handleUploadUrl: `/api/tenants/${tenantSlug}/assets/upload`,
          multipart: file.size > 4.5 * 1024 * 1024,
          clientPayload: JSON.stringify({
            originalFilename: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            folder: uploadFolder,
            technicalMetadata,
          }),
          onUploadProgress: ({ percentage }) => {
            setUploadQueueItems((prev) => prev.map((item) => item.id === uid ? { ...item, progress: Math.round(percentage) } : item));
          },
        });

        setUploadQueueItems((prev) => prev.map((item) => item.id === uid ? { ...item, state: "REGISTERING" } : item));

        if (!registeredStorageKeysRef.current.has(pathname)) {
          const result = await waitForRegisteredAsset(tenantSlug, pathname);
          if (result.found && result.asset) {
            registeredStorageKeysRef.current.add(pathname);
            setUploadQueueItems((prev) => prev.map((item) => item.id === uid ? { ...item, state: "READY", asset: result.asset, url: result.asset?.path ?? undefined, attempts: result.attempts } : item));
            registered.push(file.name);
          } else {
            setUploadQueueItems((prev) => prev.map((item) => item.id === uid ? { ...item, state: "FAILED", error: result.lastError ?? "Archivo subido, pero su registro sigue pendiente. Reintentar sincronizacion.", errorCode: result.lastStatus ? String(result.lastStatus) : "UNKNOWN", lastStatus: result.lastStatus, attempts: result.attempts, url: result.asset?.path ?? undefined } : item));
            pending.push(file.name);
          }
        } else {
          setUploadQueueItems((prev) => prev.map((item) => item.id === uid ? { ...item, state: "READY" } : item));
          registered.push(file.name);
        }
      } catch (error) {
        setUploadQueueItems((prev) => prev.map((item) => item.id === uid ? { ...item, state: "FAILED", error: error instanceof Error ? error.message : "Error al subir", errorCode: "NETWORK_ERROR" } : item));
        failed.push(file.name);
      }
    }

    const semaphore = (tasks: (() => Promise<void>)[], limit: number) => {
      const results: Promise<void>[] = [];
      const executing: Promise<void>[] = [];
      for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);
        if (limit <= tasks.length) {
          const e = p.then(() => { executing.splice(executing.indexOf(e), 1); });
          executing.push(e);
          if (executing.length >= limit) {
            results.push(Promise.race(executing) as Promise<void>);
          }
        }
      }
      return Promise.allSettled(results);
    };

    try {
      const tasks = files.map((file) => () => uploadOne(file));
      await semaphore(tasks, 3);
      await refreshTenantAssets();
      const parts: string[] = [];
      if (registered.length > 0) parts.push(`${registered.length} cargado(s)`);
      if (pending.length > 0) parts.push(`${pending.length} pendiente(s)`);
      if (failed.length > 0) parts.push(`${failed.length} fallido(s)`);
      setAssetMessage({ kind: registered.length > 0 ? "success" : "error", text: parts.join(", ") || "Sin cambios" });
    } catch (error) {
      setAssetMessage({ kind: "error", text: error instanceof Error ? error.message : "Error al subir assets" });
    } finally {
      setUploading(false);
    }
  }

  async function handleRetryUploadItem(itemId: string) {
    const item = uploadQueueItems.find((item) => item.id === itemId);
    if (!item) return;

    if (item.storageKey) {
      setUploadQueueItems((prev) => prev.map((it) => it.id === itemId ? { ...it, state: "REGISTERING", error: undefined, errorCode: undefined, lastStatus: undefined, attempts: undefined, progress: 0 } : it));

      const result = await waitForRegisteredAsset(tenantSlug, item.storageKey);
      if (result.found && result.asset) {
        registeredStorageKeysRef.current.add(item.storageKey);
        setUploadQueueItems((prev) => prev.map((it) => it.id === itemId ? { ...it, state: "READY", asset: result.asset, url: result.asset?.path ?? undefined, attempts: result.attempts } : it));
        return;
      }

      setUploadQueueItems((prev) => prev.map((it) => it.id === itemId ? { ...it, state: "FAILED", error: result.lastError ?? "Registro no encontrado, reintenta subida completa.", errorCode: result.lastStatus ? String(result.lastStatus) : "UNKNOWN", lastStatus: result.lastStatus, attempts: result.attempts } : it));
    }

    setUploadQueueItems((prev) => prev.map((it) => it.id === itemId ? { ...it, state: "PENDING", error: undefined, errorCode: undefined, lastStatus: undefined, attempts: undefined, progress: 0 } : it));
    handleUploadFiles([item.file]);
  }

  function handleRemoveUploadItem(itemId: string) {
    setUploadQueueItems((prev) => prev.filter((item) => item.id !== itemId || item.state === "READY" || item.state === "FAILED"));
  }

  async function handleRenameAsset(assetId: string) {
    if (!renameFilename.trim()) return;
    setRenameSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: renameFilename.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "Error al renombrar asset");
        return;
      }
      setLocalAssets((prev) => prev.map((asset) => asset.id === assetId ? { ...asset, ...data.asset } : asset));
      setAssetMessage({ kind: "success", text: "Asset renombrado." });
    } finally {
      setRenameSaving(false);
      setRenamingAssetId("");
      setRenameFilename("");
    }
  }

  async function handleMoveAsset(assetId: string) {
    setRenameSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: moveFolder }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAssetMessage({ kind: "error", text: data.error || "Error al mover asset" });
        return;
      }
      setLocalAssets((prev) => prev.map((asset) => asset.id === assetId ? { ...asset, ...data.asset } : asset));
      setAssetMessage({ kind: "success", text: "Coleccion actualizada." });
    } finally {
      setRenameSaving(false);
      setMovingAssetId("");
      setMoveFolder("");
    }
  }

  async function handleReplaceAsset(assetId: string, file: File | null) {
    if (!file || !metrics?.tenant.id) return;
    setReplaceAssetId(assetId);
    setAssetMessage(null);
    try {
      const current = localAssets.find((asset) => asset.id === assetId);
      const safeName = sanitizeClientFilename(file.name);
      const pathname = `tenants/${metrics.tenant.id}/assets/${crypto.randomUUID()}/${safeName}`;
      const technicalMetadata = await extractAssetMetadataFromFile(file);
      await uploadBlob(pathname, file, {
        access: "public",
        handleUploadUrl: `/api/tenants/${tenantSlug}/assets/${assetId}/content/upload`,
        multipart: file.size > 4.5 * 1024 * 1024,
        clientPayload: JSON.stringify({
          originalFilename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          expectedStorageKey: current?.storageKey ?? null,
          technicalMetadata,
        }),
      });
      const waitResult = await waitForRegisteredAsset(tenantSlug, pathname);
      if (!waitResult.found) {
        setAssetMessage({ kind: "error", text: "Archivo reemplazado, pero el registro queda pendiente. Reintentar sincronizacion." });
      }
      const refreshed = await refreshTenantAssets();
      const nextAsset = refreshed.find((asset: TenantAssetItem) => asset.id === assetId);
      setLocalQueue((prev) => prev.map((draft) => ({
        ...draft,
        status: draft.assets?.some((asset) => asset.id === assetId) && draft.status === "APPROVED" ? "NEEDS_REVIEW" : draft.status,
        requiresReview: draft.assets?.some((asset) => asset.id === assetId) && draft.status === "APPROVED" ? true : draft.requiresReview,
        assets: draft.assets?.map((asset) => asset.id === assetId ? {
          ...asset,
          filename: nextAsset?.filename ?? asset.filename,
          url: nextAsset?.path ?? asset.url,
          mimeType: nextAsset?.mimeType ?? asset.mimeType,
          kind: nextAsset?.kind ?? asset.kind,
          sizeBytes: nextAsset?.sizeBytes ?? asset.sizeBytes,
          width: nextAsset?.width ?? asset.width,
          height: nextAsset?.height ?? asset.height,
          durationSeconds: nextAsset?.durationSeconds ?? asset.durationSeconds,
          orientation: nextAsset?.orientation ?? asset.orientation,
          aspectRatio: nextAsset?.aspectRatio ?? asset.aspectRatio,
        } : asset),
      })));
      setAssetMessage({ kind: "success", text: "Contenido reemplazado." });
      setDryRunResult(null);
    } catch (error) {
      setAssetMessage({ kind: "error", text: error instanceof Error ? error.message : "Error al reemplazar asset" });
    } finally {
      setReplaceAssetId("");
    }
  }

  async function handlePersistAnalyzedMetadata(
    asset: TenantAssetItem,
    measured: { width?: number | null; height?: number | null; durationSeconds?: number | null },
  ) {
    if (analyzedAssetIdsRef.current.has(asset.id) || (asset.width && asset.height)) return;
    analyzedAssetIdsRef.current.add(asset.id);
    const technicalMetadata = normalizeTechnicalAssetMetadata({
      ...measured,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      originalFilename: asset.filename,
      metadataSource: "client-extracted",
    }, {
      sizeBytes: asset.sizeBytes,
      mimeType: asset.mimeType,
      originalFilename: asset.filename,
      folder: asset.folder ?? "",
    });
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicalMetadata }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setLocalAssets((prev) => prev.map((item) => item.id === asset.id ? { ...item, ...data.asset } : item));
      }
    } catch {
      setLocalAssets((prev) => prev.map((item) => item.id === asset.id ? { ...item, metadata: { ...(item.metadata ?? {}), metadataAnalysisFailed: true } } : item));
    }
  }

  async function handleDeleteAsset(assetId: string) {
    const asset = localAssets.find((item) => item.id === assetId);
    if (!asset || !confirm(`Eliminar ${asset.filename}?`)) return;
    setDeletingAssetId(assetId);
    setAssetMessage(null);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/assets/${assetId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAssetMessage({ kind: "error", text: data.code === "ASSET_IN_USE" ? "No se puede eliminar: asset en uso por drafts." : data.error || "Error al eliminar asset" });
        return;
      }
      setLocalAssets((prev) => prev.filter((item) => item.id !== assetId));
      setAssetMessage({ kind: "success", text: "Asset eliminado." });
    } finally {
      setDeletingAssetId("");
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
            <StatusCard label="Pendientes" value={metrics.counts.reviewRequired} note="requieren criterio" tone="warn" onClick={() => setView("queue")} />
            <StatusCard label="Listos" value={metrics.counts.readyToPublish} note="listos para publicar" onClick={() => setView("readiness")} />
            <StatusCard label="Por reconciliar" value={metrics.counts.reconciliationRequired} note="requieren verificacion" tone="warn" onClick={() => setView("queue")} />
            <StatusCard label="Publicados" value={metrics.counts.published} note="en Meta" tone="ok" onClick={() => setView("calendar")} />
            <StatusCard label="Assets" value={metrics.counts.totalAssets} note="importados" tone="ok" onClick={() => setView("assets")} />
            <StatusCard label="Proximo" value={nextTitle} note={nextNote} onClick={() => setView("calendar")} />
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
                  Formato
                  <select
                    value={newPubFormat}
                    onChange={(e) => {
                      const format = e.target.value as PublishingFormat;
                      setNewPubFormat(format);
                    }}
                  >
                    {MULTIFORMAT_VALUES
                      .filter((format) => activeNetworks.includes(PUBLISHING_FORMAT_CONFIGS[format].platform))
                      .map((format) => <option key={format} value={format}>{PUBLISHING_FORMAT_CONFIGS[format].label}</option>)}
                  </select>
                </label>
                <label>
                  Asset (opcional)
                  <select value={newPubAssetId} onChange={(e) => setNewPubAssetId(e.target.value)}>
                    <option value="">Sin asset</option>
                    {localAssets.map((a) => <option key={a.id} value={a.id}>{a.filename}</option>)}
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
                  <PlatformPreview
                    item={selected}
                    tenantSlug={tenantSlug}
                    tenantName={metrics?.tenant.name ?? "Tenant"}
                    carouselIndex={carouselIndex}
                    setCarouselIndex={setCarouselIndex}
                  />
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
                <div className="format-toolbar">
                  <label>
                    <span>Formato</span>
                    <select value={selected.format} onChange={(event) => handleFormatChange(event.target.value as PublishingFormat)}>
                      {MULTIFORMAT_VALUES
                        .filter((format) => activeNetworks.includes(PUBLISHING_FORMAT_CONFIGS[format].platform))
                        .map((format) => (
                          <option key={format} value={format}>{PUBLISHING_FORMAT_CONFIGS[format].label}</option>
                        ))}
                    </select>
                  </label>
                  <small>
                    Assets {selected.assets?.length ?? 0} / {PUBLISHING_FORMAT_CONFIGS[selected.format].assetRule.max}
                  </small>
                </div>
                <PlatformPreview
                  item={selected}
                  tenantSlug={tenantSlug}
                  tenantName={metrics?.tenant.name ?? "Tenant"}
                  captionOverride={editMode ? editCaption : selected.caption}
                  carouselIndex={carouselIndex}
                  setCarouselIndex={setCarouselIndex}
                />
                <div className="asset-manifest">
                  <div className="asset-manifest-head">
                    <strong>Assets ordenados</strong>
                    <button
                      className="tool-button"
                      onClick={() => {
                        setAssetPickerTarget({ mode: "add" });
                        setAssetPickerOpen(!assetPickerOpen || assetPickerTarget.mode !== "add");
                      }}
                      disabled={assetReplacing || (selected.assets?.length ?? 0) >= PUBLISHING_FORMAT_CONFIGS[selected.format].assetRule.max}
                    >
                      <ImageIcon size={14} /> Agregar
                    </button>
                  </div>
                  {(selected.assets ?? []).map((asset, index) => (
                    <div className="asset-manifest-row" key={`${asset.id}-${asset.order}`}>
                      <span className="asset-order">{asset.order}</span>
                      <span style={{ minWidth: 0 }}>
                        <strong>{assetLabel(asset)}</strong>
                        <small style={{ display: "block", color: "var(--hc-fog)" }}>
                          {asset.width && asset.height ? `${asset.width} x ${asset.height}` : "Sin analizar"} / {formatBytes(asset.sizeBytes)} / {aspectRatioText(asset.aspectRatio)}
                        </small>
                      </span>
                      <small>{asset.mimeType ?? asset.kind ?? "metadata pendiente"}</small>
                      <div className="asset-actions">
                        <button className="icon-button" onClick={() => handleMoveDraftAsset(asset.order, "up")} disabled={index === 0 || assetReplacing} aria-label="Mover asset arriba">
                          <ArrowUp size={14} />
                        </button>
                        <button className="icon-button" onClick={() => handleMoveDraftAsset(asset.order, "down")} disabled={index === (selected.assets?.length ?? 0) - 1 || assetReplacing} aria-label="Mover asset abajo">
                          <ArrowDown size={14} />
                        </button>
                        <button
                          className="icon-button"
                          onClick={() => {
                            setAssetPickerTarget({ mode: "replace", order: asset.order });
                            setAssetPickerOpen(!assetPickerOpen || assetPickerTarget.order !== asset.order || assetPickerTarget.mode !== "replace");
                          }}
                          disabled={assetReplacing}
                          aria-label="Reemplazar asset"
                        >
                          <Settings2 size={14} />
                        </button>
                        <button className="icon-button danger" onClick={() => handleRemoveDraftAsset(asset.order)} disabled={assetReplacing} aria-label="Eliminar asset">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(selected.assets?.length ?? 0) === 0 && <p>Sin assets vinculados.</p>}
                </div>
                {selectedValidation && (selectedValidation.errors.length > 0 || selectedValidation.warnings.length > 0) && (
                  <div className="validation-stack">
                    {selectedValidation.errors.map((error) => <p className="validation-error" key={`${error.code}-${error.assetId ?? "draft"}`}>{error.message}</p>)}
                    {selectedValidation.warnings.map((warning) => <p className="validation-warning" key={`${warning.code}-${warning.assetId ?? "draft"}`}>{warning.message}</p>)}
                  </div>
                )}
                {assetPickerOpen && (
                  <div style={{ padding: "8px 8px 4px 8px", background: "var(--hc-bone)", borderTop: "1px solid var(--hc-line)" }}>
                    <strong style={{ fontSize: 11 }}>
                      {assetPickerTarget.mode === "add" ? "Agregar asset:" : `Reemplazar asset #${assetPickerTarget.order ?? 1}:`}
                    </strong>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, maxHeight: 160, overflowY: "auto" }}>
                      {localAssets
                        .filter((a) => assetPickerTarget.mode === "replace" || !(selected.assets ?? []).some((current) => current.id === a.id))
                        .sort((a, b) => {
                          const target = compatibilityTargetFromPublishingFormat(selected.format);
                          const rank: Record<AssetCompatibilityStatus, number> = { IDEAL: 0, USABLE: 1, UNKNOWN: 2, INCOMPATIBLE: 3 };
                          return rank[evaluateAssetCompatibility(assetCompatibilityInput(a), target).status] - rank[evaluateAssetCompatibility(assetCompatibilityInput(b), target).status];
                        })
                        .slice(0, 20)
                        .map((asset) => {
                          const target = compatibilityTargetFromPublishingFormat(selected.format);
                          const compatibility = evaluateAssetCompatibility(assetCompatibilityInput(asset), target);
                          const blocked = compatibility.status === "INCOMPATIBLE";
                          return (
                          <button
                            key={asset.id}
                            onClick={() => handlePickAsset(asset.id)}
                            disabled={assetReplacing || blocked}
                            title={`${ASSET_COMPATIBILITY_CONFIGS[target].label}: ${compatibility.reasons.join(" ")}`}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 2,
                              padding: 4,
                              borderRadius: 4,
                              border: "1px solid var(--hc-line)",
                              background: blocked ? "#fff1f0" : "var(--hc-surface)",
                              cursor: blocked ? "not-allowed" : "pointer",
                              fontSize: 10,
                              maxWidth: 132,
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
                            <small style={{ color: "var(--hc-fog)", fontSize: 8 }}>{asset.width && asset.height ? `${asset.width}x${asset.height}` : "Sin analizar"}</small>
                            <small style={{ color: blocked ? "#b42318" : "var(--hc-fog)", fontSize: 8 }}>{compatibilityLabel(compatibility.status)}</small>
                          </button>
                          );
                        })}
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
                  <ApprovalActions
                    draftId={selected.id}
                    onStatusChange={(patch) => {
                      mergeLocalDraft(patch);
                      setSelectedIdRaw(patch.id);
                      setManualApproval(false);
                      setPublishState("idle");
                      setPublishMessage("");
                      activeRequestRef.current = null;
                    }}
                  />
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
            <section className="work-panel span-2">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--hc-line)", minHeight: 60 }}>
                <div>
                  <strong style={{ fontSize: 16 }}>Biblioteca</strong>
                  <small style={{ color: "var(--hc-fog)", marginLeft: 8 }}>{localAssets.length} activos</small>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                  {(() => {
                    const total = localAssets.length;
                    const networkTargets = ASSET_COMPATIBILITY_TARGETS.filter((target) =>
                      activeNetworks.some((network) => target.startsWith(network.toUpperCase()))
                    );
                    const listos = localAssets.filter((asset) => networkTargets.some((target) =>
                      evaluateAssetCompatibility(assetCompatibilityInput(asset), target).status === "IDEAL"
                    )).length;
                    const requiereAjuste = localAssets.filter((asset) => {
                      const hasIdeal = networkTargets.some((target) => evaluateAssetCompatibility(assetCompatibilityInput(asset), target).status === "IDEAL");
                      const allUsable = networkTargets.length > 0 && networkTargets.every((target) => {
                        const status = evaluateAssetCompatibility(assetCompatibilityInput(asset), target).status;
                        return status === "USABLE" || status === "IDEAL";
                      });
                      return !hasIdeal && allUsable;
                    }).length;
                    const sinAnalizar = localAssets.filter((asset) => !asset.width || !asset.height).length;
                    const enUso = localAssets.filter((asset) => asset.draftCount > 0).length;
                    return (
                      <>
                        <span style={{ background: "var(--hc-bone)", padding: "2px 8px", borderRadius: 10 }}>Total: <strong>{total}</strong></span>
                        <span style={{ background: "#e8f7ef", padding: "2px 8px", borderRadius: 10, color: "#0f6e3f" }}>Listos: <strong>{listos}</strong></span>
                        <span style={{ background: "#fff8e1", padding: "2px 8px", borderRadius: 10, color: "#8d6e00" }}>Requieren ajuste: <strong>{requiereAjuste}</strong></span>
                        <span style={{ background: "var(--hc-bone)", padding: "2px 8px", borderRadius: 10 }}>Sin analizar: <strong>{sinAnalizar}</strong></span>
                        <span style={{ background: "var(--hc-bone)", padding: "2px 8px", borderRadius: 10 }}>En uso: <strong>{enUso}</strong></span>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--hc-line)" }}>
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = "var(--hc-teal)"; e.currentTarget.style.background = "var(--hc-teal-tint)"; }}
                  onDragLeave={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = "var(--hc-line)"; (e.currentTarget as HTMLElement).style.background = "var(--hc-surface)"; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--hc-line)";
                    (e.currentTarget as HTMLElement).style.background = "var(--hc-surface)";
                    const files = Array.from(e.dataTransfer.files);
                    if (files.length > 0) handleUploadFiles(files);
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="Seleccionar archivos para subir"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  style={{
                    border: "2px dashed var(--hc-line)",
                    borderRadius: 8,
                    padding: "20px",
                    textAlign: "center",
                    cursor: "pointer",
                    minHeight: 80,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--hc-fog)",
                    fontSize: 13,
                    gap: 8,
                    background: "var(--hc-surface)",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <PackageSearch size={18} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    style={{
                      padding: "6px 16px",
                      borderRadius: 6,
                      border: "1px solid var(--hc-line)",
                      background: "var(--hc-ink)",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "inherit",
                    }}
                  >
                    Seleccionar archivos
                  </button>
                  <span style={{ fontSize: 11, color: "var(--hc-fog)" }}>
                    JPG, PNG, WebP, MP4 &middot; seleccion multiple
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length > 0) handleUploadFiles(files);
                    }}
                    style={{ display: "none" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                  <AssetCollectionPicker currentFolder={uploadFolder} tenantSlug={tenantSlug} folders={assetFolders} onSelect={(folder) => setUploadFolder(folder)} />
                </div>
              </div>

              {uploadQueueItems.length > 0 && (
                <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--hc-line)" }}>
                  <small style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                    Subiendo {uploadQueueItems.filter((item) => item.state !== "READY" && item.state !== "FAILED").length} de {uploadQueueItems.length} archivos...
                  </small>
                  {uploadQueueItems.map((item) => (
                    <Fragment key={item.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12 }}>
                      {item.file.type.startsWith("image/") && item.file ? (
                        <img
                          src={URL.createObjectURL(item.file)}
                          alt=""
                          style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }}
                        />
                      ) : (
                        <div style={{ width: 32, height: 32, background: "var(--hc-bone)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <ImageIcon size={14} />
                        </div>
                      )}
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.file.name}</span>
                      <small style={{ color: "var(--hc-fog)", minWidth: 50 }}>{formatBytes(item.file.size)}</small>
                      <span style={{
                        padding: "1px 6px",
                        borderRadius: 4,
                        fontSize: 10,
                        background:
                          item.state === "READY" ? "#e8f7ef" :
                          item.state === "FAILED" ? "#fff1f0" :
                          item.state === "REGISTERING" ? "#e8f0fe" :
                          item.state === "UPLOADING" ? "#fff8e1" :
                          "var(--hc-bone)",
                        color:
                          item.state === "READY" ? "#0f6e3f" :
                          item.state === "FAILED" ? "#b42318" :
                          item.state === "REGISTERING" ? "#174ea6" :
                          item.state === "UPLOADING" ? "#8d6e00" :
                          "var(--hc-fog)",
                      }}>
                        {item.state === "READY" ? "Listo" :
                         item.state === "FAILED" ? "Fallido" :
                         item.state === "REGISTERING" ? "Registrando" :
                         item.state === "UPLOADING" ? "Subiendo" :
                         "Pendiente"}
                      </span>
                      {item.state === "UPLOADING" || item.state === "REGISTERING" ? (
                        <div style={{ width: 60, height: 4, background: "var(--hc-line)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${item.progress}%`, height: "100%", background: "var(--hc-teal)", transition: "width 0.2s" }} />
                        </div>
                      ) : (
                        <div style={{ width: 60 }} />
                      )}
                      {item.state === "FAILED" && (
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <button onClick={() => handleRetryUploadItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--hc-teal)" }}>Reintentar</button>
                          {item.error && (
                            <button
                              onClick={() => setUploadErrorExpanded((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                                return next;
                              })}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--hc-fog)", textDecoration: "underline" }}
                            >
                              {uploadErrorExpanded.has(item.id) ? "Ocultar" : "Ver detalle"}
                            </button>
                          )}
                        </div>
                      )}
                      {item.state !== "UPLOADING" && item.state !== "REGISTERING" && (
                        <button onClick={() => handleRemoveUploadItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--hc-fog)" }}><X size={14} /></button>
                      )}
                    </div>
                    {item.state === "FAILED" && item.error && uploadErrorExpanded.has(item.id) && (
                      <div style={{ marginLeft: 40, marginBottom: 4, padding: "6px 8px", background: "var(--hc-bone)", borderRadius: 4, fontSize: 10, fontFamily: "monospace", color: "var(--hc-ink)", lineHeight: 1.5 }}>
                        <div><strong>Fase:</strong> {item.errorCode === "NETWORK_ERROR" ? "UPLOADING" : "REGISTERING"}</div>
                        <div><strong>Status HTTP:</strong> {item.lastStatus ?? "N/D"}</div>
                        <div><strong>Codigo:</strong> {item.errorCode ?? "UNKNOWN"}</div>
                        <div><strong>Mensaje:</strong> {item.error}</div>
                        <div><strong>StorageKey:</strong> {(item.storageKey ?? "").slice(0, 50)}{(item.storageKey ?? "").length > 50 ? "..." : ""}</div>
                        <div><strong>Intentos:</strong> {item.attempts ?? "N/D"}</div>
                      </div>
                    )}
                    </Fragment>
                  ))}
                  {assetMessage && (
                    <small style={{ display: "block", marginTop: 6, color: assetMessage.kind === "error" ? "#b42318" : "var(--hc-green)" }}>{assetMessage.text}</small>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 6, padding: "8px 14px", flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid var(--hc-line)" }}>
                <input
                  value={assetSearchFilter}
                  onChange={(e) => setAssetSearchFilter(e.target.value)}
                  placeholder="Buscar..."
                  style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--hc-line)", fontSize: 12, minWidth: 120 }}
                />
                <select value={assetKindFilter} onChange={(e) => setAssetKindFilter(e.target.value)} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--hc-line)" }}>
                  <option value="ALL">Todos los tipos</option>
                  <option value="IMAGE">Imagen</option>
                  <option value="VIDEO">Video</option>
                </select>
                <select value={assetFolderFilter} onChange={(e) => setAssetFolderFilter(e.target.value)} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--hc-line)" }}>
                  <option value="ALL">Todas las colecciones</option>
                  {assetFolders.map((folder) => <option key={folder} value={folder}>{folder}</option>)}
                </select>
                <select value={assetOrientationFilter} onChange={(e) => setAssetOrientationFilter(e.target.value)} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--hc-line)" }}>
                  <option value="ALL">Todas las orientaciones</option>
                  <option value="square">Cuadrado</option>
                  <option value="portrait">Vertical</option>
                  <option value="landscape">Horizontal</option>
                </select>
                <select value={assetTargetFilter} onChange={(e) => setAssetTargetFilter(e.target.value as AssetCompatibilityTarget | "ALL")} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--hc-line)" }}>
                  <option value="ALL">Todos los formatos</option>
                  {ASSET_COMPATIBILITY_TARGETS.map((target) => (
                    <option key={target} value={target}>{ASSET_COMPATIBILITY_CONFIGS[target].label}</option>
                  ))}
                </select>
                <select value={assetCompatibilityFilter} onChange={(e) => setAssetCompatibilityFilter(e.target.value as AssetCompatibilityStatus | "ALL")} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--hc-line)" }}>
                  <option value="ALL">Todos los estados</option>
                  <option value="IDEAL">Ideal</option>
                  <option value="USABLE">Usable</option>
                  <option value="INCOMPATIBLE">No compatible</option>
                  <option value="UNKNOWN">Sin analizar</option>
                </select>
                <select value={assetUsageFilter} onChange={(e) => setAssetUsageFilter(e.target.value as "ALL" | "IN_USE" | "FREE")} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--hc-line)" }}>
                  <option value="ALL">Todos</option>
                  <option value="IN_USE">En uso</option>
                  <option value="FREE">Libres</option>
                </select>
                <select value={assetSortOrder} onChange={(e) => setAssetSortOrder(e.target.value as "NOMBRE" | "FECHA" | "TAMANO")} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--hc-line)" }}>
                  <option value="NOMBRE">Nombre</option>
                  <option value="FECHA">Fecha</option>
                  <option value="TAMANO">Tamano</option>
                </select>
                <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
                  <button
                    onClick={() => setAssetViewMode("grid")}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px 0 0 4px",
                      border: "1px solid var(--hc-line)",
                      background: assetViewMode === "grid" ? "var(--hc-ink)" : "var(--hc-bone)",
                      color: assetViewMode === "grid" ? "#fff" : "var(--hc-ink)",
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setAssetViewMode("list")}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "0 4px 4px 0",
                      border: "1px solid var(--hc-line)",
                      background: assetViewMode === "list" ? "var(--hc-ink)" : "var(--hc-bone)",
                      color: assetViewMode === "list" ? "#fff" : "var(--hc-ink)",
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    Lista
                  </button>
                </div>
              </div>

              {assetViewMode === "grid" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, padding: 10, maxHeight: "calc(100vh - 340px)", overflowY: "auto" }}>
                  {visibleAssets.map((asset) => {
                    const metadataMissing = !asset.width || !asset.height;
                    const allCompatResults = ASSET_COMPATIBILITY_TARGETS.map((target) => ({
                      target,
                      result: evaluateAssetCompatibility(assetCompatibilityInput(asset), target),
                    }));
                    const topBadges = allCompatResults
                      .filter((entry) => entry.result.status !== "UNKNOWN")
                      .sort((a, b) => (a.result.status === "IDEAL" ? -1 : a.result.status === "USABLE" ? 0 : 1) - (b.result.status === "IDEAL" ? -1 : b.result.status === "USABLE" ? 0 : 1))
                      .slice(0, 3);
                    const extraCount = allCompatResults.filter((entry) => entry.result.status !== "UNKNOWN").length - 3;
                    return (
                      <div key={asset.id} style={{ border: "1px solid var(--hc-line)", borderRadius: 8, overflow: "hidden", background: "var(--hc-surface)", cursor: "pointer" }} onClick={() => setInspectorAsset(asset)}>
                        {asset.path ? (
                          asset.kind === "VIDEO" || asset.path.toLowerCase().endsWith(".mp4") ? (
                            <video src={assetUrl(asset.path, tenantSlug)} style={{ width: "100%", height: 90, objectFit: "cover" }} preload="metadata" muted />
                          ) : (
                            <img src={assetUrl(asset.path, tenantSlug)} alt={asset.filename} style={{ width: "100%", height: 90, objectFit: "cover" }} crossOrigin="anonymous" />
                          )
                        ) : (
                          <div style={{ width: "100%", height: 90, background: "var(--hc-bone)", display: "flex", alignItems: "center", justifyContent: "center" }}><PackageSearch size={22} /></div>
                        )}
                        <div style={{ padding: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={asset.filename}>{asset.filename}</div>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3, fontSize: 10 }}>
                            {asset.width && asset.height ? (
                              <span style={{ color: "var(--hc-fog)" }}>{asset.width}x{asset.height}</span>
                            ) : metadataMissing ? (
                              <span style={{ color: "var(--hc-sand)" }}>Sin analizar</span>
                            ) : null}
                            {asset.sizeBytes != null && (
                              <span style={{ color: "var(--hc-fog)" }}>{formatBytes(asset.sizeBytes)}</span>
                            )}
                            {asset.folder && (
                              <span style={{ background: "var(--hc-bone)", padding: "0 4px", borderRadius: 3 }}>{asset.folder}</span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                            {topBadges.map((entry) => (
                              <span
                                key={entry.target}
                                title={`${ASSET_COMPATIBILITY_CONFIGS[entry.target].label}: ${compatibilityLabel(entry.result.status)}`}
                                style={{
                                  padding: "1px 5px",
                                  borderRadius: 3,
                                  fontSize: 9,
                                  background: entry.result.status === "IDEAL" ? "#e8f7ef" : entry.result.status === "USABLE" ? "#fff8e1" : "#fff1f0",
                                  color: entry.result.status === "IDEAL" ? "#0f6e3f" : entry.result.status === "USABLE" ? "#8d6e00" : "#b42318",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 2,
                                }}
                              >
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: entry.result.status === "IDEAL" ? "#0f6e3f" : entry.result.status === "USABLE" ? "#f5a623" : "#b42318", display: "inline-block", flexShrink: 0 }} />
                                {compatibilityLabel(entry.result.status).slice(0, 4)}
                              </span>
                            ))}
                            {extraCount > 0 && (
                              <span style={{ fontSize: 9, color: "var(--hc-fog)", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setInspectorAsset(asset); }}>+{extraCount} formatos</span>
                            )}
                          </div>
                          {asset.draftCount > 0 && (
                            <div style={{ marginTop: 4, fontSize: 10, color: "var(--hc-teal)" }}>usado en {asset.draftCount} drafts</div>
                          )}
                          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                            <button onClick={(e) => { e.stopPropagation(); setRenamingAssetId(asset.id); setRenameFilename(asset.filename); }} title="Renombrar" style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--hc-fog)" }}><Pencil size={12} /></button>
                            <button onClick={(e) => { e.stopPropagation(); setMovingAssetId(asset.id); setMoveFolder(asset.folder ?? ""); }} title="Coleccion" style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--hc-fog)" }}><PackageSearch size={12} /></button>
                            <label title="Reemplazar" style={{ cursor: "pointer", color: "var(--hc-fog)", padding: 2 }} onClick={(e) => e.stopPropagation()}>
                              <ImageIcon size={12} />
                              <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" hidden onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f) handleReplaceAsset(asset.id, f); }} />
                            </label>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }} disabled={deletingAssetId === asset.id || asset.draftCount > 0} title={asset.draftCount > 0 ? "Asset en uso" : "Eliminar"} style={{ background: "none", border: "none", cursor: asset.draftCount > 0 ? "not-allowed" : "pointer", padding: 2, color: asset.draftCount > 0 ? "var(--hc-line)" : "#b42318" }}><Trash2 size={12} /></button>
                          </div>
                          {renamingAssetId === asset.id && (
                            <div style={{ display: "flex", gap: 4, marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
                              <input autoFocus style={{ flex: 1, padding: "3px 6px", borderRadius: 4, border: "1px solid var(--hc-line)", fontSize: 12 }} value={renameFilename} onChange={(e) => setRenameFilename(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleRenameAsset(asset.id); if (e.key === "Escape") setRenamingAssetId(""); }} />
                              <button onClick={() => handleRenameAsset(asset.id)} disabled={renameSaving} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid var(--hc-line)", background: "var(--hc-ink)", color: "#fff", cursor: "pointer", fontSize: 11 }}>{renameSaving ? "..." : "Guardar"}</button>
                              <button onClick={() => { setRenamingAssetId(""); setRenameFilename(""); }} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", cursor: "pointer", fontSize: 11 }}>Cancelar</button>
                            </div>
                          )}
                          {movingAssetId === asset.id && (
                            <div style={{ display: "flex", gap: 4, marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
                              <AssetCollectionPicker currentFolder={moveFolder} tenantSlug={tenantSlug} folders={assetFolders} onSelect={(folder) => setMoveFolder(folder)} />
                              <button onClick={() => handleMoveAsset(asset.id)} disabled={renameSaving} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid var(--hc-line)", background: "var(--hc-ink)", color: "#fff", cursor: "pointer", fontSize: 11 }}>Mover</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {visibleAssets.length === 0 && <p style={{ padding: 14, gridColumn: "1 / -1", textAlign: "center", color: "var(--hc-fog)" }}>No hay activos para este filtro.</p>}
                </div>
              ) : (
                <div style={{ padding: 10, maxHeight: "calc(100vh - 340px)", overflowY: "auto" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "40px 2fr 1fr 1fr 80px 100px 120px 80px 120px", gap: 4, fontSize: 11, fontWeight: 600, padding: "4px 8px", borderBottom: "1px solid var(--hc-line)", color: "var(--hc-fog)" }}>
                    <span></span>
                    <span>Nombre</span>
                    <span>Resolucion</span>
                    <span>Tamano</span>
                    <span>Tipo</span>
                    <span>Coleccion</span>
                    <span>Compatibilidad</span>
                    <span>Drafts</span>
                    <span>Acciones</span>
                  </div>
                  {visibleAssets.map((asset) => {
                    const allCompatResults = ASSET_COMPATIBILITY_TARGETS.map((target) => ({
                      target,
                      result: evaluateAssetCompatibility(assetCompatibilityInput(asset), target),
                    }));
                    const topBadges = allCompatResults
                      .filter((entry) => entry.result.status !== "UNKNOWN")
                      .sort((a, b) => (a.result.status === "IDEAL" ? -1 : a.result.status === "USABLE" ? 0 : 1) - (b.result.status === "IDEAL" ? -1 : b.result.status === "USABLE" ? 0 : 1))
                      .slice(0, 2);
                    return (
                      <div key={asset.id} style={{ display: "grid", gridTemplateColumns: "40px 2fr 1fr 1fr 80px 100px 120px 80px 120px", gap: 4, alignItems: "center", padding: "4px 8px", borderBottom: "1px solid var(--hc-line)", fontSize: 11, cursor: "pointer" }} onClick={() => setInspectorAsset(asset)}>
                        {asset.path ? (
                          asset.kind === "VIDEO" || asset.path.toLowerCase().endsWith(".mp4") ? (
                            <video src={assetUrl(asset.path, tenantSlug)} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }} preload="metadata" muted />
                          ) : (
                            <img src={assetUrl(asset.path, tenantSlug)} alt={asset.filename} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }} crossOrigin="anonymous" />
                          )
                        ) : (
                          <div style={{ width: 32, height: 32, background: "var(--hc-bone)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}><PackageSearch size={14} /></div>
                        )}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{asset.filename}</span>
                        <span>{asset.width && asset.height ? `${asset.width}x${asset.height}` : "-"}</span>
                        <span>{asset.sizeBytes != null ? formatBytes(asset.sizeBytes) : "-"}</span>
                        <span>{asset.kind}</span>
                        <span>{asset.folder || "raiz"}</span>
                        <span style={{ display: "flex", gap: 2 }}>
                          {topBadges.map((entry) => (
                            <span
                              key={entry.target}
                              title={`${ASSET_COMPATIBILITY_CONFIGS[entry.target].label}: ${compatibilityLabel(entry.result.status)}`}
                              style={{
                                padding: "0 4px",
                                borderRadius: 3,
                                fontSize: 9,
                                background: entry.result.status === "IDEAL" ? "#e8f7ef" : entry.result.status === "USABLE" ? "#fff8e1" : "#fff1f0",
                                color: entry.result.status === "IDEAL" ? "#0f6e3f" : entry.result.status === "USABLE" ? "#8d6e00" : "#b42318",
                              }}
                            >
                              {compatibilityLabel(entry.result.status).slice(0, 4)}
                            </span>
                          ))}
                        </span>
                        <span>{asset.draftCount > 0 ? `${asset.draftCount}` : "-"}</span>
                        <span style={{ display: "flex", gap: 4 }}>
                          <button onClick={(e) => { e.stopPropagation(); setRenamingAssetId(asset.id); setRenameFilename(asset.filename); }} title="Renombrar" style={{ background: "none", border: "none", cursor: "pointer", padding: 1, color: "var(--hc-fog)" }}><Pencil size={11} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setMovingAssetId(asset.id); setMoveFolder(asset.folder ?? ""); }} title="Mover" style={{ background: "none", border: "none", cursor: "pointer", padding: 1, color: "var(--hc-fog)" }}><PackageSearch size={11} /></button>
                          <label title="Reemplazar" style={{ cursor: "pointer", color: "var(--hc-fog)", padding: 1 }} onClick={(e) => e.stopPropagation()}>
                            <ImageIcon size={11} />
                            <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" hidden onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f) handleReplaceAsset(asset.id, f); }} />
                          </label>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }} disabled={deletingAssetId === asset.id || asset.draftCount > 0} style={{ background: "none", border: "none", cursor: asset.draftCount > 0 ? "not-allowed" : "pointer", padding: 1, color: asset.draftCount > 0 ? "var(--hc-line)" : "#b42318" }}><Trash2 size={11} /></button>
                        </span>
                      </div>
                    );
                  })}
                  {visibleAssets.length === 0 && <p style={{ padding: 14, textAlign: "center", color: "var(--hc-fog)" }}>No hay activos para este filtro.</p>}
                </div>
              )}
            </section>
          </div>
        )}

        {inspectorAsset && (
          <>
            <div
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 9998 }}
              onClick={() => setInspectorAsset(null)}
            />
            <div
              style={{
                position: "fixed",
                right: 0,
                top: 0,
                height: "100dvh",
                width: "min(480px, 100vw)",
                background: "var(--hc-surface)",
                boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
                zIndex: 9999,
                overflowY: "auto",
                padding: 24,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <InspectorContent
                inspectorAsset={inspectorAsset}
                tenantSlug={tenantSlug}
                assetFolders={assetFolders}
                onClose={() => setInspectorAsset(null)}
                onRename={(id, name) => { setInspectorAsset(null); setRenamingAssetId(id); setRenameFilename(name); }}
                onMove={(id, folder) => { setInspectorAsset(null); setMovingAssetId(id); setMoveFolder(folder); }}
                onReplace={(id, file) => { setInspectorAsset(null); handleReplaceAsset(id, file); }}
                onDelete={(id) => { setInspectorAsset(null); handleDeleteAsset(id); }}
                onUpdateFolder={(id, folder) => {
                  setRenameSaving(true);
                  fetch(`/api/tenants/${tenantSlug}/assets/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ folder }),
                  })
                    .then((r) => r.json())
                    .then((data) => {
                      if (data.ok) {
                        setLocalAssets((prev) => prev.map((asset) => asset.id === id ? { ...asset, ...data.asset } : asset));
                        setAssetMessage({ kind: "success", text: "Coleccion actualizada." });
                      }
                    })
                    .finally(() => setRenameSaving(false));
                }}
              />
            </div>
          </>
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
                      <small>{item.network} / {item.format} / {calendarDisplayState(item)}</small>
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
                    disabled={publishState === "loading"}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--hc-line)", fontSize: 13 }}
                  >
                    <option value="dry_run">Dry-run (validar, no publicar)</option>
                    <option value="scheduled">Programar (cron publica despues)</option>
                    <option value="immediate">Inmediata (publicar ahora)</option>
                  </select>
                </label>
                <div className="publish-gate">
                  <label className="gate-check" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "var(--hc-ink)" }}>Draft a publicar:</span>
                    <select
                      value={publishTarget?.id ?? ""}
                      onChange={(e) => {
                        setPublishDraftId(e.target.value);
                        setManualApproval(false);
                        setPublishState("idle");
                        setPublishMessage("");
                      }}
                      disabled={publishState === "loading" || approvedDrafts.length === 0}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--hc-line)", fontSize: 13, maxWidth: 320 }}
                    >
                      {approvedDrafts.length === 0 && <option value="">Sin drafts aprobados</option>}
                      {approvedDrafts.map((draft) => (
                        <option key={draft.id} value={draft.id}>
                          {draft.title} — {NETWORK_LABELS[draft.network] ?? draft.network}
                        </option>
                      ))}
                    </select>
                  </label>
                  {tenantNeedsManual && (
                    <label className="gate-check">
                      <input
                        type="checkbox"
                        checked={manualApproval}
                        onChange={(event) => setManualApproval(event.target.checked)}
                        disabled={publishState === "loading"}
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
                        disabled={publishState === "loading"}
                      />
                      Confirmo que quiero publicar en redes reales. Esta accion no es reversible.
                    </label>
                  )}
                  <button
                    className="primary-action"
                    onClick={handlePublish}
                    disabled={publishState === "loading" || !publishTarget}
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
                  {publishTarget && (
                    <small style={{ marginTop: 6, display: "block" }}>
                      Draft seleccionado: <strong>{publishTarget.title}</strong> ({publishTarget.id})<br />
                      Red: {NETWORK_LABELS[publishTarget.network] ?? publishTarget.network} · Estado: {publishTarget.status} · Modo: {publishMode}
                    </small>
                  )}
                  {!publishTarget && (
                    <small style={{ color: "var(--hc-sand)", display: "block", marginTop: 6 }}>
                      {approvedDrafts.length === 0
                        ? "No hay drafts APPROVED disponibles para publicar."
                        : "Selecciona un draft aprobado arriba."}
                    </small>
                  )}
                  {publishMessage && (
                    <p className={publishState === "failed" || publishState === "blocked" || publishState === "reconciliation_required" ? "login-error" : "publish-ok"}>
                      {publishMessage}
                    </p>
                  )}
                  {dryRunResult && (
                    <div className="validation-stack">
                      <small>
                        Dry-run: {dryRunResult.format} / {dryRunResult.assets.map((asset) => `#${asset.order} ${assetLabel(asset)}`).join(", ") || "sin assets"}
                      </small>
                      {dryRunResult.errors.map((error) => <p className="validation-error" key={`dry-${error.code}-${error.assetId ?? "draft"}`}>{error.message}</p>)}
                      {dryRunResult.warnings.map((warning) => <p className="validation-warning" key={`dry-${warning.code}-${warning.assetId ?? "draft"}`}>{warning.message}</p>)}
                    </div>
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
  onStatusChange: (draft: DraftQueuePatch) => void;
}) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function handleApprove() {
    if (loading !== null) return;
    setLoading("approve");
    setMessage(null);
    try {
      const res = await fetch(`/api/drafts/${draftId}/approve`, { method: "POST" });
      const result = await readApprovalResponse(res, draftId);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      onStatusChange(result.draft);
      setMessage({ kind: "success", text: "Draft aprobado." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Error de red." });
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (loading !== null) return;
    setLoading("reject");
    try {
      const res = await fetch(`/api/drafts/${draftId}/reject`, { method: "POST" });
      const data = await res.json();
      if (data.ok) onStatusChange(data.draft ?? { id: draftId, status: "REJECTED" });
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
      {message && (
        <span style={{ color: message.kind === "success" ? "var(--hc-teal)" : "var(--hc-red)", fontSize: 12 }}>
          {message.text}
        </span>
      )}
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
