"use client";

import { useEffect } from "react";
import SidebarContent, { type SidebarData } from "./SidebarContent";
import { logout } from "@/lib/actions/auth";

/**
 * Mobile-only (md:hidden) navigation drawer. Renders the SAME SidebarContent as
 * the desktop sidebar, plus a header (email + close) and a Sign out footer.
 * Panel is w-72 (288px) — wider than the 256px desktop sidebar, so the credit
 * card has at least as much room. Sits at z-[60], above the z-50 top nav.
 * Open/close + route-change-close are owned by DashboardShell.
 */
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
