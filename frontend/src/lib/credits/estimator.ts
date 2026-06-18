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
    // Guard against a zero cost (unreachable with the current catalog, but a
    // future free format would otherwise divide to Infinity in the UI).
    const count = cost > 0 ? Math.floor(PLAN_MONTHLY_CREDITS[plan] / cost) : 0;
    return { plan, available: true, count };
  });
}
