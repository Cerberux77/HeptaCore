"use client";

const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  PROVISIONING: { bg: "rgba(11,117,111,0.12)", fg: "#0b756f", label: "Provisioning" },
  ACTIVE: { bg: "rgba(11,117,111,0.18)", fg: "#0b756f", label: "Activo" },
  SUSPENDED: { bg: "rgba(138,95,0,0.15)", fg: "#8a5f00", label: "Suspendido" },
  ARCHIVED: { bg: "rgba(138,29,29,0.10)", fg: "#8a1d1d", label: "Archivado" },
};

export function LifecycleBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { bg: "rgba(142,142,147,0.12)", fg: "#8e8e93", label: status };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        background: style.bg,
        color: style.fg,
        lineHeight: "18px",
        whiteSpace: "nowrap",
      }}
    >
      {style.label}
    </span>
  );
}
