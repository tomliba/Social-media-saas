/**
 * Signup-abuse hardening verification suite.
 *
 * RUN AGAINST: a Vercel PREVIEW of feature/signup-abuse-hardening whose env is:
 *   - DATABASE_URL / DIRECT_URL  → an ISOLATED Neon branch (never prod)
 *   - TURNSTILE_SECRET_KEY        = 1x0000000000000000000000000000000AA  (Cloudflare "always passes" test secret)
 *   - NEXT_PUBLIC_TURNSTILE_SITE_KEY = 1x00000000000000000000AA            (test site key)
 *   - SIGNUP_HARDENING_ENABLED    = (unset → ON)   ← main run
 *   - UPSTASH_REDIS_REST_URL/TOKEN present
 *
 * Env this spec reads:
 *   BASE_URL      – the preview URL (e.g. https://social-media-saas-9xq4-xxxx.vercel.app)
 *   DATABASE_URL  – the SAME Neon branch the preview uses, so we can seed/assert
 *
 * Run:
 *   BASE_URL=<preview> DATABASE_URL=<branch-pooled> npx playwright test e2e/signup-hardening.spec.ts --config playwright.e2e.config.ts
 *
 * Notes on coverage (honest):
 *   - Google OAuth cannot be driven by Playwright (Google blocks automation). The
 *     Google-path gate is proven indirectly here (the tt_ok cookie is never issued
 *     without a valid Turnstile token; the signupOauthIp throttle fires at the
 *     /api/auth/turnstile choke point) and was source-verified (signIn runs before
 *     createUser in @auth/core). The full Google e2e is a MANUAL human step.
 *   - The "hardening OFF bypasses gating" case needs a SEPARATE preview with
 *     SIGNUP_HARDENING_ENABLED=false; that test is tagged @flag-off and skipped
 *     unless HARDENING_OFF=1 is set (point BASE_URL at the flag-off preview then).
 */
import { test, expect, request as pwRequest } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const BASE_URL = process.env.BASE_URL ?? "";

// Lazy + skip-not-throw so this file never breaks unrelated `playwright test`
// runs that glob e2e/. The whole suite skips unless BASE_URL is provided.
let prisma: PrismaClient;
test.beforeAll(() => {
  test.skip(!BASE_URL, "Set BASE_URL to the preview URL to run the signup-hardening suite");
  prisma = new PrismaClient();
});

// A passing-but-arbitrary token string. With the "always passes" test secret,
// siteverify returns success for any non-empty token. (Missing token is rejected
// before siteverify by verifyTurnstile's !token short-circuit.)
const PASS_TOKEN = "XXXX.DUMMY.TURNSTILE.PASS.XXXX";

function uniq(domain: string) {
  // Unique throwaway local-part so reruns don't collide. No Date.now() in app
  // code, but fine here in the test runner.
  return `qa_${Date.now()}_${Math.floor(Math.random() * 1e6)}@${domain}`;
}

async function signup(email: string, opts: { token?: string | null } = {}) {
  const ctx = await pwRequest.newContext({ baseURL: BASE_URL });
  const body: Record<string, string> = { email, password: "abcdefghij10" };
  if (opts.token !== null) body.turnstileToken = opts.token ?? PASS_TOKEN;
  const res = await ctx.post("/api/auth/signup", { data: body });
  const json = await res.json().catch(() => ({}));
  await ctx.dispose();
  return { status: res.status(), json };
}

async function creditBalance(email: string): Promise<number | null> {
  const u = await prisma.user.findUnique({ where: { email }, select: { creditBalance: true } });
  return u?.creditBalance ?? null;
}

async function signupGrantCount(email: string): Promise<number> {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!u) return 0;
  return prisma.creditTransaction.count({ where: { userId: u.id, type: "signup_grant" } });
}

const created: string[] = [];
test.afterAll(async () => {
  if (!prisma) return;
  // Best-effort cleanup of users this suite created (isolated branch anyway).
  for (const email of created) {
    await prisma.user.deleteMany({ where: { email } }).catch(() => {});
  }
  await prisma.$disconnect();
});

// ───────────────────────────── NEW GATING (flag ON) ─────────────────────────────
test.describe("new gating (must fire)", () => {
  test("G1 no captcha token → 403", async () => {
    const email = uniq("gmail.com");
    const { status } = await signup(email, { token: null });
    expect(status).toBe(403);
    expect(await creditBalance(email)).toBeNull(); // no user created
  });

  test("G2 disposable (mailinator) → 400", async () => {
    const email = uniq("mailinator.com");
    const { status, json } = await signup(email);
    expect(status).toBe(400);
    expect(String(json.error)).toMatch(/disposable/i);
    expect(await creditBalance(email)).toBeNull();
  });

  test("G3 gmail / outlook / icloud are NOT rejected", async () => {
    for (const domain of ["gmail.com", "outlook.com", "icloud.com"]) {
      const email = uniq(domain);
      created.push(email);
      const { status } = await signup(email);
      expect(status, `${domain} should be accepted`).toBe(200);
    }
  });

  test("G4 credits granted only AFTER email verification, not before", async () => {
    const email = uniq("gmail.com");
    created.push(email);
    const { status } = await signup(email);
    expect(status).toBe(200);
    // Pre-verification: user exists, unverified, ZERO credits, no grant row.
    const before = await prisma.user.findUnique({ where: { email } });
    expect(before, "user row should exist after signup").not.toBeNull();
    expect(before!.emailVerified).toBeNull();
    expect(before!.creditBalance).toBe(0);
    expect(await signupGrantCount(email)).toBe(0);

    // Simulate the verification + first login the way the app does: emailVerified
    // is stamped by /verify, then the credit grant fires on first authenticated
    // session (jwt callback → maybeGrantSignupCredits, gated on emailVerified).
    // We assert the GATE: with emailVerified still null, the grant must not exist.
    // (Driving the real /verify link requires the emailed token; the DB state here
    // proves the pre-verification half of the gate deterministically.)
    expect(await signupGrantCount(email)).toBe(0);
  });
});

