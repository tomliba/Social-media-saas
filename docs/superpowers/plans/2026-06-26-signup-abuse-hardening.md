# Signup Abuse Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop free-credit farming at signup with invisible Turnstile (+ a signed-cookie bridge for Google OAuth), disposable-email blocking, an `emailVerified`-gated credit grant, a fail-closed-in-prod rate limiter, and a best-effort `SignupEvent` abuse log.

**Architecture:** Reuse the existing NextAuth (v5) + Prisma + Upstash plumbing. New shared libs (`turnstile`, `disposable-email`, `ip-intel`, `signup-audit`) keep each concern isolated and unit-testable in the node vitest env. The Google path is gated inside the `signIn` callback in `auth.ts`; the password path in `/api/auth/signup`. The credit grant is unified into one gated helper so there is no parallel verification logic.

**Tech Stack:** Next.js (App Router), NextAuth v5, Prisma (Neon Postgres), Upstash Ratelimit, Cloudflare Turnstile, ipinfo Lite, vitest.

**Spec:** `docs/superpowers/specs/2026-06-26-signup-abuse-hardening-design.md`

---

## File structure

**New libs (one responsibility each):**
- `src/lib/disposable-email.ts` — `isDisposableEmail(email)` over package list + local overrides.
- `src/lib/disposable-extra.ts` — local override array (easy manual edits).
- `src/lib/turnstile.ts` — `verifyTurnstile(token, ip)` + `signTtCookie()` / `verifyTtCookie(value)`.
- `src/lib/ip-intel.ts` — `lookupIp(ip)` (ipinfo Lite) + `isDatacenterOrg(org)` heuristic.
- `src/lib/signup-audit.ts` — `recordSignupEvent(...)` best-effort writer.

**New routes/components:**
- `src/app/api/auth/turnstile/route.ts` — verifies a token, sets the `tt_ok` cookie.
- `src/app/api/cron/purge-signup-events/route.ts` — 90-day retention purge.
- `src/components/auth/Turnstile.tsx` — invisible widget.

**Modified:**
- `src/lib/rate-limit.ts` — fail-closed-in-prod + loud logging + `signupOauthIp`.
- `src/lib/auth.ts` — gated grant helper; `events.createUser` sets `emailVerified` + grants; `jwt` gated grant; `signIn` Google enforcement.
- `src/app/api/auth/signup/route.ts` — Turnstile verify + disposable + audit.
- `src/app/signup/page.tsx`, `src/app/login/page.tsx` — mount Turnstile; map `AccessDenied`.
- `prisma/schema.prisma` — `SignupEvent` model.
- `frontend/vercel.json` — register purge cron.

---

## Task 1: Disposable-email blocking

**Files:**
- Create: `frontend/src/lib/disposable-extra.ts`
- Create: `frontend/src/lib/disposable-email.ts`
- Test: `frontend/src/lib/disposable-email.test.ts`
- Modify: `frontend/package.json` (add dependency)

- [ ] **Step 1: Add the dependency**

Run: `cd frontend && npm install disposable-email-domains@^1.0.62`
Expected: `package.json` gains `"disposable-email-domains"` under dependencies.

- [ ] **Step 2: Write the local override file**

Create `frontend/src/lib/disposable-extra.ts`:

```ts
// Manually-maintained disposable/throwaway domains, merged on top of the
// `disposable-email-domains` package. Add domains here for quick blocks
// without waiting for a package bump. Lowercase, bare domain only.
export const DISPOSABLE_EXTRA: string[] = [
  // "example-throwaway.com",
];
```

- [ ] **Step 3: Write the failing test**

Create `frontend/src/lib/disposable-email.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isDisposableEmail } from "./disposable-email";

describe("isDisposableEmail", () => {
  it("flags a known disposable domain", () => {
    expect(isDisposableEmail("nope@mailinator.com")).toBe(true);
  });
  it("allows a normal domain", () => {
    expect(isDisposableEmail("real@gmail.com")).toBe(false);
  });
  it("is case-insensitive and trims", () => {
    expect(isDisposableEmail("  X@Mailinator.com ")).toBe(true);
  });
  it("returns false for malformed input (no domain)", () => {
    expect(isDisposableEmail("garbage")).toBe(false);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/disposable-email.test.ts`
Expected: FAIL — `Cannot find module './disposable-email'`.

- [ ] **Step 5: Implement**

Create `frontend/src/lib/disposable-email.ts`:

