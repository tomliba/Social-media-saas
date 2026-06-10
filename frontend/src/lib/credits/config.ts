// frontend/src/lib/credits/config.ts
//
// Credit system — single source of truth.
//
// Locked pricing, Fluid Curator. Three tiers: Free, Creator, Pro.
// Free $0 / 30 credits, Creator $24 / 600 credits, Pro $59 / 2000 credits.
// Credit value: Creator $0.040, Pro $0.0295. Pro is the margin floor, so anything
// that clears at the Pro rate clears everywhere.
// Plan PRICES live in Lemon Squeezy. This file holds credit amounts, per-action
// costs, plan gating, and the LS variant-ID mapping used by the webhook.

// ──────────────────────────────────────────────────────────────────────────
// Format identifiers (must match the `format` field the create flows stamp
// onto VideoRenderRequest / PostRenderRequest)
// ──────────────────────────────────────────────────────────────────────────

export type VideoFormat =
  | 'stock' | 'motion' | 'green'      // cheap modes, no AI images
  | 'smart_mix'
  | 'ai_story'
  | 'ai_images'                       // character AI images (Flux Schnell)
  | 'argument'
  | 'skeleton'                        // Flux Dev
  | 'animated_character'              // Flux Dev + Seedance
  | 'animated_story'                  // Flux Dev + Seedance
  | 'animated_skeleton';             // Flux Dev + Seedance (skeleton, animated)

export type PostFormat =
  | 'image_post_template'             // free HTML
  | 'carousel_designed'              // free HTML, layout + theme
  | 'text'                           // free HTML
  | 'image_post_ai'                  // Gemini, 2 images per idea
  | 'carousel_infographic'           // Gemini, 1 image per slide
  | 'carousel_handdrawn'             // Gemini
  | 'carousel_notebook'              // Gemini
  | 'ad_creative' | 'ai_scene' | 'meme_ad' | 'ecommerce_ad'  // single Gemini ads
  | 'post_cloner';

// ──────────────────────────────────────────────────────────────────────────
// Plan tiers
// ──────────────────────────────────────────────────────────────────────────

export type PlanName = "free" | "creator" | "pro";

// ──────────────────────────────────────────────────────────────────────────
// Video costs (credits)
// ──────────────────────────────────────────────────────────────────────────

const FLAT_VIDEO: Partial<Record<VideoFormat, number>> = {
  stock: 5,
  motion: 5,
  green: 5,
  smart_mix: 5,    // 2 to 3 schnell, ~2.45x at the floor
  ai_story: 10,
  ai_images: 10,   // schnell-priced. If a fresh render shows Flux Dev at long durations, set this to 15.
  argument: 10,
  skeleton: 15,    // Flux Dev
};

// Animated is per-second. 1.5 * seconds gives 30s=45, 60s=90, 90s=135.
// Pro-only (see PLAN_FEATURES). Bump to 1.65 if you want a wider cushion.
export const ANIMATED_CREDITS_PER_SEC = 1.5;

const ANIMATED_FORMATS: VideoFormat[] = ['animated_character', 'animated_story', 'animated_skeleton'];

export function videoCost(format: VideoFormat, durationSeconds: number): number {
  if (ANIMATED_FORMATS.includes(format)) {
    return Math.ceil(ANIMATED_CREDITS_PER_SEC * durationSeconds);
  }
  const flat = FLAT_VIDEO[format];
  if (flat == null) throw new Error(`videoCost: unknown format "${format}"`);
  return flat;
}

// Sums a batch of videos (mixed formats allowed). Mirrors postBatchCost.
export function videoBatchCost(
  items: Array<{ format: VideoFormat; durationSeconds: number }>
): number {
  return items.reduce((sum, it) => sum + videoCost(it.format, it.durationSeconds), 0);
}

// Maps the UI's human background-mode label to a VideoFormat. Single source for
// the backgroundMode mapping used by the charging create flows. "Animated AI" is
// the character-animated lane (Flux Dev + Seedance); it is the only animated value
// reachable from a charging flow today (video-setup redirects it to
// animated-character-review before the charge path).
const BACKGROUND_MODE_FORMAT: Record<string, VideoFormat> = {
  "Smart Mix": "smart_mix",
  "Stock Footage": "stock",
  "AI Images": "ai_images",
  "Animated AI": "animated_character",
  "Motion Graphics": "motion",
  "Green Screen": "green",
};

export function videoFormatFromBackgroundMode(mode: string | null | undefined): VideoFormat {
  return (mode && BACKGROUND_MODE_FORMAT[mode]) || "smart_mix";
}

// ──────────────────────────────────────────────────────────────────────────
// Post costs (credits)
// ──────────────────────────────────────────────────────────────────────────

