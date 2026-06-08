"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock3,
  FileText,
  Gauge,
  ImageIcon,
  LockKeyhole,
  MessageSquareText,
  Play,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Upload,
  X
} from "lucide-react";
import { HeptaCoreWordmark } from "./heptacore-mark";
import type { QueueItem, TurpialConsoleData } from "../lib/turpial";

type View = "overview" | "queue" | "pending" | "drafts" | "assets" | "calendar" | "strategy" | "intake" | "bot";

function assetUrl(path?: string) {
  if (!path) return "";
  return `/assets/${path.replace(/^content\/inbox\//, "")}`;
}

function channelLabel(item: QueueItem) {
  return `${item.channel} / ${item.format}`;
}

export function TurpialConsole({ data }: { data: TurpialConsoleData }) {
  const [view, setView] = useState<View>("overview");
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState(
    data.queue.find((item) => item.status !== "published")?.id ?? data.queue[0]?.id
  );

  const queue = useMemo(
    () => data.queue.map((item) => ({ ...item, status: statuses[item.id] ?? item.status })),
    [data.queue, statuses]
  );
  const selected = queue.find((item) => item.id === selectedId) ?? queue[0];
  const pendingReview = queue.filter((item) => item.status !== "published" && (item.requiresHumanReview || item.riskLevel !== "low"));
  const drafts = queue.filter((item) => item.status === "draft");
  const scheduled = queue.filter((item) => item.status !== "published").sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  const readyNow = scheduled.slice(0, 5);
  const marketplaceItems = queue.filter((item) => item.pilar.includes("marketplace") || item.pilar.includes("vendedores"));
  const assetRows = Array.from(
    queue.reduce((assets, item) => {
      if (!item.selectedAssetPath) return assets;
      const current = assets.get(item.selectedAssetPath) ?? [];
      current.push(item);
      assets.set(item.selectedAssetPath, current);
      return assets;
    }, new Map<string, QueueItem[]>())
  );
  const scheduleRows = Array.from(
    scheduled.reduce((dates, item) => {
      const current = dates.get(item.scheduledFor) ?? [];
      current.push(item);
      dates.set(item.scheduledFor, current);
      return dates;
    }, new Map<string, QueueItem[]>())
  );

  function openQueueView(nextView: View, items: QueueItem[]) {
    setSelectedId(items[0]?.id ?? selectedId);
    setView(nextView);
  }

  function updateStatus(id: string, status: string) {
    setStatuses((current) => ({ ...current, [id]: status }));
  }

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <HeptaCoreWordmark />
        </div>
        <div className="tenant-switcher">
          <span>Workspace</span>
          <strong>{data.tenant.name}</strong>
          <small>{data.tenant.primaryNetworks.join(" + ")} / {data.tenant.mode}</small>
        </div>
        <nav className="app-nav" aria-label="HeptaCore">
          <NavButton icon={<Gauge size={17} />} active={view === "overview"} onClick={() => setView("overview")}>Operaciones</NavButton>
          <NavButton icon={<ClipboardList size={17} />} active={view === "queue"} onClick={() => setView("queue")}>Aprobaciones</NavButton>
          <NavButton icon={<BarChart3 size={17} />} active={view === "strategy"} onClick={() => setView("strategy")}>Estrategia</NavButton>
          <NavButton icon={<Settings2 size={17} />} active={view === "intake"} onClick={() => setView("intake")}>Parametros</NavButton>
          <NavButton icon={<Bot size={17} />} active={view === "bot"} onClick={() => setView("bot")}>Bot</NavButton>
        </nav>
        <div className="guardrail-box">
          <ShieldCheck size={17} />
          <span>Dry-run local. Publicar, responder, gastar o scrapear exige aprobacion humana y credenciales OAuth reales.</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <span className="section-label">Tenant activo / Turpial</span>
            <h1>Control de RRSS y aprobaciones</h1>
          </div>
          <div className="header-actions">
            <button className="tool-button"><Search size={16} /> Buscar</button>
            <button className="tool-button"><Upload size={16} /> Insumos</button>
            <button className="primary-action" onClick={() => setView("queue")}><Check size={16} /> Aprobar cola</button>
          </div>
        </header>

        <section className="status-strip">
          <Status label="Publicaciones" value={data.metrics.total} note="cola importada" onClick={() => openQueueView("queue", scheduled)} />
          <Status label="Pendientes" value={pendingReview.length} note="requieren criterio" tone="warn" onClick={() => openQueueView("pending", pendingReview)} />
          <Status label="Drafts" value={data.metrics.drafts} note="listos para revision" onClick={() => openQueueView("drafts", drafts)} />
          <Status label="Assets" value="46/46" note="sin faltantes" tone="ok" onClick={() => setView("assets")} />
          <Status label="Proximo" value={data.metrics.nextDate.slice(5)} note="primer hito" onClick={() => setView("calendar")} />
        </section>

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
                    <Risk item={item} />
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </section>

            <section className="work-panel selected-preview">
              <PanelTitle icon={<ImageIcon size={17} />} title="Preview del siguiente post" />
              {selected && <PostPreview item={selected} updateStatus={updateStatus} />}
            </section>

            <section className="work-panel">
              <PanelTitle icon={<Bot size={17} />} title="Estado del bot" />
              <div className="bot-state">
                <span className="pulse-dot" />
                <strong>Estrategia generada</strong>
                <p>IG y FB corren primero. TikTok/YouTube quedan como expansion cuando exista cadencia de video suficiente.</p>
                <button className="tool-button" onClick={() => setView("bot")}><Play size={16} /> Ver agente</button>
              </div>
            </section>

            <section className="work-panel">
              <PanelTitle icon={<AlertTriangle size={17} />} title="Bloqueos reales" />
              <ul className="dense-list">
                {data.strategy.blockers.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          </div>
        )}

        {view === "queue" && selected && (
          <div className="queue-workspace" id="approval-queue">
            <section className="work-panel queue-column">
              <PanelTitle icon={<ClipboardList size={17} />} title="Cola de publicaciones" />
              <div className="queue-scroll">
                {scheduled.map((item) => (
                  <button key={item.id} className={item.id === selected.id ? "queue-card active" : "queue-card"} onClick={() => setSelectedId(item.id)}>
                    <Thumb item={item} />
                    <span>
                      <small>{channelLabel(item)} / {item.scheduledFor}</small>
                      <strong>{item.title}</strong>
                      <em>{item.status}</em>
                    </span>
                    <Risk item={item} />
                  </button>
                ))}
              </div>
            </section>
            <section className="work-panel detail-column">
              <PostPreview item={selected} updateStatus={updateStatus} expanded />
            </section>
          </div>
        )}

        {view === "pending" && selected && (
          <QueueReviewView
            title="Pendientes con criterio humano"
            items={pendingReview}
            selected={selected}
            setSelectedId={setSelectedId}
            updateStatus={updateStatus}
          />
        )}

        {view === "drafts" && selected && (
          <QueueReviewView
            title="Drafts listos para revision"
            items={drafts}
            selected={selected}
            setSelectedId={setSelectedId}
            updateStatus={updateStatus}
          />
        )}

        {view === "assets" && (
          <div className="asset-workspace">
            <section className="work-panel span-2">
              <PanelTitle icon={<ImageIcon size={17} />} title="Assets Turpial vinculados a la cola" />
              <div className="asset-summary">
                <span><strong>46/46</strong><small>inventario base presente</small></span>
                <span><strong>{assetRows.length}</strong><small>assets usados por publicaciones</small></span>
                <span><strong>{data.metrics.missingAssets}</strong><small>bloqueos por archivo faltante</small></span>
              </div>
            </section>
            <section className="work-panel span-2">
              <div className="asset-grid">
                {assetRows.map(([path, items]) => (
                  <button key={path} className="asset-card" onClick={() => { setSelectedId(items[0].id); setView("queue"); }}>
                    <Thumb item={items[0]} />
                    <span>
                      <strong>{path.split("/").at(-1)}</strong>
                      <small>{items.length} publicacion(es) dependen de este asset</small>
                      <em>{items.map((item) => item.scheduledFor).sort()[0]}</em>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </section>
            <section className="work-panel">
              <PanelTitle icon={<Upload size={17} />} title="Carga y generacion IA" />
              <p className="muted-note">MVP pendiente: uploader persistente, specs por formato, prompt IA y registro en Asset DB. Los assets se sirven desde public/assets/.</p>
            </section>
            <section className="work-panel">
              <PanelTitle icon={<AlertTriangle size={17} />} title="Criterio de bloqueo" />
              <ul className="dense-list">
                <li>Critico: asset faltante en una publicacion de los proximos 7 dias.</li>
                <li>Opcional: asset futuro no vinculado a un hito aprobado.</li>
                <li>Generacion IA: permitida solo como propuesta, no publica sin revision humana.</li>
              </ul>
            </section>
          </div>
        )}

        {view === "calendar" && (
          <div className="calendar-workspace">
            <section className="work-panel span-2">
              <PanelTitle icon={<CalendarClock size={17} />} title="Calendario y proximo hito" />
              <div className="calendar-list">
                {scheduleRows.map(([date, items]) => (
                  <button key={date} className="calendar-row" onClick={() => { setSelectedId(items[0].id); setView("queue"); }}>
                    <strong>{date}</strong>
                    <span>{items.length} publicacion(es)</span>
                    <small>{items.filter((item) => item.requiresHumanReview || item.riskLevel !== "low").length} requieren criterio</small>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {view === "strategy" && (
          <div className="strategy-grid">
            <section className="work-panel">
              <PanelTitle icon={<BarChart3 size={17} />} title="Replanteo comercial" />
              <dl className="strategy-defs">
                <dt>Oferta</dt><dd>{data.strategy.offer}</dd>
                <dt>Audiencia</dt><dd>{data.strategy.audience}</dd>
                <dt>Promesa operativa</dt><dd>{data.strategy.promise}</dd>
              </dl>
            </section>
            <section className="work-panel">
              <PanelTitle icon={<CalendarClock size={17} />} title="Prioridad por canal" />
              <ol className="priority-stack">
                {data.strategy.priorities.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </section>
            <section className="work-panel span-2">
              <PanelTitle icon={<FileText size={17} />} title="Marketplace dentro de la estrategia" />
              <div className="market-grid">
                {marketplaceItems.slice(0, 4).map((item) => (
                  <button key={item.id} className="market-card" onClick={() => { setSelectedId(item.id); setView("queue"); }}>
                    <Thumb item={item} />
                    <strong>{item.title}</strong>
                    <small>{item.pilar}</small>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {view === "intake" && (
          <div className="intake-grid">
            <section className="work-panel">
              <PanelTitle icon={<Settings2 size={17} />} title="Parametros del proyecto" />
              <label>Oferta base<textarea defaultValue={data.strategy.offer} /></label>
              <label>Audiencia<textarea defaultValue={data.strategy.audience} /></label>
              <label>Conversion principal<input defaultValue={data.tenant.conversion} /></label>
              <label>Redes prioritarias<input defaultValue={data.tenant.primaryNetworks.join(", ")} /></label>
            </section>
            <section className="work-panel">
              <PanelTitle icon={<CheckCircle2 size={17} />} title="Minimos para publicar" />
              <ul className="check-list">
                {data.strategy.minimums.map((item) => <li key={item}><CheckCircle2 size={16} /> {item}</li>)}
              </ul>
            </section>
          </div>
        )}

        {view === "bot" && (
          <div className="bot-grid">
            <section className="work-panel">
              <PanelTitle icon={<Bot size={17} />} title="Agente estratega" />
              <div className="agent-output">
                <strong>Ultima corrida local</strong>
                <p>El bot genero estrategia, prioridades, minimos, bloqueos y cola operativa desde la documentacion y assets Turpial.</p>
                <button className="primary-action"><Play size={16} /> Ejecutar dry-run</button>
              </div>
            </section>
            <section className="work-panel">
              <PanelTitle icon={<MessageSquareText size={17} />} title="Respuesta comunitaria" />
              <ul className="dense-list">
                <li>Precio o reserva: responder con rango y mover a WhatsApp.</li>
                <li>Pagos, reclamos o disputas: escalar a humano.</li>
                <li>Interes por marketplace: explicar operacion protegida y link de publicacion.</li>
              </ul>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function NavButton({ active, icon, children, onClick }: { active: boolean; icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return <button className={active ? "active" : ""} onClick={onClick}>{icon}{children}</button>;
}

function Status({ label, value, note, tone, onClick }: { label: string; value: string | number; note: string; tone?: "ok" | "warn"; onClick?: () => void }) {
  return (
    <button className={`status-card ${tone ? `status-${tone}` : ""}`} onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </button>
  );
}

function QueueReviewView({
  title,
  items,
  selected,
  setSelectedId,
  updateStatus
}: {
  title: string;
  items: QueueItem[];
  selected: QueueItem;
  setSelectedId: (id: string) => void;
  updateStatus: (id: string, status: string) => void;
}) {
  return (
    <div className="queue-workspace">
      <section className="work-panel queue-column">
        <PanelTitle icon={<ClipboardList size={17} />} title={title} />
        <div className="queue-scroll">
          {items.map((item) => (
            <button key={item.id} className={item.id === selected.id ? "queue-card active" : "queue-card"} onClick={() => setSelectedId(item.id)}>
              <Thumb item={item} />
              <span>
                <small>{channelLabel(item)} / {item.scheduledFor}</small>
                <strong>{item.title}</strong>
                <em>{item.requiresHumanReview ? "criterio humano" : item.status}</em>
              </span>
              <Risk item={item} />
            </button>
          ))}
        </div>
      </section>
      <section className="work-panel detail-column">
        <PostPreview item={items.find((item) => item.id === selected.id) ?? items[0] ?? selected} updateStatus={updateStatus} expanded />
      </section>
    </div>
  );
}

function PanelTitle({ icon, title, action, onAction }: { icon: ReactNode; title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="panel-title">
      <span>{icon}{title}</span>
      {action && <button onClick={onAction}>{action}</button>}
    </div>
  );
}

function Thumb({ item }: { item: QueueItem }) {
  const src = assetUrl(item.selectedAssetPath);
  if (!src) {
    return <span className="thumb fallback"><ImageIcon size={17} /></span>;
  }

  if (item.selectedAssetPath?.endsWith(".mp4")) {
    return <video className="thumb thumb-video" src={src} muted playsInline preload="metadata" />;
  }

  return <img className="thumb" src={src} alt="" />;
}

function Risk({ item }: { item: QueueItem }) {
  return (
    <span className={`risk risk-${item.riskLevel}`}>
      <Circle size={8} fill="currentColor" /> {item.riskLevel}
    </span>
  );
}

function PostPreview({ item, updateStatus, expanded = false }: { item: QueueItem; updateStatus: (id: string, status: string) => void; expanded?: boolean }) {
  const isVideo = item.selectedAssetPath?.endsWith(".mp4");
  const frameClass = getPlatformFrameClass(item);

  return (
    <div className={expanded ? "post-preview expanded" : "post-preview"}>
      <div className="post-preview-head">
        <div>
          <span className="section-label">{channelLabel(item)}</span>
          <h2>{item.title}</h2>
        </div>
        <Risk item={item} />
      </div>

      <div className={`platform-preview ${frameClass}`}>
        <div className="platform-chrome">
          <span>{item.channel === "instagram" ? "Instagram" : "Facebook"}</span>
          <strong>{item.format}</strong>
        </div>
        <div className="platform-media">
          {isVideo ? (
            <video src={assetUrl(item.selectedAssetPath)} controls />
          ) : (
            <img src={assetUrl(item.selectedAssetPath)} alt={item.title} />
          )}
        </div>
        <div className="platform-caption">
          <strong>Turpial Sound</strong>
          <span>{item.caption}</span>
        </div>
      </div>

      <div className="post-fields">
        <span><Clock3 size={14} /> {item.scheduledFor}</span>
        <span><Send size={14} /> {item.cta}</span>
        <span><LockKeyhole size={14} /> {item.requiresHumanReview ? "requiere revision" : "bajo riesgo"}</span>
      </div>
      <p className="caption-box">{item.caption}</p>
      <div className="tag-row">{item.hashtags.slice(0, expanded ? 8 : 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
      <div className="approval-actions">
        <button className="approve" onClick={() => updateStatus(item.id, "approved")}><Check size={16} /> Aprobar</button>
        <button onClick={() => updateStatus(item.id, "needs_review")}><AlertTriangle size={16} /> Ajustar</button>
        <button onClick={() => updateStatus(item.id, "rejected")}><X size={16} /> Rechazar</button>
      </div>
    </div>
  );
}

function getPlatformFrameClass(item: QueueItem) {
  if (item.channel === "instagram" && (item.format === "story" || item.format === "reel")) {
    return "frame-ig-vertical";
  }

  if (item.channel === "instagram" && item.format === "feed") {
    return "frame-ig-square";
  }

  if (item.channel === "instagram" && item.format === "carousel") {
    return "frame-ig-portrait";
  }

  return "frame-facebook";
}
