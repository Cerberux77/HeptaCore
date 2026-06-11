"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Error al restablecer contrasena.");
      return;
    }

    setDone(true);
  }

  if (!token) {
    return (
      <div className="login-card">
        <h1 className="login-title">HeptaCore</h1>
        <p className="login-error">Token de recuperacion invalido o ausente.</p>
        <div className="login-links">
          <Link href="/login" className="login-link">Volver al inicio de sesion</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-card">
      <h1 className="login-title">HeptaCore</h1>
      <p className="login-subtitle">Nueva contrasena</p>

      {!done ? (
        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label">
            Nueva contrasena
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              minLength={8}
              className="login-input"
              placeholder="Minimo 8 caracteres"
              autoComplete="new-password"
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={loading} className="login-button">
            {loading ? "Guardando..." : "Restablecer contrasena"}
          </button>
        </form>
      ) : (
        <div style={{ padding: 16, textAlign: "center" }}>
          <p style={{ color: "var(--hc-teal)", fontSize: 14, marginBottom: 8 }}>
            Contrasena restablecida correctamente.
          </p>
          <Link href="/login" className="login-button" style={{ display: "inline-block", textDecoration: "none", padding: "10px 24px" }}>
            Iniciar sesion
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="login-shell">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
