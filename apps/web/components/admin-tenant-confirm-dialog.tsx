"use client";

import { X, AlertTriangle } from "lucide-react";
import { useEffect, useRef } from "react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => confirmRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label={title}>
      <button className="modal-backdrop" onClick={onCancel} aria-label="Cancelar" />
      <div className="modal-panel" style={{ maxWidth: 420 }}>
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={18} color={danger ? "var(--hc-red)" : "var(--hc-warn)"} />
            <h2 style={{ margin: 0, fontSize: 15 }}>{title}</h2>
          </div>
          <button className="icon-button" onClick={onCancel} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: "var(--hc-graphite)", margin: 0, lineHeight: 1.5 }}>{message}</p>
        </div>
        <div className="modal-actions">
          <button
            onClick={onCancel}
            disabled={loading}
            style={{ fontSize: 12, padding: "6px 16px", borderRadius: 6, border: "1px solid var(--hc-line)", background: "var(--hc-bone)", color: "var(--hc-ink)", cursor: "pointer", fontFamily: "inherit" }}
          >
            Cancelar
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            style={{
              fontSize: 12,
              padding: "6px 16px",
              borderRadius: 6,
              border: "none",
              background: danger ? "var(--hc-red)" : "var(--hc-teal)",
              color: "#fff",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 600,
            }}
          >
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
