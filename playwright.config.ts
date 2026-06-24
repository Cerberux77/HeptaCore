import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://heptacore-b36fcpgcw-bkgs-projects-829c67c1.vercel.app";
const PASSWORD = process.env.HEPTACORE_QA_E2E_PASSWORD || "qa-e2e-pwd-" + Math.random().toString(36).slice(2, 10);

export default defineConfig({
  testDir: "./e2e",
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
