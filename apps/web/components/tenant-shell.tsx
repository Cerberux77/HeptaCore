"use client";

import { AdminIdentityPanel } from "./admin-identity-panel";

export function TenantShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "6px 12px",
        borderBottom: "1px solid var(--hc-line)",
        background: "var(--hc-panel)",
        width: "100%",
        boxSizing: "border-box",
      }}>
        <AdminIdentityPanel variant="tenant" />
      </div>
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
