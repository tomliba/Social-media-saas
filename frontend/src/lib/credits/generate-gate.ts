import { prisma } from "@/lib/prisma";
import {
  spendCredits,
  refundCredits,
  InsufficientCreditsError,
  videoCost,
  canUseVideoFormat,
  effectivePlan,
  type VideoFormat,
  type PlanName,
} from "@/lib/credits";

// Free scene-image regenerations per story before regens start costing credits.
export const SCENE_REGEN_FREE_CAP = 3;
// Credits charged per scene-image regen once the free cap is used up.
export const SCENE_REGEN_COST = 3;

export type GenerateGateResult =
  | { ok: true; balance: number; idempotent: boolean }
  | { ok: false; error: "insufficient_credits"; needed: number; balance: number }
  | { ok: false; error: "plan_not_allowed" };

// The AI-Story / Skeleton create flows stamp a `style` ("ai-story" | "skeleton").
function isSkeleton(style: string): boolean {
  return /skeleton/i.test(style);
}
export function storyBaseFormat(style: string): VideoFormat {
  return isSkeleton(style) ? "skeleton" : "ai_story";
}
export function storyAnimatedFormat(style: string): VideoFormat {
  return isSkeleton(style) ? "animated_skeleton" : "animated_story";
}

async function entitledPlan(userId: string): Promise<PlanName> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, subscriptionStatus: true },
  });
  return effectivePlan((u?.plan as PlanName) ?? "free", u?.subscriptionStatus);
}

/**
 * Charge the STATIC base for a story's first paid provider call (scene-image
 * generation), to be invoked server-side BEFORE the Flux call. Keyed on the
 * stable `vgJobId`, idempotent on (jobId,"render_spend") — so a tab-close mid-flow
 * can't skip it, retries can't double it, and the later Preview/Export charge on
 * the same key is a no-op. Also anchors a "preparing" ContentItem so the reconcile
 * cron can refund an abandoned/stuck job server-side (no client dependency).
 *
 * Animation, when chosen, is charged separately as a surcharge at the animate
 * step (chargeAnimationSurcharge) — so this is always the static base regardless
 * of scene_mode, which may be toggled after Generate.
 */
export async function chargeStoryGenerate(opts: {
  userId: string;
  vgJobId: string;
  style: string;
  durationSeconds: number;
  title?: string;
}): Promise<GenerateGateResult> {
  const format = storyBaseFormat(opts.style);
  const cost = videoCost(format, opts.durationSeconds);
  try {
    const { balance, idempotent } = await spendCredits({
      userId: opts.userId,
      amount: cost,
      jobId: opts.vgJobId,
      type: "render_spend",
      reason: format,
    });
    try {
      await ensureStoryItem(opts);
    } catch (err) {
      // Couldn't anchor the item on a fresh charge → undo so we don't strand it.
      if (!idempotent) {
        await refundCredits({
          userId: opts.userId,
          jobId: opts.vgJobId,
          reason: "item create failed",
        }).catch(() => {});
      }
      throw err;
    }
    return { ok: true, balance, idempotent };
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return { ok: false, error: "insufficient_credits", needed: err.needed, balance: err.balance };
    }
    throw err;
  }
}

async function ensureStoryItem(opts: {
  userId: string;
  vgJobId: string;
  style: string;
  durationSeconds: number;
  title?: string;
}): Promise<void> {
  const existing = await prisma.contentItem.findUnique({ where: { jobId: opts.vgJobId } });
  if (existing) return;
  await prisma.contentItem.create({
    data: {
      userId: opts.userId,
      jobId: opts.vgJobId,
      title: opts.title || (isSkeleton(opts.style) ? "Skeleton video" : "AI Voice Story"),
      format: "video",
      templateId: isSkeleton(opts.style) ? "Skeleton" : "AI Story",
      backgroundMode: "AI Images",
      status: "preparing",
      durationSec: Math.round(opts.durationSeconds) || null,
    },
  });
}

/**
 * Charge the animation surcharge (animated − static base) when the user animates.
 * Pro-gated, idempotent on `${vgJobId}:animate`. Base + surcharge == the full
 * animated cost. Must be called server-side BEFORE the animate provider call.
 */
export async function chargeAnimationSurcharge(opts: {
  userId: string;
  vgJobId: string;
  style: string;
  durationSeconds: number;
}): Promise<GenerateGateResult> {
  const animated = storyAnimatedFormat(opts.style);
  const plan = await entitledPlan(opts.userId);
  if (!canUseVideoFormat(plan, animated)) {
    return { ok: false, error: "plan_not_allowed" };
  }
  const surcharge =
    videoCost(animated, opts.durationSeconds) - videoCost(storyBaseFormat(opts.style), opts.durationSeconds);
  try {
    const { balance, idempotent } = await spendCredits({
      userId: opts.userId,
      amount: Math.max(0, surcharge),
      jobId: `${opts.vgJobId}:animate`,
      type: "render_spend",
      reason: animated,
    });
    return { ok: true, balance, idempotent };
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return { ok: false, error: "insufficient_credits", needed: err.needed, balance: err.balance };
    }
    throw err;
  }
}

export type RegenResult =
  | { ok: true; charged: boolean; cost: number; balance: number; jobId: string }
  | { ok: false; error: "insufficient_credits"; needed: number; balance: number };

/**
 * Scene-image regeneration charge. The first SCENE_REGEN_FREE_CAP regens per story
 * are free; each is still recorded as a 0-credit ledger row keyed
 * `${vgJobId}:regen:<n>` so the count survives without a schema change. After the
 * cap, each regen costs SCENE_REGEN_COST. Count-based keys advance per regen, so a
 * failed paid regen can be refunded without freeing the retry.
 */
export async function chargeSceneRegen(opts: { userId: string; vgJobId: string }): Promise<RegenResult> {
  const used = await prisma.creditTransaction.count({
    where: { jobId: { startsWith: `${opts.vgJobId}:regen:` } },
  });
  const cost = used < SCENE_REGEN_FREE_CAP ? 0 : SCENE_REGEN_COST;
  const jobId = `${opts.vgJobId}:regen:${used}`;
  try {
    const { balance } = await spendCredits({
      userId: opts.userId,
      amount: cost,
      jobId,
      type: "render_spend",
      reason: cost === 0 ? "free scene regen" : "scene regen",
    });
    return { ok: true, charged: cost > 0, cost, balance, jobId };
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return { ok: false, error: "insufficient_credits", needed: err.needed, balance: err.balance };
    }
    throw err;
  }
}
