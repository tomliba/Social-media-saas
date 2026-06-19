"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logout } from "@/lib/actions/auth";

/**
 * Account dropdown in the top nav (desktop + mobile). Replaces the previously
 * dead account_circle button. Holds the signed-in email and the links a logged
 * in user needs from anywhere: Account, Preferences, and Sign out. Closes on
 * outside click or Escape.
 */
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
