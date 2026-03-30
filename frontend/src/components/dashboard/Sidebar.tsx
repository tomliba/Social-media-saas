"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { icon: "home", label: "Home", href: "/dashboard", match: "/dashboard" },
  { icon: "add_circle", label: "Create", href: "/create", match: "/create" },
  { icon: "video_library", label: "Library", href: "/library", match: "/library" },
  { icon: "auto_awesome", label: "Autopilot", href: "/autopilot", match: "/autopilot" },
  { icon: "manage_accounts", label: "Accounts", href: "/accounts", match: "/accounts" },
  { icon: "settings", label: "Preferences", href: "/preferences", match: "/preferences" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [readyCount, setReadyCount] = useState(0);
  const [renderingCount, setRenderingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchCounts = async () => {
      try {
        const res = await fetch("/api/library");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setReadyCount(data.readyCount ?? 0);
        setRenderingCount(data.renderingCount ?? 0);
      } catch {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

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
          const isLibrary = item.label === "Library";
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
