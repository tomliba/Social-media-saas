import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Runs the CHEAP, fully-intercepted AI Carousel "charge == quote" invariant spec
// against the LOCAL dev server (which carries the clamp fix; prod won't until it
// deploys). Reuses the existing throwaway identity from .env.overnight and the
// same minted-session global-setup as the other e2e specs — no new auth.
//
// .env supplies AUTH_SECRET (the same secret `next dev` loads); .env.overnight
// supplies the throwaway E2E_USER_ID. We then pin the target at localhost and the
// HTTP (non-secure) Auth.js cookie name.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.overnight", override: true });

process.env.E2E_BASE_URL = process.env.CAROUSEL_INVARIANT_BASE_URL || "http://localhost:3001";
process.env.E2E_COOKIE_NAME = "authjs.session-token";
process.env.E2E_USER_EMAIL = process.env.E2E_USER_EMAIL || process.env.QA_EMAIL || "qa@example.com";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /qa-carousel-invariant\.spec\.ts$/,
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 900 },
    storageState: "e2e/.auth/state.json",
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
