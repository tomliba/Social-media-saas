# Email/Password Auth — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public email/password accounts alongside Google (with Resend email verification + self-serve password reset) and admin-role plumbing from `ADMIN_EMAILS`, replacing the abandoned dev-login-secret approach.

**Architecture:** NextAuth v5 with a Node-side Credentials provider (bcrypt) in `auth.ts`; edge `auth.config.ts` stays Google-only. New focused libs (`password`, `tokens`, `email`, `admin`, `rate-limit`) plus route handlers for signup/verify/request-reset/reset. Tokens are random, hashed at rest, single-use, short-expiry. Upstash for rate limiting. Spec: `docs/superpowers/specs/2026-06-11-email-password-auth-phase1-design.md`.

**Tech Stack:** Next.js App Router, NextAuth v5, Prisma + Neon Postgres, `bcryptjs`, `resend`, `@upstash/ratelimit` + `@upstash/redis`, vitest.

All commands run from `frontend/`.

---

### Task 1: Dependencies + revert dev-login-secret

**Files:**
- Modify: `frontend/package.json` (via npm install)
- Modify: `frontend/src/lib/auth.config.ts`
- Modify: `frontend/src/app/login/page.tsx`

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install bcryptjs resend @upstash/ratelimit @upstash/redis
npm install -D @types/bcryptjs
```

- [ ] **Step 2: Revert the dev-login Credentials block in `auth.config.ts`**

Replace the providers array so only Google remains (remove the entire `...(process.env.NODE_ENV === "development" || process.env.DEV_LOGIN_SECRET ? [...] : [])` block and the `Credentials` import):

```ts
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Base config without Prisma adapter — safe for Edge middleware.
// The email/password Credentials provider lives in auth.ts (Node side) because
// it needs bcrypt + Prisma, which cannot run in edge middleware.
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const publicPaths = ["/", "/pricing", "/privacy", "/terms", "/login", "/signup", "/forgot-password", "/reset-password"];
      const isPublic =
        publicPaths.some((p) => pathname === p) ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/webhooks") ||
        pathname.startsWith("/api/cron") ||
        pathname.startsWith("/_next") ||
        pathname === "/verify" ||
        pathname.endsWith("/complete") ||
        pathname.endsWith("/preview-ready") ||
        pathname.includes(".");

      if (isPublic) return true;
      if (!isLoggedIn) return false;
      return true;
    },
  },
};
```

(Note: `/forgot-password`, `/reset-password`, and `/verify` are added to public paths now so the reset/verify pages are reachable when logged out.)

- [ ] **Step 3: Remove the dev-login UI block from `login/page.tsx`**

Delete the `const [devSecret, setDevSecret] = useState("");` line and the entire "Dev only" divider + email/secret/Dev Login `<div>` block (everything from the `{/* Dev Login … */}` comment through its closing `</div>`). Leave the Google button and the signup link. (Task 15 rebuilds this page with a real email/password form.)

- [ ] **Step 4: Verify build still type-checks**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/auth.config.ts src/app/login/page.tsx
git commit -m "chore(auth): revert dev-login secret; add auth deps (bcrypt, resend, upstash)"
```

---

### Task 2: Prisma schema + migration

**Files:**
- Modify: `frontend/prisma/schema.prisma`
- Create: `frontend/prisma/migrations/<timestamp>_add_password_auth/migration.sql` (generated)

- [ ] **Step 1: Add `password` to User and a `PasswordResetToken` model**

In `schema.prisma`, add `password String?` to `User` (after `image`), add the relation field, and add the new model:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  password      String?   // bcrypt hash; null for Google-only accounts
  // ...existing fields unchanged...
  preferences   UserPreferences?
  passwordResetTokens PasswordResetToken[]
}

model PasswordResetToken {
  id         String    @id @default(cuid())
  userId     String
  tokenHash  String    @unique
  expires    DateTime
  consumedAt DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

- [ ] **Step 2: Create and apply the migration to the local/dev DB**

Run: `npx prisma migrate dev --name add_password_auth`
Expected: migration created under `prisma/migrations/`, applied, and Prisma Client regenerated. (Requires `DATABASE_URL` + `DIRECT_URL` in `.env`.)

- [ ] **Step 3: Verify the client has the new fields**

Run: `npx tsc --noEmit`
Expected: exit 0 (no type changes break yet; this just confirms the client regenerated).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add User.password and PasswordResetToken (add_password_auth migration)"
```

> ⚠️ **Deploy-time:** this migration must be applied to Neon prod with `npx prisma migrate deploy` (see Task 18). The Vercel build only runs `prisma generate`.

---

### Task 3: `password.ts` (bcrypt hash/verify)

**Files:**
- Create: `frontend/src/lib/password.ts`
- Test: `frontend/src/lib/__tests__/password.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/__tests__/password.test.ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).not.toBe("correct horse battery");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/password.test.ts`
Expected: FAIL — cannot resolve `@/lib/password`.

- [ ] **Step 3: Implement**

```ts
// frontend/src/lib/password.ts
import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/password.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/password.ts src/lib/__tests__/password.test.ts
git commit -m "feat(auth): bcrypt password hashing helper"
```

---

### Task 4: `admin.ts` (role from ADMIN_EMAILS)

**Files:**
- Create: `frontend/src/lib/admin.ts`
- Test: `frontend/src/lib/__tests__/admin.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/__tests__/admin.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAdminEmail, roleForEmail } from "@/lib/admin";

