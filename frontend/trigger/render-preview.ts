import { task, metadata, logger } from "@trigger.dev/sdk";

export interface RenderPreviewPayload {
  /** Library item ID — used to update status on completion */
  libraryItemId: string;
  title: string;
  previewData: {
    audioUrl: string;
    backgroundPaths: string[];
    captions: unknown[];
    volumePerFrame: number[];
    durationInFrames: number;
    fps: number;
  };
  creativeSettings: {
    hookText?: string;
    style?: string;
    captionStyle?: string;
    captionFontSize?: string;
    captionTextTransform?: string;
    captionPosition?: string;
    music?: string;
    musicUrl?: string;
    filmGrain?: boolean;
    shakeEffect?: boolean;
    transitionStyle?: string;
  };
}

// ── SSE event types from Flask ──

interface FlaskSSEEvent {
  event: "step" | "complete" | "error" | "ping";
  data: {
    step?: string;
    status?: string;
    message?: string;
    video_url?: string;
    thumbnail_url?: string;
    fatal?: boolean;
  };
}

function parseSSELine(line: string): FlaskSSEEvent | null {
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6)) as FlaskSSEEvent;
  } catch {
    return null;
  }
}

const stepProgress: Record<string, { active: number; done: number; label: string }> = {
  remotion: { active: 30, done: 70, label: "Rendering video..." },
  upload: { active: 70, done: 90, label: "Uploading to cloud storage..." },
};

// ── The Trigger.dev task ──

export const renderPreview = task({
  id: "render-preview",
  maxDuration: 600,
  queue: {
    concurrencyLimit: 1,
  },
  onFailure: async (params: { ctx: { run: { id: string } }; error: unknown; payload: RenderPreviewPayload }) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
    const errMsg = params.error instanceof Error ? params.error.message : "Render failed";
    const libraryItemId = params.payload?.libraryItemId;
    if (!libraryItemId) return;
    try {
      await fetch(`${appUrl}/api/library/${libraryItemId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "failed", error: errMsg }),
      });
    } catch (err) {
      logger.warn("Failed to update library item on failure", { error: String(err) });
    }
  },
  run: async (payload: RenderPreviewPayload): Promise<{ videoUrl: string; thumbnailUrl: string }> => {
    logger.log("Starting render-from-preview", { title: payload.title, libraryItemId: payload.libraryItemId });

    metadata.set("stage", "starting");
    metadata.set("stageLabel", "Starting render...");
    metadata.set("progress", 0);
    metadata.set("title", payload.title);

    const flaskUrl = process.env.FLASK_API_URL;
    if (!flaskUrl) {
      throw new Error("FLASK_API_URL not set — cannot render without Flask backend");
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const apiKey = process.env.FLASK_API_KEY;
    if (apiKey) headers["X-API-Key"] = apiKey;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
    const { previewData, creativeSettings } = payload;

    // ── Step 1: Call /vg/render-from-preview ──
    let jobId: string;

    try {
      metadata.set("stage", "render_start");
      metadata.set("stageLabel", "Sending render request...");
      metadata.set("progress", 5);

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
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Flask /vg/render-from-preview failed (${res.status}): ${errText}`);
      }

      const startData = await res.json() as { ok: boolean; job_id: string };
      jobId = startData.job_id;
      logger.log("Render job started", { jobId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      metadata.set("stage", "failed");
      metadata.set("stageLabel", "Failed to start render");
      metadata.set("errorMessage", message);
      throw err;
    }

    // ── Step 2: Stream SSE for progress ──
    metadata.set("stage", "rendering");
    metadata.set("stageLabel", "Rendering video...");
    metadata.set("progress", 20);

    let videoUrl = "";
    let thumbnailUrl = "";

    try {
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

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const evt = parseSSELine(trimmed);
            if (!evt) continue;

            if (evt.event === "step" && evt.data.step) {
              const stepInfo = stepProgress[evt.data.step];
              if (stepInfo) {
                const isActive = evt.data.status === "active";
                const progress = isActive ? stepInfo.active : stepInfo.done;
                metadata.set("stage", `${evt.data.step}_${evt.data.status}`);
                metadata.set("stageLabel", isActive ? stepInfo.label : `${evt.data.step} complete`);
                metadata.set("progress", progress);
                logger.log(`Step: ${evt.data.step} → ${evt.data.status}`, { progress });
              }
            } else if (evt.event === "complete") {
              videoUrl = evt.data.video_url || "";
              thumbnailUrl = evt.data.thumbnail_url || "";
              logger.log("Render complete", { videoUrl, thumbnailUrl });
              break;
            } else if (evt.event === "error") {
              const msg = evt.data.message || "Unknown render error";
              logger.error("Render error", { message: msg });
              throw new Error(`Flask render error: ${msg}`);
            }
          }

          if (videoUrl) break;
        }
      } finally {
        reader.cancel();
      }

      if (!videoUrl) {
        throw new Error("SSE stream ended without a complete event");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      metadata.set("stage", "failed");
      metadata.set("stageLabel", "Render failed");
      metadata.set("errorMessage", message);
      throw err;
    }

    // ── Step 3: Update library item to "ready" ──
    metadata.set("stage", "finalizing");
    metadata.set("stageLabel", "Finalizing...");
    metadata.set("progress", 95);

    try {
      await fetch(`${appUrl}/api/library/${payload.libraryItemId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ready",
          videoUrl,
          thumbnailUrl: thumbnailUrl || videoUrl,
        }),
      });
      logger.log("Library item updated to ready", { libraryItemId: payload.libraryItemId });
    } catch (err) {
      logger.warn("Failed to update library item", { error: String(err) });
    }

    metadata.set("stage", "complete");
    metadata.set("stageLabel", "Complete!");
    metadata.set("progress", 100);

    return { videoUrl, thumbnailUrl: thumbnailUrl || videoUrl };
  },
});
