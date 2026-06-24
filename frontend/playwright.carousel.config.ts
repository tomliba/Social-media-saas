import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Hermetic regression for the Part A carousel fixes (carousel-part-a.spec.ts).
// Runs against a LOCAL dev server and STUBS /api/credits/balance in the browser,
// so it never reads/writes the real ledger and clicks no paid action. Mirrors
// playwright.niche.config.ts. AUTH_SECRET must match the LOCAL dev server, which
// loads .env — so .env wins (override). E2E_USER_ID/E2E_USER_EMAIL identify the
// minted session; pass a throwaway identity inline when running.
loadEnv({ path: ".env.test" });
loadEnv({ path: ".env", override: true });

export default defineConfig({
  testDir: "./e2e",
  testMatch: /carousel-part-a\.spec\.ts/,
  globalSetup: "./e2e/niche.setup.ts", // mints a local-http session, no DB writes
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    headless: true,
    viewport: { width: 1280, height: 1000 },
    storageState: "e2e/.auth/niche-state.json",
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
