import { describe, it } from "node:test";
import assert from "node:assert";
import { validateEvidencePath, SENSITIVE_PATTERNS } from "../lib.mjs";

describe("No Secrets in Evidence", () => {
  it("SENSITIVE_PATTERNS covers .env files", () => {
    const patterns = SENSITIVE_PATTERNS;
    assert.ok(patterns.some((p) => p.test(".env")));
    assert.ok(patterns.some((p) => p.test(".env.local")));
    assert.ok(patterns.some((p) => p.test(".env.production")));
  });

  it("SENSITIVE_PATTERNS covers credential files", () => {
    const patterns = SENSITIVE_PATTERNS;
    assert.ok(patterns.some((p) => p.test("credentials.json")));
    assert.ok(patterns.some((p) => p.test("my-credential-file.txt")));
  });

  it("SENSITIVE_PATTERNS covers token and password files", () => {
    const patterns = SENSITIVE_PATTERNS;
    assert.ok(patterns.some((p) => p.test("api-token.txt")));
    assert.ok(patterns.some((p) => p.test("password-hash.json")));
    assert.ok(patterns.some((p) => p.test("secrets.yaml")));
  });

  it("SENSITIVE_PATTERNS covers key files", () => {
    const patterns = SENSITIVE_PATTERNS;
    assert.ok(patterns.some((p) => p.test("private-key.pem")));
    assert.ok(patterns.some((p) => p.test("service-account-key.json")));
    assert.ok(patterns.some((p) => p.test("cert.pem")));
  });

  it("validateEvidencePath rejects env files", () => {
    const result = validateEvidencePath(".env");
    assert.equal(result.valid, false);
    assert.ok(result.reason.includes("sensitive"));
  });

  it("validateEvidencePath rejects token files", () => {
    const result = validateEvidencePath("config/tokens.json");
    assert.equal(result.valid, false);
    assert.ok(result.reason.includes("sensitive"));
  });

  it("validateEvidencePath rejects credential paths", () => {
    const result = validateEvidencePath("aws-credentials");
    assert.equal(result.valid, false);
    assert.ok(result.reason.includes("sensitive"));
  });
});
