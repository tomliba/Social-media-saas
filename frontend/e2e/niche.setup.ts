/**
 * Global setup for the hermetic niche regression test (playwright.niche.config.ts).
 *
 * Mints the same Auth.js (NextAuth v5) JWT session cookie the app would issue
 * for the E2E user and saves it as Playwright storageState, so the spec can load
 * the auth-gated Create flows on the local dev server. The local server is http,
 * so we use the non-secure cookie name and secure:false.
 *
 * This makes NO database writes. The spec stubs /api/preferences, so the real
 * account's niche is never read or mutated. Secrets come from .env.test (loaded
 * by the config); nothing secret is logged.
 */
import { encode } from "next-auth/jwt";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SECRET = process.env.AUTH_SECRET;
const USER_ID = process.env.E2E_USER_ID || "";
const USER_EMAIL = process.env.E2E_USER_EMAIL || "";
// Local dev runs over http, where Auth.js uses the non-secure cookie name.
const COOKIE_NAME = "authjs.session-token";
const STORAGE_PATH = path.join("e2e", ".auth", "niche-state.json");

export default async function nicheSetup() {
  if (!SECRET || !USER_ID || !USER_EMAIL) {
    throw new Error(
      "niche.setup: AUTH_SECRET, E2E_USER_ID and E2E_USER_EMAIL must be set in .env.test (see e2e/README.md)."
    );
  }

  const maxAge = 24 * 60 * 60; // 1 day
  const token = { id: USER_ID, sub: USER_ID, email: USER_EMAIL, name: "Niche E2E" };
  const value = await encode({ token, secret: SECRET, salt: COOKIE_NAME, maxAge });

  const storageState = {
    cookies: [
      {
        name: COOKIE_NAME,
        value,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
        expires: Math.floor(Date.now() / 1000) + maxAge,
      },
    ],
    origins: [] as never[],
  };

  mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
  writeFileSync(STORAGE_PATH, JSON.stringify(storageState, null, 2));
}
