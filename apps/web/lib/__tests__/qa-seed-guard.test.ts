import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("qa-seed host guard", async () => {
  const { parseDbHost, parseHostAllowlist, isHostAuthorized } = await import(
    "../../../../scripts/seed-qa-e2e.mjs"
  );

  it("parses the hostname without exposing credentials", () => {
    assert.equal(
      parseDbHost("postgres://user:secret@ep-lively-lake-aq2uvkv4-pooler.eu.aws.neon.tech/db?sslmode=require"),
      "ep-lively-lake-aq2uvkv4-pooler.eu.aws.neon.tech",
    );
  });

  it("returns null for missing or invalid URLs", () => {
    assert.equal(parseDbHost(undefined), null);
    assert.equal(parseDbHost(""), null);
    assert.equal(parseDbHost("not-a-url"), null);
  });

  it("builds an allowlist from comma-separated and single env values", () => {
    assert.deepEqual(parseHostAllowlist("Host1, host2 ,,HOST3", " expected-host "), [
      "host1",
      "host2",
      "host3",
      "expected-host",
    ]);
    assert.deepEqual(parseHostAllowlist("", ""), []);
    assert.deepEqual(parseHostAllowlist(undefined, undefined), []);
  });

  it("authorizes only hosts that match the allowlist", () => {
    const allow = parseHostAllowlist("ep-lively-lake-aq2uvkv4", "");
    // Neon full hostname contains the configured endpoint id -> authorized.
    assert.equal(isHostAuthorized("ep-lively-lake-aq2uvkv4-pooler.eu.aws.neon.tech", allow), true);
    // Exact match -> authorized.
    assert.equal(isHostAuthorized("ep-lively-lake-aq2uvkv4", allow), true);
    // Different host -> rejected.
    assert.equal(isHostAuthorized("ep-other-db-9999.eu.aws.neon.tech", allow), false);
  });

  it("never authorizes when the allowlist is empty (guard preserved)", () => {
    assert.equal(isHostAuthorized("ep-lively-lake-aq2uvkv4.neon.tech", []), false);
    assert.equal(isHostAuthorized("any-host", parseHostAllowlist("", "")), false);
  });
});
