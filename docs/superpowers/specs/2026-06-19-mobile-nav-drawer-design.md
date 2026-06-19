# Mobile navigation drawer — design

Date: 2026-06-19
Status: Proposed (awaiting review)

## Problem

On phones (tested live at 390px, iPhone 14), a logged-in user can only reach
`/create`. The sidebar that holds Library, Autopilot, Accounts, Preferences,
the credit balance, and the Upgrade card is `hidden md:flex` in
`src/components/dashboard/Sidebar.tsx:76` with **no mobile replacement** — no
hamburger, no drawer, no bottom bar. The top bar's `notifications` and
`account_circle` buttons in `src/components/dashboard/DashboardNav.tsx:16-23`
are bare `<button>`s with no handler, so they do nothing on any screen size.

Net effect: a phone visitor (≈all traffic, since it comes from Instagram) can
sign up and start one create flow, then cannot reach their Library, connect or
manage Accounts, change Preferences, see their credit balance, upgrade, or log
out. Every destination page itself renders cleanly at 390px — they are simply
unreachable.

Two findings raise the stakes:

1. **There is no logout anywhere in the app today** — not in the nav, not on
   `/accounts`. `signOut` is only wired into the logged-out pages. This change
   introduces the first working logout, for both mobile and desktop.
2. The whole logged-in chrome already lives in one shared
   `src/app/(dashboard)/layout.tsx` so it mounts once and persists across
   navigations. A drawer added there inherits that behavior.

## Approach: slide-out drawer that reuses the sidebar

A drawer, not a bottom tab bar. A bottom bar holds ~4–5 destinations but cannot
cleanly carry the Creator Hub header, the live credit balance, the Upgrade
card, and logout — precisely what mobile users are cut off from. A drawer
reuses the existing sidebar 1:1, giving mobile feature-parity with desktop and
leaving one nav to maintain. A bottom bar can be layered on later if desired;
it is not needed to unblock people and is out of scope here.

## Component structure

Today `Sidebar.tsx` mixes three concerns: data polling, desktop layout
(`hidden md:flex` fixed aside), and the nav markup. Split so the markup is
shared between desktop and mobile:

- **`SidebarContent`** (new, presentational, `src/components/dashboard/SidebarContent.tsx`)
  Creator Hub header (plan label) + nav links (Create, Library, Autopilot
  [coming soon], Accounts, Preferences) + `CreditBalance` (the Upgrade card).
  Receives `{ plan, balance, readyCount, renderingCount }` as props. No
  fetching, no layout-positioning classes of its own. **No Sign out** — logout
  is added by the drawer footer (mobile) and the account dropdown only, so the
  desktop sidebar stays as it is today.

- **`DashboardShell`** (new, client, `src/components/dashboard/DashboardShell.tsx`)
  Owns the single data poll moved out of `Sidebar` (`/api/library` +
  `/api/credits/balance`, the existing 15s interval and module-level cache),
  and owns `drawerOpen` state. Renders the top nav, the desktop sidebar, and the
  mobile drawer, feeding all three the same polled data. This prevents the
  double-poll that would otherwise occur from mounting the sidebar markup twice.

- **Desktop sidebar**: the existing `hidden md:flex` fixed `<aside>` now renders
  `<SidebarContent/>`. Look and position unchanged.

- **`MobileNavDrawer`** (new, client, `src/components/dashboard/MobileNavDrawer.tsx`)
  `md:hidden`. A backdrop + left-slide panel containing a header row (close ✕ +
  signed-in email), `<SidebarContent/>`, and a **Sign out** footer. Closes on
  backdrop tap, Escape,
  selecting any link, and on route change (`usePathname` effect). Focus trapped
  while open; `menu` trigger gets `aria-expanded` / `aria-controls`. Body scroll
  locked while open.

`src/app/(dashboard)/layout.tsx` changes from rendering `<DashboardNav/>` +
`<Sidebar/>` directly to rendering `<DashboardShell>{children}</DashboardShell>`
(or the shell as a sibling of `{children}`), preserving the "mounts once,
persists across navigation" property. The `md:ml-64` content offsets in the
`(padded)` and `create` layouts stay desktop-only, so nothing shifts on phones.

## Top bar

`DashboardNav` becomes a client component (it now needs handlers + a dropdown).

- Mobile bar: **☰  Fluvio · · · Create · 👤**. Hamburger (`menu`) far-left, the
  universal position. Create stays — it is the primary CTA and the funnel
  entry. The notifications bell is removed (see Dead buttons). The account icon
  becomes a dropdown trigger.
- Desktop bar: unchanged layout; the account icon gains the same dropdown.

## Dead buttons

- **Notifications bell** — removed for now. There is no notifications backend,
  so any wiring would be a placeholder. Re-add when a real notifications feature
  exists.
- **Account icon (`account_circle`)** — becomes a real profile dropdown,
  identical on desktop and mobile: signed-in email, link to Account
  (`/accounts`), link to Preferences (`/preferences`), and **Sign out**. This
  also gives desktop its first logout.

## Logout

New server action (e.g. `src/lib/actions/logout.ts`, `"use server"`) calling
`signOut({ redirectTo: "/login" })` from `@/lib/auth`. Rendered as
`<form action={logout}><button>Sign out</button></form>`. No `SessionProvider`
needed in the dashboard (it has none today). Sign out appears in **two** places:
the **drawer footer** (mobile) and the **account dropdown** (desktop + mobile).

## Upgrade / billing path (explicitly preserved)

Two reachable routes on mobile after this change, both previously unreachable:

1. **Upgrade card in the drawer** — `CreditBalance` → `/pricing`.
2. **Account** via the account dropdown — `/accounts` → Manage Subscription /
   Buy Credits.

## Out of scope

- Notifications feature/backend (bell stays removed).
- Bottom tab bar.
- Any redesign of the destination pages — they already render cleanly at 390px.
- Desktop sidebar visual changes beyond sourcing markup from `SidebarContent`.

## Testing / verification

- Re-run the 390px Playwright walk: from `/create`, open the drawer, navigate to
  Library, Accounts, Preferences; confirm credit balance shows and Upgrade →
  `/pricing` works; confirm Sign out lands on `/login` and the session is
  dropped.
- Confirm no horizontal overflow at 390px with the drawer open and closed.
- Desktop regression: sidebar unchanged, account dropdown logout works, single
  poll only (no duplicate `/api/library` / `/api/credits/balance` calls).
- The existing overnight `auth.spec.ts` logout test (currently skips when no
  sign-out control is visible) should now find and exercise the control.
