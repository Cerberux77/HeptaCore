"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError("Credenciales invalidas.");
      return;
    }

    window.location.href = callbackUrl;
  }

  return (
    <div className="login-card">
      <h1 className="login-title">HeptaCore</h1>
      <p className="login-subtitle">Iniciar sesion</p>

      <form onSubmit={handleSubmit} className="login-form">
        <label className="login-label">
          Usuario o email
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="login-input"
            placeholder="mvera"
            autoComplete="username"
          />
        </label>

        <label className="login-label">
          Contrasena
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
            placeholder="******"
            autoComplete="current-password"
          />
        </label>

        {error && <p className="login-error">{error}</p>}

        <button type="submit" disabled={loading} className="login-button">
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div className="login-links">
          <Link href="/recover" className="login-link">Olvide mi contrasena</Link>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="login-shell">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
