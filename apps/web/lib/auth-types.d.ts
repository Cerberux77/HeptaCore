import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      tenantId: string | null;
      role: UserRole | null;
      memberships: Array<{ tenantId: string; role: UserRole }>;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tenantId: string | null;
    role: UserRole | null;
    memberships: Array<{ tenantId: string; role: UserRole }>;
  }
}
