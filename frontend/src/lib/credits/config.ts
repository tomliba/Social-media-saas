// frontend/src/lib/credits/config.ts
//
// Credit system — single source of truth.
//
// Locked pricing, Fluvio. Three tiers: Free, Creator, Pro.
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

// Unified per-second video pricing: a flat base plus a per-second rate that
// depends on the render's cost bucket.
//   cost(format, seconds) = VIDEO_BASE + ceil(rate × seconds)
export const VIDEO_BASE = 5;

// Per-second rate by bucket.
const VIDEO_RATE_STANDARD = 0.1;   // stock, motion, green, smart_mix, ai_story, ai_images, argument
const VIDEO_RATE_SKELETON = 0.35;  // skeleton (static, Flux Dev)
const VIDEO_RATE_ANIMATED = 2.4;   // animated_* (Flux Dev + Seedance, Pro-only)

const ANIMATED_FORMATS: VideoFormat[] = ['animated_character', 'animated_story', 'animated_skeleton'];

function videoRate(format: VideoFormat): number {
  if (ANIMATED_FORMATS.includes(format)) return VIDEO_RATE_ANIMATED;
  if (format === 'skeleton') return VIDEO_RATE_SKELETON;
  return VIDEO_RATE_STANDARD;
}

export function videoCost(format: VideoFormat, durationSeconds: number): number {
  return VIDEO_BASE + Math.ceil(videoRate(format) * durationSeconds);
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

const FREE_POST_CREDITS = 2;          // HTML render, Gemini text only
const IMAGE_POST_AI_PER_IDEA = 30;    // 2 Gemini images per idea
const GEMINI_CAROUSEL_PER_SLIDE = 15; // 1 Gemini image per slide
const SINGLE_GEMINI_AD = 15;          // 1 Gemini image
const POST_CLONER = 15;               // vision read + 1 generated image

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
  pro: 3000,     // $59
};

/**
 * Monthly subscription price (USD) per plan. Source of truth for prices is Lemon
 * Squeezy; these mirror the LS variant prices for in-app MRR math only.
 */
export const PLAN_PRICES: Record<PlanName, number> = {
  free: 0,
  creator: 24.99,
  pro: 59.99,
};

/**
 * Per-credit dollar value by plan (revenue side). Creator credits are priced at
 * $0.040, Pro at $0.0295. Pro is the margin floor.
 */
export const CREDIT_VALUE_USD: Record<PlanName, number> = {
  free: 0,            // free credits are not sold
  creator: 0.040,
  pro: 0.0295,
};

/**
 * ESTIMATED provider cost basis per credit (USD). We do not store real provider
 * invoices, so cost is approximated at the Pro margin-floor value ($0.0295/credit):
 * anything that clears at the Pro rate clears everywhere, so this is a
 * conservative (high) cost estimate. Every figure derived from this MUST be
 * labeled "est." in the UI — it is inferred, not measured.
 */
export const EST_CREDIT_COST_USD = 0.0295;

/** Estimated dollar cost of a number of credits consumed (see EST_CREDIT_COST_USD). */
export function estDollarsForCredits(credits: number): number {
  return credits * EST_CREDIT_COST_USD;
}

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
  "1771372": "creator", // $24.99/mo
  "1771393": "pro",     // $59.99/mo
};

/**
 * One-time credit top-up packs.
 * `lemonSqueezyVariantId` maps an order's variant to a credit grant.
 */
export interface TopUpPack {
  credits: number;
  priceUsd: number;
  lemonSqueezyVariantId: string;
  label: string;
}

// Lemon Squeezy variant id per pack. These map an order_created event's
// variant back to the credit grant (topUpPackForVariant) and drive checkout.
export const TOPUP_PACKS: TopUpPack[] = [
  { credits: 200,  priceUsd: 9.99,  lemonSqueezyVariantId: "1802153", label: "200 credits" },
  { credits: 450,  priceUsd: 19.99, lemonSqueezyVariantId: "1802177", label: "450 credits" },
  { credits: 1000, priceUsd: 44.99, lemonSqueezyVariantId: "1802178", label: "1,000 credits" },
];

/** Look up a top-up pack by its LS variant id (from order_created events). */
export function topUpPackForVariant(variantId: string): TopUpPack | undefined {
  if (!variantId) return undefined;
  return TOPUP_PACKS.find((p) => p.lemonSqueezyVariantId === variantId);
}

/** Look up a top-up pack by its credit amount (stable UI/checkout key). */
export function topUpPackByCredits(credits: number): TopUpPack | undefined {
  return TOPUP_PACKS.find((p) => p.credits === credits);
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
// Subscription entitlement
// A user may use their paid plan's features while the subscription is active,
// on trial, cancelled-but-not-yet-expired, or in past_due dunning. Paused,
// expired, unpaid, or unknown/absent statuses are NOT entitled. This is the
// single source of truth for feature gating — gates use effectivePlan(), never
// the raw stored plan, so a cancelled user keeps access until expiry and a
// paused user is suspended immediately.
// ──────────────────────────────────────────────────────────────────────────

export const ENTITLED_STATUSES = ["active", "on_trial", "cancelled", "past_due"] as const;

export function isEntitled(status: string | null | undefined): boolean {
  return !!status && (ENTITLED_STATUSES as readonly string[]).includes(status);
}

/**
 * The plan whose features the user may actually use right now. Equals the
 * stored plan while entitled (see isEntitled); otherwise "free".
 */
export function effectivePlan(plan: PlanName, status: string | null | undefined): PlanName {
  if (plan === "free") return "free";
  return isEntitled(status) ? plan : "free";
}

// ── Paid image carousels (Nano Banana Pro, per-slide image baking) ──
// These are the expensive carousel formats produced by /create/ai-carousel.
// Gated to Creator+ (Free tier gets the free HTML carousel `carousel_designed`
// only) and slide-capped per plan as a server-side cost guard. See COST_AUDIT.md.
export const PAID_IMAGE_CAROUSEL_FORMATS: PostFormat[] = [
  'carousel_infographic', 'carousel_handdrawn', 'carousel_notebook',
];

/** Max slides per paid image carousel, by plan. free = 0 (not allowed). */
export const CAROUSEL_SLIDE_CAP: Record<PlanName, number> = { free: 0, creator: 10, pro: 15 };

export function isPaidImageCarousel(format: PostFormat): boolean {
  return PAID_IMAGE_CAROUSEL_FORMATS.includes(format);
}

export function canUseImageCarousel(plan: PlanName): boolean {
  return plan === 'creator' || plan === 'pro';
}

export function maxCarouselSlides(plan: PlanName): number {
  return CAROUSEL_SLIDE_CAP[plan];
}

// ──────────────────────────────────────────────────────────────────────────
// Misc
// ──────────────────────────────────────────────────────────────────────────

/** Stuck-render reconciliation threshold (minutes). */
export const RECONCILE_STALE_MINUTES = 15; // TODO: tune
