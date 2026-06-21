"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button type="button" className="login-button secondary" onClick={() => void signOut({ redirectTo: "/login" })}>
      Cerrar sesion
    </button>
  );
}
