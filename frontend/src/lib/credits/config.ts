/**
 * Credit system — single source of truth.
 *
 * ⚠️ EVERY numeric value in this file is a PLACEHOLDER. Finalize the economics
 * before going live (see TODOs). IDs from Lemon Squeezy are intentionally blank
 * and must be filled in from the LS dashboard.
 */

// ──────────────────────────────────────────────────────────────────────────
// Per-action credit costs
// ──────────────────────────────────────────────────────────────────────────

export const CREDIT_COSTS = {
  STANDARD_VIDEO: 10, // TODO: finalize — character/stock-footage video
  AI_STORY_VIDEO: 20, // TODO: finalize — AI Story / animated video (more compute)
  STANDARD_POST: 5, // TODO: finalize — per image post
} as const;

// ──────────────────────────────────────────────────────────────────────────
// Plan tiers
// ──────────────────────────────────────────────────────────────────────────

export type PlanName = "free" | "starter" | "creator" | "pro";

/** Monthly credit allotment granted on each successful subscription payment. */
export const PLAN_MONTHLY_CREDITS: Record<PlanName, number> = {
  free: 30, // TODO: finalize — granted at signup (see FREE_TIER_ALLOTMENT)
  starter: 200, // TODO: finalize
  creator: 600, // TODO: finalize
  pro: 2000, // TODO: finalize
};

/** Credits granted once when a user first signs up (free tier). */
export const FREE_TIER_ALLOTMENT = PLAN_MONTHLY_CREDITS.free;

// ──────────────────────────────────────────────────────────────────────────
// Lemon Squeezy mapping
// Fill in the variant IDs from your LS dashboard. Leave as "" until created.
// ──────────────────────────────────────────────────────────────────────────

/**
 * Subscription variant ID → plan name.
 * One entry per paid tier. Used by subscription_* webhook events.
 * TODO: paste the real LS variant IDs (strings).
 */
export const LS_SUBSCRIPTION_VARIANTS: Record<string, PlanName> = {
  // "123456": "starter",
  // "123457": "creator",
  // "123458": "pro",
};

/**
 * One-time credit top-up packs.
 * `lemonSqueezyVariantId` maps an order's variant to a credit grant.
 * TODO: paste the real LS variant IDs and finalize pack sizes/prices.
 */
export interface TopUpPack {
  credits: number;
  lemonSqueezyVariantId: string;
  label: string;
}

export const TOPUP_PACKS: TopUpPack[] = [
  { credits: 100, lemonSqueezyVariantId: "", label: "100 credits" }, // TODO
  { credits: 500, lemonSqueezyVariantId: "", label: "500 credits" }, // TODO
  { credits: 1200, lemonSqueezyVariantId: "", label: "1,200 credits" }, // TODO
];

/** Look up a top-up pack by its LS variant id (from order_created events). */
export function topUpPackForVariant(variantId: string): TopUpPack | undefined {
  if (!variantId) return undefined;
  return TOPUP_PACKS.find((p) => p.lemonSqueezyVariantId === variantId);
}

/** Look up the plan a subscription variant maps to. */
export function planForSubscriptionVariant(variantId: string): PlanName | undefined {
  return LS_SUBSCRIPTION_VARIANTS[variantId];
}

// ──────────────────────────────────────────────────────────────────────────
// Cost helpers
// ──────────────────────────────────────────────────────────────────────────

/** Minimal shape needed to price a video render. */
export interface VideoCostInput {
  template?: string;
  settings?: {
    aiStory?: unknown;
    backgroundMode?: string;
  };
}

/**
 * Pick the credit cost for a single video based on its type.
 * AI Story videos (and the "Animated AI" background mode that drives them)
 * cost more than standard character/stock videos.
 */
export function videoCost(video: VideoCostInput): number {
  const isAiStory =
    !!video.settings?.aiStory || video.settings?.backgroundMode === "Animated AI";
  return isAiStory ? CREDIT_COSTS.AI_STORY_VIDEO : CREDIT_COSTS.STANDARD_VIDEO;
}

/** Total cost for a batch of videos. */
export function videoBatchCost(videos: VideoCostInput[]): number {
  return videos.reduce((sum, v) => sum + videoCost(v), 0);
}

/** Cost for a batch of posts (one job renders N selected ideas). */
export function postBatchCost(count: number): number {
  return Math.max(0, count) * CREDIT_COSTS.STANDARD_POST;
}

// ──────────────────────────────────────────────────────────────────────────
// Misc
// ──────────────────────────────────────────────────────────────────────────

/** Stuck-render reconciliation threshold (minutes). */
export const RECONCILE_STALE_MINUTES = 15; // TODO: tune

/** Shared secret guarding the render-completion callback route. */
export const TRIGGER_CALLBACK_SECRET = process.env.TRIGGER_CALLBACK_SECRET;
