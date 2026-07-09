import type { PlatformRole, UserRole } from "@prisma/client";

export type MembershipClaim = {
  tenantId: string;
  role: UserRole;
};

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
