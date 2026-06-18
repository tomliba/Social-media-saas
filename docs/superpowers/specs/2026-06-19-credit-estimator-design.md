# Public Credit Estimator — Design

**Date:** 2026-06-19
**Status:** Approved (brainstorming)

## Problem

The public pricing page (`PricingSection`, shown on the home page and `/pricing`)
shows only the three subscription tiers (Free / Creator / Pro) with prices and a
vague per-tier output estimate ("≈ 3–6 videos or posts / month"). A prospect who
is not logged in cannot see what an individual create actually costs in credits.
The exact per-format cost only appears *after* signup, inside the create flows via
`CostBadge`.

Goal: let a prospect, on the public page, pick a create type (and its size) and see
both the credit cost and how many they would get per month on each plan.

## Solution

An interactive **credit estimator** widget rendered inside `PricingSection`, below
the tier cards. Because `/pricing` and the home page both render `PricingSection`,
the estimator appears in both with no extra wiring.

### Component

`frontend/src/components/credits/CreditEstimator.tsx` — a client component
(`"use client"`).

### Data source

Reads live from `frontend/src/lib/credits/config.ts`. No hardcoded credit numbers,
so the estimator can never drift from real billing:

- `videoCost(format, seconds)`
- `postCost(format, opts)`
- `PLAN_MONTHLY_CREDITS`
- `canUseVideoFormat(plan, format)` and `canUseImageCarousel(plan)` for gating

### Controls

1. **Format dropdown** — all create types, grouped Video / Post, with friendly
   user-facing labels (not the raw `VideoFormat` / `PostFormat` identifiers).
2. **Adaptive second control**, driven by a small in-component config table keyed
   by format. Each entry declares the control kind plus min / max / default:
   - Video formats → duration slider, 15–60s, default 30
   - AI carousels (`carousel_infographic`, `carousel_handdrawn`,
     `carousel_notebook`) → slides slider, 2–15, default 6
   - AI image post (`image_post_ai`) → ideas slider, 1–5, default 1
   - Flat formats (single AI ads, free posts, `post_cloner`) → no slider; show the
     flat cost only

### Output

- `= N credits` for the current selection (from `videoCost` / `postCost`).
- Per-plan monthly estimate for Free / Creator / Pro, computed as
  `Math.floor(planCredits / costEach)`.
- **Gating is respected** so the estimator tells the same story the app enforces:
  - Animated formats are Pro-only → Free and Creator cells show "Pro only".
  - Paid carousels are Creator+ → Free cell shows "—".
  - Gating is determined via `canUseVideoFormat` / `canUseImageCarousel`, not a
    second hardcoded list.

### Estimator entry model

A single source array in the component, e.g.:

```ts
type ControlKind = "seconds" | "slides" | "ideas" | "flat";

interface EstimatorEntry {
  label: string;        // "AI Story", "AI Carousel", "Meme Ad"
  group: "Video" | "Post";
  kind: ControlKind;
  // format is VideoFormat or PostFormat; cost is computed by a small switch
  // that calls videoCost or postCost with the current control value.
}
```

The cost function switches on `kind`: `seconds` → `videoCost(format, value)`;
`slides` → `postCost(format, { slides: value })`; `ideas` →
`postCost(format, { ideas: value })`; `flat` → `postCost(format)` /
`videoCost(format, defaultSeconds)` as appropriate.

## Placement

Rendered inside `PricingSection.tsx` after the tier-card grid and before the
"Paid checkout opens after you sign in." footnote. Styled to match the existing
purple design system (surface containers, primary accents) and the look of
`CostBadge` (the `toll` material icon for credits).

## Testing

A unit test (`frontend/src/components/credits/__tests__/credit-estimator`-style,
matching the existing `frontend/src/lib/credits/__tests__/` convention) asserting:

- AI Story at 30s = 8 credits → Free ≈ 3, Creator ≈ 75, Pro ≈ 375.
- A gated animated format reports "Pro only" for Free and Creator.
- A paid carousel reports "—" for Free and a positive number for Creator/Pro.

Where the math is pure (cost + per-plan counts + gating label), extract it into a
small exported helper so it can be unit-tested without rendering the component.

## Out of scope (YAGNI)

- No persistence or saved estimates.
- No separate estimator page (lives inside `PricingSection`).
- No new animated-cost math — `videoCost` already returns the animated rate.
- No change to the existing tier cards or their copy.
