"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, RefreshCcw, Unplug, Video } from "lucide-react";
import { useSearchParams } from "next/navigation";

type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnect_required"
  | "revoked"
  | "error"
  | "unavailable";

type YoutubeConnectionStatus = {
  provider: "YOUTUBE";
  state: ConnectionState;
  channelTitle: string | null;
  channelId: string | null;
  handle: string | null;
  thumbnailUrl: string | null;
  connectedAt: string | null;
  expiresAt: string | null;
  scopes: string[];
};

function stateLabel(state: ConnectionState) {
  return state;
}

function stateTone(state: ConnectionState) {
  if (state === "connected") return { bg: "#e8f7ef", fg: "#0f6e3f" };
  if (state === "reconnect_required") return { bg: "#fff8e1", fg: "#8d6e00" };
  if (state === "revoked" || state === "error") return { bg: "#fff1f0", fg: "#b42318" };
  return { bg: "var(--hc-bone)", fg: "var(--hc-fog)" };
}

function fmtDate(value: string | null) {
  if (!value) return "Sin registro";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Sin registro" : parsed.toLocaleString();
}

export default function YoutubeIntegrationPanel({
  tenantSlug,
}: {
  tenantSlug: string;
}) {
  const searchParams = useSearchParams();
  const oauthStatus = searchParams.get("oauth");
  const [status, setStatus] = useState<YoutubeConnectionStatus | null>(null);
  const [fetchState, setFetchState] = useState<"loading" | "ready" | "error">("loading");
  const [busyAction, setBusyAction] = useState<"" | "disconnect">("");

  async function loadStatus() {
    setFetchState("loading");
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/oauth/youtube/status`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFetchState("error");
        return;
      }
      setStatus(data.connection as YoutubeConnectionStatus);
      setFetchState("ready");
    } catch {
      setFetchState("error");
    }
  }

  useEffect(() => {
    void loadStatus();
  }, [tenantSlug]);

  const returnTo = `/tenant/${tenantSlug}?view=integrations`;
  const canReconnect = status?.state === "connected" || status?.state === "reconnect_required" || status?.state === "revoked";
  const canDisconnect = status?.state === "connected" || status?.state === "reconnect_required" || status?.state === "revoked";
  const tone = stateTone(status?.state ?? "disconnected");

  async function handleDisconnect() {
    setBusyAction("disconnect");
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/oauth/youtube/disconnect`, {
        method: "POST",
      });
      if (res.ok) {
        await loadStatus();
      }
    } finally {
      setBusyAction("");
    }
  }

  return (
    <div className="strategy-grid">
      <section className="work-panel span-2">
        <div className="panel-title">
          <span><Video size={17} /> Integraciones</span>
        </div>
        <div style={{ padding: 14, display: "grid", gap: 14 }}>
          <div className="network-scope">
            <div>
              <span className="section-label">Configuracion</span>
              <strong>Redes sociales del tenant</strong>
              <small>Conecta YouTube con OAuth del tenant. Los tokens quedan cifrados en servidor y no se exponen al navegador.</small>
            </div>
          </div>

          {oauthStatus === "youtube_connected" && (
            <div className="status-card status-ok">
              <span>OAuth</span>
              <strong>YouTube conectado</strong>
              <small>El canal ya puede resolver su credencial tenant-scoped para PUB-07.</small>
            </div>
          )}
          {oauthStatus === "youtube_reconnected" && (
            <div className="status-card status-ok">
              <span>OAuth</span>
              <strong>YouTube reconectado</strong>
              <small>La autorizacion del tenant fue actualizada sin exponer secretos.</small>
            </div>
          )}
          {oauthStatus === "youtube_error" && (
            <div className="status-card status-warn">
              <span>OAuth</span>
              <strong>Conexion incompleta</strong>
              <small>El callback de Google no pudo completarse. Revisa permisos, estado y configuracion del redirect URI.</small>
            </div>
          )}

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <article className="network-card" style={{ border: "1px solid var(--hc-line)", padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <strong>YouTube</strong>
                  <small style={{ display: "block" }}>OAuth del tenant para VIDEO y SHORT</small>
                </div>
                <span style={{ padding: "4px 8px", borderRadius: 999, background: tone.bg, color: tone.fg, fontSize: 11, fontWeight: 700 }}>
                  {stateLabel(status?.state ?? "disconnected")}
                </span>
              </div>

              {fetchState === "loading" && (
                <p style={{ marginTop: 12, color: "var(--hc-fog)", fontSize: 12 }}>Cargando estado de conexion...</p>
              )}

              {fetchState === "error" && (
                <p style={{ marginTop: 12, color: "#b42318", fontSize: 12 }}>
                  <AlertTriangle size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  No se pudo leer el estado de YouTube.
                </p>
              )}

              {fetchState === "ready" && (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {status?.thumbnailUrl ? (
                    <img
                      src={status.thumbnailUrl}
                      alt={status.channelTitle || "YouTube channel"}
                      style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--hc-line)" }}
                    />
                  ) : null}
                  <div style={{ display: "grid", gap: 4, fontSize: 12 }}>
                    <div><strong>Canal:</strong> {status?.channelTitle || "No conectado"}</div>
                    <div><strong>Handle:</strong> {status?.handle || "Sin handle publico"}</div>
                    <div><strong>Channel ID:</strong> {status?.channelId || "Sin asignar"}</div>
                    <div><strong>Conectado:</strong> {fmtDate(status?.connectedAt ?? null)}</div>
                    <div><strong>Expira:</strong> {fmtDate(status?.expiresAt ?? null)}</div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a
                      className="primary-action"
                      href={`/api/tenants/${tenantSlug}/oauth/youtube/connect?returnTo=${encodeURIComponent(returnTo)}`}
                    >
                      <Check size={16} />
                      {status?.state === "connected" ? "Conectar de nuevo" : "Conectar YouTube"}
                    </a>
                    {canReconnect && (
                      <a
                        className="tool-button"
                        href={`/api/tenants/${tenantSlug}/oauth/youtube/reconnect?returnTo=${encodeURIComponent(returnTo)}`}
                      >
                        <RefreshCcw size={14} />
                        Reconectar
                      </a>
                    )}
                    {canDisconnect && (
                      <button className="tool-button" onClick={handleDisconnect} disabled={busyAction === "disconnect"}>
                        <Unplug size={14} />
                        {busyAction === "disconnect" ? "Desconectando..." : "Desconectar"}
                      </button>
                    )}
                  </div>

                  <small style={{ color: "var(--hc-fog)" }}>
                    Scopes: {status?.scopes?.length ? status.scopes.join(", ") : "pendientes"}
                  </small>
                </div>
              )}
            </article>

            <article className="network-card" style={{ border: "1px solid var(--hc-line)", padding: 14 }}>
              <div>
                <strong>Facebook</strong>
                <small style={{ display: "block" }}>Base Meta existente reutilizada</small>
              </div>
              <p style={{ marginTop: 12, fontSize: 12, color: "var(--hc-fog)" }}>
                El flujo Meta actual existe en el repositorio. Esta continuacion no reescribe Facebook ni Instagram.
              </p>
              <span style={{ padding: "4px 8px", borderRadius: 999, background: "var(--hc-bone)", color: "var(--hc-fog)", fontSize: 11, fontWeight: 700 }}>
                legacy
              </span>
            </article>

            <article className="network-card" style={{ border: "1px solid var(--hc-line)", padding: 14 }}>
              <div>
                <strong>Instagram</strong>
                <small style={{ display: "block" }}>Base Meta existente reutilizada</small>
              </div>
              <p style={{ marginTop: 12, fontSize: 12, color: "var(--hc-fog)" }}>
                La conectividad de Instagram sigue anclada al flujo existente. No se expone ningun secreto al navegador.
              </p>
              <span style={{ padding: "4px 8px", borderRadius: 999, background: "var(--hc-bone)", color: "var(--hc-fog)", fontSize: 11, fontWeight: 700 }}>
                legacy
              </span>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