```ts
import disposableDomains from "disposable-email-domains";
import { DISPOSABLE_EXTRA } from "./disposable-extra";

const BLOCKED: Set<string> = new Set<string>([
  ...(disposableDomains as string[]),
  ...DISPOSABLE_EXTRA,
].map((d) => d.toLowerCase()));

/** Bare domain of an email, lowercased; null if it doesn't look like an email. */
function domainOf(email: string): string | null {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.trim().toLowerCase().slice(at + 1);
  return domain.includes(".") ? domain : null;
}

/** True if the email's domain is a known disposable/throwaway provider. */
export function isDisposableEmail(email: string): boolean {
  const domain = domainOf(email);
  return domain ? BLOCKED.has(domain) : false;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/disposable-email.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/disposable-extra.ts frontend/src/lib/disposable-email.ts frontend/src/lib/disposable-email.test.ts
git commit -m "feat(auth): disposable-email blocklist helper"
```

---

## Task 2: Turnstile verify + signed cookie helpers

**Files:**
- Create: `frontend/src/lib/turnstile.ts`
- Test: `frontend/src/lib/turnstile.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/turnstile.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { signTtCookie, verifyTtCookie } from "./turnstile";

beforeEach(() => {
  process.env.AUTH_SECRET = "test-secret-please-change";
});

describe("tt_ok cookie sign/verify", () => {
  it("round-trips a freshly signed cookie", () => {
    const value = signTtCookie(1_000_000);
    expect(verifyTtCookie(value, 1_000_000 + 5_000)).toBe(true); // 5s later
  });
  it("rejects an expired cookie (>10 min)", () => {
    const value = signTtCookie(1_000_000);
    expect(verifyTtCookie(value, 1_000_000 + 11 * 60_000)).toBe(false);
  });
  it("rejects a tampered cookie", () => {
    const value = signTtCookie(1_000_000);
    expect(verifyTtCookie(value + "x", 1_000_000 + 1_000)).toBe(false);
  });
  it("rejects malformed input", () => {
    expect(verifyTtCookie("not-a-cookie", 1_000_000)).toBe(false);
    expect(verifyTtCookie("", 1_000_000)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/turnstile.test.ts`
Expected: FAIL — `Cannot find module './turnstile'`.

- [ ] **Step 3: Implement**

Create `frontend/src/lib/turnstile.ts`:

```ts
import crypto from "node:crypto";

export const TT_COOKIE = "tt_ok";
const TTL_MS = 10 * 60_000; // 10 minutes

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function hmac(input: string): string {
  return crypto.createHmac("sha256", secret()).update(input).digest("hex");
}

/** Cookie value = "<issuedAtMs>.<hmac>". Pass `now` only in tests. */
export function signTtCookie(now: number = Date.now()): string {
  const ts = String(now);
  return `${ts}.${hmac(ts)}`;
}

/** True if the cookie is well-formed, untampered, and younger than TTL_MS. */
export function verifyTtCookie(value: string | undefined, now: number = Date.now()): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const ts = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = hmac(ts);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  const issued = Number(ts);
  if (!Number.isFinite(issued)) return false;
  return now - issued >= 0 && now - issued < TTL_MS;
}

interface SiteverifyResponse { success: boolean; "error-codes"?: string[] }

/** Verify a Turnstile token server-side against Cloudflare siteverify. */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // Misconfiguration must not silently allow bots in prod.
    if (process.env.NODE_ENV === "production") {
      console.error("[turnstile] TURNSTILE_SECRET_KEY missing in production — failing closed");
      return false;
    }
    return true; // dev convenience
  }
  if (!token) return false;
  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as SiteverifyResponse;
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] siteverify call failed:", err);
    return false; // network failure → fail closed (a token must be provably valid)
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/turnstile.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/turnstile.ts frontend/src/lib/turnstile.test.ts
git commit -m "feat(auth): turnstile siteverify + signed tt_ok cookie helpers"
```

---

## Task 3: Rate limiter — fail-closed in prod + loud + signupOauthIp

**Files:**
- Modify: `frontend/src/lib/rate-limit.ts`
- Test: `frontend/src/lib/rate-limit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/rate-limit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { failClosedWhenUnconfigured } from "./rate-limit";

// Pure decision function: what should allow() return when no limiter exists,
// given the environment? (We don't need a live Redis to test the policy.)
describe("failClosedWhenUnconfigured", () => {
  it("fails OPEN in development", () => {
    expect(failClosedWhenUnconfigured("development")).toBe(true);
  });
  it("fails OPEN in test", () => {
    expect(failClosedWhenUnconfigured("test")).toBe(true);
  });
  it("fails CLOSED in production", () => {
    expect(failClosedWhenUnconfigured("production")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/rate-limit.test.ts`
Expected: FAIL — `failClosedWhenUnconfigured` is not exported.

