import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routePath = join(__dirname, "..", "..", "app", "api", "auth", "recover", "route.ts");

describe("recover route reset-link guard", () => {
  it("requires explicit HEPTACORE_EXPOSE_RESET_LINKS=1 to expose resetLink", () => {
    const source = readFileSync(routePath, "utf8");
    assert.match(source, /HEPTACORE_EXPOSE_RESET_LINKS === "1"/);
    assert.match(source, /const debugResetLink = canExposeResetLinks\(\) && result\.token/);
    assert.match(source, /\.\.\.\(debugResetLink \? \{ debugResetLink \} : \{\}\)/);
  });

  it("does not allow preview alone to expose resetLink", () => {
    const source = readFileSync(routePath, "utf8");
    assert.equal(source.includes("VERCEL_ENV"), false);
  });
});
