import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { applyMembershipClaims } from "./auth-token-claims";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
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
        const authUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { platformRole: true },
        });
        const memberships = await prisma.membership.findMany({
          where: { userId: token.id },
          orderBy: { createdAt: "asc" },
          select: { tenantId: true, role: true },
        });
        applyMembershipClaims(token, memberships, authUser?.platformRole ?? null);
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