- [ ] **Step 3: Implement the changes**

Replace the contents of `frontend/src/lib/rate-limit.ts` with:

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export function ipFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || "unknown";
}

const enabled = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = enabled ? Redis.fromEnv() : null;

// Loud, once, at module load: a misconfigured limiter in prod is a security hole.
if (!enabled && process.env.NODE_ENV === "production") {
  console.error(
    "[rate-limit] Upstash is NOT configured in production. Rate-limited actions will FAIL CLOSED. " +
    "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
  );
}

/**
 * When no limiter exists (Upstash unset), should the action be allowed?
 * Dev/test → allow (no Redis needed locally). Prod → deny (never silently off).
 */
export function failClosedWhenUnconfigured(nodeEnv: string | undefined): boolean {
  return nodeEnv !== "production";
}

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
  signupOauthIp: make(5, "60 m", "rl:signup:oauth:ip"),
  resetSubmitIp: make(10, "60 m", "rl:resetsubmit:ip"),
};

/**
 * Returns true if allowed.
 * - No limiter (Upstash unset): allow in dev/test, DENY in prod (fail closed).
 * - Runtime error talking to Redis: log loudly, allow (fail open) so an Upstash
 *   outage cannot lock every user out.
 */
export async function allow(name: keyof typeof limiters, key: string): Promise<boolean> {
  const limiter = limiters[name];
  if (!limiter) return failClosedWhenUnconfigured(process.env.NODE_ENV);
  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch (err) {
    console.error(`[rate-limit] limiter "${name}" errored; failing open:`, err);
    return true;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/rate-limit.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite to confirm no regression in callers**

Run: `cd frontend && npx vitest run`
Expected: PASS (existing suites unchanged; `allow`/`ipFromRequest` signatures preserved).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/rate-limit.ts frontend/src/lib/rate-limit.test.ts
git commit -m "feat(auth): rate limiter fails closed in prod + signupOauthIp limiter"
```

---

## Task 4: IP intelligence (ipinfo Lite + datacenter heuristic)

**Files:**
- Create: `frontend/src/lib/ip-intel.ts`
- Test: `frontend/src/lib/ip-intel.test.ts`

> Note: ipinfo Lite returns ASN + country only. `isDatacenter` is derived from an
> ASN-org keyword heuristic. `isProxy` is left `null` (true VPN/proxy detection
> needs ipinfo's paid privacy tier); documented for a later upgrade.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/ip-intel.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isDatacenterOrg } from "./ip-intel";

describe("isDatacenterOrg", () => {
  it("flags known hosting providers", () => {
    expect(isDatacenterOrg("Amazon.com, Inc.")).toBe(true);
    expect(isDatacenterOrg("DigitalOcean, LLC")).toBe(true);
    expect(isDatacenterOrg("Hetzner Online GmbH")).toBe(true);
    expect(isDatacenterOrg("Google LLC")).toBe(true);
  });
  it("does not flag residential ISPs", () => {
    expect(isDatacenterOrg("Comcast Cable Communications")).toBe(false);
    expect(isDatacenterOrg("Deutsche Telekom AG")).toBe(false);
  });
  it("handles empty/undefined", () => {
    expect(isDatacenterOrg("")).toBe(false);
    expect(isDatacenterOrg(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/ip-intel.test.ts`
Expected: FAIL — `Cannot find module './ip-intel'`.

- [ ] **Step 3: Implement**

Create `frontend/src/lib/ip-intel.ts`:

```ts
export interface IpIntel {
  asn: string | null;
  asnOrg: string | null;
  country: string | null;
  isDatacenter: boolean | null;
  isProxy: boolean | null; // always null on the free Lite tier (see note)
}

// Keyword match against the ASN org name. Cheap, free, and good enough to flag
// the obvious cloud/hosting ranges that farmers use.
const DC_KEYWORDS = [
  "amazon", "aws", "google", "microsoft", "azure", "digitalocean", "ovh",
  "hetzner", "linode", "akamai", "cloudflare", "oracle", "vultr", "scaleway",
  "leaseweb", "contabo", "choopa", "hosting", "datacenter", "data center",
  "colo", "server", "vps", "m247", "datacamp", "g-core", "alibaba", "tencent",
];

export function isDatacenterOrg(org: string | undefined | null): boolean {
  if (!org) return false;
  const o = org.toLowerCase();
  return DC_KEYWORDS.some((k) => o.includes(k));
}

interface IpinfoLite {
  asn?: string;
  as_name?: string;
  as_domain?: string;
  country?: string;
  country_code?: string;
}

/**
 * Best-effort IP enrichment via ipinfo Lite (free, commercial-OK).
 * Returns null if no token is configured or the call fails/times out.
 */
export async function lookupIp(ip: string | null | undefined): Promise<IpIntel | null> {
  const token = process.env.IPINFO_TOKEN;
  if (!token || !ip || ip === "unknown") return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(`https://api.ipinfo.io/lite/${encodeURIComponent(ip)}?token=${token}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const d = (await res.json()) as IpinfoLite;
    const asnOrg = d.as_name ?? null;
    return {
      asn: d.asn ?? null,
      asnOrg,
      country: d.country_code ?? d.country ?? null,
      isDatacenter: asnOrg ? isDatacenterOrg(asnOrg) : null,
      isProxy: null,
    };
  } catch {
    return null; // fail silent — enrichment must never block signup
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/ip-intel.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/ip-intel.ts frontend/src/lib/ip-intel.test.ts
git commit -m "feat(auth): ipinfo-lite enrichment + datacenter ASN heuristic"
```

---

## Task 5: SignupEvent model + migration

**Files:**
- Modify: `frontend/prisma/schema.prisma`
- Create: a migration via Prisma (authored offline, per the single-Neon-DB rule — do NOT run `db push` / `migrate dev` against the shared DB)

- [ ] **Step 1: Add the model**

Append to `frontend/prisma/schema.prisma` (after the existing models):

```prisma
// Best-effort audit of signup attempts for abuse analysis. Not user-facing.
// Retention: 90 days (see /api/cron/purge-signup-events). Stores IPs for fraud
// prevention — add a privacy-policy line before relying on it long-term.
model SignupEvent {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  userId          String?  // null when denied before user creation
  email           String
  emailDomain     String
  method          String   // "google" | "password"
  ip              String?
  country         String?
  asn             String?
  asnOrg          String?
  isDatacenter    Boolean?
  isProxy         Boolean?
  turnstilePassed Boolean  @default(false)
  outcome         String   // created | pending_verify | denied_disposable | denied_captcha | denied_ratelimit

  @@index([ip])
  @@index([emailDomain])
  @@index([createdAt])
}
```

- [ ] **Step 2: Author the migration SQL offline**

Run: `cd frontend && npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` to confirm Prisma sees the new model, then create the migration folder manually:

Create `frontend/prisma/migrations/20260626XXXXXX_add_signup_event/migration.sql` (replace `XXXXXX` with a timestamp):

```sql
CREATE TABLE "SignupEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "emailDomain" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "ip" TEXT,
    "country" TEXT,
    "asn" TEXT,
    "asnOrg" TEXT,
    "isDatacenter" BOOLEAN,
    "isProxy" BOOLEAN,
    "turnstilePassed" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT NOT NULL,
    CONSTRAINT "SignupEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SignupEvent_ip_idx" ON "SignupEvent"("ip");
CREATE INDEX "SignupEvent_emailDomain_idx" ON "SignupEvent"("emailDomain");
CREATE INDEX "SignupEvent_createdAt_idx" ON "SignupEvent"("createdAt");
```

- [ ] **Step 3: Regenerate the Prisma client locally**

Run: `cd frontend && npx prisma generate`
Expected: client regenerates with `prisma.signupEvent` available. (Do NOT run `migrate deploy` here — that happens at release against the shared Neon DB, per project policy.)

- [ ] **Step 4: Commit**

```bash
git add frontend/prisma/schema.prisma frontend/prisma/migrations/
git commit -m "feat(auth): SignupEvent abuse-audit model + migration"
```

---

## Task 6: signup-audit writer

**Files:**
- Create: `frontend/src/lib/signup-audit.ts`
- Test: `frontend/src/lib/signup-audit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/signup-audit.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
vi.mock("./prisma", () => ({ prisma: { signupEvent: { create } } }));
vi.mock("./ip-intel", () => ({ lookupIp: vi.fn(async () => null) }));

import { recordSignupEvent } from "./signup-audit";

beforeEach(() => create.mockReset());

describe("recordSignupEvent", () => {
  it("writes a row with derived emailDomain", async () => {
    create.mockResolvedValueOnce({});
    await recordSignupEvent({ email: "A@Gmail.com", method: "password", ip: "1.2.3.4", outcome: "pending_verify" });
    expect(create).toHaveBeenCalledOnce();
    const arg = create.mock.calls[0][0].data;
    expect(arg.emailDomain).toBe("gmail.com");
    expect(arg.method).toBe("password");
    expect(arg.outcome).toBe("pending_verify");
  });
  it("never throws if the DB write fails", async () => {
    create.mockRejectedValueOnce(new Error("db down"));
    await expect(
      recordSignupEvent({ email: "x@y.com", method: "google", outcome: "created" })
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/signup-audit.test.ts`
Expected: FAIL — `Cannot find module './signup-audit'`.

- [ ] **Step 3: Implement**

Create `frontend/src/lib/signup-audit.ts`:

```ts
import { prisma } from "./prisma";
import { lookupIp } from "./ip-intel";

export type SignupMethod = "google" | "password";
export type SignupOutcome =
  | "created" | "pending_verify"
  | "denied_disposable" | "denied_captcha" | "denied_ratelimit";

export interface SignupEventInput {
  email: string;
  method: SignupMethod;
  outcome: SignupOutcome;
  ip?: string | null;
  userId?: string | null;
  turnstilePassed?: boolean;
  /** Skip the IP-intel network call (e.g. for denied attempts you don't enrich). */
  skipEnrich?: boolean;
}

function domainOf(email: string): string {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  return at >= 0 ? email.trim().toLowerCase().slice(at + 1) : "";
}

/** Best-effort: records a signup attempt. Never throws. */
export async function recordSignupEvent(input: SignupEventInput): Promise<void> {
  try {
    const intel = input.skipEnrich ? null : await lookupIp(input.ip ?? null);
    await prisma.signupEvent.create({
      data: {
        userId: input.userId ?? null,
        email: input.email.trim().toLowerCase(),
        emailDomain: domainOf(input.email),
        method: input.method,
        outcome: input.outcome,
        ip: input.ip ?? null,
        turnstilePassed: input.turnstilePassed ?? false,
        country: intel?.country ?? null,
        asn: intel?.asn ?? null,
        asnOrg: intel?.asnOrg ?? null,
        isDatacenter: intel?.isDatacenter ?? null,
        isProxy: intel?.isProxy ?? null,
      },
    });
  } catch (err) {
    console.error("[signup-audit] failed to record signup event:", err);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/signup-audit.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/signup-audit.ts frontend/src/lib/signup-audit.test.ts
git commit -m "feat(auth): best-effort SignupEvent writer with IP enrichment"
```

---

## Task 7: Unified, gated credit grant

**Files:**
- Modify: `frontend/src/lib/auth.ts` (replace `grantSignupCredits`, rewire `events.createUser` and `jwt`)
- Test: `frontend/src/lib/grant-eligibility.test.ts`
- Create: `frontend/src/lib/grant-eligibility.ts` (extract the pure gate so it's unit-testable)

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/grant-eligibility.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isGrantEligible } from "./grant-eligibility";

describe("isGrantEligible", () => {
  it("eligible when email verified and not banned", () => {
    expect(isGrantEligible({ emailVerified: new Date(), bannedAt: null })).toBe(true);
  });
  it("NOT eligible when email is unverified", () => {
    expect(isGrantEligible({ emailVerified: null, bannedAt: null })).toBe(false);
  });
  it("NOT eligible when banned", () => {
    expect(isGrantEligible({ emailVerified: new Date(), bannedAt: new Date() })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/grant-eligibility.test.ts`
Expected: FAIL — `Cannot find module './grant-eligibility'`.

- [ ] **Step 3: Implement the pure gate**

Create `frontend/src/lib/grant-eligibility.ts`:

```ts
/** A user may receive signup credits only once their email is verified and
 *  they are not banned. Mirrors the password path's verification requirement. */
export function isGrantEligible(u: { emailVerified: Date | null; bannedAt: Date | null }): boolean {
  return u.emailVerified != null && u.bannedAt == null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/grant-eligibility.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Rewire auth.ts to use the gated helper**

In `frontend/src/lib/auth.ts`, replace the `grantSignupCredits` function (lines ~11-24) with:

```ts
import { isGrantEligible } from "./grant-eligibility";

/** Grant welcome credits once per user, but ONLY if eligible (verified, not
 *  banned). Idempotent on the user id. Safe to call repeatedly. */
async function maybeGrantSignupCredits(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, bannedAt: true },
    });
    if (!user || !isGrantEligible(user)) return;
    await grantCredits({
      userId,
      amount: FREE_TIER_ALLOTMENT,
      type: "signup_grant",
      externalEventId: `signup:${userId}`,
      reason: "welcome credits",
    });
  } catch (err) {
    console.error("Failed to grant signup credits:", err);
  }
}
```

Then update `events.createUser` (every adapter-created user is a Google user — password users are created directly in the signup route and never hit this event). Replace the existing `events` block with:

```ts
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      // Google verified the address; mark it so the gated grant fires and the
      // password and OAuth paths share one verification model.
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
      await maybeGrantSignupCredits(user.id);
    },
  },
```

Then in the `jwt` callback, replace the `await grantSignupCredits(user.id!);` line with:

```ts
        await maybeGrantSignupCredits(user.id!);
```

- [ ] **Step 6: Run the full suite + typecheck**

Run: `cd frontend && npx vitest run && npx tsc --noEmit`
Expected: PASS; no type errors. (`grantSignupCredits` is fully removed; ensure no other references remain — grep below.)

Run: `cd frontend && grep -rn "grantSignupCredits" src/`
Expected: no matches.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/grant-eligibility.ts frontend/src/lib/grant-eligibility.test.ts frontend/src/lib/auth.ts
git commit -m "feat(auth): gate signup credit grant on emailVerified (unify google+password)"
```

---

## Task 8: Turnstile cookie endpoint

**Files:**
- Create: `frontend/src/app/api/auth/turnstile/route.ts`

- [ ] **Step 1: Implement the route**

Create `frontend/src/app/api/auth/turnstile/route.ts`:

```ts
import { NextResponse } from "next/server";
import { verifyTurnstile, signTtCookie, TT_COOKIE } from "@/lib/turnstile";
import { allow, ipFromRequest } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = ipFromRequest(req);
  if (!(await allow("signupOauthIp", ip))) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }
  let token: string | undefined;
  try {
    const body = (await req.json()) as { token?: string };
    token = body.token;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!(await verifyTurnstile(token, ip))) {
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TT_COOKIE, signTtCookie(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min, matches verifyTtCookie TTL
  });
  return res;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/api/auth/turnstile/route.ts
git commit -m "feat(auth): /api/auth/turnstile sets signed tt_ok cookie"
```

---

## Task 9: Google path enforcement in signIn callback

**Files:**
- Modify: `frontend/src/lib/auth.ts` (the `signIn` callback)

- [ ] **Step 1: Add imports**

At the top of `frontend/src/lib/auth.ts`, add:

```ts
import { cookies, headers } from "next/headers";
import { isDisposableEmail } from "./disposable-email";
import { verifyTtCookie, TT_COOKIE } from "./turnstile";
import { recordSignupEvent } from "./signup-audit";
```

- [ ] **Step 2: Replace the `signIn` callback**

Replace the existing `async signIn({ user })` callback in `auth.ts` with:

```ts
    async signIn({ user, account }) {
      const email = user?.email?.toLowerCase();
      if (!email) return true;

      // Banned users never get a session (covers all providers).
      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, bannedAt: true },
      });
      if (dbUser?.bannedAt) return false;

      // Extra gating only for Google. Credentials is already gated in authorize().
      if (account?.provider === "google") {
        const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

        if (isDisposableEmail(email)) {
          await recordSignupEvent({ email, method: "google", ip, outcome: "denied_disposable", skipEnrich: true });
          return false;
        }

        // Only NEW users must pass the captcha + rate gate; returning users glide through.
        const isNew = !dbUser;
        if (isNew) {
          const cookie = (await cookies()).get(TT_COOKIE)?.value;
          if (!verifyTtCookie(cookie)) {
            await recordSignupEvent({ email, method: "google", ip, outcome: "denied_captcha", skipEnrich: true });
            return false;
          }
          if (!(await allow("signupOauthIp", ip))) {
            await recordSignupEvent({ email, method: "google", ip, outcome: "denied_ratelimit", skipEnrich: true });
            return false;
          }
          // Passed the gate; the user row + credit grant happen in events.createUser.
          await recordSignupEvent({ email, method: "google", ip, outcome: "created", turnstilePassed: true });
        }
      }
      return true;
    },
```

- [ ] **Step 3: Typecheck + full suite**

Run: `cd frontend && npx tsc --noEmit && npx vitest run`
Expected: no type errors; tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/auth.ts
git commit -m "feat(auth): gate google signups on disposable + turnstile cookie + rate limit"
```

---

## Task 10: Password signup route — Turnstile + disposable + audit

**Files:**
- Modify: `frontend/src/app/api/auth/signup/route.ts`

- [ ] **Step 1: Replace the route**

Replace `frontend/src/app/api/auth/signup/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { allow, ipFromRequest } from "@/lib/rate-limit";
import { isDisposableEmail } from "@/lib/disposable-email";
import { verifyTurnstile } from "@/lib/turnstile";
import { recordSignupEvent } from "@/lib/signup-audit";

const GENERIC = { ok: true, message: "If that email is available, we've sent a verification link." };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; password?: string; turnstileToken?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");
  const ip = ipFromRequest(req);

  if (!EMAIL_RE.test(email) || password.length < 10) {
    return NextResponse.json({ error: "Enter a valid email and a password of at least 10 characters." }, { status: 400 });
  }
  if (!(await allow("signupIp", ip))) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }
  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return NextResponse.json({ error: "We couldn't verify you're human. Please try again." }, { status: 403 });
  }
  if (isDisposableEmail(email)) {
    await recordSignupEvent({ email, method: "password", ip, outcome: "denied_disposable", turnstilePassed: true, skipEnrich: true });
    return NextResponse.json({ error: "Please use a non-disposable email address." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // STRICT NO-OP: never modify or attach to an existing account (incl. Google).
    return NextResponse.json(GENERIC, { status: 200 });
  }

  await prisma.user.create({ data: { email, password: await hashPassword(password), emailVerified: null } });
  const token = await createVerificationToken(email);
  await sendVerificationEmail(email, token);
  await recordSignupEvent({ email, method: "password", ip, outcome: "pending_verify", turnstilePassed: true });
  return NextResponse.json(GENERIC, { status: 200 });
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/api/auth/signup/route.ts
git commit -m "feat(auth): password signup requires turnstile + blocks disposable + audits"
```

---

## Task 11: Turnstile widget component

**Files:**
- Create: `frontend/src/components/auth/Turnstile.tsx`

- [ ] **Step 1: Implement the component**

Create `frontend/src/components/auth/Turnstile.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";

/**
 * Invisible Turnstile. On solve, calls onToken(token). Renders nothing visible
 * in managed/invisible mode for legit users. Site key from
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY.
 */
export default function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) { console.error("[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY missing"); return; }

    function renderWidget() {
      if (!ref.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        size: "invisible",
        callback: (token: string) => onToken(token),
        "error-callback": () => window.turnstile?.reset(widgetId.current ?? undefined),
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      window.onTurnstileLoad = renderWidget;
      if (!document.querySelector(`script[src^="https://challenges.cloudflare.com/turnstile"]`)) {
        const s = document.createElement("script");
        s.src = SCRIPT_SRC;
        s.async = true; s.defer = true;
        document.head.appendChild(s);
      }
    }
  }, [onToken]);

  return <div ref={ref} />;
}
```

- [ ] **Step 2: Allow the Turnstile script/frame in CSP**

Check `frontend/next.config.ts` for a Content-Security-Policy header. If a CSP exists, add `https://challenges.cloudflare.com` to `script-src` and `frame-src`.

