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
  title, icon, children, note,
}: {
  title: ReactNode;
  icon?: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon && <span className="material-symbols-outlined text-primary">{icon}</span>}
        <h2 className="font-headline font-bold text-zinc-900">{title}</h2>
      </div>
      {children}
      {note && <p className="mt-3 text-xs text-zinc-500">{note}</p>}
    </section>
  );
}

export function Stat({
  label, value, sub,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-zinc-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}