// ─────────────────────── AUDIT-HOLE CLOSURES (one per finding) ───────────────────────
test.describe("audit-hole closures", () => {
  test("A2 [Google had no rate limit] /api/auth/turnstile throttles repeated hits from one IP", async () => {
    // signupOauthIp limiter = 5 / 60m. The 6th call from the same IP → 429.
    const ctx = await pwRequest.newContext({ baseURL: BASE_URL });
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await ctx.post("/api/auth/turnstile", { data: { token: PASS_TOKEN } });
      statuses.push(r.status());
    }
    await ctx.dispose();
    expect(statuses.filter((s) => s === 429).length, `statuses=${statuses}`).toBeGreaterThan(0);
  });

  test("A4 [no disposable blocking] mailinator rejected on the password path", async () => {
    const { status } = await signup(uniq("mailinator.com"));
    expect(status).toBe(400);
    // Google path disposable block is source-verified (signIn callback) + manual.
  });

  test("A5 [no captcha anywhere] no-token signup rejected on the password path", async () => {
    const { status } = await signup(uniq("gmail.com"), { token: null });
    expect(status).toBe(403);
  });

  test("A1 [Google instant 30 credits, no captcha] tt_ok cookie is NEVER issued without a valid token", async () => {
    // The Google gate requires a valid tt_ok cookie for new users. That cookie is
    // ONLY set by /api/auth/turnstile after a real siteverify pass. Prove a bad/no
    // token yields NO Set-Cookie, so a headless Google new-user is denied (no user,
    // no credits). Full Google e2e = manual human step.
    const ctx = await pwRequest.newContext({ baseURL: BASE_URL });
    const r = await ctx.post("/api/auth/turnstile", { data: {} }); // no token
    const setCookie = r.headers()["set-cookie"] ?? "";
    expect(r.status()).toBe(403);
    expect(setCookie).not.toMatch(/tt_ok/);
    await ctx.dispose();
  });

  // A3 [limiter fails open if Upstash unset] — with Upstash PRESENT, the password
  // signup limiter (signupIp = 5/60m) actually blocks. NOTE: this consumes the
  // limiter for the test IP for ~1h; run last.
  test("A3 [limiter fails open silently] signupIp actually blocks at the limit (Upstash present)", async () => {
    let got429 = false;
    for (let i = 0; i < 8; i++) {
      // disposable so we never create users while exhausting the limiter
      const { status } = await signup(uniq("mailinator.com"));
      if (status === 429) { got429 = true; break; }
    }
    expect(got429, "expected a 429 once the signupIp window is exhausted").toBe(true);
  });
});

// ───────────────────────────── REGRESSION (must still work) ─────────────────────────────
test.describe("regression (pre-existing behavior intact)", () => {
  test("R1 email signup with a real provider creates a user", async () => {
    const email = uniq("gmail.com");
    created.push(email);
    const { status } = await signup(email);
    expect(status).toBe(200);
    const u = await prisma.user.findUnique({ where: { email } });
    expect(u, "user row created").not.toBeNull();
    expect(u!.password, "password hash stored").toBeTruthy();
  });

  test("R4 password reset request returns generic 200 (no enumeration) and mints a token", async () => {
    // Seed a verified user, request reset, assert a reset token row appears.
    const email = uniq("gmail.com");
    created.push(email);
    await prisma.user.create({
      data: { email, password: "$2b$10$abcdefghijklmnopqrstuv", emailVerified: new Date() },
    });
    const ctx = await pwRequest.newContext({ baseURL: BASE_URL });
    const r = await ctx.post("/api/auth/request-reset", { data: { email } });
    expect(r.status()).toBe(200); // generic, no enumeration
    await ctx.dispose();
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    const tokens = await prisma.passwordResetToken.count({ where: { userId: u!.id } });
    expect(tokens).toBeGreaterThan(0);
  });

  test("R5 login page renders the Turnstile-gated Google button + password form (no CSP break)", async ({ page }) => {
    const cspErrors: string[] = [];
    page.on("console", (m) => { if (/content security policy/i.test(m.text())) cspErrors.push(m.text()); });
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
    await expect(page.getByPlaceholder(/you@example.com/i)).toBeVisible();
    // The invisible Turnstile script must load with NO CSP violation (validates
    // the connect-src/script-src/frame-src allowances).
    expect(cspErrors, `CSP violations: ${cspErrors.join("; ")}`).toHaveLength(0);
  });

  // R2 (email LOGIN succeeds) and R3 (Google login) drive full auth sessions.
  // R2 needs a user whose password hash matches a known plaintext — seed it with
  // the app's hashing in a fixture once live; R3 (Google) is the MANUAL human step.
  test.skip("R2 email login works — TODO seed bcrypt hash via app's hashPassword once preview is live", async () => {});
  test.skip("R3 Google login for an existing user — MANUAL (Google blocks automation)", async () => {});
});

// SIGNUP_HARDENING_ENABLED=off bypass — only against a flag-off preview.
test.describe("@flag-off kill-switch bypass", () => {
  test.skip(process.env.HARDENING_OFF !== "1", "set HARDENING_OFF=1 and point BASE_URL at a SIGNUP_HARDENING_ENABLED=false preview");
  test("G5 with hardening OFF, a no-captcha non-disposable signup is accepted", async () => {
    const email = uniq("gmail.com");
    created.push(email);
    const { status } = await signup(email, { token: null }); // no token, would be 403 when ON
    expect(status).toBe(200); // bypassed
  });
});
