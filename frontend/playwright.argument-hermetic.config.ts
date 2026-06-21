import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Hermetic regression test for the NEW original argument roster. Runs against a
// LOCAL dev server and STUBS the /api/argument/* + /api/preferences responses in
// the browser (returning the new roster), so it never hits the real Flask backend
// and makes no DB/render calls. Verifies the argument page loads with the new
// characters and the new defaults (big_dave/baby), and shows no old copyrighted names.
// Reuses the niche auth-cookie setup (no DB writes).
loadEnv({ path: ".env.test" });
loadEnv({ path: ".env", override: true });

export default defineConfig({
  testDir: "./e2e",
  testMatch: /argument-hermetic\.spec\.ts/,
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
