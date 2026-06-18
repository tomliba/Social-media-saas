# Credit Estimator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive public credit estimator to the pricing section so prospects can pick a create type and size and see the credit cost plus how many they get per plan.

**Architecture:** A pure logic module (`estimator.ts`) holds the format catalog and all cost/per-plan/gating math, fully unit-tested with no rendering. A thin client component (`CreditEstimator.tsx`) renders the dropdown + adaptive slider and reads from that module. `PricingSection` renders the component below its tier grid. All credit numbers come from the existing `config.ts` — nothing is hardcoded.

**Tech Stack:** Next.js (App Router) client component, TypeScript, Tailwind v4, Vitest. Test runner: `npm test` (`vitest run`).

---

### Task 1: Estimator logic module (pure, tested)

**Files:**
- Create: `frontend/src/lib/credits/estimator.ts`
- Test: `frontend/src/lib/credits/__tests__/estimator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/credits/__tests__/estimator.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  ESTIMATOR_ENTRIES,
  estimateCost,
  perPlanEstimate,
  findEntry,
} from "@/lib/credits/estimator";

describe("estimateCost", () => {
  it("AI Story at 30s costs 8 credits", () => {
    const entry = findEntry("AI Story");
    expect(estimateCost(entry, 30)).toBe(8);
  });

  it("AI Carousel at 6 slides costs 90 credits", () => {
    const entry = findEntry("AI Carousel");
    expect(estimateCost(entry, 6)).toBe(90);
  });

  it("AI Image Post at 1 idea costs 30 credits", () => {
    const entry = findEntry("AI Image Post");
    expect(estimateCost(entry, 1)).toBe(30);
  });

  it("a flat ad ignores the control value", () => {
    const entry = findEntry("Single AI Ad");
    expect(estimateCost(entry, 99)).toBe(15);
  });

  it("Animated AI at 30s costs 77 credits", () => {
    const entry = findEntry("Animated AI Video");
    expect(estimateCost(entry, 30)).toBe(77);
  });
});

describe("perPlanEstimate", () => {
  it("AI Story 30s → Free 3, Creator 75, Pro 375", () => {
    const entry = findEntry("AI Story");
    const cells = perPlanEstimate(entry, 30);
    expect(cells).toEqual([
      { plan: "free", available: true, count: 3 },
      { plan: "creator", available: true, count: 75 },
      { plan: "pro", available: true, count: 375 },
    ]);
  });

  it("Animated AI is Pro only on Free and Creator", () => {
    const entry = findEntry("Animated AI Video");
    const cells = perPlanEstimate(entry, 30);
    expect(cells[0]).toEqual({ plan: "free", available: false, label: "Pro only" });
    expect(cells[1]).toEqual({ plan: "creator", available: false, label: "Pro only" });
    expect(cells[2]).toEqual({ plan: "pro", available: true, count: 38 }); // floor(3000/77)
  });

  it("AI Carousel shows — for Free, numbers for Creator/Pro", () => {
    const entry = findEntry("AI Carousel");
    const cells = perPlanEstimate(entry, 6); // 90 credits
    expect(cells[0]).toEqual({ plan: "free", available: false, label: "—" });
    expect(cells[1]).toEqual({ plan: "creator", available: true, count: 6 });  // floor(600/90)
    expect(cells[2]).toEqual({ plan: "pro", available: true, count: 33 });     // floor(3000/90)
  });
});

describe("ESTIMATOR_ENTRIES", () => {
  it("every slider entry has min/max/default within range", () => {
    for (const e of ESTIMATOR_ENTRIES) {
      if (e.kind === "flat") continue;
      expect(e.min).toBeLessThanOrEqual(e.default!);
      expect(e.default!).toBeLessThanOrEqual(e.max!);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- estimator` (from `frontend/`)
Expected: FAIL — `Cannot find module '@/lib/credits/estimator'`.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/lib/credits/estimator.ts`:

```ts
// frontend/src/lib/credits/estimator.ts
//
// Pure logic for the public credit estimator widget. Holds the catalog of
// create types shown to prospects plus all cost / per-plan / gating math.
// Reads every credit number from config.ts so it can never drift from billing.

import {
  videoCost,
  postCost,
  PLAN_MONTHLY_CREDITS,
  canUseVideoFormat,
  canUseImageCarousel,
  isPaidImageCarousel,
  type VideoFormat,
  type PostFormat,
  type PlanName,
} from "@/lib/credits/config";

export type ControlKind = "seconds" | "slides" | "ideas" | "flat";

export interface EstimatorEntry {
  label: string;                 // user-facing name, also the lookup key
  group: "Video" | "Post";
  kind: ControlKind;
  format: VideoFormat | PostFormat;
  unit?: string;                 // slider unit label, e.g. "s", "slides", "ideas"
  min?: number;                  // omitted for flat
  max?: number;
  default?: number;
}

// Catalog. One representative entry per distinct cost behaviour — the carousel
// variants all cost the same per slide, the single ads all cost the same flat.
export const ESTIMATOR_ENTRIES: EstimatorEntry[] = [
  { label: "Standard Video", group: "Video", kind: "seconds", format: "smart_mix", unit: "s", min: 15, max: 60, default: 30 },
  { label: "AI Story", group: "Video", kind: "seconds", format: "ai_story", unit: "s", min: 15, max: 60, default: 30 },
  { label: "Argument Video", group: "Video", kind: "seconds", format: "argument", unit: "s", min: 15, max: 60, default: 30 },
  { label: "Skeleton Video", group: "Video", kind: "seconds", format: "skeleton", unit: "s", min: 15, max: 60, default: 30 },
  { label: "Animated AI Video", group: "Video", kind: "seconds", format: "animated_character", unit: "s", min: 15, max: 60, default: 30 },
  { label: "AI Carousel", group: "Post", kind: "slides", format: "carousel_infographic", unit: "slides", min: 2, max: 15, default: 6 },
  { label: "AI Image Post", group: "Post", kind: "ideas", format: "image_post_ai", unit: "ideas", min: 1, max: 5, default: 1 },
  { label: "Single AI Ad", group: "Post", kind: "flat", format: "meme_ad" },
  { label: "Free Post", group: "Post", kind: "flat", format: "text" },
];

