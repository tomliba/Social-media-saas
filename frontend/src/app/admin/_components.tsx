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
