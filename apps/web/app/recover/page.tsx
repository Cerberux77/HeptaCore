"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Error al enviar recuperacion.");
      return;
    }

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
              Email registrado
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="login-input"
                placeholder="usuario@ejemplo.com"
                autoComplete="email"
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
              Si el email esta registrado, recibiras un link de recuperacion.
            </p>
            <div className="login-links" style={{ marginTop: 16 }}>
              <Link href="/login" className="login-link">Volver al inicio de sesion</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
