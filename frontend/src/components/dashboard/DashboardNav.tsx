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
