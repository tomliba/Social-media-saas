# Mobile Navigation Drawer Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. This plan is executed inline in the same session; the git branch + author diff review is the gate (no merge).

**Goal:** Give logged-in mobile users a working navigation drawer (reusing the existing sidebar) plus an account dropdown with logout, so every page, the credit balance, the Upgrade path, and Sign out are reachable on phones.

**Architecture:** Extract the sidebar's inner markup into a shared presentational `SidebarContent`. A new client `DashboardShell` owns a single data poll and the drawer open/close state, and renders the top nav, the desktop sidebar, and a mobile drawer — all fed the same data. The account icon becomes a real dropdown; the dead bell is removed; a new `logout` server action powers Sign out in the drawer footer and the account dropdown.

**Tech Stack:** Next.js App Router (server + client components), NextAuth v5 (`signOut` server action), Tailwind v4, Material Symbols icon font.

**Branch:** `feat/mobile-nav-drawer` (already created; spec committed there).

---

## File structure

- Create `frontend/src/lib/actions/auth.ts` — `logout()` server action.
- Create `frontend/src/components/dashboard/SidebarContent.tsx` — shared nav body (Creator Hub + links + CreditBalance), props-driven, no positioning.
- Create `frontend/src/components/dashboard/AccountMenu.tsx` — account dropdown (email + Account + Preferences + Sign out).
- Create `frontend/src/components/dashboard/MobileNavDrawer.tsx` — mobile backdrop + slide panel wrapping `SidebarContent` + Sign out footer.
- Create `frontend/src/components/dashboard/DashboardShell.tsx` — client; single poll + drawer state; renders nav/sidebar/drawer.
- Modify `frontend/src/components/dashboard/Sidebar.tsx` — becomes the desktop-only fixed aside wrapper around `SidebarContent`; polling removed.
- Modify `frontend/src/components/dashboard/DashboardNav.tsx` — client; add hamburger (mobile), remove bell, use `AccountMenu`.
- Modify `frontend/src/app/(dashboard)/layout.tsx` — async; read `auth()` email; render `DashboardShell`.

---

## Task 1: Logout server action

**Files:** Create `frontend/src/lib/actions/auth.ts`

- [ ] **Step 1: Create the action**

```tsx
"use server";

import { signOut } from "@/lib/auth";

/** Server action: end the session and return the user to the login page. */
export async function logout() {
  await signOut({ redirectTo: "/login" });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/actions/auth.ts
git commit -m "feat(auth): logout server action (signOut -> /login)"
```

---

## Task 2: SidebarContent (shared nav body)

**Files:** Create `frontend/src/components/dashboard/SidebarContent.tsx`

This is the current `Sidebar` inner markup (Creator Hub + nav + CreditBalance) made presentational. Adds an optional `onNavigate` callback so the mobile drawer can close on link tap.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CreditBalance from "@/components/credits/CreditBalance";

interface NavItem {
  icon: string;
  label: string;
  href: string;
  match: string;
  /** Feature not yet available — rendered greyed-out and non-clickable. */
  comingSoon?: boolean;
}

const navItems: NavItem[] = [
  { icon: "add_circle", label: "Create", href: "/create", match: "/create" },
  { icon: "video_library", label: "Library", href: "/library", match: "/library" },
  { icon: "auto_awesome", label: "Autopilot", href: "/autopilot", match: "/autopilot", comingSoon: true },
  { icon: "manage_accounts", label: "Accounts", href: "/accounts", match: "/accounts" },
  { icon: "settings", label: "Preferences", href: "/preferences", match: "/preferences" },
];

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  creator: "Creator",
  pro: "Pro",
};

export interface SidebarData {
  plan: string;
  balance: number | null;
  readyCount: number;
  renderingCount: number;
}

