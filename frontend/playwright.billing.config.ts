import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Hermetic Playwright wiring guard for AI-Story billing (complements the route-
// level hermetic test in src/lib/credits/__tests__/generate-gate.test.ts, run via
// `npm run test:billing`). It runs against a LOCAL dev server and STUBS the AI-Story
// generation routes in the browser, so it NEVER charges real credits and makes NO
// writes to the real account/ledger. It asserts the browser-observable wiring only:
// Generate triggers the charge route (/api/generate-scene-images) at the first
// scene image keyed on vg_job_id, and a 402 surfaces the InsufficientCreditsDialog.
// The actual charge/idempotency/cap math is covered by test:billing.
//
// E2E_USER_* come from .env.test (gitignored); AUTH_SECRET must match the LOCAL dev
// server, which loads .env — so .env wins (override). See e2e/README.md.
loadEnv({ path: ".env.test" });
loadEnv({ path: ".env", override: true });

export default defineConfig({
  testDir: "./e2e",
  testMatch: /billing\.spec\.ts/,
  globalSetup: "./e2e/billing.setup.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    viewport: { width: 1280, height: 1000 },
    storageState: "e2e/.auth/billing-state.json",
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
