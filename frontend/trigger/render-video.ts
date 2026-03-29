import { task, metadata, logger } from "@trigger.dev/sdk";

export interface RenderVideoPayload {
  title: string;
  script: string;
  template: string;
  settings: {
    tone: string;
    presenter: string;
    background: string;
    duration: string;
    layout: string;
  };
}

export interface RenderVideoOutput {
  title: string;
  videoUrl: string;
  caption: string;
}

const stages = [
  { name: "generating_script", label: "Preparing script...", progress: 10, durationMs: 3000 },
  { name: "generating_audio", label: "Generating audio synthesis...", progress: 25, durationMs: 5000 },
  { name: "fetching_backgrounds", label: "Fetching background footage...", progress: 40, durationMs: 4000 },
  { name: "transcribing", label: "Creating word timestamps...", progress: 55, durationMs: 3000 },
  { name: "rendering_video", label: "Rendering video...", progress: 70, durationMs: 8000 },
  { name: "finalizing", label: "Finalizing export...", progress: 90, durationMs: 2000 },
] as const;

export const renderVideo = task({
  id: "render-video",
  maxDuration: 300,
  queue: {
    concurrencyLimit: 5,
  },
  run: async (payload: RenderVideoPayload): Promise<RenderVideoOutput> => {
    logger.log("Starting video render", { title: payload.title, template: payload.template });

    metadata.set("stage", "queued");
    metadata.set("stageLabel", "Queued for rendering...");
    metadata.set("progress", 0);
    metadata.set("title", payload.title);

    const railwayUrl = process.env.RAILWAY_API_URL;

    if (railwayUrl) {
      // ── Real render via Flask/Railway backend ──
      // TODO: Replace simulation below with actual Flask API call:
      // const res = await fetch(`${railwayUrl}/api/render-video`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // });
      // const result = await res.json();
      // return { title: payload.title, videoUrl: result.video_url, caption: result.caption };
      logger.log("RAILWAY_API_URL set but real render not yet implemented — using simulation");
    }

    // ── Simulated render (realistic timing, ~25s total) ──
    for (const stage of stages) {
      metadata.set("stage", stage.name);
      metadata.set("stageLabel", stage.label);
      metadata.set("progress", stage.progress);
      await new Promise((resolve) => setTimeout(resolve, stage.durationMs));
    }

    metadata.set("stage", "complete");
    metadata.set("stageLabel", "Complete!");
    metadata.set("progress", 100);

    logger.log("Render complete", { title: payload.title });

    return {
      title: payload.title,
      videoUrl: `/mock-videos/${encodeURIComponent(payload.title)}.mp4`,
      caption: `${payload.title} — Created with The Fluid Curator. #content #creator #viral`,
    };
  },
});
