import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL;
const PASSWORD = process.env.HEPTACORE_QA_E2E_PASSWORD;

if (!BASE_URL) {
  throw new Error("PLAYWRIGHT_BASE_URL environment variable is required");
}
if (!PASSWORD) {
  throw new Error("HEPTACORE_QA_E2E_PASSWORD environment variable is required");
}

export default defineConfig({
  testDir: "./e2e",
  globalTimeout: 720000,
  timeout: 60000,
  expect: { timeout: 10000 },
  retries: 1,
  maxFailures: 3,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "e2e/results.json" }]],
  use: {
    baseURL: BASE_URL,
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    headless: true,
  },
});
