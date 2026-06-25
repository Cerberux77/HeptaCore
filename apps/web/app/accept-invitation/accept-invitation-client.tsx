"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AcceptInvitationClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "error" | "accepting">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setError("No invitation token provided"); return; }
  }, [token]);

  const handleAccept = async () => {
    setStatus("accepting");
    const res = await fetch("/api/invitations/accept", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (data.ok && data.tenantSlug) { router.push(`/tenant/${data.tenantSlug}`); }
    else { setStatus("error"); setError(data.error || "Acceptance failed"); }
  };

  if (status === "error") return <div style={{padding:40}}><h1>Invitation Error</h1><p>{error}</p></div>;
  return (
    <div style={{ padding: 40, maxWidth: 480, margin: "0 auto" }}>
      <h1>Accept Invitation</h1>
      <p>You have been invited to join a tenant on HeptaCore.</p>
      <button onClick={handleAccept} disabled={status === "accepting"}
        style={{ padding: "12px 24px", fontSize: 16, cursor: "pointer", background: "#0070f3", color: "#fff", border: "none", borderRadius: 8 }}>
        {status === "accepting" ? "Accepting..." : "Accept Invitation"}
      </button>
    </div>
  );
}