const ORIG = process.env.ADMIN_EMAILS;
beforeEach(() => { process.env.ADMIN_EMAILS = "Owner@Example.com, second@x.com"; });
afterEach(() => { process.env.ADMIN_EMAILS = ORIG; });

describe("admin email allowlist", () => {
  it("matches case-insensitively and trims spaces", () => {
    expect(isAdminEmail("owner@example.com")).toBe(true);
    expect(isAdminEmail("SECOND@X.COM")).toBe(true);
  });
  it("rejects non-listed and empty", () => {
    expect(isAdminEmail("nope@x.com")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });
  it("roleForEmail maps to admin/user", () => {
    expect(roleForEmail("owner@example.com")).toBe("admin");
    expect(roleForEmail("nope@x.com")).toBe("user");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/admin.test.ts`
Expected: FAIL — cannot resolve `@/lib/admin`.

- [ ] **Step 3: Implement**

```ts
// frontend/src/lib/admin.ts
export type Role = "admin" | "user";

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export function roleForEmail(email?: string | null): Role {
  return isAdminEmail(email) ? "admin" : "user";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/admin.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin.ts src/lib/__tests__/admin.test.ts
git commit -m "feat(auth): admin role from ADMIN_EMAILS allowlist"
```

---

### Task 5: `tokens.ts` pure helpers

**Files:**
- Create: `frontend/src/lib/tokens.ts`
- Test: `frontend/src/lib/__tests__/tokens.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/__tests__/tokens.test.ts
import { describe, it, expect } from "vitest";
import { generateToken, hashToken, isExpired } from "@/lib/tokens";

describe("token helpers", () => {
  it("generateToken returns a raw token and its sha256 hash", () => {
    const { token, tokenHash } = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).toBe(hashToken(token));
    expect(tokenHash).not.toBe(token);
  });
  it("hashToken is deterministic", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });
  it("isExpired compares against now", () => {
    expect(isExpired(new Date(Date.now() - 1000))).toBe(true);
    expect(isExpired(new Date(Date.now() + 60_000))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/tokens.test.ts`
Expected: FAIL — cannot resolve `@/lib/tokens`.

- [ ] **Step 3: Implement the pure helpers**

```ts
// frontend/src/lib/tokens.ts
import { createHash, randomBytes } from "crypto";

export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const RESET_TTL_MS = 30 * 60 * 1000;       // 30m

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

export function isExpired(expires: Date): boolean {
  return expires.getTime() < Date.now();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/tokens.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tokens.ts src/lib/__tests__/tokens.test.ts
git commit -m "feat(auth): token primitives (random, sha256-at-rest, expiry)"
```

---

### Task 6: `tokens.ts` DB functions (single-use)

**Files:**
- Modify: `frontend/src/lib/tokens.ts`
- Test: `frontend/src/lib/__tests__/tokens-db.test.ts`

- [ ] **Step 1: Write the failing test (mocked Prisma)**

```ts
// frontend/src/lib/__tests__/tokens-db.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const prisma = {
  verificationToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  passwordResetToken: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ prisma }));

import {
  createVerificationToken, consumeVerificationToken,
  createPasswordResetToken, consumePasswordResetToken,
} from "@/lib/tokens";

beforeEach(() => vi.clearAllMocks());

describe("verification token", () => {
  it("creates a token row and returns the raw token", async () => {
    const raw = await createVerificationToken("a@b.com");
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    expect(prisma.verificationToken.create).toHaveBeenCalledOnce();
  });
  it("consumes a valid token once and returns the identifier", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue({
      identifier: "a@b.com", token: "x", expires: new Date(Date.now() + 1000),
    });
    const email = await consumeVerificationToken("rawtoken");
    expect(email).toBe("a@b.com");
    expect(prisma.verificationToken.delete).toHaveBeenCalledOnce(); // single-use
  });
  it("rejects an expired token (and still deletes it)", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue({
      identifier: "a@b.com", token: "x", expires: new Date(Date.now() - 1000),
    });
    expect(await consumeVerificationToken("rawtoken")).toBeNull();
    expect(prisma.verificationToken.delete).toHaveBeenCalledOnce();
  });
  it("rejects an unknown token", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue(null);
    expect(await consumeVerificationToken("rawtoken")).toBeNull();
  });
});

describe("password reset token", () => {
  it("consumes a valid token once and returns userId", async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      userId: "u1", consumedAt: null, expires: new Date(Date.now() + 1000),
    });
    expect(await consumePasswordResetToken("rawtoken")).toBe("u1");
    expect(prisma.passwordResetToken.update).toHaveBeenCalledOnce(); // marked consumed
  });
  it("rejects an already-consumed token", async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      userId: "u1", consumedAt: new Date(), expires: new Date(Date.now() + 1000),
    });
    expect(await consumePasswordResetToken("rawtoken")).toBeNull();
    expect(prisma.passwordResetToken.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/tokens-db.test.ts`
Expected: FAIL — `createVerificationToken` etc. not exported.

- [ ] **Step 3: Implement the DB functions (append to `tokens.ts`)**

```ts
// append to frontend/src/lib/tokens.ts
import { prisma } from "./prisma";

export async function createVerificationToken(email: string): Promise<string> {
  const { token, tokenHash } = generateToken();
  await prisma.verificationToken.create({
    data: { identifier: email, token: tokenHash, expires: new Date(Date.now() + VERIFY_TTL_MS) },
  });
  return token;
}

/** Returns the verified email on success, null if invalid/expired. Single-use. */
export async function consumeVerificationToken(raw: string): Promise<string | null> {
  const tokenHash = hashToken(raw);
  const row = await prisma.verificationToken.findUnique({ where: { token: tokenHash } });
  if (!row) return null;
  await prisma.verificationToken.delete({ where: { token: tokenHash } }).catch(() => {});
  if (isExpired(row.expires)) return null;
  return row.identifier;
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const { token, tokenHash } = generateToken();
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expires: new Date(Date.now() + RESET_TTL_MS) },
  });
  return token;
}

