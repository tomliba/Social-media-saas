# Email/Password Auth — Phase 1 Design

- **Date:** 2026-06-11
- **Status:** Approved (brainstorm) — pending spec review
- **Scope:** Phase 1 of 2. Phase 2 (admin UI, free-usage credit bypass, grant/adjust credits) is out of scope here.

## Context & goal

The app uses NextAuth v5 (Auth.js) with Google OAuth, a Prisma adapter, and 30-day JWT sessions. A dev-only Credentials provider was temporarily extended into a secret-gated production login (commit `a1ea25b`); that approach is being abandoned.

Phase 1 replaces it with **public email/password accounts alongside Google**, including email verification and self-serve password reset (via Resend), plus **admin role plumbing** derived from an `ADMIN_EMAILS` allowlist and surfaced on `session.user`. Google sign-in and the 30-day JWT session behavior are unchanged.

## Non-goals (Phase 2)

- Admin area / user-list UI
- Free usage (credit-charge bypass) for admins
- Granting/adjusting credits
- "Add a password to a Google account" / account linking
- Resend-verification-email re-trigger flow (see Decisions)

## Architecture & boundaries

**Edge vs Node split (load-bearing constraint).** `src/middleware.ts` runs on the edge and imports `src/lib/auth.config.ts`. Therefore `auth.config.ts` must stay free of bcrypt, Prisma, and Resend. It keeps only the Google provider and the `authorized` callback. The password-checking Credentials provider, hashing, DB access, token logic, and email sending all live on the **Node side**: `src/lib/auth.ts`, the new `src/lib/*` helpers, and the route handlers.

Admin role is a pure string check against `ADMIN_EMAILS`, so it is edge-safe and is embedded in the JWT.

**Small single-purpose libs:**
- `password.ts` — hash/verify (bcryptjs)
- `tokens.ts` — create/validate single-use, short-expiry tokens (random, stored hashed)
- `email.ts` — Resend client + `sendVerificationEmail`, `sendPasswordResetEmail`
- `admin.ts` — `isAdminEmail(email)` / role resolution
- `rate-limit.ts` — Upstash-backed limiters

## Data model (new migration `add_password_auth`)

- `User.password String?` — bcrypt hash; `null` for Google-only users.
- New model `PasswordResetToken` — `id`, `userId` (FK), `tokenHash` (random token hashed at rest), `expires DateTime`, `consumedAt DateTime?`. Single-use.
- Email verification reuses the existing `VerificationToken` model (identifier = email), single-use, short expiry.

## Security requirements → mechanisms

- **Password hashing:** `bcryptjs` (pure-JS, no native build issues on Vercel serverless), cost factor 12.
- **Minimum password length:** **≥ 8 characters**, enforced on both signup and password reset. Rejected with a generic validation error.
- **Single-use, short-expiry tokens:** verification = 24h; reset = 30 min. Tokens are random (≥ 32 bytes), stored **hashed**, compared in constant time, and **deleted/marked consumed on first use**. Expired or consumed tokens are rejected.
- **Rate limiting (Upstash):** see below.
- **No user enumeration:** `signup`, `request-reset`, and `verify` return a generic, identical response whether or not the email exists / is already registered / is valid. Login returns a single generic "invalid email or password" for both unknown email and wrong password. An unverified-but-correct login returns a distinct "please verify your email" (not enumeration — the caller already proved the password).
- **Email-taken is a strict no-op (explicit requirement):** if a signup email already exists in any form (Google-only account, or an existing email/password account, verified or not), the signup handler performs **no writes at all** — it does **not** set or overwrite a password, does **not** attach to or modify the existing (e.g. Google) account, does **not** create or link an `Account` row, and does **not** issue a token against it. It simply returns the generic success response. This guarantees email/password signup can never take over or alter a Google account. Covered by an explicit test.

## Auth flows

### Signup — `POST /api/auth/signup`
1. Validate email format and password length (≥ 8). Generic 400 on validation failure.
2. Rate-limit (per IP).
3. Look up the email. **If it exists → strict no-op**, return generic success (per above).
4. Otherwise: create `User` with bcrypt-hashed `password`, `emailVerified = null`.
5. Issue a `VerificationToken` (24h, hashed), send verification email via Resend.
6. Return generic success ("Check your email to verify your account").

Signup credits are granted on first successful login via the existing idempotent `grantSignupCredits` path in the `jwt` callback (unchanged).

### Verify — `GET /verify?token=…`
- Validate the single-use token (exists, not expired). Set `User.emailVerified = now()`, delete the token, redirect to `/login?verified=1`. Invalid/expired → redirect to `/login?error=verification`.

### Login (Credentials provider in `auth.ts`)
- `authorize`: rate-limit by email; look up user; if no user **or no password set** (Google-only) → generic failure (no enumeration); bcrypt-compare; if `emailVerified` is null → "please verify your email"; else return the user. Google and JWT behavior untouched.

