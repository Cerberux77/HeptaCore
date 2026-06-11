"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function RegisterForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Error al registrarse.");
      return;
    }

    setDone(true);
  }

  if (!token) {
    return (
      <div className="login-card">
        <h1 className="login-title">HeptaCore</h1>
        <p className="login-subtitle">Registro por invitacion</p>
        <p className="login-error">Token de invitacion invalido o ausente. Solicita una invitacion al administrador del tenant.</p>
        <div className="login-links">
          <Link href="/login" className="login-link">Volver al inicio de sesion</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-card">
      <h1 className="login-title">HeptaCore</h1>
      <p className="login-subtitle">Completar registro</p>

      {!done ? (
        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label">
            Nombre
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="login-input"
              placeholder="Tu nombre"
              autoComplete="name"
            />
          </label>
          <label className="login-label">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="login-input"
              placeholder="usuario@ejemplo.com"
              autoComplete="email"
            />
          </label>
          <label className="login-label">
            Contrasena
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="login-input"
              placeholder="Minimo 8 caracteres"
              autoComplete="new-password"
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={loading} className="login-button">
            {loading ? "Registrando..." : "Crear cuenta"}
          </button>
          <div className="login-links">
            <Link href="/login" className="login-link">Ya tengo cuenta</Link>
          </div>
        </form>
      ) : (
        <div style={{ padding: 16, textAlign: "center" }}>
          <p style={{ color: "var(--hc-teal)", fontSize: 14, marginBottom: 8 }}>
            Cuenta creada correctamente.
          </p>
          <Link href="/login" className="login-button" style={{ display: "inline-block", textDecoration: "none", padding: "10px 24px" }}>
            Iniciar sesion
          </Link>
        </div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="login-shell">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
