"use client";

import { X, AlertTriangle } from "lucide-react";
import { useEffect, useRef, useId } from "react";

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
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement;
      const t = setTimeout(() => confirmRef.current?.focus(), 50);
      return () => clearTimeout(t);
    } else if (prevFocusRef.current) {
      prevFocusRef.current.focus();
      prevFocusRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (loading) {
        e.preventDefault();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled])',
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) last.focus();
          else {
            const idx = Array.from(focusable).indexOf(document.activeElement as HTMLElement);
            focusable[idx - 1]?.focus();
          }
        } else {
          if (document.activeElement === last) first.focus();
          else {
            const idx = Array.from(focusable).indexOf(document.activeElement as HTMLElement);
            focusable[idx + 1]?.focus();
          }
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="modal-layer"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <button
        className="modal-backdrop"
        onClick={loading ? undefined : onCancel}
        disabled={loading}
        aria-label="Cancelar"
      />
      <div className="modal-panel" style={{ maxWidth: 420 }}>
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={18} color={danger ? "var(--hc-red)" : "var(--hc-warn)"} />
            <h2 id={titleId} style={{ margin: 0, fontSize: 15 }}>{title}</h2>
          </div>
          <button className="icon-button" onClick={onCancel} disabled={loading} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p id={descId} style={{ fontSize: 13, color: "var(--hc-graphite)", margin: 0, lineHeight: 1.5 }}>{message}</p>
        </div>
        <div className="modal-actions">
          <button
            ref={cancelRef}
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
