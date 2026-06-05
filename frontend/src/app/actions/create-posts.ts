"use server";

import { renderPostViaFlask } from "@/lib/flask-render";
import { auth } from "@/lib/auth";
import {
  spendCredits,
  refundCredits,
  getCreditBalance,
  InsufficientCreditsError,
  postBatchCost,
} from "@/lib/credits";

export interface PostRenderRequest {
  pgJobId: string;
  selectedIdeas: number[];
  ideaTopics: string[];
  settings: {
    tone: string;
    platform: string;
  };
}

export interface PostRenderHandle {
  runId: string;
  publicAccessToken: string;
  ideaTopics: string[];
  /** Set when using direct Flask mode (no Trigger.dev) */
  directResult?: { status: "ready" | "failed"; error?: string };
}

export type TriggerPostRendersResult =
  | { ok: true; handle: PostRenderHandle }
  | { ok: false; error: "insufficient_credits"; needed: number; balance: number }
  | { ok: false; error: "unauthenticated" };

export async function triggerPostRenders(
  request: PostRenderRequest
): Promise<TriggerPostRendersResult> {
  // ── Auth ──
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "unauthenticated" };

  // One job renders N selected ideas — charge once for the whole batch.
  const cost = postBatchCost(request.selectedIdeas.length);
  const balance = await getCreditBalance(userId);
  if (balance < cost) {
    return { ok: false, error: "insufficient_credits", needed: cost, balance };
  }

  const useTrigger = !!process.env.TRIGGER_SECRET_KEY;

  if (useTrigger) {
    // ── Trigger.dev path (async, production) ──
    const { tasks } = await import("@trigger.dev/sdk");
    const handle = await tasks.trigger("render-post", {
      pgJobId: request.pgJobId,
      selectedIdeas: request.selectedIdeas,
      ideaTopics: request.ideaTopics,
      settings: request.settings,
    });

    try {
      await spendCredits({
        userId,
        amount: cost,
        jobId: handle.id,
        type: "post_spend",
        reason: request.ideaTopics.join(", "),
      });
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        return { ok: false, error: "insufficient_credits", needed: err.needed, balance: err.balance };
      }
      throw err;
    }

    return {
      ok: true,
      handle: {
        runId: handle.id,
        publicAccessToken: handle.publicAccessToken!,
        ideaTopics: request.ideaTopics,
      },
    };
  }

  // ── Direct Flask path (synchronous, local dev) ──
  const jobId = `direct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await spendCredits({
      userId,
      amount: cost,
      jobId,
      type: "post_spend",
      reason: request.ideaTopics.join(", "),
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return { ok: false, error: "insufficient_credits", needed: err.needed, balance: err.balance };
    }
    throw err;
  }

  try {
    await renderPostViaFlask(request);
    return {
      ok: true,
      handle: {
        runId: jobId,
        publicAccessToken: "",
        ideaTopics: request.ideaTopics,
        directResult: { status: "ready" },
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Post render failed";
    console.error("Direct post render failed:", msg);
    await refundCredits({ userId, jobId, reason: msg }).catch(() => {});
    return {
      ok: true,
      handle: {
        runId: jobId,
        publicAccessToken: "",
        ideaTopics: request.ideaTopics,
        directResult: { status: "failed", error: msg },
      },
    };
  }
}
