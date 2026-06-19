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

// Map the stored plan value to a clean display label.
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

/**
 * Presentational nav body shared by the desktop Sidebar and the mobile
 * MobileNavDrawer. The balance/plan/library counts are polled once by
 * DashboardShell and passed in, so this component never fetches. `onNavigate`
 * lets the drawer close itself when a link is tapped.
 */
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

          // Not-yet-available feature: render greyed-out, non-clickable, with a badge.
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
