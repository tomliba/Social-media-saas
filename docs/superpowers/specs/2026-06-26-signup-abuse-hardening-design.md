# Signup Abuse Hardening — Design Spec

**Date:** 2026-06-26
**Status:** Approved (pending implementation plan)
**Goal:** Harden signup against free-credit farming without adding meaningful friction for real users.

## Problem

New users get 30 free credits on signup (`grantSignupCredits()` in `src/lib/auth.ts`). An audit found the grant is cheap to farm:

- **Google path** grants 30 credits *instantly* on first sign-in via `events.createUser` → `grantSignupCredits`, with no captcha, no rate limit, no disposable-email check. The `jwt` callback grants a second time (idempotent).
- **Password path** is already gated: `/api/auth/signup` creates the user with `emailVerified: null` and grants nothing; credits are only granted later in the `jwt` callback on first *verified* login (`authenticateUser` rejects unverified). This is the model to match.
- **Rate limiter** (`src/lib/rate-limit.ts`) **fails open** on missing Upstash config and on runtime errors, and only the password signup route uses it. The Google path touches no limiter — so the limiter could be silently disabled in prod and nobody would know.
- No disposable-email blocking anywhere. No signup audit trail.

Grant is idempotent on `signup:${userId}`. Ledger is the append-only `CreditTransaction` model. No `SignupEvent` audit table exists.

**Key structural insight:** every `events.createUser` is a Google user. Password users are created directly via `prisma.user.create` in the signup route, which does **not** trigger the NextAuth adapter's `createUser` event. This lets us treat `events.createUser` as the Google-only hook.

## Constraints (from the owner)

- Do **not** gate signup behind SMS/phone verification.
- Do **not** break existing real-user signup. Invisible Turnstile (no interaction for legit users); disposable + captcha only deny on hard signals.
- Keep the audit log minimal; do not block signup on it.
- Reuse existing auth/rate-limit plumbing rather than duplicating it.

## Approved decisions

1. **Google-OAuth captcha gate:** signed-cookie bridge (truly blocks headless callback hits), not a client-only gate.
2. **IP intelligence:** enrichment for ASN / datacenter / VPN flags, provider-pluggable. ⚠️ ip-api.com free tier is **non-commercial-use only** and cannot be used by a commercial SaaS; use **ipinfo.io Lite** (free, commercial-OK, free token) instead. Store raw IP + Vercel geo regardless; enrichment fails silent.
3. **Rate limiter failure mode:** in production, missing Upstash config logs loudly at startup **and fails closed**. Dev stays fail-open. Transient Redis errors fail-open but log loudly (avoid outage lockout).

## Design

### A. Turnstile (invisible) + cookie bridge

- **`components/auth/Turnstile.tsx`** (new): renders Cloudflare's managed/invisible Turnstile widget, loads the CF script once, invokes a callback with the token. Reads site key from `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- Mounted on:
  - **Signup page** — gates the password form submit and the Google button.
  - **Login page** — gates the Google button (first Google sign-in is account creation, so it must be gated here too).
- **`POST /api/auth/turnstile`** (new): receives `{ token }`, rate-limits by IP (`signupOauthIp`), verifies via Cloudflare siteverify (`TURNSTILE_SECRET_KEY` + remote IP). On success sets a short-lived (10 min) **httpOnly, Secure, SameSite=Lax, signed** cookie `tt_ok` (HMAC-signed with the existing `AUTH_SECRET` — no new secret). On failure returns 403. This is the single pre-auth choke point and is where the Google path picks up its IP rate limit.
- **`lib/turnstile.ts`** (new): `verifyTurnstile(token, ip)` (shared by the endpoint and the password route) plus `signTtCookie()` / `verifyTtCookie()` helpers.
- Password signup verifies the token **inline** via `verifyTurnstile` (no cookie needed there).

### B. Google path enforcement — `auth.ts` `signIn` callback (`provider === "google"`)

In order:
1. Reject if the email domain is disposable → return `false`.
2. Look up whether the email already exists (new vs returning user).
3. For **new** Google users: require a valid `tt_ok` cookie (read via `next/headers cookies()`) **and** pass the `signupOauthIp` rate limit. Fail either → return `false`. A headless hit on `/api/auth/callback/google` without a solved cookie therefore creates no user and grants nothing.
4. Returning Google users: no added friction (cookie not required).
5. Existing banned-user check stays.
6. Record a `SignupEvent` for new users (best-effort), including the deny outcomes (`denied_disposable`, `denied_captcha`, `denied_ratelimit`).

Denied sign-ins surface as NextAuth `AccessDenied`; the login page maps this to a friendly message ("We couldn't verify your sign-in. Please try again." / disposable-specific copy where distinguishable).

### C. Unified, gated credit grant

