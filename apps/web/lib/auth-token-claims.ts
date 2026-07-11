import type { PlatformRole, UserRole } from "@prisma/client";

export type MembershipClaim = {
  tenantId: string;
  role: UserRole;
};

export const CANONICAL_MEMBERSHIP_ROLES = ["TENANT_ADMIN", "PUBLISHER"] as const satisfies readonly UserRole[];

type AuthClaimsToken = {
  id?: string | null;
  platformRole?: PlatformRole | null;
  memberships?: MembershipClaim[];
  tenantId?: string | null;
  role?: UserRole | null;
};

type AuthClaimsDb = {
  user: {
    findUnique(args: {
      where: { id: string };
      select: { platformRole: true };
    }): Promise<{ platformRole: PlatformRole | null } | null>;
  };
  membership: {
    findMany(args: {
      where: { userId: string; role: { in: UserRole[] } };
      orderBy: { createdAt: "asc" };
      select: { tenantId: true; role: true };
    }): Promise<MembershipClaim[]>;
  };
};

type AuthDiagnosticLogger = (event: string, payload: Record<string, unknown>) => void;

export function membershipClaims(memberships: MembershipClaim[], platformRole: PlatformRole | null = null) {
  return {
    platformRole,
    memberships,
    tenantId: memberships[0]?.tenantId ?? null,
    role: memberships[0]?.role ?? null,
  };
}

export function applyMembershipClaims<T extends {
  platformRole?: PlatformRole | null;
  memberships?: MembershipClaim[];
  tenantId?: string | null;
  role?: UserRole | null;
}>(
  token: T,
  memberships: MembershipClaim[],
  platformRole: PlatformRole | null = null,
): T {
  const claims = membershipClaims(memberships, platformRole);
  token.platformRole = claims.platformRole;
  token.memberships = claims.memberships;
  token.tenantId = claims.tenantId;
  token.role = claims.role;
  return token;
}

export async function hydrateAuthTokenClaims<T extends AuthClaimsToken>(
  token: T,
  db: AuthClaimsDb,
  logDiagnostic?: AuthDiagnosticLogger,
): Promise<T> {
  if (!token.id) return token;

  const userId = token.id;
  const authUser = await db.user.findUnique({
    where: { id: userId },
    select: { platformRole: true },
  });

  logDiagnostic?.("platform user lookup", {
    userId,
    userFound: Boolean(authUser),
    platformRole: authUser?.platformRole ?? null,
  });

  try {
    const memberships = await db.membership.findMany({
      where: {
        userId,
        role: { in: [...CANONICAL_MEMBERSHIP_ROLES] },
      },
      orderBy: { createdAt: "asc" },
      select: { tenantId: true, role: true },
    });

    logDiagnostic?.("membership lookup", {
      userId,
      membershipCount: memberships.length,
      platformRole: authUser?.platformRole ?? null,
    });

    return applyMembershipClaims(token, memberships, authUser?.platformRole ?? null);
  } catch (error) {
    if (authUser?.platformRole === "SUPER_ADMIN") {
      logDiagnostic?.("platform superadmin fallback", {
        userId,
        platformRole: authUser.platformRole,
        membershipCount: 0,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });

      return applyMembershipClaims(token, [], authUser.platformRole);
    }

    throw error;
  }
}
