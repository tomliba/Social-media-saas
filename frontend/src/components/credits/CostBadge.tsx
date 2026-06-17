"use client";

/**
 * Small inline "N credits" badge shown next to a create action so the user
 * sees the cost the moment they pick a format/duration/options. Pass the cost
 * computed via videoCost()/postCost().
 */
export default function CostBadge({
  credits,
  className = "",
}: {
  credits: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant ${className}`}
      title="Credit cost for this generation"
    >
      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
        toll
      </span>
      {credits.toLocaleString()} {credits === 1 ? "credit" : "credits"}
    </span>
  );
}
