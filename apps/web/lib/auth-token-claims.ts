import type { UserRole } from "@prisma/client";

export type MembershipClaim = {
  tenantId: string;
  role: UserRole;
};

export function membershipClaims(memberships: MembershipClaim[]) {
  return {
    memberships,
    tenantId: memberships[0]?.tenantId ?? null,
    role: memberships[0]?.role ?? null,
  };
}

export function applyMembershipClaims<T extends { memberships?: MembershipClaim[]; tenantId?: string | null; role?: UserRole | null }>(
  token: T,
  memberships: MembershipClaim[],
): T {
  const claims = membershipClaims(memberships);
  token.memberships = claims.memberships;
  token.tenantId = claims.tenantId;
  token.role = claims.role;
  return token;
}
