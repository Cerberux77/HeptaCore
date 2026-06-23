"use client";

const ROLE_COLORS: Record<string, string> = {
  OWNER: "#8a1d1d",
  ADMIN: "#0b756f",
  TENANT_ADMIN: "#2b2b2b",
  STRATEGIST: "#0b756f",
  EDITOR: "#2b2b2b",
  APPROVER: "#8a5f00",
  PUBLISHER: "#0b756f",
  ANALYST: "#8e8e93",
  VIEWER: "#8e8e93",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  TENANT_ADMIN: "Tenant Admin",
  STRATEGIST: "Strategist",
  EDITOR: "Editor",
  APPROVER: "Approver",
  PUBLISHER: "Publisher",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
};

export function RoleBadge({ role, size }: { role: string; size?: "sm" | "md" }) {
  const color = ROLE_COLORS[role] ?? "#8e8e93";
  const label = ROLE_LABELS[role] ?? role;
  const scale = size === "sm" ? 0.85 : 1;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: `${2 * scale}px ${7 * scale}px`,
        borderRadius: 10,
        fontSize: `${11 * scale}px`,
        fontWeight: 600,
        background: `${color}18`,
        color,
        lineHeight: `${18 * scale}px`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
