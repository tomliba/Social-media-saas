import { defineConfig, devices } from "@playwright/test";

// Local-only config for the CostBadge input-step regression. Targets the local
// dev server (npm run dev on :3000) with a session cookie minted from .env.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /qa-costbadge-input\.spec\.ts/,
  globalSetup: "./e2e/costbadge-input.local-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    viewport: { width: 1280, height: 900 },
    storageState: "e2e/.auth/costbadge-local-state.json",
    actionTimeout: 15_000,
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
