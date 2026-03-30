"use server";

import { renderVideoViaFlask } from "@/lib/flask-render";

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
