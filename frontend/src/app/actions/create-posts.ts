"use server";

import { renderPostViaFlask } from "@/lib/flask-render";

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

export async function triggerPostRenders(
  request: PostRenderRequest
): Promise<PostRenderHandle> {
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

    return {
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken!,
      ideaTopics: request.ideaTopics,
    };
  }

  // ── Direct Flask path (synchronous, local dev) ──
  const jobId = `direct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await renderPostViaFlask(request);
    return {
      runId: jobId,
      publicAccessToken: "",
      ideaTopics: request.ideaTopics,
      directResult: { status: "ready" },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Post render failed";
    console.error("Direct post render failed:", msg);
    return {
      runId: jobId,
      publicAccessToken: "",
      ideaTopics: request.ideaTopics,
      directResult: { status: "failed", error: msg },
    };
  }
}
