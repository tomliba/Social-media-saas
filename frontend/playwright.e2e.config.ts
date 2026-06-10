import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Live end-to-end config: drives the create-video flow against the deployed app
// using a pre-minted Auth.js session (see e2e/global-setup.ts). Kept separate
// from the local playwright.config.ts (which targets localhost/./tests).
//
// Test secrets/config come from the gitignored .env.test (AUTH_SECRET, etc.).
loadEnv({ path: ".env.test" });

const BASE_URL =
  process.env.E2E_BASE_URL || "https://social-media-saas-9xq4.vercel.app";

export default defineConfig({
  testDir: "./e2e",
  // Mint the Auth.js session once, before any test, into storageState.
  globalSetup: "./e2e/global-setup.ts",
  timeout: 720_000, // a full smart_mix render (script→TTS→clips→Remotion→upload) can take several minutes
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-e2e" }]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 900 },
    storageState: "e2e/.auth/state.json",
    actionTimeout: 20_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
