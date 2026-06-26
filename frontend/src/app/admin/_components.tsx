import type { ReactNode } from "react";

export function fmtUsd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
export function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}
export function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}
export function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Marks a figure as inferred (not a measured/stored number). */
export function Est() {
  return (
    <span
      title="Estimated — inferred from credit rates, not a measured provider cost."
      className="ml-1 inline-block align-middle rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700"
    >
      est.
    </span>
  );
}

/** Badge showing how much of a cost figure is measured vs estimated. */
export function CoverageBadge({ measured, total }: { measured: number; total: number }) {
  if (total === 0) return null;
  if (measured === total) {
    return <span className="ml-1 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700" title="All renders have a measured provider cost.">measured</span>;
  }
  if (measured === 0) {
    return <span className="ml-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700" title="No measured cost yet — credit-rate estimate.">est.</span>;
  }
  return <span className="ml-1 inline-block rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700" title={`${measured} of ${total} renders measured; the rest estimated.`}>{measured}/{total} meas.</span>;
}

export function Panel({
  title, icon, children, note, id,
}: {
  title: ReactNode;
  icon?: string;
  children: ReactNode;
  note?: ReactNode;
  /** Optional anchor id so the triage banner can deep-link to this panel. */
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon && <span className="material-symbols-outlined text-primary">{icon}</span>}
        <h2 className="font-headline font-bold text-zinc-900">{title}</h2>
      </div>
      {children}
      {note && <p className="mt-3 text-xs text-zinc-500">{note}</p>}
    </section>
  );
}

// ── Stat tone (good/warn/bad) for threshold coloring ─────────────────────────
export type StatTone = "good" | "warn" | "bad";

const TONE_CLASS: Record<StatTone, string> = {
  good: "text-emerald-700",
  warn: "text-amber-600",
  bad: "text-red-600",
};

/** Higher is worse: bad ≥ crit, warn ≥ warn, else good. (e.g. error rate) */
export function toneAbove(value: number, warn: number, crit: number): StatTone {
  if (value >= crit) return "bad";
  if (value >= warn) return "warn";
  return "good";
}

/** Higher is better: good ≥ target, warn ≥ warn, else bad. (e.g. conversion %) */
export function toneBelow(value: number, warn: number, target: number): StatTone {
  if (value >= target) return "good";
  if (value >= warn) return "warn";
  return "bad";
}

export function Stat({
  label, value, sub, tone,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  /** Optional threshold color for the value. Omit for the default neutral look. */
  tone?: StatTone;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${tone ? TONE_CLASS[tone] : "text-zinc-900"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

/**
 * Compact headline metric for the always-visible KPI strip at the top of the
 * dashboard. Smaller than Stat; optional threshold tone + a delta line.
 */
export function Kpi({
  label, value, tone, delta, icon,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: StatTone;
  delta?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
        {icon && <span className="material-symbols-outlined text-sm text-zinc-400">{icon}</span>}
        {label}
      </div>
      <div className={`mt-0.5 text-xl font-extrabold ${tone ? TONE_CLASS[tone] : "text-zinc-900"}`}>{value}</div>
      {delta && <div className="mt-0.5 text-[11px] leading-tight">{delta}</div>}
    </div>
  );
}

/**
 * Period-over-period delta badge: "▲ +X% vs last week". The arrow always shows
 * the real direction; the COLOR shows good/bad. By default up = good (green),
 * down = bad (red). Pass `invert` for metrics where rising is bad (e.g. credit
 * spend / cost): then up = red, down = green. Flat / no-baseline = neutral.
 * Renders "new"/"—" when there is no prior-period baseline (pctChange === null).
 */
export function Delta({
  current, prior, pctChange, invert = false, className = "",
}: {
  current: number;
  prior: number;
  pctChange: number | null;
  /** When true, an increase is treated as bad (red) and a decrease as good (green). */
  invert?: boolean;
  className?: string;
}) {
  if (pctChange === null) {
    return (
      <span className={`font-bold text-zinc-400 ${className}`} title={`${current} vs 0 prior 7d`}>
        {current > 0 ? "new vs last week" : "— vs last week"}
      </span>
    );
  }
  const flat = Math.abs(pctChange) < 0.05;
  const up = pctChange > 0;
  // Arrow = direction; color = good/bad (flips with `invert`).
  const isGood = up ? !invert : invert;
  const cls = flat ? "text-zinc-400" : isGood ? "text-emerald-600" : "text-red-600";
  const arrow = flat ? "→" : up ? "▲" : "▼";
  const sign = pctChange > 0 ? "+" : "";
  return (
    <span className={`font-bold ${cls} ${className}`} title={`${current} vs ${prior} prior 7d`}>
      {arrow} {sign}{pctChange.toFixed(1)}% vs last week
    </span>
  );
}
