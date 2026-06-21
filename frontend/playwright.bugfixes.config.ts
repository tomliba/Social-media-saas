import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Hermetic regression config for the three Creator-mode bug fixes
// (e2e/qa-bugfixes.spec.ts). Mirrors the niche hermetic setup: mints an Auth.js
// cookie (no DB writes), runs against the local dev server, stubs all network in
// the spec. Run: npx playwright test --config playwright.bugfixes.config.ts
loadEnv({ path: ".env.test" });
loadEnv({ path: ".env", override: true });

export default defineConfig({
  testDir: "./e2e",
  testMatch: /qa-bugfixes\.spec\.ts/,
  globalSetup: "./e2e/niche.setup.ts",
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
    storageState: "e2e/.auth/niche-state.json",
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
