"use server";

import type { RenderPreviewPayload } from "../../../trigger/render-preview";

export interface RenderPreviewHandle {
  runId: string;
}

export async function triggerRenderPreview(
  payload: RenderPreviewPayload
): Promise<RenderPreviewHandle> {
  const useTrigger = !!process.env.TRIGGER_SECRET_KEY;

  if (useTrigger) {
    const { tasks } = await import("@trigger.dev/sdk");
    const handle = await tasks.trigger("render-preview", payload);
    return { runId: handle.id };
  }

  // ── Direct Flask path (local dev) ──
  const flaskUrl = process.env.FLASK_API_URL;
  if (!flaskUrl) throw new Error("FLASK_API_URL not set");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.FLASK_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const { previewData, creativeSettings } = payload;

  const res = await fetch(`${flaskUrl}/vg/render-from-preview`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      audio_url: previewData.audioUrl,
      background_urls: previewData.backgroundPaths,
      captions: previewData.captions,
      volume_per_frame: previewData.volumePerFrame,
      duration_in_frames: previewData.durationInFrames,
      fps: previewData.fps,
      hook_text: creativeSettings.hookText,
      style: creativeSettings.style || "ai-story",
      caption_style: creativeSettings.captionStyle,
      caption_font_size: creativeSettings.captionFontSize,
      caption_text_transform: creativeSettings.captionTextTransform,
      caption_position: creativeSettings.captionPosition,
      music: creativeSettings.music,
      music_url: creativeSettings.musicUrl,
      film_grain: creativeSettings.filmGrain ?? false,
      shake_effect: creativeSettings.shakeEffect ?? false,
      transition_style: creativeSettings.transitionStyle,
      scale: 1.0,
      ...(payload.visualSegments && { visual_segments: payload.visualSegments }),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Flask /vg/render-from-preview failed (${res.status}): ${errText}`);
  }

  const startData = await res.json() as { ok: boolean; job_id: string };
  const jobId = startData.job_id;

  // In direct mode, poll SSE synchronously (simplified — just wait for completion)
  const eventsRes = await fetch(`${flaskUrl}/vg/render-from-preview/events/${jobId}`, {
    headers: {
      Accept: "text/event-stream",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
  });

  if (!eventsRes.ok || !eventsRes.body) {
    throw new Error(`Flask SSE endpoint failed (${eventsRes.status})`);
  }

  const reader = eventsRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let videoUrl = "";
  let thumbnailUrl = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        try {
          const evt = JSON.parse(trimmed.slice(6)) as { event: string; data: Record<string, unknown> };
          if (evt.event === "complete") {
            videoUrl = (evt.data.video_url as string) || "";
            thumbnailUrl = (evt.data.thumbnail_url as string) || "";
          } else if (evt.event === "error") {
            throw new Error(`Render error: ${evt.data.message || "Unknown"}`);
          }
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("Render error:")) throw e;
        }
      }

      if (videoUrl) break;
    }
  } finally {
    reader.cancel();
  }

  // Update library item
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  await fetch(`${appUrl}/api/library/${payload.libraryItemId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "ready",
      videoUrl,
      thumbnailUrl: thumbnailUrl || videoUrl,
    }),
  });

  return { runId: jobId };
}
