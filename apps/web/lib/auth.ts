import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { hydrateAuthTokenClaims } from "./auth-token-claims";
import { prisma } from "./prisma";

function authDiagnosticsEnabled(): boolean {
  return process.env.HEPTACORE_AUTH_DIAGNOSTICS === "1";
}

function logAuthDiagnostic(event: string, payload: Record<string, unknown>) {
  if (!authDiagnosticsEnabled()) return;
  console.info(`[auth.credentials] ${event}`, payload);
}

function logAuthJwtDiagnostic(event: string, payload: Record<string, unknown>) {
  if (!authDiagnosticsEnabled()) return;
  console.info(`[auth.jwt] ${event}`, payload);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        logAuthDiagnostic("attempt", {
          rawIdentifierLength: String(credentials?.email ?? "").length,
          hasPasswordInput: Boolean(credentials?.password),
        });

        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        logAuthDiagnostic("normalized", {
          normalizedIdentifier: email,
        });

        const user = await prisma.user.findUnique({ where: { email } });
        logAuthDiagnostic("user lookup", {
          normalizedIdentifier: email,
          userFound: Boolean(user),
          hasPasswordHash: Boolean(user?.passwordHash),
          platformRole: user?.platformRole ?? null,
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        logAuthDiagnostic("password compare", {
          normalizedIdentifier: email,
          valid,
        });

        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
      }

      if (token.id) {
        await hydrateAuthTokenClaims(token, prisma, logAuthJwtDiagnostic);
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/") && !url.startsWith("//")) return `${baseUrl}${url}`;
      try {
        const parsed = new URL(url);
        if (parsed.origin === baseUrl) return parsed.toString();
      } catch {
        // Fall through to the deterministic app resolver.
      }
      return `${baseUrl}/app`;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.platformRole = (token.platformRole as typeof session.user.platformRole) ?? null;
        session.user.memberships = token.memberships as typeof session.user.memberships;
        session.user.tenantId = token.tenantId as string | null;
        session.user.role = token.role as typeof session.user.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