const FREE_POST_FORMATS: PostFormat[] = ['image_post_template', 'carousel_designed', 'text'];
const GEMINI_CAROUSELS: PostFormat[] = ['carousel_infographic', 'carousel_handdrawn', 'carousel_notebook'];
const SINGLE_GEMINI_ADS: PostFormat[] = ['ad_creative', 'ai_scene', 'meme_ad', 'ecommerce_ad'];

const FREE_POST_CREDITS = 5;          // HTML render, Gemini text only
const IMAGE_POST_AI_PER_IDEA = 20;    // 2 Gemini images per idea, ~1.75x
const GEMINI_CAROUSEL_PER_SLIDE = 8;  // 1 Gemini image per slide, ~1.5x
const SINGLE_GEMINI_AD = 10;          // 1 Gemini image, ~1.63x
const POST_CLONER = 12;               // break-even at the $0.30 worst case. Bump to 15 once the vision-call count is confirmed.

export interface PostCostOpts {
  ideas?: number;   // image_post_ai
  slides?: number;  // gemini carousels, 2 to 15
}

export function postCost(format: PostFormat, opts: PostCostOpts = {}): number {
  if (FREE_POST_FORMATS.includes(format)) return FREE_POST_CREDITS;
  if (format === 'image_post_ai') return IMAGE_POST_AI_PER_IDEA * (opts.ideas ?? 1);
  if (GEMINI_CAROUSELS.includes(format)) return GEMINI_CAROUSEL_PER_SLIDE * (opts.slides ?? 1);
  if (SINGLE_GEMINI_ADS.includes(format)) return SINGLE_GEMINI_AD;
  if (format === 'post_cloner') return POST_CLONER;
  throw new Error(`postCost: unknown format "${format}"`);
}

// Sums a batch of posts (mixed formats allowed).
export function postBatchCost(items: Array<{ format: PostFormat } & PostCostOpts>): number {
  return items.reduce((sum, it) => sum + postCost(it.format, it), 0);
}

// ──────────────────────────────────────────────────────────────────────────
// Plan allotments
// ──────────────────────────────────────────────────────────────────────────

/** Monthly credit allotment granted on each successful subscription payment. */
export const PLAN_MONTHLY_CREDITS: Record<PlanName, number> = {
  free: 30,      // taste tier, watermarked — granted at signup (see FREE_TIER_ALLOTMENT)
  creator: 600,  // $24
  pro: 2000,     // $59
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
 */
export const LS_SUBSCRIPTION_VARIANTS: Record<string, PlanName> = {
  // TODO: real LS variant ID — "<creator_variant_id>": "creator",
  // TODO: real LS variant ID — "<pro_variant_id>": "pro",
};

/**
 * One-time credit top-up packs.
 * `lemonSqueezyVariantId` maps an order's variant to a credit grant.
 */
export interface TopUpPack {
  credits: number;
  lemonSqueezyVariantId: string;
  label: string;
}

export const TOPUP_PACKS: TopUpPack[] = [
  { credits: 100, lemonSqueezyVariantId: "", label: "100 credits" },   // $7  — TODO: real LS variant ID
  { credits: 500, lemonSqueezyVariantId: "", label: "500 credits" },   // $30 — TODO: real LS variant ID
  { credits: 1200, lemonSqueezyVariantId: "", label: "1,200 credits" }, // $60 — TODO: real LS variant ID
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
// Plan features (policy only)
// Enforcement (apply watermark, cap resolution, queue priority) lives in the
// render pipeline. This map is the single source of truth for what each tier allows.
// ──────────────────────────────────────────────────────────────────────────

export interface PlanFeatures {
  animation: boolean;
  watermark: boolean;
  maxResolution: 720 | 1080;
  priorityRender: boolean;
  commercialLicense: boolean;
  maxConcurrentRenders: number;
}

export const PLAN_FEATURES: Record<PlanName, PlanFeatures> = {
  free:    { animation: false, watermark: true,  maxResolution: 720,  priorityRender: false, commercialLicense: false, maxConcurrentRenders: 1 },
  creator: { animation: false, watermark: false, maxResolution: 1080, priorityRender: false, commercialLicense: false, maxConcurrentRenders: 2 },
  pro:     { animation: true,  watermark: false, maxResolution: 1080, priorityRender: true,  commercialLicense: true,  maxConcurrentRenders: 4 },
};

// ──────────────────────────────────────────────────────────────────────────
// Eligibility / gating
// ──────────────────────────────────────────────────────────────────────────

export function canUseVideoFormat(plan: PlanName, format: VideoFormat): boolean {
  if (ANIMATED_FORMATS.includes(format)) return PLAN_FEATURES[plan].animation;
  return true;
}

export function canUsePostFormat(_plan: PlanName, _format: PostFormat): boolean {
  return true;   // all posts allowed on every plan, metered by the credit pool
}

// ──────────────────────────────────────────────────────────────────────────
// Misc
// ──────────────────────────────────────────────────────────────────────────

/** Stuck-render reconciliation threshold (minutes). */
export const RECONCILE_STALE_MINUTES = 15; // TODO: tune
