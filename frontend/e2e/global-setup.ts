/**
 * Playwright global setup: mint a valid Auth.js (NextAuth v5) session for the
 * E2E test user and save it as Playwright storageState, so every test runs
 * pre-authenticated with no manual Google login.
 *
 * The app keeps Google-only auth in production; we do NOT add a dev-login
 * bypass. Instead we forge the same JWT session cookie the app would issue,
 * using the production AUTH_SECRET (read only from the gitignored .env.test).
 *
 * Nothing secret is logged. AUTH_SECRET lives only in .env.test.
 */
import { encode } from "next-auth/jwt";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { request as playwrightRequest } from "@playwright/test";

const BASE_URL =
  process.env.E2E_BASE_URL || "https://social-media-saas-9xq4.vercel.app";
const SECRET = process.env.AUTH_SECRET;
const USER_ID = process.env.E2E_USER_ID || "";
const USER_EMAIL = process.env.E2E_USER_EMAIL || "";
// Auth.js v5 cookie name/flags depend on transport: the secure `__Secure-` prefix
// + Secure flag on HTTPS (prod), the plain name with no Secure flag on HTTP
// (local dev). Override the name via E2E_COOKIE_NAME if needed.
const IS_HTTPS = new URL(BASE_URL).protocol === "https:";
const COOKIE_NAME =
  process.env.E2E_COOKIE_NAME ||
  (IS_HTTPS ? "__Secure-authjs.session-token" : "authjs.session-token");
const STORAGE_PATH = path.join("e2e", ".auth", "state.json");

export default async function globalSetup() {
  if (!SECRET) {
    throw new Error(
      "AUTH_SECRET is not set. Create frontend/.env.test (gitignored) with " +
        "AUTH_SECRET=<your production secret>. See e2e/README.md."
    );
  }
  if (!USER_ID || !USER_EMAIL) {
    throw new Error(
      "E2E_USER_ID and E2E_USER_EMAIL must be set in .env.test."
    );
  }

  const host = new URL(BASE_URL).hostname;
  const maxAge = 30 * 24 * 60 * 60; // 30 days

  // Same shape the app's jwt() callback produces: token.id drives session.user.id.
  const token = {
    id: USER_ID,
    sub: USER_ID,
    email: USER_EMAIL,
    name: "E2E Test",
  };

  const cookieValue = await encode({
    token,
    secret: SECRET,
    salt: COOKIE_NAME,
    maxAge,
  });

  const storageState = {
    cookies: [
      {
        name: COOKIE_NAME,
        value: cookieValue,
        domain: host,
        path: "/",
        httpOnly: true,
        secure: IS_HTTPS,
        sameSite: "Lax" as const,
        expires: Math.floor(Date.now() / 1000) + maxAge,
      },
    ],
    origins: [] as never[],
  };

  mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
  writeFileSync(STORAGE_PATH, JSON.stringify(storageState, null, 2));

  // Fail fast if the cookie doesn't actually authenticate (wrong secret/cookie
  // name) — a protected route should NOT redirect us to /login.
  const ctx = await playwrightRequest.newContext({ storageState: STORAGE_PATH });
  const res = await ctx.get(`${BASE_URL}/create`, { maxRedirects: 0 });
  await ctx.dispose();
  const status = res.status();
  const location = res.headers()["location"] || "";
  if (status >= 300 && status < 400 && location.includes("/login")) {
    throw new Error(
      `Minted session was REJECTED (redirected to login). Check AUTH_SECRET ` +
        `matches production and the cookie name (${COOKIE_NAME}). Status ${status}.`
    );
  }
  console.log(
    `[global-setup] Authenticated session for ${USER_EMAIL} written to ${STORAGE_PATH} ` +
      `(probe /create -> ${status}).`
  );
}
