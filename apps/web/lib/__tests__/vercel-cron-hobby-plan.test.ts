import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("Vercel Hobby hourly publisher architecture", () => {
  const vercelPath = resolve(root, "vercel.json");
  const docsPath = resolve(root, "docs/operations/vercel-hobby-hourly-publisher.md");
  const routePath = resolve(root, "apps/web/app/api/cron/publisher/route.ts");

  it("defines exactly 24 daily cron jobs covering every UTC hour", () => {
    const config = JSON.parse(readFileSync(vercelPath, "utf8"));
    assert.ok(Array.isArray(config.crons));
    assert.equal(config.crons.length, 24);

    const seenHours = new Set<number>();
    const seenSlots = new Set<string>();

    for (const cron of config.crons) {
      assert.match(cron.path, /^\/api\/cron\/publisher\?slot=\d{2}$/);
      assert.match(cron.schedule, /^0 (?:[0-9]|1[0-9]|2[0-3]) \* \* \*$/);
      assert.notEqual(cron.schedule, "0 * * * *");

      const slot = cron.path.slice(-2);
      const hour = Number(cron.schedule.split(" ")[1]);

      assert.equal(slot, String(hour).padStart(2, "0"));
      assert.equal(seenSlots.has(slot), false, `duplicate slot ${slot}`);
      assert.equal(seenHours.has(hour), false, `duplicate hour ${hour}`);

      seenSlots.add(slot);
      seenHours.add(hour);
    }

    assert.deepEqual([...seenHours].sort((a, b) => a - b), Array.from({ length: 24 }, (_, i) => i));
    assert.deepEqual([...seenSlots].sort(), Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")));
  });

  it("keeps slot observational and selects all durable work due at execution time", () => {
    const route = readFileSync(routePath, "utf8");
    assert.match(route, /scheduledFor:\s*\{\s*lte:\s*now\s*\}/);
    assert.doesNotMatch(route, /scheduledFor:\s*\{\s*(?:gte|equals):[^}]*slot/i);
    assert.doesNotMatch(route, /status:\s*["']PUBLISHED["'][^]*scheduledFor:\s*\{\s*lte:\s*now/i);
  });

  it("keeps the canonical ADR present and explicit", () => {
    assert.equal(existsSync(docsPath), true);
    const docs = readFileSync(docsPath, "utf8");
    for (const required of [
      "24 cron jobs diarios",
      "0 * * * *",
      "slot es únicamente un identificador de observabilidad",
      "scheduledFor <= now",
      "oldest-first",
      "recupera backlog",
      "invocaciones duplicadas",
      "https://vercel.com/docs/cron-jobs/usage-and-pricing",
    ]) {
      assert.ok(docs.includes(required), `ADR missing: ${required}`);
    }
  });
});
