"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

export function EmptyState({ message, action }: { message: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--hc-fog)" }}>
      <p style={{ fontSize: 14, margin: "0 0 12px" }}>{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            fontSize: 12,
            padding: "6px 14px",
            borderRadius: 6,
            border: "1px solid var(--hc-line)",
            background: "var(--hc-panel)",
            color: "var(--hc-ink)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{ padding: "12px 16px", background: "rgba(138,29,29,0.06)", borderLeft: "3px solid var(--hc-red)", borderRadius: "0 4px 4px 0", margin: "8px 0", display: "flex", alignItems: "center", gap: 8 }}>
      <AlertCircle size={16} color="var(--hc-red)" />
      <span style={{ fontSize: 13, color: "var(--hc-red)", flex: 1 }}>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{ fontSize: 11, padding: "3px 8px", border: "1px solid var(--hc-red)", borderRadius: 4, background: "transparent", color: "var(--hc-red)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}
        >
          <RefreshCw size={12} /> Reintentar
        </button>
      )}
    </div>
  );
}
