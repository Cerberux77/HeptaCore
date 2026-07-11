import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANONICAL_MEMBERSHIP_ROLES,
  hydrateAuthTokenClaims,
} from "../auth-token-claims";

describe("hydrateAuthTokenClaims", () => {
  it("keeps SUPER_ADMIN login alive without valid memberships", async () => {
    const token = { id: "u1", platformRole: null, memberships: [], tenantId: null, role: null };
    const result = await hydrateAuthTokenClaims(token, {
      user: {
        findUnique: async () => ({ platformRole: "SUPER_ADMIN" }),
      },
      membership: {
        findMany: async () => [],
      },
    });

    assert.equal(result.platformRole, "SUPER_ADMIN");
    assert.deepEqual(result.memberships, []);
    assert.equal(result.tenantId, null);
    assert.equal(result.role, null);
  });

  it("queries memberships using only canonical runtime roles", async () => {
    const token = { id: "u1", platformRole: null, memberships: [], tenantId: null, role: null };
    let receivedRoles: string[] = [];

    const result = await hydrateAuthTokenClaims(token, {
      user: {
        findUnique: async () => ({ platformRole: null }),
      },
      membership: {
        findMany: async (args) => {
          receivedRoles = [...args.where.role.in];
          return [{ tenantId: "tenant-1", role: "TENANT_ADMIN" }];
        },
      },
    });

    assert.deepEqual(receivedRoles, [...CANONICAL_MEMBERSHIP_ROLES]);
    assert.deepEqual(result.memberships, [{ tenantId: "tenant-1", role: "TENANT_ADMIN" }]);
    assert.equal(result.role, "TENANT_ADMIN");
  });

  it("falls back to empty memberships when legacy data breaks a SUPER_ADMIN lookup", async () => {
    const token = { id: "u1", platformRole: null, memberships: [], tenantId: null, role: null };

    const result = await hydrateAuthTokenClaims(token, {
      user: {
        findUnique: async () => ({ platformRole: "SUPER_ADMIN" }),
      },
      membership: {
        findMany: async () => {
          throw new Error("legacy membership decode failed");
        },
      },
    });

    assert.equal(result.platformRole, "SUPER_ADMIN");
    assert.deepEqual(result.memberships, []);
    assert.equal(result.tenantId, null);
    assert.equal(result.role, null);
  });

  it("does not swallow membership errors for non-superadmin users", async () => {
    const token = { id: "u1", platformRole: null, memberships: [], tenantId: null, role: null };

    await assert.rejects(
      () => hydrateAuthTokenClaims(token, {
        user: {
          findUnique: async () => ({ platformRole: null }),
        },
        membership: {
          findMany: async () => {
            throw new Error("broken query");
          },
        },
      }),
      /broken query/,
    );
  });
});
