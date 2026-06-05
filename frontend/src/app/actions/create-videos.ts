"use server";

import { renderVideoViaFlask } from "@/lib/flask-render";
import type { VisualSegment } from "@/lib/video-types";
import { auth } from "@/lib/auth";
import {
  spendCredits,
  refundCredits,
  getCreditBalance,
  InsufficientCreditsError,
  videoCost,
  videoBatchCost,
} from "@/lib/credits";

export interface VideoRenderRequest {
  title: string;
  script: string;
  template: string;
  settings: {
    tone: string;
    presenter: string;
    voice: string;
    background: string;
    backgroundMode?: string;
    duration: string;
    layout: string;
    speed?: number;
    animate?: boolean;
    artStyle?: string;
    revoiceMode?: boolean;
    revoiceVideoUrl?: string;
    revoiceBlurSubtitles?: boolean;
    captionStyle?: string | null;
    captionFontSize?: string | null;
    captionTransform?: string | null;
    captionPosition?: string | null;
    music?: string | null;
    language?: string;
    filmGrain?: boolean;
    shakeEffect?: boolean;
    vgJobId?: string;
    assetsReady?: boolean;
    resolvedSegments?: VisualSegment[];
    /** AI Story mode — when set, skip script generation and use provided data */
    aiStory?: {
      vgJobId: string;
      hook: string;
      scenes: { text: string; image_prompt: string }[];
      cta: string;
      artStyle: string;
      captionStyle: string | null;
      captionFontSize: string | null;
      captionTransform: string | null;
      captionPosition: string | null;
      music: string | null;
      language: string;
      filmGrain: boolean;
      shakeEffect: boolean;
      sceneMode: string;
      tone: string;
      duration: number;
      transitionStyle: string;
      /** When true, TTS/visual-plan/resolve-assets are already done (preview→export flow) */
      assetsReady?: boolean;
      /** Pre-resolved visual segments from prepare-assets task */
      resolvedSegments?: import("@/lib/video-types").VisualSegment[];
    };
  };
}

export interface VideoRenderHandle {
  runId: string;
  publicAccessToken: string;
  title: string;
  /** Set when using direct Flask mode (no Trigger.dev) */
  directResult?: { status: "ready" | "failed"; videoUrl?: string; error?: string };
}

export type TriggerVideoRendersResult =
  | { ok: true; handles: VideoRenderHandle[] }
  | { ok: false; error: "insufficient_credits"; needed: number; balance: number }
  | { ok: false; error: "unauthenticated" };

export async function triggerVideoRenders(
  videos: VideoRenderRequest[]
): Promise<TriggerVideoRendersResult> {
  // ── Auth ──
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "unauthenticated" };

  // ── Pre-flight balance check for the whole batch ──
  const totalCost = videoBatchCost(videos);
  const balance = await getCreditBalance(userId);
  if (balance < totalCost) {
    return { ok: false, error: "insufficient_credits", needed: totalCost, balance };
  }

  const useTrigger = !!process.env.TRIGGER_SECRET_KEY;

  if (useTrigger) {
    // ── Trigger.dev path (async, production) ──
    // runIds only exist after tasks.trigger, so we trigger then charge per video.
    const { tasks } = await import("@trigger.dev/sdk");
    const handles: VideoRenderHandle[] = [];
    const chargedJobIds: string[] = [];
    try {
      for (const video of videos) {
        const handle = await tasks.trigger("render-video", {
          title: video.title,
          script: video.script,
          template: video.template,
          settings: video.settings,
        });

        // Charge immediately, keyed on the run id (== ContentItem.jobId).
        await spendCredits({
          userId,
          amount: videoCost(video),
          jobId: handle.id,
          type: "render_spend",
          reason: video.title,
        });
        chargedJobIds.push(handle.id);

        handles.push({
          runId: handle.id,
          publicAccessToken: handle.publicAccessToken!,
          title: video.title,
        });
      }
      return { ok: true, handles };
    } catch (err) {
      // A later charge failed (e.g. concurrent request drained the balance).
      // Refund everything we already charged in this batch and abort.
      for (const jobId of chargedJobIds) {
        await refundCredits({ userId, jobId, reason: "batch aborted" }).catch(() => {});
      }
      if (err instanceof InsufficientCreditsError) {
        return { ok: false, error: "insufficient_credits", needed: err.needed, balance: err.balance };
      }
      throw err;
    }
  }

  // ── Direct Flask path (synchronous, local dev) ──
  // We mint the jobId up-front, so we charge before rendering and refund on failure.
  const handles: VideoRenderHandle[] = [];
  const chargedJobIds: string[] = [];
  for (const video of videos) {
    const jobId = `direct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await spendCredits({
        userId,
        amount: videoCost(video),
        jobId,
        type: "render_spend",
        reason: video.title,
      });
      chargedJobIds.push(jobId);
    } catch (err) {
      // Balance ran out mid-batch — refund prior charges and abort.
      for (const j of chargedJobIds) {
        await refundCredits({ userId, jobId: j, reason: "batch aborted" }).catch(() => {});
      }
      if (err instanceof InsufficientCreditsError) {
        return { ok: false, error: "insufficient_credits", needed: err.needed, balance: err.balance };
      }
      throw err;
    }

    try {
      const result = await renderVideoViaFlask(video);
      handles.push({
        runId: jobId,
        publicAccessToken: "",
        title: video.title,
        directResult: { status: "ready", videoUrl: result.videoUrl },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Render failed";
      console.error(`Direct video render failed for "${video.title}":`, msg);
      // Render failed — refund this job's charge immediately.
      await refundCredits({ userId, jobId, reason: msg }).catch(() => {});
      handles.push({
        runId: jobId,
        publicAccessToken: "",
        title: video.title,
        directResult: { status: "failed", error: msg },
      });
    }
  }

  return { ok: true, handles };
}
