import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Hermetic regression test for the user-chosen niche behavior (the modal,
// empty-niche gating, and per-flow pre-fill). It runs against a LOCAL dev
// server and STUBS /api/preferences in the browser (empty vs saved), so it
// never reads or writes the real account's niche and makes no DB changes.
// E2E_USER_* come from .env.test (gitignored). AUTH_SECRET must match the LOCAL
// dev server, which loads .env — so .env wins for AUTH_SECRET (override). The
// production secret in .env.test would be rejected by the local server.
loadEnv({ path: ".env.test" });
loadEnv({ path: ".env", override: true });

export default defineConfig({
  testDir: "./e2e",
  testMatch: /niche\.spec\.ts/,
  // Mint a local-http Auth.js session cookie before the test (no DB writes).
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
  // Boot the app locally; reuse an already-running dev server if present.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
