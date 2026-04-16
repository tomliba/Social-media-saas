"use server";

import { renderVideoViaFlask } from "@/lib/flask-render";
import type { VisualSegment } from "@/lib/video-types";

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

export async function triggerVideoRenders(
  videos: VideoRenderRequest[]
): Promise<VideoRenderHandle[]> {
  const useTrigger = !!process.env.TRIGGER_SECRET_KEY;

  if (useTrigger) {
    // ── Trigger.dev path (async, production) ──
    const { tasks } = await import("@trigger.dev/sdk");
    const handles = await Promise.all(
      videos.map(async (video) => {
        const handle = await tasks.trigger("render-video", {
          title: video.title,
          script: video.script,
          template: video.template,
          settings: video.settings,
        });

        return {
          runId: handle.id,
          publicAccessToken: handle.publicAccessToken!,
          title: video.title,
        };
      })
    );
    return handles;
  }

  // ── Direct Flask path (synchronous, local dev) ──
  const handles = await Promise.all(
    videos.map(async (video): Promise<VideoRenderHandle> => {
      const jobId = `direct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      try {
        const result = await renderVideoViaFlask(video);
        return {
          runId: jobId,
          publicAccessToken: "",
          title: video.title,
          directResult: { status: "ready", videoUrl: result.videoUrl },
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Render failed";
        console.error(`Direct video render failed for "${video.title}":`, msg);
        return {
          runId: jobId,
          publicAccessToken: "",
          title: video.title,
          directResult: { status: "failed", error: msg },
        };
      }
    })
  );

  return handles;
}