- New **`maybeGrantSignupCredits(userId)`**: loads `{ emailVerified, bannedAt }`; grants `FREE_TIER_ALLOTMENT` only when `emailVerified != null && !bannedAt`. Still idempotent on `signup:${userId}`.
- **`events.createUser`** (Google-only, per the structural insight): set `emailVerified = new Date()` (Google has already verified the address) and call `maybeGrantSignupCredits`. By this point the `signIn` callback has already enforced captcha + disposable + rate limit, so the new Google user is legitimate.
- **`jwt` callback**: replace the unconditional `grantSignupCredits` with `maybeGrantSignupCredits`. Password users become eligible on first verified login (they verify before they can authenticate).
- Net: today's two *unconditional* grants become one *gated* grant path, matching the existing email-verification model rather than forking it.

### D. Disposable-email blocking

- **`lib/disposable-email.ts`** (new): loads the maintained `disposable-email-domains` npm package into a `Set`, merged with a local **`lib/disposable-extra.ts`** array for quick manual additions. Exposes `isDisposableEmail(email): boolean`.
- Used in the password signup route (reject 400, clear message) and the Google `signIn` callback (deny).

### E. Rate limiter — `rate-limit.ts`

- In **production** (`NODE_ENV === "production"`): if Upstash env is missing, `console.error` loudly at module load and make `allow()` return `false` (fail **closed**) so the limiter can't be silently off.
- In **dev**: fail-open (no Upstash needed locally).
- Transient Redis errors at call time: log loudly via `console.error`, return `true` (fail-open) to avoid locking everyone out during an Upstash outage.
- Add a **`signupOauthIp`** limiter used by `/api/auth/turnstile` and the Google `signIn` path.

### F. Abuse log — `SignupEvent`

New Prisma model (minimal):

```prisma
model SignupEvent {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  userId          String?  // null if denied before user creation
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

- **`lib/signup-audit.ts`** (new): `recordSignupEvent(...)` — best-effort, wrapped so a failure never blocks signup.
- **`lib/ip-intel.ts`** (new): `lookupIp(ip)` → `{ asn, asnOrg, country, isDatacenter, isProxy } | null` via **ipinfo.io Lite** when `IPINFO_TOKEN` is set (~1.5s timeout, fail silent). Country also taken from Vercel geo headers as a fallback.
- **Retention: 90 days.** New `GET /api/cron/purge-signup-events` deletes rows older than 90 days (the repo already runs crons; register it alongside the others).
- Privacy: stores IPs for fraud prevention — add a line to the privacy policy later (out of scope for this change).

## Files

**New**
- `src/components/auth/Turnstile.tsx`
- `src/app/api/auth/turnstile/route.ts`
- `src/lib/turnstile.ts`
- `src/lib/disposable-email.ts`
- `src/lib/disposable-extra.ts`
- `src/lib/ip-intel.ts`
- `src/lib/signup-audit.ts`
- `src/app/api/cron/purge-signup-events/route.ts`
- one Prisma migration (`SignupEvent`)

**Modified**
- `src/app/signup/page.tsx` — Turnstile on password form + Google button
- `src/app/login/page.tsx` — Turnstile on Google button; map `AccessDenied` to friendly copy
- `src/app/api/auth/signup/route.ts` — Turnstile verify + disposable check + audit
- `src/lib/auth.ts` — `signIn` callback enforcement (disposable + cookie + rate limit + audit) for Google; `events.createUser` sets `emailVerified` and gated grant; `jwt` gated grant
- `src/lib/rate-limit.ts` — fail-closed-in-prod + loud logging + `signupOauthIp`
- `prisma/schema.prisma` — `SignupEvent` model

**Dependency added:** `disposable-email-domains`

## Env vars

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Turnstile site key (public)
- `TURNSTILE_SECRET_KEY` — Turnstile secret (server-side siteverify)
- `IPINFO_TOKEN` — optional; enables ASN/VPN enrichment via ipinfo Lite
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — confirm present in prod (new fail-closed behavior surfaces their absence)
- Reuses existing `AUTH_SECRET` for signing the `tt_ok` cookie.

## Testing / acceptance

1. **Disposable rejected (password):** signup with `x@mailinator.com` → 400 with a clear message; no user created.
2. **Disposable rejected (Google):** Google sign-in with a disposable domain → denied (`AccessDenied`), no user, no credits, `SignupEvent` outcome `denied_disposable`.
3. **Headless Google blocked:** hit `/api/auth/callback/google` (or drive the Google button) **without** solving Turnstile so no `tt_ok` cookie is set → `signIn` denies, no user row, no credit transaction.
4. **Real signup still works:** normal email + solved invisible Turnstile → verification email → verify → first login grants exactly 30 credits, once.
5. **Real Google signup still works:** solve invisible Turnstile → Google → user created with `emailVerified` set, 30 credits granted once.
6. **Rate limiter live in prod:** confirm Upstash env present (startup log is silent when configured, loud when not); 6th password signup within the hour from one IP → 429; Google path throttled via `signupOauthIp`.
7. **Audit rows:** each signup attempt writes a `SignupEvent` with method, ip, emailDomain, outcome, and (when `IPINFO_TOKEN` set) asn/isDatacenter/isProxy.

## Out of scope

- SMS/phone verification.
- Privacy-policy copy update (note for later).
- Retroactively flagging/sweeping existing farmed accounts.
- Gating password *login* with Turnstile (login keeps its existing email+IP rate limit).
