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
  previewUrl: string;
  caption: string;
}

// ── Map frontend setting values to Flask API parameter values ──

const toneMap: Record<string, string> = {
  Funny: "funny_clean",
  Serious: "educational",
  Cursing: "funny_profanity",
  Edgy: "sarcastic",
};

const durationMap: Record<string, number> = {
  "15s": 15,
  "30s": 30,
  "60s": 60,
  "AI picks": 60,
};

// Frontend character names → Flask character directory names (lowercase, underscored)
const characterMap: Record<string, string> = {
  Doctor: "doctor",
  Professor: "professor",
  Chef: "chef",
  Cowboy: "cowboy",
  Robot: "robot",
  Vampire: "vampire",
  Wizard: "wizard",
  "Finance Bro": "finance_bro",
  Alien: "alien",
};

// ── SSE event types from Flask /vg/events/<job_id> ──

interface FlaskSSEEvent {
  event: "step" | "complete" | "error" | "ping";
  data: {
    step?: string;
    status?: string;
    message?: string;
    video_filename?: string;
    output_dir?: string;
    vg_job_id?: string;
    fatal?: boolean;
  };
}

// Map Flask pipeline steps to progress percentages and labels
const stepProgress: Record<string, { active: number; done: number; label: string }> = {
  parallel: { active: 25, done: 50, label: "Generating audio & fetching backgrounds..." },
  lipsync: { active: 55, done: 65, label: "Creating word-level timestamps..." },
  remotion: { active: 70, done: 95, label: "Rendering video with Remotion..." },
};

// ── Simulation stages (used when FLASK_API_URL is not set) ──

const simulationStages = [
  { name: "generating_script", label: "Preparing script...", progress: 10, durationMs: 3000 },
  { name: "generating_audio", label: "Generating audio synthesis...", progress: 25, durationMs: 5000 },
  { name: "fetching_backgrounds", label: "Fetching background footage...", progress: 40, durationMs: 4000 },
  { name: "transcribing", label: "Creating word timestamps...", progress: 55, durationMs: 3000 },
  { name: "rendering_video", label: "Rendering video...", progress: 70, durationMs: 8000 },
  { name: "finalizing", label: "Finalizing export...", progress: 90, durationMs: 2000 },
] as const;

// ── Parse a single SSE line into a structured event ──

function parseSSELine(line: string): FlaskSSEEvent | null {
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6)) as FlaskSSEEvent;
  } catch {
    return null;
  }
}

// ── The Trigger.dev task ──

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

    const flaskUrl = process.env.FLASK_API_URL;

    if (!flaskUrl) {
      // ── No Flask backend configured — run simulation ──
      logger.warn("FLASK_API_URL not set — using simulated render");
      return runSimulation(payload);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Optional API key for service-to-service auth
    const apiKey = process.env.FLASK_API_KEY;
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    // ── Step 1: Generate script breakdown via Flask ──
    metadata.set("stage", "generating_script");
    metadata.set("stageLabel", "Generating script breakdown...");
    metadata.set("progress", 5);

    const tone = toneMap[payload.settings.tone] ?? "funny_clean";
    const duration = durationMap[payload.settings.duration] ?? 60;
    const character = characterMap[payload.settings.presenter] ?? "doctor";

    const scriptRes = await fetch(`${flaskUrl}/vg/generate_script`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        topic: payload.script,
        tone,
        language: "English",
        duration,
        character,
        mode: "script", // We already have a script from Gemini — Flask generates scenes
      }),
    });

    if (!scriptRes.ok) {
      const errText = await scriptRes.text();
      throw new Error(`Flask /vg/generate_script failed (${scriptRes.status}): ${errText}`);
    }

    const scriptData = await scriptRes.json() as {
      vg_job_id: string;
      script: string;
      hook: string;
      cta: string;
      scenes: { text: string; image_prompt: string }[];
    };

    const jobId = scriptData.vg_job_id;
    logger.log("Script generated", { jobId, sceneCount: scriptData.scenes.length });

    metadata.set("stage", "script_ready");
    metadata.set("stageLabel", "Script ready — starting pipeline...");
    metadata.set("progress", 15);

    // ── Step 2: Start the full video pipeline ──
    const startRes = await fetch(`${flaskUrl}/vg/start`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        vg_job_id: jobId,
      }),
    });

    if (!startRes.ok) {
      const errText = await startRes.text();
      throw new Error(`Flask /vg/start failed (${startRes.status}): ${errText}`);
    }

    metadata.set("stage", "pipeline_started");
    metadata.set("stageLabel", "Video pipeline running...");
    metadata.set("progress", 20);

    // ── Step 3: Stream SSE events from Flask for real-time progress ──
    const eventsRes = await fetch(`${flaskUrl}/vg/events/${jobId}`, {
      headers: {
        Accept: "text/event-stream",
        ...(apiKey ? { "X-API-Key": apiKey } : {}),
      },
    });

    if (!eventsRes.ok || !eventsRes.body) {
      throw new Error(`Flask /vg/events/${jobId} failed (${eventsRes.status})`);
    }

    const reader = eventsRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let videoFilename = "";
    let outputDir = "";

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
              const label = isActive
                ? (evt.data.message ?? stepInfo.label)
                : `${evt.data.step} complete`;

              metadata.set("stage", `${evt.data.step}_${evt.data.status}`);
              metadata.set("stageLabel", label);
              metadata.set("progress", progress);
              logger.log(`Pipeline step: ${evt.data.step} → ${evt.data.status}`, { progress });
            }
          } else if (evt.event === "complete") {
            videoFilename = evt.data.video_filename || "final_video.mp4";
            outputDir = evt.data.output_dir || "";
            logger.log("Pipeline complete", { videoFilename, outputDir });
            break;
          } else if (evt.event === "error") {
            const msg = evt.data.message || "Unknown pipeline error";
            logger.error("Pipeline error", { message: msg, fatal: evt.data.fatal });
            throw new Error(`Flask render error: ${msg}`);
          }
          // Ignore ping events
        }

        // If we got the complete event, stop reading
        if (videoFilename) break;
      }
    } finally {
      reader.cancel();
    }

    if (!videoFilename || !outputDir) {
      throw new Error("SSE stream ended without a complete event");
    }

    // ── Build video URLs ──
    const videoUrl = `${flaskUrl}/vg/preview/${outputDir}/${videoFilename}`;
    const previewUrl = videoUrl; // Same URL for now, download uses /vg/download/

    metadata.set("stage", "complete");
    metadata.set("stageLabel", "Complete!");
    metadata.set("progress", 100);
    metadata.set("videoUrl", videoUrl);

    logger.log("Render complete", { title: payload.title, videoUrl });

    return {
      title: payload.title,
      videoUrl,
      previewUrl,
      caption: `${scriptData.hook} ${scriptData.cta}`,
    };
  },
});

// ── Simulation fallback (no Flask backend) ──

async function runSimulation(payload: RenderVideoPayload): Promise<RenderVideoOutput> {
  for (const stage of simulationStages) {
    metadata.set("stage", stage.name);
    metadata.set("stageLabel", stage.label);
    metadata.set("progress", stage.progress);
    await new Promise((resolve) => setTimeout(resolve, stage.durationMs));
  }

  metadata.set("stage", "complete");
  metadata.set("stageLabel", "Complete!");
  metadata.set("progress", 100);
  metadata.set("videoUrl", "");

  return {
    title: payload.title,
    videoUrl: "",
    previewUrl: "",
    caption: `${payload.title} — Created with The Fluid Curator. #content #creator #viral`,
  };
}