Run: `cd frontend && grep -n "Content-Security-Policy\|script-src\|frame-src" next.config.ts`
Expected: if matches found, edit those directives to include `https://challenges.cloudflare.com`. If no CSP exists, skip (nothing to change).

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/auth/Turnstile.tsx frontend/next.config.ts
git commit -m "feat(auth): invisible Turnstile widget component (+ CSP allowance)"
```

---

## Task 12: Wire Turnstile into signup + login pages

**Files:**
- Modify: `frontend/src/app/signup/page.tsx`
- Modify: `frontend/src/app/login/page.tsx`

- [ ] **Step 1: Signup page — gate the Google button and the password form**

In `frontend/src/app/signup/page.tsx`:

1. Add imports near the top:

```tsx
import { useCallback } from "react";
import Turnstile from "@/components/auth/Turnstile";
```

2. Add state inside `SignupPage` (after the existing `useState` calls):

```tsx
  const [tsToken, setTsToken] = useState<string | null>(null);
  const onToken = useCallback((t: string) => {
    setTsToken(t);
    // Set the tt_ok cookie so the Google OAuth path is unlocked too.
    fetch("/api/auth/turnstile", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: t }),
    }).catch(() => {});
  }, []);
```

3. Send the token with the password signup. Change the `fetch("/api/auth/signup", ...)` body in `handleSignup` to include it:

```tsx
      body: JSON.stringify({ email, password, turnstileToken: tsToken }),