export default function SidebarContent({
  plan,
  balance,
  readyCount,
  renderingCount,
  onNavigate,
}: SidebarData & { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Creator Hub */}
      <div className="px-6 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary-container/30 flex items-center justify-center text-primary">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
          </div>
          <div>
            <p className="font-headline font-bold text-sm">Creator Hub</p>
            <p className="text-xs text-on-surface-variant">{PLAN_LABELS[plan] ?? "Free"} Plan</p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.match || pathname.startsWith(item.match + "/");
          const isLibrary = item.label === "Library";

          if (item.comingSoon) {
            return (
              <div
                key={item.label}
                aria-disabled="true"
                title="Coming soon"
                className="mx-2 flex items-center gap-3 px-4 py-3 font-medium rounded-xl text-zinc-400 cursor-not-allowed select-none"
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
                <span className="ml-auto bg-zinc-200 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
                  Coming Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={`mx-2 flex items-center gap-3 px-4 py-3 font-medium rounded-xl transition-transform hover:translate-x-1 ${
                isActive
                  ? "bg-violet-100 text-violet-700"
                  : "text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              <span className="material-symbols-outlined relative">
                {item.icon}
                {isLibrary && renderingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
                )}
              </span>
              <span>{item.label}</span>
              {isLibrary && readyCount > 0 && (
                <span className="ml-auto bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {readyCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Credit balance / Upgrade */}
      <CreditBalance balance={balance} />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/dashboard/SidebarContent.tsx
git commit -m "feat(nav): shared SidebarContent (nav body extracted from Sidebar)"
```

---

## Task 3: Desktop Sidebar becomes a props-driven wrapper

**Files:** Modify `frontend/src/components/dashboard/Sidebar.tsx`

Replace the whole file. Polling + cache move to `DashboardShell` (Task 6). Desktop look/position is unchanged (`fixed left-0 top-16 ... w-64 ... hidden md:flex`).

- [ ] **Step 1: Replace file contents**

```tsx
import SidebarContent, { type SidebarData } from "./SidebarContent";

// Desktop-only fixed sidebar. Hidden below md; the SAME content renders in the
// mobile drawer (MobileNavDrawer). Balance/plan/library counts are polled once
// by DashboardShell and passed in, so there is no duplicate fetching.
export default function Sidebar(data: SidebarData) {
  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-zinc-50 hidden md:flex flex-col py-4 space-y-2">
      <SidebarContent {...data} />
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/dashboard/Sidebar.tsx
git commit -m "refactor(nav): Sidebar is a props-driven desktop wrapper (no poll)"
```

---

## Task 4: Account dropdown menu

**Files:** Create `frontend/src/components/dashboard/AccountMenu.tsx`

Replaces the dead `account_circle` button. Same dropdown on desktop and mobile: email, Account, Preferences, Sign out. Closes on outside click / Escape.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logout } from "@/lib/actions/auth";

export default function AccountMenu({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded-full border border-outline-variant/20 hover:bg-zinc-100 transition-colors flex items-center"
      >
        <span className="material-symbols-outlined text-3xl">account_circle</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-outline-variant/10 py-2 z-50"
        >
          {email && (
            <p className="px-4 py-2 text-xs text-on-surface-variant truncate border-b border-outline-variant/10 mb-1">
              {email}
            </p>
          )}
          <Link
            href="/accounts"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            <span className="material-symbols-outlined text-lg">manage_accounts</span>
            Account
          </Link>
          <Link
            href="/preferences"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            Preferences
          </Link>
          <form action={logout} className="border-t border-outline-variant/10 mt-1 pt-1">
            <button
              type="submit"
              role="menuitem"
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/dashboard/AccountMenu.tsx
git commit -m "feat(nav): account dropdown (Account/Preferences/Sign out)"
```

---

## Task 5: Mobile nav drawer

**Files:** Create `frontend/src/components/dashboard/MobileNavDrawer.tsx`

`md:hidden`. Backdrop + left-slide panel (w-72 = 288px, ≥ the 256px desktop sidebar so the credit card has at least as much room). Header (email + close), `SidebarContent` (closes drawer on link tap), Sign out footer. Escape + body-scroll-lock while open. Drawer sits above the nav via `z-[60]` (nav stays `z-50`, untouched).

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect } from "react";
import SidebarContent, { type SidebarData } from "./SidebarContent";
import { logout } from "@/lib/actions/auth";

export default function MobileNavDrawer({
  open,
  onClose,
  email,
  ...data
}: { open: boolean; onClose: () => void; email: string | null } & SidebarData) {
  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <div className="md:hidden" aria-hidden={!open}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`fixed left-0 top-0 z-[60] h-full w-72 bg-zinc-50 flex flex-col py-4 shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header: email + close */}
        <div className="flex items-center justify-between gap-2 px-6 mb-4">
          <p className="text-sm font-medium text-on-surface truncate">
            {email ?? "Account"}
          </p>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-zinc-200 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Shared nav body */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <SidebarContent {...data} onNavigate={onClose} />
        </div>

        {/* Sign out footer */}
        <form action={logout} className="px-4 pt-2">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Sign out
          </button>
        </form>
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/dashboard/MobileNavDrawer.tsx
git commit -m "feat(nav): mobile nav drawer (reuses SidebarContent + Sign out)"
```

---

## Task 6: DashboardNav — hamburger, no bell, account dropdown

**Files:** Modify `frontend/src/components/dashboard/DashboardNav.tsx`

Replace the whole file. Becomes a client component taking `email` + `onMenuClick`. Adds a `md:hidden` hamburger on the left, drops the dead bell, swaps the dead account button for `AccountMenu`. Nav keeps `z-50` (unchanged) so create-flow overlays are unaffected.

- [ ] **Step 1: Replace file contents**

```tsx
"use client";

import Link from "next/link";
import AccountMenu from "./AccountMenu";

export default function DashboardNav({
  email,
  onMenuClick,
}: {
  email: string | null;
  onMenuClick: () => void;
}) {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm flex justify-between items-center px-6 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenuClick}
          className="md:hidden -ml-2 p-2 rounded-full hover:bg-zinc-100 transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <Link
          href="/"
          className="text-2xl font-bold bg-gradient-to-br from-violet-600 to-violet-400 bg-clip-text text-transparent font-headline tracking-tight"
        >
          Fluvio
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/create"
          className="bg-primary text-on-primary px-5 py-2 rounded-full font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          Create
        </Link>
        <AccountMenu email={email} />
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/dashboard/DashboardNav.tsx
git commit -m "feat(nav): hamburger + account dropdown, remove dead bell"
```

---

## Task 7: DashboardShell — single poll + drawer state

**Files:** Create `frontend/src/components/dashboard/DashboardShell.tsx`

Owns the one poll (moved verbatim from the old `Sidebar`, including the module-level cache) and the drawer open/close state. Closes the drawer on route change. Feeds the same data to the desktop sidebar and the mobile drawer.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import DashboardNav from "./DashboardNav";
import Sidebar from "./Sidebar";
import MobileNavDrawer from "./MobileNavDrawer";

// Module-level cache of the last fetched balance/plan, so a remount shows the
// last-known value immediately instead of blanking to "—".
let cachedBalance: number | null = null;
let cachedPlan = "free";

export default function DashboardShell({ email }: { email: string | null }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [plan, setPlan] = useState<string>(cachedPlan);
  const [balance, setBalance] = useState<number | null>(cachedBalance);
  const [readyCount, setReadyCount] = useState(0);
  const [renderingCount, setRenderingCount] = useState(0);

  // Single poll covering library counts + balance/plan (shared by the desktop
  // sidebar and the mobile drawer — no duplicate fetches).
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const [libRes, balRes] = await Promise.all([
          fetch("/api/library"),
          fetch("/api/credits/balance"),
        ]);
        if (cancelled) return;
        if (libRes.ok) {
          const lib = await libRes.json();
          setReadyCount(lib.readyCount ?? 0);
          setRenderingCount(lib.renderingCount ?? 0);
        }
        if (balRes.ok) {
          const bal = await balRes.json();
          cachedPlan = bal.plan ?? "free";
          cachedBalance = bal.balance ?? 0;
          setPlan(cachedPlan);
          setBalance(cachedBalance);
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const data = { plan, balance, readyCount, renderingCount };

  return (
    <>
      <DashboardNav email={email} onMenuClick={() => setDrawerOpen(true)} />
      <Sidebar {...data} />
      <MobileNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        email={email}
        {...data}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/dashboard/DashboardShell.tsx
git commit -m "feat(nav): DashboardShell owns single poll + drawer state"
```

---

## Task 8: Wire the dashboard layout

**Files:** Modify `frontend/src/app/(dashboard)/layout.tsx`

Read the session email server-side and hand the chrome to `DashboardShell`. The layout still wraps every dashboard route, so `DashboardShell` mounts once and persists across navigations (poll keeps running) — same property the shared layout was built for.

- [ ] **Step 1: Replace file contents**

```tsx
import { auth } from "@/lib/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";

// Shared chrome for the whole logged-in app (Create, Library, Accounts,
// Preferences, Autopilot, the /dashboard redirect). DashboardShell renders the
// top nav, the desktop sidebar, and the mobile drawer, and owns the single
// balance/library poll + drawer state. It mounts ONCE here and persists across
// navigations; only the page content below swaps. The per-segment content
// wrappers ((padded), create/) keep the md:ml-64 offset for the fixed sidebar.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <>
      <DashboardShell email={session?.user?.email ?? null} />
      {children}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "frontend/src/app/(dashboard)/layout.tsx"
git commit -m "feat(nav): wire DashboardShell into the dashboard layout"
```

---

## Task 9: Typecheck + production build

**Files:** none (gate)

- [ ] **Step 1: Typecheck**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no errors. (Watch for prop-shape mismatches between `SidebarData` and the shell.)

- [ ] **Step 2: Production build**

Run (from `frontend/`): `npm run build`
Expected: build completes; `(dashboard)` routes compile. The shared memory note warns `next build` type-checks e2e configs — if an unrelated pre-existing failure appears, confirm it is not from these files before proceeding.

---

## Task 10: Live verification at 390px + desktop (the four checks + screenshots)

**Files:** none (verification)

Run the local dev server against the shared Neon DB (`.env` already has `DATABASE_URL` + `AUTH_SECRET`). If credential login fails locally, set `AUTH_URL=http://localhost:3000` and `AUTH_TRUST_HOST=true` for the dev process and retry.

- [ ] **Step 1: Start dev server**

Run (from `frontend/`, background): `npm run dev` → wait for `http://localhost:3000`.

- [ ] **Step 2: Phone viewport + login**

```bash
playwright-cli open --browser=chrome
playwright-cli resize 390 844
playwright-cli goto http://localhost:3000/login
# fill QA creds (from .env.overnight): tomliba1996+fluvioqa1@gmail.com / Fluvio-QA-9x7k2m4p
# submit, expect to land on /create
```

- [ ] **Step 2: Check 2 — single poll (no duplicates).** After landing on `/create`, before the 15s interval fires, count network requests:

```bash
playwright-cli --raw eval "JSON.stringify(performance.getEntriesByType('resource').filter(e=>/\\/api\\/(library|credits\\/balance)/.test(e.name)).map(e=>e.name.replace(location.origin,'')))"
```
Expected: exactly one `/api/library` and one `/api/credits/balance` (not two of either).

- [ ] **Step 3: Screenshot — drawer open.** Tap the hamburger; confirm the drawer shows Create/Library/Autopilot/Accounts/Preferences, the credit balance card, the Upgrade button, and Sign out; no horizontal overflow.

```bash
playwright-cli click "getByRole('button', { name: 'Open menu' })"
playwright-cli --raw eval "JSON.stringify({overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth})"
playwright-cli screenshot --filename=verify-390-drawer-open.png
```

- [ ] **Step 4: Check 4 — credit card at drawer width.** With the drawer open, confirm the `CreditBalance` card fits the 288px panel with no clipping/overflow:

```bash
playwright-cli --raw eval "(() => { const a=document.querySelector('aside[aria-label=Navigation]'); const card=a && a.querySelector('a[href=\"/pricing\"]'); if(!card) return 'no card'; const cr=card.getBoundingClientRect(); const ar=a.getBoundingClientRect(); return JSON.stringify({cardRight: Math.round(cr.right), panelRight: Math.round(ar.right), withinPanel: cr.right <= ar.right + 0.5}); })()"
```
Expected: `withinPanel: true`.

- [ ] **Step 5: Screenshot — mid-nav.** From the open drawer, tap Library; confirm the drawer auto-closes and `/library` renders.

```bash
playwright-cli click "getByRole('link', { name: 'Library' })"
playwright-cli --raw eval "JSON.stringify({url: location.pathname})"
playwright-cli screenshot --filename=verify-390-mid-nav.png
```

- [ ] **Step 6: Check 3 + Screenshot — logout drops session.** Open the account menu, Sign out, expect `/login`. Then attempt `/accounts` and confirm it bounces back to `/login` (session genuinely gone).

```bash
playwright-cli click "getByRole('button', { name: 'Account menu' })"
playwright-cli click "getByRole('menuitem', { name: 'Sign out' })"
playwright-cli --raw eval "JSON.stringify({afterLogout: location.pathname})"   # expect /login
playwright-cli goto http://localhost:3000/accounts
playwright-cli --raw eval "JSON.stringify({protected: location.pathname})"      # expect /login
playwright-cli screenshot --filename=verify-390-after-logout.png
```

- [ ] **Step 7: Check 1 — desktop regression.** Log back in, resize to desktop, confirm the sidebar + nav look/behave as before and there is still a single poll.

```bash
playwright-cli resize 1280 800
playwright-cli goto http://localhost:3000/create
# expect: fixed left sidebar visible, no hamburger, Create + account icon in nav
playwright-cli --raw eval "JSON.stringify(performance.getEntriesByType('resource').filter(e=>/\\/api\\/(library|credits\\/balance)/.test(e.name)).length)"  # expect 2 (one each)
playwright-cli screenshot --filename=verify-desktop-create.png
playwright-cli close
```

- [ ] **Step 8: Stop dev server.**

---

## Self-review notes

- Spec coverage: drawer (T5) reusing sidebar (T2/T3), single poll in shell (T7), account dropdown (T4), bell removed (T6), logout in drawer footer (T5) + account menu (T4) via server action (T1), Upgrade reachable via drawer CreditBalance (T2) + account→/accounts (T4), trigger far-left hamburger (T6). All covered.
- Type consistency: `SidebarData` defined once in `SidebarContent.tsx` and imported by `Sidebar`, `MobileNavDrawer`, `DashboardShell`. `logout` signature identical in both consumers.
- Verification maps 1:1 to the four required checks plus the four required screenshots.