/** Returns the userId on success, null if invalid/expired/consumed. Single-use. */
export async function consumePasswordResetToken(raw: string): Promise<string | null> {
  const tokenHash = hashToken(raw);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.consumedAt || isExpired(row.expires)) return null;
  await prisma.passwordResetToken.update({ where: { tokenHash }, data: { consumedAt: new Date() } });
  return row.userId;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/tokens-db.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tokens.ts src/lib/__tests__/tokens-db.test.ts
git commit -m "feat(auth): single-use verification + password-reset token storage"
```

---

### Task 7: `email.ts` (Resend senders)

**Files:**
- Create: `frontend/src/lib/email.ts`
- Test: `frontend/src/lib/__tests__/email.test.ts`

- [ ] **Step 1: Write the failing test (mocked Resend)**

```ts
// frontend/src/lib/__tests__/email.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn().mockResolvedValue({ data: { id: "x" }, error: null });
vi.mock("resend", () => ({ Resend: vi.fn(() => ({ emails: { send } })) }));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "Fluid Curator <noreply@example.com>";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
});

import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";

describe("transactional emails", () => {
  it("sends a verification email with a /verify link", async () => {
    await sendVerificationEmail("a@b.com", "TOKEN123");
    expect(send).toHaveBeenCalledOnce();
    const arg = send.mock.calls[0][0];
    expect(arg.to).toBe("a@b.com");
    expect(String(arg.html)).toContain("https://app.example.com/verify?token=TOKEN123");
  });
  it("sends a reset email with a /reset-password link", async () => {
    await sendPasswordResetEmail("a@b.com", "TOKEN456");
    const arg = send.mock.calls[0][0];
    expect(String(arg.html)).toContain("https://app.example.com/reset-password?token=TOKEN456");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/email.test.ts`
Expected: FAIL — cannot resolve `@/lib/email`.

- [ ] **Step 3: Implement**

```ts
// frontend/src/lib/email.ts
import { Resend } from "resend";

function client() {
  return new Resend(process.env.RESEND_API_KEY);
}
function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
function from() {
  return process.env.EMAIL_FROM || "Fluid Curator <onboarding@resend.dev>";
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${appUrl()}/verify?token=${token}`;
  await client().emails.send({
    from: from(),
    to,
    subject: "Verify your email",
    html: `<p>Welcome to The Fluid Curator. Confirm your email to finish signing up:</p>
           <p><a href="${link}">Verify my email</a></p>
           <p>This link expires in 24 hours. If you didn't sign up, ignore this email.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${appUrl()}/reset-password?token=${token}`;
  await client().emails.send({
    from: from(),
    to,
    subject: "Reset your password",
    html: `<p>We received a request to reset your password:</p>
           <p><a href="${link}">Reset my password</a></p>
           <p>This link expires in 30 minutes. If you didn't request this, ignore this email.</p>`,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/email.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/lib/__tests__/email.test.ts
git commit -m "feat(auth): Resend verification + password-reset emails"
```

---

### Task 8: `rate-limit.ts` (Upstash) + `ipFromRequest`

**Files:**
- Create: `frontend/src/lib/rate-limit.ts`
- Test: `frontend/src/lib/__tests__/rate-limit.test.ts`

- [ ] **Step 1: Write the failing test for `ipFromRequest`**

```ts
// frontend/src/lib/__tests__/rate-limit.test.ts
import { describe, it, expect } from "vitest";
import { ipFromRequest } from "@/lib/rate-limit";

describe("ipFromRequest", () => {
  it("reads the first x-forwarded-for entry", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(ipFromRequest(req)).toBe("1.2.3.4");
  });
  it("falls back to 'unknown'", () => {
    expect(ipFromRequest(new Request("http://x"))).toBe("unknown");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/rate-limit.test.ts`
Expected: FAIL — cannot resolve `@/lib/rate-limit`.

- [ ] **Step 3: Implement**

```ts
// frontend/src/lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export function ipFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || "unknown";
}

// Fail-open when Upstash isn't configured (e.g. local dev) so logins still work.
const enabled = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = enabled ? Redis.fromEnv() : null;

function make(tokens: number, window: Parameters<typeof Ratelimit.slidingWindow>[1], prefix: string) {
  if (!redis) return null;
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(tokens, window), prefix });
}

const limiters = {
  loginEmail: make(5, "15 m", "rl:login:email"),
  loginIp: make(20, "15 m", "rl:login:ip"),
  resetEmail: make(3, "60 m", "rl:reset:email"),
  resetIp: make(10, "60 m", "rl:reset:ip"),
  signupIp: make(5, "60 m", "rl:signup:ip"),
  resetSubmitIp: make(10, "60 m", "rl:resetsubmit:ip"),
};

/** Returns true if allowed. Fail-open on missing config or limiter errors. */
export async function allow(name: keyof typeof limiters, key: string): Promise<boolean> {
  const limiter = limiters[name];
  if (!limiter) return true;
  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch {
    return true; // never block users because the limiter is down
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/rate-limit.test.ts`
Expected: PASS (2 tests). (Limiters are null without Upstash env, so `allow` no-ops in tests.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/rate-limit.ts src/lib/__tests__/rate-limit.test.ts
git commit -m "feat(auth): Upstash rate limiting (fail-open) + ipFromRequest"
```

---

### Task 9: `authenticateUser` (Credentials core)

**Files:**
- Create: `frontend/src/lib/auth-credentials.ts`
- Test: `frontend/src/lib/__tests__/auth-credentials.test.ts`

- [ ] **Step 1: Write the failing test (mocked Prisma, real bcrypt)**

```ts
// frontend/src/lib/__tests__/auth-credentials.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const prisma = { user: { findUnique: vi.fn() } };
vi.mock("@/lib/prisma", () => ({ prisma }));

import { authenticateUser } from "@/lib/auth-credentials";
import { hashPassword } from "@/lib/password";

beforeEach(() => vi.clearAllMocks());

describe("authenticateUser", () => {
  it("returns ok for a verified user with the right password", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u1", email: "a@b.com", name: "A", emailVerified: new Date(),
      password: await hashPassword("secret123"),
    });
    const r = await authenticateUser("a@b.com", "secret123");
    expect(r).toEqual({ ok: true, user: { id: "u1", email: "a@b.com", name: "A" } });
  });
  it("returns invalid for a wrong password", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u1", email: "a@b.com", emailVerified: new Date(),
      password: await hashPassword("secret123"),
    });
    expect(await authenticateUser("a@b.com", "nope")).toEqual({ ok: false, reason: "invalid" });
  });
  it("returns invalid for a Google-only user (no password) — no enumeration", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", email: "a@b.com", password: null, emailVerified: new Date() });
    expect(await authenticateUser("a@b.com", "anything")).toEqual({ ok: false, reason: "invalid" });
  });
  it("returns invalid for an unknown email", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    expect(await authenticateUser("ghost@b.com", "x")).toEqual({ ok: false, reason: "invalid" });
  });
  it("returns unverified for a correct password but unverified email", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u1", email: "a@b.com", emailVerified: null,
      password: await hashPassword("secret123"),
    });
    expect(await authenticateUser("a@b.com", "secret123")).toEqual({ ok: false, reason: "unverified" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/auth-credentials.test.ts`
Expected: FAIL — cannot resolve `@/lib/auth-credentials`.

- [ ] **Step 3: Implement**

```ts
// frontend/src/lib/auth-credentials.ts
import { prisma } from "./prisma";
import { verifyPassword } from "./password";

export type AuthResult =
  | { ok: true; user: { id: string; email: string; name: string | null } }
  | { ok: false; reason: "invalid" | "unverified" };

export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Same generic failure for unknown email AND Google-only (no password) — no enumeration.
  if (!user || !user.password) return { ok: false, reason: "invalid" };
  if (!(await verifyPassword(password, user.password))) return { ok: false, reason: "invalid" };
  if (!user.emailVerified) return { ok: false, reason: "unverified" };
  return { ok: true, user: { id: user.id, email: user.email, name: user.name } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/auth-credentials.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-credentials.ts src/lib/__tests__/auth-credentials.test.ts
git commit -m "feat(auth): authenticateUser credential check (no enumeration, verified gate)"
```

---

### Task 10: Wire Credentials provider + role into `auth.ts`; type augmentation

**Files:**
- Create: `frontend/src/types/next-auth.d.ts`
- Modify: `frontend/src/lib/auth.ts`

- [ ] **Step 1: Add the session type augmentation**

```ts
// frontend/src/types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "user";
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "admin" | "user";
  }
}
```

- [ ] **Step 2: Add the Credentials provider and role wiring to `auth.ts`**

Add imports at the top:
```ts
import Credentials, { CredentialsSignin } from "next-auth/providers/credentials";
import { authenticateUser } from "./auth-credentials";
import { allow, ipFromRequest } from "./rate-limit";
import { roleForEmail } from "./admin";
```

Add a custom error class (above the `NextAuth(...)` call):
```ts
class EmailNotVerifiedError extends CredentialsSignin { code = "email_not_verified"; }
class RateLimitedError extends CredentialsSignin { code = "rate_limited"; }
```

In the `NextAuth({...})` config, set `providers` (overriding the spread base) and extend the callbacks:
```ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "Email and Password",
      credentials: { email: {}, password: {} },
      authorize: async (creds, request) => {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const ip = ipFromRequest(request as Request);
        const okRate = (await allow("loginEmail", email)) && (await allow("loginIp", ip));
        if (!okRate) throw new RateLimitedError();
        const res = await authenticateUser(email, password);
        if (!res.ok) {
          if (res.reason === "unverified") throw new EmailNotVerifiedError();
          return null; // generic CredentialsSignin
        }
        return { id: res.user.id, email: res.user.email, name: res.user.name };
      },
    }),
  ],
  events: {
    async createUser({ user }) {
      if (user.id) await grantSignupCredits(user.id);
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        await prisma.user.upsert({
          where: { id: user.id! },
          update: {},
          create: { id: user.id!, email: user.email!, name: user.name ?? "User" },
        });
        await grantSignupCredits(user.id!);
        token.id = user.id;
        token.email = user.email; // ensure email is on the token for role resolution
      }
      if (token.email) token.role = roleForEmail(token.email as string);
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      if (session.user) session.user.role = (token.role as "admin" | "user") ?? "user";
      return session;
    },
  },
});
```

(The `name: user.name ?? "User"` replaces the old `"Dev User"` default.)

- [ ] **Step 3: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Run the full unit suite (no regressions)**

Run: `npx vitest run`
Expected: PASS (all tests so far, including credits tests).

- [ ] **Step 5: Commit**

```bash
git add src/types/next-auth.d.ts src/lib/auth.ts
git commit -m "feat(auth): email/password Credentials provider + admin role on session"
```

---

### Task 11: Signup route (no-op + no-enumeration + min length)

**Files:**
- Create: `frontend/src/app/api/auth/signup/route.ts`
- Test: `frontend/src/app/api/auth/__tests__/signup.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/app/api/auth/__tests__/signup.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const prisma = { user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() } };
const tokens = { createVerificationToken: vi.fn().mockResolvedValue("rawtok") };
const email = { sendVerificationEmail: vi.fn().mockResolvedValue(undefined) };
const ratelimit = { allow: vi.fn().mockResolvedValue(true), ipFromRequest: () => "1.1.1.1" };
const password = { hashPassword: vi.fn().mockResolvedValue("HASH") };

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/tokens", () => tokens);
vi.mock("@/lib/email", () => email);
vi.mock("@/lib/rate-limit", () => ratelimit);
vi.mock("@/lib/password", () => password);

import { POST } from "@/app/api/auth/signup/route";

function post(body: unknown) {
  return new Request("http://x/api/auth/signup", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}
beforeEach(() => { vi.clearAllMocks(); ratelimit.allow.mockResolvedValue(true); });

describe("POST /api/auth/signup", () => {
  it("creates a new user and sends verification", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: "u1" });
    const res = await POST(post({ email: "new@b.com", password: "longenough" }));
    expect(res.status).toBe(200);
    expect(prisma.user.create).toHaveBeenCalledOnce();
    expect(email.sendVerificationEmail).toHaveBeenCalledOnce();
  });

  it("is a STRICT NO-OP when the email already exists (e.g. a Google account)", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "g1", email: "taken@b.com", password: null });
    const res = await POST(post({ email: "taken@b.com", password: "longenough" }));
    expect(res.status).toBe(200);                       // generic success
    expect(prisma.user.create).not.toHaveBeenCalled();  // no new user
    expect(prisma.user.update).not.toHaveBeenCalled();  // never modifies the Google account
    expect(tokens.createVerificationToken).not.toHaveBeenCalled();
    expect(email.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns an identical generic body for existing vs new email (no enumeration)", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "g1", password: null });
    prisma.user.create.mockResolvedValue({ id: "u1" });
    const a = await POST(post({ email: "new@b.com", password: "longenough" }));
    const b = await POST(post({ email: "taken@b.com", password: "longenough" }));
    expect(a.status).toBe(b.status);
    expect(await a.json()).toEqual(await b.json());
  });

  it("rejects a password shorter than 8 chars with no DB write", async () => {
    const res = await POST(post({ email: "new@b.com", password: "short" }));
    expect(res.status).toBe(400);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects when rate-limited", async () => {
    ratelimit.allow.mockResolvedValue(false);
    const res = await POST(post({ email: "new@b.com", password: "longenough" }));
    expect(res.status).toBe(429);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/auth/__tests__/signup.test.ts`
Expected: FAIL — cannot resolve route.

- [ ] **Step 3: Implement**

```ts
// frontend/src/app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { allow, ipFromRequest } from "@/lib/rate-limit";

const GENERIC = { ok: true, message: "If that email is available, we've sent a verification link." };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");

  if (!EMAIL_RE.test(email) || password.length < 8) {
    return NextResponse.json({ error: "Enter a valid email and a password of at least 8 characters." }, { status: 400 });
  }

  if (!(await allow("signupIp", ipFromRequest(req)))) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // STRICT NO-OP: never modify or attach to an existing account (incl. Google).
    return NextResponse.json(GENERIC, { status: 200 });
  }

  await prisma.user.create({ data: { email, password: await hashPassword(password), emailVerified: null } });
  const token = await createVerificationToken(email);
  await sendVerificationEmail(email, token);
  return NextResponse.json(GENERIC, { status: 200 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/auth/__tests__/signup.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/signup/route.ts src/app/api/auth/__tests__/signup.test.ts
git commit -m "feat(auth): signup route (strict no-op on existing email, no enumeration, min length)"
```

---

### Task 12: Verify route

**Files:**
- Create: `frontend/src/app/verify/route.ts`
- Test: `frontend/src/app/__tests__/verify.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/app/__tests__/verify.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const prisma = { user: { update: vi.fn() } };
const tokens = { consumeVerificationToken: vi.fn() };
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/tokens", () => tokens);

import { GET } from "@/app/verify/route";
beforeEach(() => vi.clearAllMocks());

describe("GET /verify", () => {
  it("marks the email verified and redirects to login on success", async () => {
    tokens.consumeVerificationToken.mockResolvedValue("a@b.com");
    const res = await GET(new Request("http://x/verify?token=good"));
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "a@b.com" } }));
    expect([302, 303, 307, 308]).toContain(res.status); // NextResponse.redirect defaults to 307
    expect(res.headers.get("location")).toContain("/login?verified=1");
  });
  it("redirects with an error on an invalid/expired token", async () => {
    tokens.consumeVerificationToken.mockResolvedValue(null);
    const res = await GET(new Request("http://x/verify?token=bad"));
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("/login?error=verification");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/__tests__/verify.test.ts`
Expected: FAIL — cannot resolve route.

- [ ] **Step 3: Implement**

```ts
// frontend/src/app/verify/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeVerificationToken } from "@/lib/tokens";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const email = token ? await consumeVerificationToken(token) : null;
  if (!email) return NextResponse.redirect(`${base}/login?error=verification`);
  await prisma.user.update({ where: { email }, data: { emailVerified: new Date() } });
  return NextResponse.redirect(`${base}/login?verified=1`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/__tests__/verify.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/verify/route.ts src/app/__tests__/verify.test.ts
git commit -m "feat(auth): email verification route (single-use token)"
```

---

### Task 13: Request-reset route

**Files:**
- Create: `frontend/src/app/api/auth/request-reset/route.ts`
- Test: `frontend/src/app/api/auth/__tests__/request-reset.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/app/api/auth/__tests__/request-reset.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const prisma = { user: { findUnique: vi.fn() } };
const tokens = { createPasswordResetToken: vi.fn().mockResolvedValue("rawtok") };
const email = { sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined) };
const ratelimit = { allow: vi.fn().mockResolvedValue(true), ipFromRequest: () => "1.1.1.1" };
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/tokens", () => tokens);
vi.mock("@/lib/email", () => email);
vi.mock("@/lib/rate-limit", () => ratelimit);

import { POST } from "@/app/api/auth/request-reset/route";
function post(body: unknown) {
  return new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.clearAllMocks(); ratelimit.allow.mockResolvedValue(true); });

describe("POST /api/auth/request-reset", () => {
  it("emails a reset link for an existing email/password account", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", password: "HASH" });
    const res = await POST(post({ email: "a@b.com" }));
    expect(res.status).toBe(200);
    expect(email.sendPasswordResetEmail).toHaveBeenCalledOnce();
  });
  it("does NOT email a Google-only account (no password) but returns the same body", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "g1", password: null });
    const res = await POST(post({ email: "g@b.com" }));
    expect(res.status).toBe(200);
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
  });
  it("returns identical generic body for unknown email (no enumeration)", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: "u1", password: "HASH" }).mockResolvedValueOnce(null);
    const a = await POST(post({ email: "a@b.com" }));
    const b = await POST(post({ email: "ghost@b.com" }));
    expect(a.status).toBe(b.status);
    expect(await a.json()).toEqual(await b.json());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/auth/__tests__/request-reset.test.ts`
Expected: FAIL — cannot resolve route.

- [ ] **Step 3: Implement**

```ts
// frontend/src/app/api/auth/request-reset/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { allow, ipFromRequest } from "@/lib/rate-limit";

const GENERIC = { ok: true, message: "If an account with that email exists, we've sent a reset link." };

export async function POST(req: Request) {
  let body: { email?: string };
  try { body = await req.json(); } catch { return NextResponse.json(GENERIC, { status: 200 }); }
  const email = String(body.email ?? "").toLowerCase().trim();

  const okRate = (await allow("resetEmail", email)) && (await allow("resetIp", ipFromRequest(req)));
  if (!okRate) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  // Only email/password accounts (password set) get a reset link; never attach a
  // password to a Google-only account. Response is identical regardless.
  if (user?.password) {
    const token = await createPasswordResetToken(user.id);
    await sendPasswordResetEmail(email, token);
  }
  return NextResponse.json(GENERIC, { status: 200 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/auth/__tests__/request-reset.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/request-reset/route.ts src/app/api/auth/__tests__/request-reset.test.ts
git commit -m "feat(auth): request-reset route (no enumeration, password accounts only)"
```

---

### Task 14: Reset route

**Files:**
- Create: `frontend/src/app/api/auth/reset/route.ts`
- Test: `frontend/src/app/api/auth/__tests__/reset.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/app/api/auth/__tests__/reset.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const prisma = { user: { update: vi.fn() } };
const tokens = { consumePasswordResetToken: vi.fn() };
const ratelimit = { allow: vi.fn().mockResolvedValue(true), ipFromRequest: () => "1.1.1.1" };
const password = { hashPassword: vi.fn().mockResolvedValue("NEWHASH") };
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/tokens", () => tokens);
vi.mock("@/lib/rate-limit", () => ratelimit);
vi.mock("@/lib/password", () => password);

import { POST } from "@/app/api/auth/reset/route";
function post(body: unknown) {
  return new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.clearAllMocks(); ratelimit.allow.mockResolvedValue(true); });

describe("POST /api/auth/reset", () => {
  it("sets a new password for a valid token", async () => {
    tokens.consumePasswordResetToken.mockResolvedValue("u1");
    const res = await POST(post({ token: "good", password: "longenough" }));
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { password: "NEWHASH" } });
  });
  it("rejects a short password before touching the token", async () => {
    const res = await POST(post({ token: "good", password: "short" }));
    expect(res.status).toBe(400);
    expect(tokens.consumePasswordResetToken).not.toHaveBeenCalled();
  });
  it("rejects an invalid/expired/consumed token", async () => {
    tokens.consumePasswordResetToken.mockResolvedValue(null);
    const res = await POST(post({ token: "bad", password: "longenough" }));
    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/auth/__tests__/reset.test.ts`
Expected: FAIL — cannot resolve route.

- [ ] **Step 3: Implement**

```ts
// frontend/src/app/api/auth/reset/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken } from "@/lib/tokens";
import { hashPassword } from "@/lib/password";
import { allow, ipFromRequest } from "@/lib/rate-limit";

export async function POST(req: Request) {
  let body: { token?: string; password?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (!(await allow("resetSubmitIp", ipFromRequest(req)))) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const userId = token ? await consumePasswordResetToken(token) : null;
  if (!userId) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }
  await prisma.user.update({ where: { id: userId }, data: { password: await hashPassword(password) } });
  return NextResponse.json({ ok: true, message: "Your password has been reset. You can now sign in." }, { status: 200 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/auth/__tests__/reset.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/reset/route.ts src/app/api/auth/__tests__/reset.test.ts
git commit -m "feat(auth): reset route (single-use token, min length)"
```

---

### Task 15: Login page — email/password form

**Files:**
- Modify: `frontend/src/app/login/page.tsx`

- [ ] **Step 1: Add email/password state + handler and render the form**

Inside `LoginForm`, add state and a submit handler, and read `verified`:
```tsx
const verified = searchParams.get("verified");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [submitting, setSubmitting] = useState(false);
const [formError, setFormError] = useState<string | null>(null);

async function handleEmailLogin(e: React.FormEvent) {
  e.preventDefault();
  setSubmitting(true);
  setFormError(null);
  const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
  setSubmitting(false);
  if (res?.error) {
    setFormError(
      res.code === "email_not_verified"
        ? "Please verify your email — check your inbox for the link."
        : res.code === "rate_limited"
        ? "Too many attempts. Please try again later."
        : "Invalid email or password."
    );
    return;
  }
  window.location.href = callbackUrl;
}
```

Update the existing top `error` banner so `OAuthAccountNotLinked` (thrown when someone tries Google with an email already registered with a password — account linking stays disabled) shows a clear, actionable message. Replace the existing error-banner JSX with:
```tsx
{error && (
  <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm text-center">
    {error === "OAuthAccountNotLinked"
      ? "This email is already registered with a password. Please sign in with your password below."
      : "Something went wrong. Please try again."}
  </div>
)}
```

Add the verified banner and the form below the Google button (replacing the removed dev block):
```tsx
{verified && (
  <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm text-center">
    Email verified — you can sign in now.
  </div>
)}

{/* Google button stays above */}

<div className="flex items-center gap-3 my-6">
  <div className="flex-1 h-px bg-outline-variant/20" />
  <span className="text-xs text-on-surface-variant font-bold uppercase">or</span>
  <div className="flex-1 h-px bg-outline-variant/20" />
</div>

<form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
  {formError && (
    <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm text-center">{formError}</div>
  )}
  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
    className="px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm focus:ring-2 focus:ring-primary/40" />
  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
    className="px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm focus:ring-2 focus:ring-primary/40" />
  <button type="submit" disabled={submitting}
    className="px-6 py-3 bg-primary text-on-primary rounded-xl font-headline font-bold hover:opacity-90 transition disabled:opacity-50">
    {submitting ? "Signing in…" : "Sign in"}
  </button>
  <Link href="/forgot-password" className="text-xs text-on-surface-variant hover:text-primary text-center">Forgot password?</Link>
</form>
```

- [ ] **Step 2: Verify type-check + build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat(auth): email/password sign-in form on /login"
```

---

### Task 16: Signup page — email/password form

**Files:**
- Modify: `frontend/src/app/signup/page.tsx`

- [ ] **Step 1: Add the signup form**

Add (matching the login page structure) a form that posts to `/api/auth/signup` and shows the generic confirmation. Inside the signup form component:
```tsx
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [done, setDone] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [formError, setFormError] = useState<string | null>(null);

async function handleSignup(e: React.FormEvent) {
  e.preventDefault();
  if (password.length < 8) { setFormError("Password must be at least 8 characters."); return; }
  setSubmitting(true); setFormError(null);
  const res = await fetch("/api/auth/signup", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  setSubmitting(false);
  if (res.ok) setDone(true);
  else setFormError("Enter a valid email and a password of at least 8 characters.");
}
```

Render: keep the existing Google button; below it, an "or" divider and either the success message (when `done`) or the form:
```tsx
{done ? (
  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm text-center">
    Check your email for a verification link to finish signing up.
  </div>
) : (
  <form onSubmit={handleSignup} className="flex flex-col gap-3">
    {formError && <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm text-center">{formError}</div>}
    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
      className="px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm focus:ring-2 focus:ring-primary/40" />
    <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ characters)"
      className="px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm focus:ring-2 focus:ring-primary/40" />
    <button type="submit" disabled={submitting}
      className="px-6 py-3 bg-primary text-on-primary rounded-xl font-headline font-bold hover:opacity-90 transition disabled:opacity-50">
      {submitting ? "Creating…" : "Create account"}
    </button>
  </form>
)}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/signup/page.tsx
git commit -m "feat(auth): email/password signup form on /signup"
```

---

### Task 17: Forgot-password + reset-password pages

**Files:**
- Create: `frontend/src/app/forgot-password/page.tsx`
- Create: `frontend/src/app/reset-password/page.tsx`

- [ ] **Step 1: Forgot-password page**

```tsx
// frontend/src/app/forgot-password/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/auth/request-reset", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    });
    setSubmitting(false);
    setDone(true); // always generic — no enumeration
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-10 border border-outline-variant/10">
        <h1 className="text-2xl font-bold font-headline text-on-surface text-center mb-6">Reset your password</h1>
        {done ? (
          <p className="text-on-surface-variant text-sm text-center">
            If an account with that email exists, we&apos;ve sent a reset link. Check your inbox.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm focus:ring-2 focus:ring-primary/40" />
            <button type="submit" disabled={submitting}
              className="px-6 py-3 bg-primary text-on-primary rounded-xl font-headline font-bold hover:opacity-90 transition disabled:opacity-50">
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        <div className="mt-6 text-center"><Link href="/login" className="text-sm text-primary font-bold hover:underline">Back to sign in</Link></div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Reset-password page**

```tsx
// frontend/src/app/reset-password/page.tsx
"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setSubmitting(true); setError(null);
    const res = await fetch("/api/auth/reset", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }),
    });
    setSubmitting(false);
    if (res.ok) setStatus("done");
    else { setStatus("error"); setError("This reset link is invalid or has expired."); }
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-10 border border-outline-variant/10">
        <h1 className="text-2xl font-bold font-headline text-on-surface text-center mb-6">Choose a new password</h1>
        {status === "done" ? (
          <p className="text-on-surface-variant text-sm text-center">
            Your password has been reset. <Link href="/login" className="text-primary font-bold hover:underline">Sign in</Link>.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            {error && <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm text-center">{error}</div>}
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (8+ characters)"
              className="px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm focus:ring-2 focus:ring-primary/40" />
            <button type="submit" disabled={submitting}
              className="px-6 py-3 bg-primary text-on-primary rounded-xl font-headline font-bold hover:opacity-90 transition disabled:opacity-50">
              {submitting ? "Saving…" : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/forgot-password/page.tsx src/app/reset-password/page.tsx
git commit -m "feat(auth): forgot-password and reset-password pages"
```

---

### Task 18: Env docs + full verification + deploy checklist

**Files:**
- Modify: `frontend/.env.example`

- [ ] **Step 1: Document new env vars in `.env.example`**

Append:
```
# Email/password auth (Phase 1)
RESEND_API_KEY=""
EMAIL_FROM="The Fluid Curator <noreply@yourdomain.com>"
ADMIN_EMAILS=""                       # comma-separated admin emails
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

- [ ] **Step 2: Run the full unit suite**

Run: `npx vitest run`
Expected: PASS (all suites).

- [ ] **Step 3: Type-check and production build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed (green build).

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "docs(auth): document Phase 1 auth env vars"
```

- [ ] **Step 5: Deploy checklist (do NOT skip — perform at deploy time)**

1. Set Vercel env vars (Production): `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAILS`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
2. **Apply the migration to Neon prod:** `npx prisma migrate deploy` (needs `DATABASE_URL` + `DIRECT_URL` pointing at prod). The Vercel build does **not** run migrations.
3. **Verify the Resend sending domain** (SPF/DKIM for `EMAIL_FROM`) — without it, verification/reset emails fail or land in spam.
4. After deploy: smoke-test signup → verification email → verify link → login; and forgot-password → reset email → reset → login. Confirm an `ADMIN_EMAILS` account shows `session.user.role === "admin"`.

---

## Notes for the implementer

- Tests mock `@/lib/prisma`, `@/lib/email`, `@/lib/tokens`, `@/lib/rate-limit`, and `resend` — no live DB/Upstash/Resend needed for the unit suite.
- `auth.config.ts` (edge) must never import bcrypt/Prisma/Resend. All of that stays in `auth.ts` and the route handlers.
- Rate limiting is fail-open and no-ops without Upstash env vars, so local dev and the unit suite are unaffected.
- **Account linking stays disabled** — do NOT set `allowDangerousEmailAccountLinking` on the Google provider. A Google sign-in for an email already registered with a password throws `OAuthAccountNotLinked`, which the login page (Task 15) surfaces as a clear "sign in with your password" message.

## Deferred to Phase 2 (decided)

- **Session invalidation after password reset.** With JWT sessions, a password reset does NOT invalidate existing sessions for up to ~30 days. Correct enforcement (a `passwordChangedAt` field + a per-request check in the `jwt`/`session` callback, or moving to database sessions) imposes a per-request DB read and pairs with "log out other sessions" UX, so it is deferred to a focused Phase 2 hardening pass. Residual risk accepted for Phase 1.
