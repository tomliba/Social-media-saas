"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  spendCredits,
  refundCredits,
  getCreditBalance,
  InsufficientCreditsError,
  videoCost,
  postCost,
  canUseVideoFormat,
  isPaidImageCarousel,
  canUseImageCarousel,
  maxCarouselSlides,
  type VideoFormat,
  type PostFormat,
  type PlanName,
} from "@/lib/credits";

/**
 * Centralized charge-before-dispatch for the bypass create flows (argument,
 * skeleton, ai-story, and the specialized posts). Mirrors how triggerVideoRenders
 * charges: auth -> gate (video) -> balance check -> spendCredits. Each flow calls
 * this before dispatching, then refundRender() on dispatch failure.
 */
export type ChargeResult =
  | { ok: true; balance: number }
  | { ok: false; error: "insufficient_credits"; needed: number; balance: number }
  | { ok: false; error: "plan_not_allowed"; format: VideoFormat }
  | { ok: false; error: "plan_not_allowed_post"; format: PostFormat }
  | { ok: false; error: "slide_cap_exceeded"; max: number }
  | { ok: false; error: "unauthenticated" };

export async function chargeVideo(args: {
  jobId: string;
  format: VideoFormat;
  durationSeconds: number;
}): Promise<ChargeResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "unauthenticated" };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const plan = (user?.plan as PlanName) ?? "free";
  if (!canUseVideoFormat(plan, args.format)) {
    return { ok: false, error: "plan_not_allowed", format: args.format };
  }

  const cost = videoCost(args.format, args.durationSeconds);
  const balance = await getCreditBalance(userId);
  if (balance < cost) return { ok: false, error: "insufficient_credits", needed: cost, balance };

  try {
    const { balance: after } = await spendCredits({
      userId,
      amount: cost,
      jobId: args.jobId,
      type: "render_spend",
      reason: args.format,
    });
    return { ok: true, balance: after };
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return { ok: false, error: "insufficient_credits", needed: err.needed, balance: err.balance };
    }
    throw err;
  }
}

export async function chargePost(args: {
  jobId: string;
  format: PostFormat;
  ideas?: number;
  slides?: number;
}): Promise<ChargeResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "unauthenticated" };

  // Paid image carousels (Nano Banana Pro) are Creator+ and slide-capped per
  // plan. Other post formats stay available on every plan.
  if (isPaidImageCarousel(args.format)) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    const plan = (user?.plan as PlanName) ?? "free";
    if (!canUseImageCarousel(plan)) {
      return { ok: false, error: "plan_not_allowed_post", format: args.format };
    }
    const max = maxCarouselSlides(plan);
    if ((args.slides ?? 0) > max) {
      return { ok: false, error: "slide_cap_exceeded", max };
    }
  }

  const cost = postCost(args.format, { ideas: args.ideas, slides: args.slides });
  const balance = await getCreditBalance(userId);
  if (balance < cost) return { ok: false, error: "insufficient_credits", needed: cost, balance };

  try {
    const { balance: after } = await spendCredits({
      userId,
      amount: cost,
      jobId: args.jobId,
      type: "post_spend",
      reason: args.format,
    });
    return { ok: true, balance: after };
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return { ok: false, error: "insufficient_credits", needed: err.needed, balance: err.balance };
    }
    throw err;
  }
}

/**
 * Refund the charge tied to `jobId` after a dispatch failure. Idempotent and
 * a no-op if nothing was charged. Logs on failure so a credit-back is never
 * lost silently (the reconcile cron is the backstop).
 */
export async function refundRender(args: { jobId: string }): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  try {
    await refundCredits({ userId, jobId: args.jobId, reason: "render failed" });
  } catch (err) {
    console.error(`refundRender failed for job ${args.jobId}:`, err);
  }
}