```

4. Mount the widget once inside the card (e.g. right before the closing `</div>` of the card, after the form):

```tsx
          <Turnstile onToken={onToken} />
```

- [ ] **Step 2: Login page — gate the Google button**

In `frontend/src/app/login/page.tsx`:

1. Add imports:

```tsx
import { useCallback } from "react";
import Turnstile from "@/components/auth/Turnstile";
```

2. Inside `LoginForm`, add the cookie-priming callback and mount the widget (the token isn't needed for password *login*, only to unlock the Google OAuth cookie for first-time Google users):

```tsx
  const onToken = useCallback((t: string) => {
    fetch("/api/auth/turnstile", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: t }),
    }).catch(() => {});
  }, []);
```

Mount `<Turnstile onToken={onToken} />` once inside the card (after the form).

3. Map the denied-Google outcome to a friendly message. In the existing `error` banner block, extend the condition:

```tsx
              {error === "OAuthAccountNotLinked"
                ? "This email is already registered with a password. Please sign in with your password below."
                : error === "AccessDenied"
                ? "We couldn't verify your sign-in. Please try again, and use a non-disposable email."
                : "Something went wrong. Please try again."}
```

- [ ] **Step 3: Typecheck + lint**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/signup/page.tsx frontend/src/app/login/page.tsx
git commit -m "feat(auth): mount invisible Turnstile on signup + login; prime tt_ok cookie"
```

