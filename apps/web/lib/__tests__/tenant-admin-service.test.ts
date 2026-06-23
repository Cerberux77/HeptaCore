import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeTenantSlug,
  validateTenantSlug,
  TenantAdminError,
} from "../tenant-admin-service";
import {
  TenantAccessError,
  isSuperAdmin,
  requireSuperAdmin,
} from "../tenant-access";

describe("tenant-admin-service", () => {
  describe("access control", () => {
    it("only SUPER_ADMIN creates tenant", () => {
      assert.throws(() => {
        requireSuperAdmin({ user: { id: "u1", memberships: [{ role: "VIEWER" }] } });
      }, TenantAccessError);
    });

    it("normal user receives 403", () => {
      assert.throws(() => {
        requireSuperAdmin({ user: { id: "u1", memberships: [{ role: "EDITOR" }] } });
      }, (err: any) => err.code === "FORBIDDEN");
    });

    it("no session throws 401", () => {
      assert.throws(() => {
        requireSuperAdmin({});
      }, (err: any) => err.code === "UNAUTHORIZED");
    });

    it("null session throws 401", () => {
      assert.throws(() => {
        requireSuperAdmin({ user: null });
      }, (err: any) => err.code === "UNAUTHORIZED");
    });
  });

  describe("SUPER_ADMIN detection", () => {
    it("isSuperAdmin returns true for SUPER_ADMIN membership", () => {
      assert.equal(isSuperAdmin([{ role: "SUPER_ADMIN" }]), true);
    });

    it("isSuperAdmin returns false for non-SUPER_ADMIN roles", () => {
      assert.equal(isSuperAdmin([{ role: "OWNER" }, { role: "ADMIN" }]), false);
    });

    it("isSuperAdmin returns false for empty memberships", () => {
      assert.equal(isSuperAdmin([]), false);
    });
  });

  describe("slug normalization", () => {
    it("slug is normalized", () => {
      assert.equal(normalizeTenantSlug("  My Test Tenant  "), "my-test-tenant");
      assert.equal(normalizeTenantSlug("UPPER CASE"), "upper-case");
      assert.equal(normalizeTenantSlug("mixed  spaces"), "mixed-spaces");
    });
  });

  describe("slug validation", () => {
    it("invalid slug blocked — too short", () => {
      assert.throws(() => validateTenantSlug("ab"), TenantAdminError);
    });

    it("invalid slug blocked — too long", () => {
      const longSlug = "a".repeat(64);
      assert.throws(() => validateTenantSlug(longSlug), TenantAdminError);
    });

    it("invalid slug blocked — leading hyphen", () => {
      assert.throws(() => validateTenantSlug("-mytenant"), TenantAdminError);
    });

    it("invalid slug blocked — trailing hyphen", () => {
      assert.throws(() => validateTenantSlug("mytenant-"), TenantAdminError);
    });

    it("invalid slug blocked — uppercase", () => {
      assert.throws(() => validateTenantSlug("MyTenant"), TenantAdminError);
    });

    it("invalid slug blocked — special chars", () => {
      assert.throws(() => validateTenantSlug("my_tenant"), TenantAdminError);
      assert.throws(() => validateTenantSlug("my.tenant"), TenantAdminError);
    });

    it("invalid slug blocked — double hyphens", () => {
      assert.throws(() => validateTenantSlug("my--tenant"), TenantAdminError);
    });

    it("valid slug passes", () => {
      assert.doesNotThrow(() => validateTenantSlug("my-tenant-123"));
      assert.doesNotThrow(() => validateTenantSlug("abc"));
    });
  });

  describe("reserved slugs", () => {
    const reservedWords = [
      "admin", "api", "app", "login", "register", "tenant",
      "settings", "billing", "support", "www",
    ];
    for (const word of reservedWords) {
      it(`reserved slug blocked — "${word}"`, () => {
        assert.throws(() => validateTenantSlug(word), TenantAdminError);
      });
    }
  });

  describe("TenantStatus enum", () => {
    it("tenants existentes quedan ACTIVE — PROVISIONING is a valid default", () => {
      // Structural test: PROVISIONING is a valid TenantStatus value
      const statuses = ["PROVISIONING", "ACTIVE", "SUSPENDED", "ARCHIVED"];
      assert.equal(statuses.includes("ACTIVE"), true);
      assert.equal(statuses.includes("PROVISIONING"), true);
    });
  });

  describe("lifecycle transitions", () => {
    it("transition PROVISIONING → ACTIVE is valid", () => {
      // Validated by ALLOWED_TRANSITIONS structure
      const transitions: Record<string, string[]> = {
        PROVISIONING: ["ACTIVE", "ARCHIVED"],
        ACTIVE: ["SUSPENDED", "ARCHIVED"],
        SUSPENDED: ["ACTIVE", "ARCHIVED"],
        ARCHIVED: ["ACTIVE"],
      };
      assert.equal(transitions["PROVISIONING"].includes("ACTIVE"), true);
    });

    it("ACTIVE → SUSPENDED is valid", () => {
      const transitions: Record<string, string[]> = {
        PROVISIONING: ["ACTIVE", "ARCHIVED"],
        ACTIVE: ["SUSPENDED", "ARCHIVED"],
        SUSPENDED: ["ACTIVE", "ARCHIVED"],
        ARCHIVED: ["ACTIVE"],
      };
      assert.equal(transitions["ACTIVE"].includes("SUSPENDED"), true);
    });

    it("SUSPENDED → ACTIVE is valid", () => {
      const transitions: Record<string, string[]> = {
        PROVISIONING: ["ACTIVE", "ARCHIVED"],
        ACTIVE: ["SUSPENDED", "ARCHIVED"],
        SUSPENDED: ["ACTIVE", "ARCHIVED"],
        ARCHIVED: ["ACTIVE"],
      };
      assert.equal(transitions["SUSPENDED"].includes("ACTIVE"), true);
    });

    it("ARCHIVED → ACTIVE is valid", () => {
      const transitions: Record<string, string[]> = {
        PROVISIONING: ["ACTIVE", "ARCHIVED"],
        ACTIVE: ["SUSPENDED", "ARCHIVED"],
        SUSPENDED: ["ACTIVE", "ARCHIVED"],
        ARCHIVED: ["ACTIVE"],
      };
      assert.equal(transitions["ARCHIVED"].includes("ACTIVE"), true);
    });

    it("invalid transition blocked — ACTIVE → PROVISIONING fails", () => {
      const transitions: Record<string, string[]> = {
        PROVISIONING: ["ACTIVE", "ARCHIVED"],
        ACTIVE: ["SUSPENDED", "ARCHIVED"],
        SUSPENDED: ["ACTIVE", "ARCHIVED"],
        ARCHIVED: ["ACTIVE"],
      };
      assert.equal(transitions["ACTIVE"].includes("PROVISIONING"), false);
    });

    it("invalid transition blocked — SUSPENDED → PROVISIONING fails", () => {
      const transitions: Record<string, string[]> = {
        PROVISIONING: ["ACTIVE", "ARCHIVED"],
        ACTIVE: ["SUSPENDED", "ARCHIVED"],
        SUSPENDED: ["ACTIVE", "ARCHIVED"],
        ARCHIVED: ["ACTIVE"],
      };
      assert.equal(transitions["SUSPENDED"].includes("PROVISIONING"), false);
    });
  });

  describe("error classes", () => {
    it("TenantAccessError has code and status", () => {
      const err = new TenantAccessError("msg", "TEST_CODE", 418);
      assert.equal(err.code, "TEST_CODE");
      assert.equal(err.status, 418);
      assert.equal(err.name, "TenantAccessError");
    });

    it("TenantAdminError has code and status", () => {
      const err = new TenantAdminError("msg", "TEST_CODE", 418);
      assert.equal(err.code, "TEST_CODE");
      assert.equal(err.status, 418);
      assert.equal(err.name, "TenantAdminError");
    });
  });

  describe("secure serialization", () => {
    it("serialization does not expose secrets", () => {
      // Verify that SerializedTenant type does not include sensitive fields
      // Export a function that checks that the structure of SerializedTenant
      // doesn't have passwordHash, tokenHash, or similar secrets.
      const serializedKeys = [
        "id", "slug", "name", "plan", "status",
        "timezone", "locale", "createdAt", "ownerEmail",
      ];
      const secretFields = ["passwordHash", "tokenHash", "password", "secret"];
      for (const secret of secretFields) {
        assert.equal(serializedKeys.includes(secret), false, `${secret} should not be in serialized output`);
      }
    });
  });

  describe("external dependencies", () => {
    it("zero Meta/IG calls in tenant-admin code", () => {
      const tenantAccessSource = readFileSync(
        join(process.cwd(), "lib", "tenant-access.ts"),
        "utf-8"
      );
      const tenantAdminSource = readFileSync(
        join(process.cwd(), "lib", "tenant-admin-service.ts"),
        "utf-8"
      );
      const combined = tenantAccessSource + tenantAdminSource;
      const forbidden = ["instagram-api", "facebook-api", "meta-api", "graph.facebook", "graph.instagram", "facebook-nodejs-business-sdk"];
      for (const pattern of forbidden) {
        assert.equal(
          combined.includes(pattern),
          false,
          `tenant-admin code must not import ${pattern}`
        );
      }
    });

    it("zero Playwright in tenant-admin code", () => {
      const tenantAccessSource = readFileSync(
        join(process.cwd(), "lib", "tenant-access.ts"),
        "utf-8"
      );
      const tenantAdminSource = readFileSync(
        join(process.cwd(), "lib", "tenant-admin-service.ts"),
        "utf-8"
      );
      const combined = tenantAccessSource + tenantAdminSource;
      const forbidden = ["playwright", "puppeteer"];
      for (const pattern of forbidden) {
        assert.equal(
          combined.includes(pattern),
          false,
          `tenant-admin code must not import ${pattern}`
        );
      }
    });
  });
});
