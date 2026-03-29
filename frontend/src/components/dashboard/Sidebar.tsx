"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { icon: "home", label: "Home", href: "/dashboard", match: "/dashboard" },
  { icon: "add_circle", label: "Create", href: "/create", match: "/create" },
  { icon: "auto_awesome", label: "Autopilot", href: "/autopilot", match: "/autopilot" },
  { icon: "manage_accounts", label: "Accounts", href: "/accounts", match: "/accounts" },
  { icon: "settings", label: "Preferences", href: "/preferences", match: "/preferences" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-zinc-50 hidden md:flex flex-col py-4 space-y-2">
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
            <p className="text-xs text-on-surface-variant">Pro Plan</p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.match || pathname.startsWith(item.match + "/");
          return (
          <Link
            key={item.label}
            href={item.href}
            className={`mx-2 flex items-center gap-3 px-4 py-3 font-medium rounded-xl transition-transform hover:translate-x-1 ${
              isActive
                ? "bg-violet-100 text-violet-700"
                : "text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
          );
        })}
      </nav>

      {/* Usage / Upgrade */}
      <div className="px-4 mt-auto">
        <div className="bg-surface-container-highest p-4 rounded-xl mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Usage: 80%
            </span>
            <span className="material-symbols-outlined text-sm text-primary">
              bar_chart
            </span>
          </div>
          <div className="w-full bg-outline-variant/20 h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full w-[80%]" />
          </div>
          <button className="w-full mt-4 py-2 text-sm font-bold text-primary bg-white rounded-lg shadow-sm">
            Upgrade Plan
          </button>
        </div>
      </div>
    </aside>
  );
}