export function findEntry(label: string): EstimatorEntry {
  const entry = ESTIMATOR_ENTRIES.find((e) => e.label === label);
  if (!entry) throw new Error(`findEntry: unknown label "${label}"`);
  return entry;
}

/** Credit cost of one create for this entry at the given control value. */
export function estimateCost(entry: EstimatorEntry, value: number): number {
  switch (entry.kind) {
    case "seconds":
      return videoCost(entry.format as VideoFormat, value);
    case "slides":
      return postCost(entry.format as PostFormat, { slides: value });
    case "ideas":
      return postCost(entry.format as PostFormat, { ideas: value });
    case "flat":
      return postCost(entry.format as PostFormat);
  }
}

function isAvailable(entry: EstimatorEntry, plan: PlanName): boolean {
  if (entry.group === "Video") return canUseVideoFormat(plan, entry.format as VideoFormat);
  if (isPaidImageCarousel(entry.format as PostFormat)) return canUseImageCarousel(plan);
  return true;
}

export type PlanCell =
  | { plan: PlanName; available: true; count: number }
  | { plan: PlanName; available: false; label: string };

/** How many of this create each plan's monthly credits buy, with gating. */
export function perPlanEstimate(entry: EstimatorEntry, value: number): PlanCell[] {
  const cost = estimateCost(entry, value);
  const plans: PlanName[] = ["free", "creator", "pro"];
  return plans.map((plan) => {
    if (!isAvailable(entry, plan)) {
      // Only animated videos and paid carousels are ever gated here.
      const label = entry.group === "Video" ? "Pro only" : "—";
      return { plan, available: false, label };
    }
    return { plan, available: true, count: Math.floor(PLAN_MONTHLY_CREDITS[plan] / cost) };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- estimator` (from `frontend/`)
Expected: PASS — all cases green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/credits/estimator.ts frontend/src/lib/credits/__tests__/estimator.test.ts
git commit -m "feat(credits): estimator logic module (catalog + per-plan math)"
```

---

### Task 2: CreditEstimator component

**Files:**
- Create: `frontend/src/components/credits/CreditEstimator.tsx`

This is a presentational client component over the Task 1 module. No new unit test — the logic is already covered in Task 1; this task is verified by render in Task 3.

- [ ] **Step 1: Write the component**

Create `frontend/src/components/credits/CreditEstimator.tsx`:

```tsx
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
```

- [ ] **Step 2: Typecheck the component**

Run: `npx tsc --noEmit -p frontend/tsconfig.json` (or from `frontend/`: `npx tsc --noEmit`)
Expected: no errors referencing `CreditEstimator.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/credits/CreditEstimator.tsx
git commit -m "feat(credits): CreditEstimator widget component"
```

---

### Task 3: Wire estimator into PricingSection

**Files:**
- Modify: `frontend/src/components/PricingSection.tsx`

- [ ] **Step 1: Import the component**

In `frontend/src/components/PricingSection.tsx`, add after the existing imports (currently lines 1-3):

```tsx
import CreditEstimator from "@/components/credits/CreditEstimator";
```

- [ ] **Step 2: Render it below the tier grid**

In the same file, find the closing of the tier grid and the footnote paragraph:

```tsx
        </div>
        <p className="text-center text-on-surface-variant text-xs mt-8">
          Paid checkout opens after you sign in.
        </p>
```

Insert `<CreditEstimator />` between the grid's closing `</div>` and the footnote `<p>`:

```tsx
        </div>
        <CreditEstimator />
        <p className="text-center text-on-surface-variant text-xs mt-8">
          Paid checkout opens after you sign in.
        </p>
```

- [ ] **Step 3: Verify build/typecheck**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full unit suite**

Run (from `frontend/`): `npm test`
Expected: PASS, including the new `estimator.test.ts`.

- [ ] **Step 5: Visual check in the browser**

Run (from `frontend/`): `npm run dev`, open `http://localhost:3000/pricing`.
Expected: below the three tier cards, the "How far do your credits go?" widget appears. Selecting "AI Story" with the slider at 30s shows "8 credits each" and Free ~3 / Creator ~75 / Pro ~375. Selecting "Animated AI Video" shows "Pro only" for Free and Creator. Selecting "AI Carousel" shows "—" for Free.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/PricingSection.tsx
git commit -m "feat(credits): show credit estimator on pricing section"
```

---

## Notes for the implementer

- `npm test` runs Vitest once (`vitest run`); `npm test -- estimator` filters to the estimator file. Run all commands from the `frontend/` directory.
- The `@/` import alias maps to `frontend/src/`.
- Do not hardcode any credit number in the component or module — every figure comes from `config.ts` via the Task 1 helpers. If a number looks wrong, fix `config.ts`, not the estimator.
- The purple design-system class names (`surface-container-*`, `primary`, `on-surface-variant`) and the `material-symbols-outlined` `toll` icon match the existing `CostBadge` and `PricingSection`; reuse them, don't invent new colors.
