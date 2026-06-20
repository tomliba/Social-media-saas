# E2E: create-video flow (live, session-minted)

Drives the real create-video flow on the deployed app as a logged-in user and
asserts the video lands **ready** in the library — exercising the whole chain:

```
create UI → Trigger.dev dispatch → Flask render (Railway) → completion callback → ContentItem "ready"
```

Auth stays **Google-only** in the app. The test does not add a dev-login
bypass; instead `e2e/global-setup.ts` forges the same Auth.js (NextAuth v5) JWT
session cookie the app would issue, signed with the production `AUTH_SECRET`,
and saves it as Playwright `storageState`. Every test then runs pre-authenticated.

## One-time setup

Create `frontend/.env.test` (gitignored — never commit, never paste anywhere shared):

```ini
AUTH_SECRET=<the production AUTH_SECRET from Vercel>
E2E_BASE_URL=https://social-media-saas-9xq4.vercel.app
E2E_USER_EMAIL=tomliba1996@gmail.com
E2E_USER_ID=cmq8asgn300005w91yw84xrqd
DATABASE_URL=<production Neon URL, for verifying the result>
```

- `AUTH_SECRET` **must** match production, or the minted cookie is rejected
  (global-setup fails fast with a clear message).
- `DATABASE_URL` is used only to poll the `ContentItem` status for the assertion.
- If `AUTH_SECRET` ever leaks, rotate it in Vercel immediately.

Install the browser once if needed:

```bash
npx playwright install chromium
```

## Run it

```bash
npm run test:e2e            # headless
npm run test:e2e:headed     # watch it drive the browser
```

What happens:
1. `global-setup` mints the session → `e2e/.auth/state.json` and probes `/create`
   to confirm the session is accepted.
2. `create-video.spec.ts` opens `/create/video-setup`, pastes a script, accepts
   the defaults (Doctor presenter, Smart Mix background), clicks **Accept and
   create**, then polls the DB until the new `ContentItem` is `ready` (with a
   `videoUrl`) or `failed`.

A run costs the test user credits (one `smart_mix` video). The user has a credit
balance; top up if a run reports `insufficient_credits`.

## Files

| File | Purpose |
| --- | --- |
| `playwright.e2e.config.ts` | Live config: testDir `e2e/`, globalSetup, storageState |
| `e2e/global-setup.ts` | Mints the Auth.js session cookie into storageState |
| `e2e/create-video.spec.ts` | The create-flow test + DB-based readiness check |
| `.env.test` | Secrets (gitignored) |
| `e2e/.auth/state.json` | Minted session (gitignored, regenerated each run) |

## Niche regression test (hermetic, local)

`niche.spec.ts` guards the user-chosen niche behavior (first-use modal,
empty-niche Generate gating + nudge, and per-flow pre-fill). Unlike the live
create-video test, it is **hermetic**: it runs against a local dev server and
**stubs `/api/preferences`** in the browser (empty vs saved niche), so it never
reads or writes the real account's niche and makes **no DB changes** — important
because the E2E user is a real account.

```bash
npm run test:e2e:niche
```

- `playwright.niche.config.ts` boots `npm run dev` (reusing a running one) and
  mints a **local-http** session via `e2e/niche.setup.ts`.
- AUTH_SECRET is taken from `.env` (the local dev server's secret), with
  `E2E_USER_ID` / `E2E_USER_EMAIL` from `.env.test`.
- No credits are spent (it never clicks Generate or Save).