### Forgot password — `POST /api/auth/request-reset`
- Validate email; rate-limit (per email + per IP). If a user exists **and has a password** (i.e. an email/password account), issue a `PasswordResetToken` (30 min, hashed) and email the reset link. Google-only or non-existent emails: no email sent. **Always** return the same generic response. (Reset never sets a password on a Google-only account — consistent with the no-op guarantee.)

### Reset — `POST /api/auth/reset`
- Validate new password length (≥ 8); rate-limit. Validate the single-use, unexpired token; set the new bcrypt hash; mark the token consumed. Generic success or generic invalid-token error.

### Admin plumbing
- `jwt`/`session` callbacks set `role: "admin" | "user"` from `isAdminEmail(email)` (`ADMIN_EMAILS`, comma-separated). `src/types/next-auth.d.ts` augments `session.user` with `role`. No route/feature gating in Phase 1.

### Google + existing-password collision (no account linking)
- Account linking stays **disabled** (`allowDangerousEmailAccountLinking` is never set). When someone signs in with Google using an email already registered with a password, NextAuth throws `OAuthAccountNotLinked`; the login page surfaces a clear, actionable message: "This email is already registered with a password. Please sign in with your password." No automatic linking or account modification occurs.

## Rate limiting (Upstash)

`@upstash/ratelimit` + `@upstash/redis`, sliding window. Limiters in `rate-limit.ts`:
- **login:** 5 / 15 min per email **and** 20 / 15 min per IP. The per-IP limit curbs credential stuffing across many emails; combining it with the per-email limit avoids relying on email-only limiting, which alone would let an attacker lock a victim out (DoS) and wouldn't slow stuffing. Auth.js v5 passes the request to `authorize`, so the client IP is read from `x-forwarded-for`.
- **request-reset:** 3 / hour per email, and 10 / hour per IP
- **signup:** 5 / hour per IP
- **reset (submit):** 10 / hour per IP

On limit exceeded: generic 429 ("Too many attempts, please try again later"). Requires a free Upstash Redis DB and env vars `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

## Files

**Revert (undo `a1ea25b`)**
- `src/lib/auth.config.ts` — remove the dev-login secret Credentials block (back to Google-only base + `authorized`)
- `src/app/login/page.tsx` — remove dev-login/secret UI (rebuilt below)

**New**
- `prisma/schema.prisma` edits + `prisma/migrations/<ts>_add_password_auth/`
- `src/lib/password.ts`, `src/lib/tokens.ts`, `src/lib/email.ts`, `src/lib/admin.ts`, `src/lib/rate-limit.ts`
- `src/types/next-auth.d.ts`
- `src/app/api/auth/signup/route.ts`, `src/app/api/auth/request-reset/route.ts`, `src/app/api/auth/reset/route.ts`
- `src/app/verify/route.ts`
- `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx`
- Tests: `src/lib/__tests__/password.test.ts`, `tokens.test.ts`, `admin.test.ts`, `signup-email-taken-noop.test.ts`, `no-enumeration.test.ts`

**Modified**
- `src/lib/auth.ts` — Credentials provider (bcrypt + verified check + login rate-limit); role in `jwt`/`session`
- `src/app/login/page.tsx` — real email+password form + "Forgot password?" link (keep Google)
- `src/app/signup/page.tsx` — email+password signup form (keep Google)
- `.env.example` — document new vars

## Environment variables (set on Vercel)

- `RESEND_API_KEY`, `EMAIL_FROM`
- `ADMIN_EMAILS` (comma-separated)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Email links use the existing `NEXT_PUBLIC_APP_URL`.

## Deploy-time steps (must not be missed)

1. **Apply the Prisma migration to Neon prod:** `prisma migrate deploy` — the Vercel build only runs `prisma generate`, so the `add_password_auth` migration will **not** auto-apply. Without it, signup/login error in prod.
2. **Verify the Resend sending domain** (DNS/SPF/DKIM for `EMAIL_FROM`) before relying on verification/reset emails — unverified domains silently fail or land in spam.

## Testing

- Unit: bcrypt hash/verify round-trip; token create → single-use → reject-on-reuse → reject-on-expiry; `isAdminEmail` parsing (case/space/empty).
- Behavioral: signup with an already-registered email is a true no-op (asserts no write to the existing user/account, no password set); signup/request-reset return identical generic responses for existing vs non-existing emails (no enumeration); password length < 8 rejected on signup and reset.

## Decisions / explicitly deferred

- Re-sending a verification email for an unverified existing account is **deferred** (kept strictly no-op in Phase 1).
- "Add password to a Google account" via reset is **not supported** in Phase 1 (intentional, preserves the no-op guarantee).
- **Session invalidation after password reset is deferred to Phase 2 hardening (decided 2026-06-11).** With JWT sessions, a reset does not invalidate existing sessions for up to ~30 days. Correct enforcement needs a `passwordChangedAt` field + a per-request check in the session callback (or database sessions), which imposes a per-request DB read and pairs with "log out other sessions" UX. Residual risk accepted for Phase 1.
