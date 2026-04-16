import { task, metadata, logger } from "@trigger.dev/sdk";
import { defaultVoice } from "../src/lib/voices";
import type { VisualSegment } from "../src/lib/video-types";

export interface RenderVideoPayload {
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
      resolvedSegments?: VisualSegment[];
    };
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
  Regular: "regular",
  Funny: "funny_clean",
  Serious: "educational",
  Cursing: "funny_profanity",
  Edgy: "roast",
  Motivational: "motivational",
  Storytelling: "storytime",
  Sarcastic: "sarcastic",
  Shocked: "shocked",
  Conspiracy: "conspiracy",
  Friendly: "friendly",
};

const durationMap: Record<string, number> = {
  "15s": 15,
  "30s": 30,
  "60s": 60,
  "90s": 90,
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
  Gamer: "gamer",
  "Chef Women": "cheff_women",
  "Fitness Men": "fitness_men",
  "Fitness Women": "fitness_women",
  Teacher: "teacher",
};

// Frontend background options → Flask bg_mode values
const bgModeMap: Record<string, string> = {
  "Stock footage": "pexels",
  "AI images": "ai",
  "Kling video": "pexels",   // Pro feature — falls back to Pexels for now
  "Upload own": "pexels",    // Upload not yet implemented — falls back to Pexels
};

// Frontend background mode options → Flask background_mode values
const backgroundModeMap: Record<string, string> = {
  "Smart Mix": "smart_mix",
  "Stock Footage": "pexels",
  "AI Images": "ai_images",
  "Animated AI": "ai_images",
  "Motion Graphics": "motion_graphics",
};

// Frontend layout options → Flask layout values (passed through for Remotion)
const layoutMap: Record<string, string> = {
  Standard: "standard",
  "Split screen": "split",
  "Text only": "text_only",
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
    video_url?: string;
    thumbnail_url?: string;
    fatal?: boolean;
  };
}

// Map Flask pipeline steps to progress percentages and labels
const stepProgress: Record<string, { active: number; done: number; label: string }> = {
  parallel: { active: 40, done: 55, label: "Generating voice + fetching backgrounds..." },
  lipsync: { active: 55, done: 65, label: "Creating word-level timestamps..." },
  remotion: { active: 70, done: 90, label: "Rendering video with Remotion..." },
  upload: { active: 90, done: 95, label: "Uploading to cloud storage..." },
};

// ── Simulation stages (used when FLASK_API_URL is not set) ──

