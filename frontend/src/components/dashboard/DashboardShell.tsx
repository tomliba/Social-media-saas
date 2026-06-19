"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import DashboardNav from "./DashboardNav";
import Sidebar from "./Sidebar";
import MobileNavDrawer from "./MobileNavDrawer";

// Module-level cache of the last fetched balance/plan. Seeding state from this
// cache shows the last-known value immediately (instead of blanking to "—")
// if the shell ever remounts, while the poll revalidates.
let cachedBalance: number | null = null;
let cachedPlan = "free";

/**
 * Client chrome for the whole logged-in app. Owns the single balance/library
 * poll (shared by the desktop sidebar and the mobile drawer) and the drawer
 * open/close state. Mounted once by the (dashboard) layout and persists across
 * navigations.
 */
export default function DashboardShell({ email }: { email: string | null }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [plan, setPlan] = useState<string>(cachedPlan);
  const [balance, setBalance] = useState<number | null>(cachedBalance);
  const [readyCount, setReadyCount] = useState(0);
  const [renderingCount, setRenderingCount] = useState(0);

  // Single poll covering library counts + balance/plan (no duplicate fetches).
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
