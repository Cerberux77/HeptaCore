"use client";

import { normalizeTenantRole, getCanonicalRoleLabel } from "../lib/canonical-tenant-role";

const ROLE_COLORS: Record<string, string> = {
  OWNER: "#8a1d1d",
  ADMIN: "#0b756f",
  VIEWER: "#8e8e93",
  SUPER_ADMIN: "#0b756f",
};

export function RoleBadge({ role, size }: { role: string; size?: "sm" | "md" }) {
  const canonical = normalizeTenantRole(role as any);
  const displayRole = canonical ?? role;
  const color = canonical ? (ROLE_COLORS[canonical] ?? "#8e8e93") : (ROLE_COLORS[role] ?? "#8e8e93");
  const label = canonical ? getCanonicalRoleLabel(canonical) : role;
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