const simulationStages = [
  { name: "generating_script", label: "Preparing script...", progress: 10, durationMs: 3000 },
  { name: "tts", label: "Generating speech audio...", progress: 20, durationMs: 4000 },
  { name: "visual_plan", label: "Breaking script into visual segments...", progress: 30, durationMs: 2000 },
  { name: "resolving_assets", label: "Fetching Pexels clips per segment...", progress: 45, durationMs: 4000 },
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
  maxDuration: 600,
  queue: {
    concurrencyLimit: 1,
  },
  onFailure: async (params: { ctx: { run: { id: string } }; error: unknown }) => {
    const runId = params.ctx.run.id;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const errMsg = params.error instanceof Error ? params.error.message : "Render failed";
    try {
      await fetch(`${appUrl}/api/library/${runId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "failed", error: errMsg }),
      });
    } catch (err) {
      logger.warn("Failed to update library item on failure", { error: String(err) });
    }
  },
  run: async (payload: RenderVideoPayload, { ctx }): Promise<RenderVideoOutput> => {
    logger.log("Starting video render", { title: payload.title, template: payload.template });

    metadata.set("stage", "queued");
    metadata.set("stageLabel", "Queued for rendering...");
    metadata.set("progress", 0);
    metadata.set("title", payload.title);

    const runId = ctx.run.id;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const flaskUrl = process.env.FLASK_API_URL;

    if (!flaskUrl) {
      // ── No Flask backend configured — run simulation ──
      logger.warn("FLASK_API_URL not set — using simulated render");
      const result = await runSimulation(payload);

      // Update library item status to ready
      try {
        await fetch(`${appUrl}/api/library/${runId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ready", videoUrl: result.videoUrl, thumbnailUrl: result.previewUrl }),
        });
      } catch (err) {
        logger.warn("Failed to update library item (simulation)", { error: String(err) });
      }

      return result;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Optional API key for service-to-service auth
    const apiKey = process.env.FLASK_API_KEY;
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    // Resolve settings once
    const tone = toneMap[payload.settings.tone] ?? "funny_clean";
    const duration = durationMap[payload.settings.duration] ?? 60;
    const character = characterMap[payload.settings.presenter] ?? "doctor";
    // voice is now a Fish Audio ID (passed directly from the voice picker)
    const voiceId = payload.settings.voice || defaultVoice.fishAudioId;
    const bgMode = bgModeMap[payload.settings.background] ?? "pexels";
    const backgroundMode = backgroundModeMap[payload.settings.backgroundMode ?? "Smart Mix"] ?? "smart_mix";
    const layout = layoutMap[payload.settings.layout] ?? "standard";
    const speed = payload.settings.speed ?? 1.0;
    const animate = payload.settings.animate === true;

    // Helper to record failure in metadata before re-throwing
    function failAtStage(stage: string, err: unknown): never {
      const message = err instanceof Error ? err.message : String(err);
      metadata.set("stage", "failed");
      metadata.set("stageLabel", "Failed");
      metadata.set("errorStage", stage);
      metadata.set("errorMessage", message);
      logger.error(`Failed at stage: ${stage}`, { message });
      throw err;
    }

    let jobId = "";
    let scriptData: {
      vg_job_id: string;
      script: string;
      hook: string;
      cta: string;
      scenes: { text: string; image_prompt: string }[];
    };

    const aiStory = payload.settings.aiStory;

    if (payload.settings.vgJobId) {
      // ── Pre-existing job: script already generated, reuse Flask job ──
      jobId = payload.settings.vgJobId;
      scriptData = {
        vg_job_id: payload.settings.vgJobId,
        script: payload.script,
        hook: "",
        cta: "",
        scenes: [],
      };
      logger.log("Reusing existing vgJobId — skipping script generation", { jobId });
      metadata.set("stage", "script_ready");
      metadata.set("stageLabel", "Script ready — generating speech...");
      metadata.set("progress", 15);
    } else if (aiStory) {
      // ── AI Story mode: script already generated, use provided data ──
      jobId = aiStory.vgJobId;
      scriptData = {
        vg_job_id: aiStory.vgJobId,
        script: payload.script,
        hook: aiStory.hook,
        cta: aiStory.cta,
        scenes: aiStory.scenes,
      };
      logger.log("AI Story mode — using pre-generated script", { jobId, sceneCount: aiStory.scenes.length });
      metadata.set("stage", "script_ready");
      metadata.set("stageLabel", "Script ready — generating speech...");
      metadata.set("progress", 15);
    } else {
    // ── Step 1: Generate script breakdown via Flask ──
    try {
      console.log(`[render-video] ▶ STAGE: script_generation | title="${payload.title}"`);
      metadata.set("stage", "generating_script");
      metadata.set("stageLabel", "Generating script breakdown...");
      metadata.set("progress", 5);

      logger.log("Settings mapped", { tone, duration, character, voiceId, bgMode, backgroundMode, layout, speed });

      const scriptRes = await fetch(`${flaskUrl}/vg/generate_script`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          topic: payload.script,
          tone,
          language: "English",
          duration,
          character,
          mode: "script",
        }),
      });

      if (!scriptRes.ok) {
        const errText = await scriptRes.text();
        throw new Error(`Flask /vg/generate_script failed (${scriptRes.status}): ${errText}`);
      }

      scriptData = await scriptRes.json() as typeof scriptData;

      jobId = scriptData.vg_job_id;
      logger.log("Script generated", { jobId, sceneCount: scriptData.scenes.length });
    } catch (err) {
      failAtStage("script_generation", err);
    }
    }

    metadata.set("stage", "script_ready");
    metadata.set("stageLabel", "Script ready — generating speech...");
    metadata.set("progress", 15);

    // ── Step 2: TTS (ALWAYS runs — creates the job in Flask's memory + generates voiceover.mp3) ──
    let resolvedData: { segments: VisualSegment[] };
    let ttsData: { audio_duration_ms: number; word_timestamps: unknown[] };

    try {
      console.log(`[render-video] ▶ STAGE: tts | jobId="${jobId}"`);
      metadata.set("stage", "tts");
      metadata.set("stageLabel", "Generating speech audio...");
      metadata.set("progress", 18);

      const ttsRes = await fetch(`${flaskUrl}/vg/tts`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          vg_job_id: jobId,
          voice_id: voiceId,
          speed,
          ...(aiStory ? { language: aiStory.language } : {}),
        }),
      });

      if (!ttsRes.ok) {
        const errText = await ttsRes.text();
        throw new Error(`Flask /vg/tts failed (${ttsRes.status}): ${errText}`);
      }

      ttsData = await ttsRes.json() as typeof ttsData;
      logger.log("TTS complete", { audio_duration_ms: ttsData.audio_duration_ms });
    } catch (err) {
      failAtStage("tts", err);
    }

    metadata.set("stage", "tts_ready");
    metadata.set("stageLabel", "Speech ready — planning visuals...");
    metadata.set("progress", 22);

    const preResolved = aiStory?.resolvedSegments || payload.settings.resolvedSegments;
    if ((aiStory?.assetsReady || payload.settings.assetsReady) && preResolved) {
      // ── Assets-ready shortcut: skip visual-plan + resolve-assets, use stored segments ──
      logger.log("Assets already prepared — skipping visual-plan + resolve-assets", {
        segmentCount: preResolved.length,
      });
      resolvedData = { segments: preResolved };
      metadata.set("stage", "pipeline_starting");
      metadata.set("stageLabel", "Starting video render...");
      metadata.set("progress", 40);
    } else {
    // ── Step 3: Visual plan (uses real speech timing for segment alignment) ──
    let visualPlanData: { segments: VisualSegment[] };

    try {
      console.log(`[render-video] ▶ STAGE: visual_plan | jobId="${jobId}"`);
      metadata.set("stage", "visual_plan");
      metadata.set("stageLabel", "Breaking script into visual segments...");
      metadata.set("progress", 25);

      const visualPlanRes = await fetch(`${flaskUrl}/vg/visual-plan`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          vg_job_id: jobId,
          background_mode: backgroundMode,
          script: scriptData.script,
          audio_duration_ms: ttsData.audio_duration_ms,
          word_timestamps: ttsData.word_timestamps,
          ...(aiStory ? { art_style: aiStory.artStyle, style: "ai-story", scene_mode: aiStory.sceneMode } : {}),
        }),
      });

      if (!visualPlanRes.ok) {
        const errText = await visualPlanRes.text();
        throw new Error(`Flask /vg/visual-plan failed (${visualPlanRes.status}): ${errText}`);
      }

      visualPlanData = await visualPlanRes.json() as { segments: VisualSegment[] };
      logger.log("Visual plan complete", { segmentCount: visualPlanData.segments.length });
    } catch (err) {
      failAtStage("visual_plan", err);
    }

    metadata.set("stage", "resolving_assets");
    metadata.set("stageLabel", "Fetching clips per segment...");
    metadata.set("progress", 30);

    // ── Step 4: Resolve assets (fetch Pexels clip per segment) ──

    try {
      console.log(`[render-video] ▶ STAGE: resolve_assets | jobId="${jobId}" segments=${visualPlanData.segments.length}`);

      const resolveRes = await fetch(`${flaskUrl}/vg/resolve-assets`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          vg_job_id: jobId,
          segments: visualPlanData.segments,
          ...(animate ? { animate: true } : {}),
          ...(aiStory ? { art_style: aiStory.artStyle, style: "ai-story", scene_mode: aiStory.sceneMode } : {}),
        }),
      });

      if (!resolveRes.ok) {
        const errText = await resolveRes.text();
        throw new Error(`Flask /vg/resolve-assets failed (${resolveRes.status}): ${errText}`);
      }

      resolvedData = await resolveRes.json() as { segments: VisualSegment[] };

      logger.log("Assets resolved", {
        segmentCount: resolvedData.segments.length,
        withUrls: resolvedData.segments.filter((s) => s.asset_url).length,
      });
    } catch (err) {
      failAtStage("resolve_assets", err);
    }

    // Step 4b: Animate backgrounds (if enabled)
    if (animate) {
      try {
        logger.log("Animating backgrounds...");
        const animRes = await fetch(`${flaskUrl}/vg/animate-segments`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            vg_job_id: jobId,
            segments: resolvedData.segments,
          }),
        });

        if (!animRes.ok) {
          const errText = await animRes.text();
          throw new Error(`Flask /vg/animate-segments failed (${animRes.status}): ${errText}`);
        }

        const animData = await animRes.json() as { segments: VisualSegment[] };
        resolvedData.segments = animData.segments;
      } catch (err) {
        failAtStage("animate_segments", err);
      }
    }

    // Store visual segments in metadata for the review page timeline
    metadata.set("visualSegments", JSON.parse(JSON.stringify(resolvedData.segments)));

    metadata.set("stage", "pipeline_starting");
    metadata.set("stageLabel", "Starting video pipeline (render)...");
    metadata.set("progress", 40);
    } // end of non-assetsReady path

    // ── Step 5: Start pipeline via /vg/start (lipsync + Remotion render — TTS already done) ──
    try {
      console.log(`[render-video] ▶ STAGE: vg_start | jobId="${jobId}"`);

      const startBody: Record<string, unknown> = {
          vg_job_id: jobId,
          script: scriptData.script,
          voice_id: voiceId,
          bg_mode: bgMode,
          background_mode: backgroundMode,
          layout,
          speed,
          visual_segments: resolvedData.segments,
        };

      // Pass AI Story-specific fields to Flask
      if (aiStory) {
        startBody.style = "ai-story";
        startBody.art_style = aiStory.artStyle;
        startBody.caption_style = aiStory.captionStyle;
        startBody.caption_font_size = aiStory.captionFontSize;
        startBody.caption_text_transform = aiStory.captionTransform;
        startBody.caption_position = aiStory.captionPosition;
        startBody.music = aiStory.music;
        startBody.language = aiStory.language;
        startBody.film_grain = aiStory.filmGrain;
        startBody.shake_effect = aiStory.shakeEffect;
        startBody.scene_mode = aiStory.sceneMode;
        startBody.hook = aiStory.hook;
        startBody.cta = aiStory.cta;
        startBody.tone = aiStory.tone;
        startBody.duration = aiStory.duration;
        startBody.transition_style = aiStory.transitionStyle;
      }

      const startRes = await fetch(`${flaskUrl}/vg/start`, {
        method: "POST",
        headers,
        body: JSON.stringify(startBody),
      });

      if (!startRes.ok) {
        const errText = await startRes.text();
        throw new Error(`Flask /vg/start failed (${startRes.status}): ${errText}`);
      }
    } catch (err) {
      failAtStage("pipeline_start", err);
    }

    metadata.set("stage", "pipeline_running");
    metadata.set("stageLabel", "Video pipeline running...");
    metadata.set("progress", 40);

    // ── Step 6: Stream SSE events from Flask for pipeline progress ──
    let videoFilename = "";
    let outputDir = "";
    let r2VideoUrl = "";

    try {
      console.log(`[render-video] ▶ STAGE: sse_streaming | jobId="${jobId}"`);

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
              r2VideoUrl = evt.data.video_url || "";
              logger.log("Pipeline complete", { videoFilename, outputDir, r2VideoUrl });
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
    } catch (err) {
      failAtStage("pipeline_render", err);
    }

    // ── Build video URL ──
    // Prefer R2 URL (direct CDN) when available; fall back to Flask proxy for local files
    let videoUrl: string;
    if (r2VideoUrl) {
      videoUrl = r2VideoUrl;
    } else {
      const flaskPath = `/vg/preview/${outputDir}/${videoFilename}`;
      videoUrl = `/api/video-proxy?path=${encodeURIComponent(flaskPath)}`;
    }
    // Generate thumbnail via Flask
    let thumbnailUrl: string | null = null;
    try {
      const thumbRes = await fetch(`${flaskUrl}/thumbnail/video`, {
        method: "POST",
        headers,
        body: JSON.stringify({ video_url: videoUrl }),
      });
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json() as { thumbnailUrl?: string };
        thumbnailUrl = thumbData.thumbnailUrl ?? null;
        logger.log("Thumbnail generated", { thumbnailUrl });
      } else {
        logger.warn("Thumbnail generation failed", { status: thumbRes.status });
      }
    } catch (err) {
      logger.warn("Thumbnail generation error", { error: String(err) });
    }

    metadata.set("stage", "complete");
    metadata.set("stageLabel", "Complete!");
    metadata.set("progress", 100);
    metadata.set("videoUrl", videoUrl);

    console.log(`[render-video] ✓ COMPLETE | title="${payload.title}" videoUrl="${videoUrl}"`);
    logger.log("Render complete", { title: payload.title, videoUrl });

    // Update library item status to ready
    try {
      await fetch(`${appUrl}/api/library/${runId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ready",
          videoUrl,
          thumbnailUrl: thumbnailUrl ?? videoUrl,
        }),
      });
    } catch (err) {
      logger.warn("Failed to update library item", { error: String(err) });
    }

    return {
      title: payload.title,
      videoUrl,
      previewUrl: thumbnailUrl ?? videoUrl,
      caption: `${scriptData.hook} ${scriptData.cta}`,
    };
  },
});

// ── Simulation fallback (no Flask backend) ──

async function runSimulation(payload: RenderVideoPayload): Promise<RenderVideoOutput> {
  for (const stage of simulationStages) {
    console.log(`[render-video] ▶ STAGE (sim): ${stage.name} | title="${payload.title}"`);
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
