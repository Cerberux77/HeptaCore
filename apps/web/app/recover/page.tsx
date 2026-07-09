"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function RecoverPage() {
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState(false);
  const [debugResetLink, setDebugResetLink] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setDebugResetLink(null);
    setLoading(true);

    const res = await fetch("/api/auth/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Error al enviar recuperacion.");
      return;
    }

    setDebugResetLink(typeof data.debugResetLink === "string" ? data.debugResetLink : null);
    setSent(true);
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1 className="login-title">HeptaCore</h1>
        <p className="login-subtitle">Recuperar contrasena</p>

        {!sent ? (
          <form onSubmit={handleSubmit} className="login-form">
            <label className="login-label">
              Identificador registrado
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoFocus
                className="login-input"
                placeholder="jean o usuario@ejemplo.com"
                autoComplete="username"
              />
            </label>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" disabled={loading} className="login-button">
              {loading ? "Enviando..." : "Enviar link de recuperacion"}
            </button>
            <div className="login-links">
              <Link href="/login" className="login-link">Volver al inicio de sesion</Link>
            </div>
          </form>
        ) : (
          <div style={{ padding: 16, textAlign: "center" }}>
            <p style={{ color: "var(--hc-teal)", fontSize: 14, marginBottom: 8 }}>
              Si el identificador esta registrado, se genero una solicitud de recuperacion.
            </p>
            {debugResetLink ? (
              <p style={{ fontSize: 14, marginTop: 12, wordBreak: "break-all" }}>
                Link de preview: <a href={debugResetLink}>{debugResetLink}</a>
              </p>
            ) : null}
            <div className="login-links" style={{ marginTop: 16 }}>
              <Link href="/login" className="login-link">Volver al inicio de sesion</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