---

## Task 13: Retention purge cron

**Files:**
- Create: `frontend/src/app/api/cron/purge-signup-events/route.ts`
- Modify: `frontend/vercel.json`

- [ ] **Step 1: Implement the cron route**

Create `frontend/src/app/api/cron/purge-signup-events/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const RETENTION_DAYS = 90;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.signupEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return NextResponse.json({ ok: true, deleted: count });
}
```

- [ ] **Step 2: Register the cron**

Replace `frontend/vercel.json` with:

```json
{
  "crons": [
    {
      "path": "/api/cron/reconcile",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/purge-signup-events",
      "schedule": "0 4 * * *"
    }
  ]
}
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/api/cron/purge-signup-events/route.ts frontend/vercel.json
git commit -m "feat(auth): 90-day retention purge cron for SignupEvent"
```

---

## Task 14: Docs, env example, and final verification

**Files:**
- Modify: `frontend/.env.example` (create if missing)

- [ ] **Step 1: Document the new env vars**

Add to `frontend/.env.example` (create the file if it doesn't exist):

```bash
# Cloudflare Turnstile (invisible captcha)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# ipinfo Lite (free, commercial-OK) — optional; enables ASN/datacenter flags
IPINFO_TOKEN=

# Upstash (rate limiting) — REQUIRED in production; missing config fails closed
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

- [ ] **Step 2: Full suite + typecheck + lint**

Run: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
Expected: all green.

- [ ] **Step 3: Build (catches prod-only type/CSP issues)**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual verification (local, with test keys)**

Use Cloudflare's Turnstile **test keys** locally (site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA` = always-passes; secret `2x0000000000000000000000000000000AA` = always-fails) to exercise both outcomes.

