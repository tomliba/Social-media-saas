"use client";

import { useMemo, useState } from "react";
import {
  ESTIMATOR_ENTRIES,
  estimateCost,
  perPlanEstimate,
  type EstimatorEntry,
} from "@/lib/credits/estimator";

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  creator: "Creator",
  pro: "Pro",
};

export default function CreditEstimator() {
  const [label, setLabel] = useState(ESTIMATOR_ENTRIES[1].label); // default: AI Story
  const entry: EstimatorEntry =
    ESTIMATOR_ENTRIES.find((e) => e.label === label) ?? ESTIMATOR_ENTRIES[0];

  const [value, setValue] = useState(entry.default ?? 0);

  // When the selected format changes, snap the slider to that format's default.
  function onSelect(nextLabel: string) {
    const next = ESTIMATOR_ENTRIES.find((e) => e.label === nextLabel)!;
    setLabel(nextLabel);
    setValue(next.default ?? 0);
  }

  const cost = useMemo(() => estimateCost(entry, value), [entry, value]);
  const cells = useMemo(() => perPlanEstimate(entry, value), [entry, value]);

  const videoEntries = ESTIMATOR_ENTRIES.filter((e) => e.group === "Video");
  const postEntries = ESTIMATOR_ENTRIES.filter((e) => e.group === "Post");

  return (
    <div className="mt-16 mx-auto max-w-2xl bg-surface-container-lowest rounded-[1rem] p-8 border border-surface-variant">
      <h3 className="font-bold text-lg mb-1 text-center">How far do your credits go?</h3>
      <p className="text-center text-on-surface-variant text-sm mb-6">
        Pick a create type to see its credit cost and how many you get per plan.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-6">
        <select
          aria-label="Create type"
          value={label}
          onChange={(e) => onSelect(e.target.value)}
          className="bg-surface-container-highest rounded-md px-4 py-2 font-semibold w-full sm:w-auto"
        >
          <optgroup label="Video">
            {videoEntries.map((e) => (
              <option key={e.label} value={e.label}>{e.label}</option>
            ))}
          </optgroup>
          <optgroup label="Post">
            {postEntries.map((e) => (
              <option key={e.label} value={e.label}>{e.label}</option>
            ))}
          </optgroup>
        </select>

        {entry.kind !== "flat" ? (
          <label className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="range"
              aria-label={`${entry.label} ${entry.unit}`}
              min={entry.min}
              max={entry.max}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="accent-primary flex-1"
            />
            <span className="text-sm font-semibold whitespace-nowrap w-20 text-right">
              {value} {entry.unit}
            </span>
          </label>
        ) : (
          <span className="text-sm text-on-surface-variant">flat rate</span>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 mb-6">
        <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          toll
        </span>
        <span className="text-3xl font-black">{cost.toLocaleString()}</span>
        <span className="text-on-surface-variant">credits each</span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {cells.map((cell) => (
          <div key={cell.plan} className="bg-surface-container-low rounded-md py-3">
            <div className="text-xs uppercase tracking-wide text-on-surface-variant mb-1">
              {PLAN_LABEL[cell.plan]}
            </div>
            <div className="font-bold text-lg">
              {cell.available ? `~${cell.count.toLocaleString()} / mo` : cell.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
