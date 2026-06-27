import { defineConfig, devices } from "@playwright/test";

// Minimal config for the signup-hardening suite. No globalSetup / storageState
// (unlike playwright.e2e.config.ts, which mints a session against the deployed
// app). Target is set via BASE_URL; DB assertions read DATABASE_URL — both must
// point at the local server + the EMPTY Neon project.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "signup-hardening.spec.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1, // absorb dev-server navigation jitter; real failures fail twice
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL,
    headless: true,
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