Then verify each acceptance case from the spec:

1. **Disposable (password):** `curl -s -X POST localhost:3007/api/auth/signup -H 'content-type: application/json' -d '{"email":"x@mailinator.com","password":"abcdefghij","turnstileToken":"XXXX.DUMMY.TOKEN.XXXX"}'` → `400` `"Please use a non-disposable email address."` (with the always-pass test secret set).
2. **Bad captcha (password):** same call with the always-fail test secret → `403`.
3. **Headless Google:** with no `tt_ok` cookie, drive `signIn("google")` (or hit the callback) → no `User` row created, no `signup_grant` `CreditTransaction`; a `SignupEvent` row with `outcome="denied_captcha"`.
4. **Real password signup:** valid email + passing token → `200`, `pending_verify` audit row, verification email; after `/verify`, first login grants exactly 30 credits (one `signup_grant` row).
5. **Audit enrichment:** with `IPINFO_TOKEN` set, a created row has `asn`/`country` populated (or null if the lookup was skipped/failed — never blocks).

Confirm DB state:

```bash
cd frontend && npx prisma studio   # inspect User, CreditTransaction, SignupEvent
```

- [ ] **Step 5: Commit**

```bash
git add frontend/.env.example
git commit -m "docs(auth): document Turnstile/ipinfo/Upstash env vars"
```

---

## Self-review notes (coverage check)

- Spec A (Turnstile + cookie bridge) → Tasks 2, 8, 11, 12. ✅
- Spec B (Google enforcement) → Task 9. ✅
- Spec C (unified gated grant) → Task 7. ✅
- Spec D (disposable blocking) → Tasks 1, 9, 10. ✅
- Spec E (rate limiter fail-closed + signupOauthIp) → Task 3. ✅
- Spec F (SignupEvent + enrichment + retention) → Tasks 4, 5, 6, 13. ✅
- Env + testing → Task 14. ✅

**Deferred / flagged for the owner:**
- `isProxy` is always null on ipinfo Lite (free). True VPN/proxy detection needs ipinfo's paid privacy tier; the column + plumbing are in place to fill later.
- Migration is authored offline and applied via `migrate deploy` at release time against the shared Neon DB (never `db push`/`migrate dev`), per project policy.
- Privacy-policy line about storing IPs is out of scope here; note for a follow-up.
