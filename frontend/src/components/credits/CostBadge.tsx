"use client";

/**
 * Small inline "N credits" pill shown next to a create action so the user
 * sees the cost the moment they pick a format/duration/options. Pass the cost
 * computed via videoCost()/postCost(). Optional `suffix` appends extra wording
 * (e.g. "per image") when the cost is per-unit rather than flat.
 */
export default function CostBadge({
  credits,
  suffix,
  className = "",
}: {
  credits: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-primary/10 ring-1 ring-primary/20 px-3 py-1 text-sm font-bold text-primary ${className}`}
      title="Credit cost for this generation"
    >
      <span className="material-symbols-outlined text-base text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>
        toll
      </span>
      {credits.toLocaleString()} {credits === 1 ? "credit" : "credits"}{suffix ? ` ${suffix}` : ""}
    </span>
  );
}
