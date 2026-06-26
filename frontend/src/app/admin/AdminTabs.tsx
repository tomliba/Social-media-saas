"use client";

import { useState, useEffect, type ReactNode } from "react";

export interface AdminTabDef {
  id: string;
  label: string;
  icon: string;
  /** Count of attention items in this tab (shows a red pill on the tab). */
  badge?: number;
  content: ReactNode;
}

export interface AdminTriageItem {
  text: string;
  tab: string;
  anchor: string; // e.g. "#cost-margin"
}

function tabLabel(tabs: AdminTabDef[], id: string): string {
  return tabs.find((t) => t.id === id)?.label ?? id;
}

/**
 * Client shell for the admin dashboard.
 *
 * Data is still fetched once on the server (in page.tsx) and every panel is
 * server-rendered; this component only positions those nodes and toggles which
 * tab is visible — so switching is instant with no reload and no extra queries.
 * The KPI strip and triage banner stay pinned above the tabs on every tab; a
 * triage line jumps to the right tab and scrolls to its panel. The active tab is
 * mirrored into ?tab= so a server-action redirect (refund/ban/lookup) returns to
 * the same tab.
 */
export function AdminTabs({
  tabs, initialTab, kpi, triage,
}: {
  tabs: AdminTabDef[];
  initialTab: string;
  kpi: ReactNode;
  triage: AdminTriageItem[];
}) {
  const validIds = tabs.map((t) => t.id);
  const [active, setActive] = useState(
    validIds.includes(initialTab) ? initialTab : tabs[0]?.id
  );

  // Keep ?tab= in the URL (without a navigation) so reloads restore the tab.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") !== active) {
      url.searchParams.set("tab", active);
      window.history.replaceState(null, "", url.toString());
    }
  }, [active]);

  const jump = (tab: string, anchor: string) => {
    setActive(tab);
    // Double rAF: let the target tab become visible before scrolling to it.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.querySelector(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
      })
    );
  };

  return (
    <div className="space-y-5">
      {kpi}

      {/* ── Triage (always visible) ── */}
      <section aria-label="Triage" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className={`material-symbols-outlined ${triage.length ? "text-red-600" : "text-emerald-600"}`}>
            {triage.length ? "warning" : "check_circle"}
          </span>
          <h2 className="font-headline font-bold text-zinc-900">Triage</h2>
          {triage.length > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              {triage.length} issue{triage.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {triage.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800">
            <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
            All clear — no outstanding issues.
          </div>
        ) : (
          <ul className="space-y-2">
            {triage.map((t, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => jump(t.tab, t.anchor)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-left text-sm font-bold text-red-800 transition-colors hover:bg-red-100"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-red-600">error</span>
                    {t.text}
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap text-xs font-bold text-red-600">
                    Go to {tabLabel(tabs, t.tab)}
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Tab nav (sticky) ── */}
      <nav className="sticky top-0 z-10 flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white/90 p-1 shadow-sm backdrop-blur">
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              aria-current={on ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                on ? "bg-primary text-white shadow-sm" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <span className="material-symbols-outlined text-base">{t.icon}</span>
              {t.label}
              {t.badge ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none ${
                    on ? "bg-white/25 text-white" : "bg-red-100 text-red-700"
                  }`}
                >
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* ── Tab panels (only the active one is shown) ── */}
      {tabs.map((t) => (
        <div key={t.id} hidden={t.id !== active} className="space-y-6">
          {t.content}
        </div>
      ))}
    </div>
  );
}
