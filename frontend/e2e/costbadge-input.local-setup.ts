/**
 * Local global-setup for the CostBadge input-step test. Mints an Auth.js
 * session cookie using the LOCAL dev server's AUTH_SECRET (.env) and writes it
 * as Playwright storageState. Runs entirely against http://localhost:3000 — no
 * prod, no charges. The badge is client-rendered, so the session only needs to
 * pass the auth middleware; the user row is never touched.
 */
import { encode } from "next-auth/jwt";
import { config as loadEnv } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

loadEnv({ path: ".env" });

const COOKIE_NAME = "authjs.session-token"; // HTTP local dev (no __Secure- prefix)
const STORAGE_PATH = path.join("e2e", ".auth", "costbadge-local-state.json");

export default async function globalSetup() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET missing from .env");

  const maxAge = 30 * 24 * 60 * 60;
  const value = await encode({
    token: { id: "costbadge-test", sub: "costbadge-test", email: "badge@test.local", name: "Badge Test" },
    secret,
    salt: COOKIE_NAME,
    maxAge,
  });

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
