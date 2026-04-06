import { task, metadata, logger } from "@trigger.dev/sdk";
import { defaultVoice } from "../src/lib/voices";
import type { VisualSegment } from "../src/lib/video-types";

export interface PrepareAssetsPayload {
  title: string;
  script: string;
  /** Library item ID — task will PATCH this item with preview data on completion */
  libraryItemId?: string;
  /** Pre-generated scene image R2 URLs — skips visual-plan and resolve-assets when provided */
  preGeneratedImageUrls?: string[];
  settings: {
    voice: string;
    speed?: number;
    backgroundMode?: string;
    aiStory: {
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
    };
  };
}

export interface PrepareAssetsOutput {
  /** Data needed by the Remotion Player for browser preview */
  previewData: {
    audioUrl: string;
    backgroundPaths: string[];
    captions: CaptionEntry[];
    volumePerFrame: number[];
    durationInFrames: number;
    fps: number;
    backgroundType: "video" | "image";
    showCaptions: boolean;
    /** Per-scene duration in frames (when pre-generated images with scene-timing are used) */
    imageDurations?: number[];
  };
  /** Resolved visual segments — passed to render-video on export */
  resolvedSegments: VisualSegment[];
  /** Flask job ID — reused for the export render */
  jobId: string;
}

interface CaptionWord {
  word: string;
  startFrame: number;
  endFrame: number;
}

interface CaptionEntry {
  text: string;
  startFrame: number;
  endFrame: number;
  words: CaptionWord[];
}

// ── Setting maps ──

const backgroundModeMap: Record<string, string> = {
  "Smart Mix": "smart_mix",
  "Stock Footage": "pexels",
  "AI Images": "ai_images",
  "Motion Graphics": "motion_graphics",
};

// ── The Trigger.dev task ──

export const prepareAssets = task({
  id: "prepare-assets",
  maxDuration: 300, // 5 minutes — no Remotion render here
  queue: {
    concurrencyLimit: 2,
  },
  run: async (payload: PrepareAssetsPayload): Promise<PrepareAssetsOutput> => {
    logger.log("Starting asset preparation", { title: payload.title });

    metadata.set("stage", "queued");
    metadata.set("stageLabel", "Queued...");
    metadata.set("progress", 0);
    metadata.set("title", payload.title);

    const flaskUrl = process.env.FLASK_API_URL;
    if (!flaskUrl) {
      throw new Error("FLASK_API_URL not set — cannot prepare assets without Flask backend");
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const apiKey = process.env.FLASK_API_KEY;
    if (apiKey) headers["X-API-Key"] = apiKey;

    const aiStory = payload.settings.aiStory;
    const jobId = aiStory.vgJobId;
    const voiceId = payload.settings.voice || defaultVoice.fishAudioId;
    const speed = payload.settings.speed ?? 1.0;
    const backgroundMode = backgroundModeMap[payload.settings.backgroundMode ?? "AI Images"] ?? "ai_images";

    function fail(stage: string, err: unknown): never {
      const message = err instanceof Error ? err.message : String(err);
      metadata.set("stage", "failed");
      metadata.set("stageLabel", `Failed at ${stage}`);
      metadata.set("errorStage", stage);
      metadata.set("errorMessage", message);
      logger.error(`Failed at stage: ${stage}`, { message });
      throw err;
    }

    // ── Step 1: TTS ──
    let ttsData: { audio_duration_ms: number; word_timestamps: unknown[] };

    try {
      metadata.set("stage", "tts");
      metadata.set("stageLabel", "Generating voiceover...");
      metadata.set("progress", 10);

      const ttsRes = await fetch(`${flaskUrl}/vg/tts`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          vg_job_id: jobId,
          voice_id: voiceId,
          speed,
          language: aiStory.language,
        }),
      });

      if (!ttsRes.ok) {
        throw new Error(`Flask /vg/tts failed (${ttsRes.status}): ${await ttsRes.text()}`);
      }

      ttsData = await ttsRes.json() as typeof ttsData;
      logger.log("TTS complete", { audio_duration_ms: ttsData.audio_duration_ms });
    } catch (err) {
      fail("tts", err);
    }

    metadata.set("stage", "tts_ready");
    metadata.set("stageLabel", "Voiceover ready — planning visuals...");
    metadata.set("progress", 30);

    let resolvedData: { segments: VisualSegment[] };

    const hasPreGeneratedUrls = payload.preGeneratedImageUrls && payload.preGeneratedImageUrls.length > 0;
    let imageDurations: number[] | undefined;

    if (hasPreGeneratedUrls) {
      // ── Pre-generated images — get scene timing (incl. hook + CTA), skip visual-plan + resolve-assets ──
      const preUrls = payload.preGeneratedImageUrls!;

      try {
        metadata.set("stage", "scene_timing");
        metadata.set("stageLabel", "Calculating scene timing...");
        metadata.set("progress", 35);

        const stRes = await fetch(`${flaskUrl}/vg/scene-timing`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            vg_job_id: jobId,
            hook: aiStory.hook,
            scenes: aiStory.scenes,
            cta: aiStory.cta,
            word_timestamps: ttsData.word_timestamps,
            audio_duration_ms: ttsData.audio_duration_ms,
          }),
        });

        if (!stRes.ok) {
          throw new Error(`Flask /vg/scene-timing failed (${stRes.status}): ${await stRes.text()}`);
        }

        // Response includes timings for all entries: [hook, scene1, scene2, ..., cta]
        const timingData = await stRes.json() as { scene_timings: { startSec: number; endSec: number; type?: string; label?: string }[] };
        logger.log("Scene timing complete", { entryCount: timingData.scene_timings.length });

        metadata.set("stage", "images_ready");
        metadata.set("stageLabel", "Images ready — preparing preview...");
        metadata.set("progress", 60);

        // Map preGeneratedImageUrls sequentially: [hook, scene1, ..., cta]
        const lastUrl = preUrls[preUrls.length - 1];
        resolvedData = {
          segments: timingData.scene_timings.map((timing, i) => ({
            visual_type: "ai_image",
            startSec: timing.startSec,
            endSec: timing.endSec,
            speech: timing.label ?? "",
            asset_url: i < preUrls.length ? preUrls[i] : lastUrl,
            data: {},
          })),
        };

        logger.log("Using pre-generated image URLs", { count: preUrls.length, segments: resolvedData.segments.length });
        logger.log("Scene timing debug", {
          preGeneratedImageUrls: preUrls.length,
          sceneTimings: timingData.scene_timings.length,
          segments: resolvedData.segments.map((s, i) => ({
            index: i,
            startSec: s.startSec,
            endSec: s.endSec,
            urlPrefix: s.asset_url?.substring(0, 50),
          })),
        });
      } catch (err) {
        fail("scene_timing", err);
      }
    } else {
      // ── Step 2: Visual plan ──
      let visualPlanData: { segments: VisualSegment[] };

      try {
        metadata.set("stage", "visual_plan");
        metadata.set("stageLabel", "Creating scene images...");
        metadata.set("progress", 35);

        const vpRes = await fetch(`${flaskUrl}/vg/visual-plan`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            vg_job_id: jobId,
            background_mode: backgroundMode,
            script: payload.script,
            audio_duration_ms: ttsData.audio_duration_ms,
            word_timestamps: ttsData.word_timestamps,
            art_style: aiStory.artStyle,
            style: "ai-story",
            scene_mode: aiStory.sceneMode,
          }),
        });

        if (!vpRes.ok) {
          throw new Error(`Flask /vg/visual-plan failed (${vpRes.status}): ${await vpRes.text()}`);
        }

        visualPlanData = await vpRes.json() as { segments: VisualSegment[] };
        logger.log("Visual plan complete", { segmentCount: visualPlanData.segments.length });
      } catch (err) {
        fail("visual_plan", err);
      }

      // ── Step 3: Resolve assets ──

      try {
        metadata.set("stage", "resolve_assets");
        metadata.set("stageLabel", "Creating scene images...");
        metadata.set("progress", 50);

        const raRes = await fetch(`${flaskUrl}/vg/resolve-assets`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            vg_job_id: jobId,
            segments: visualPlanData.segments,
            art_style: aiStory.artStyle,
            style: "ai-story",
            scene_mode: aiStory.sceneMode,
          }),
        });

        if (!raRes.ok) {
          throw new Error(`Flask /vg/resolve-assets failed (${raRes.status}): ${await raRes.text()}`);
        }

        resolvedData = await raRes.json() as { segments: VisualSegment[] };
        logger.log("Assets resolved", {
          segmentCount: resolvedData.segments.length,
          withUrls: resolvedData.segments.filter((s) => s.asset_url).length,
        });
      } catch (err) {
        fail("resolve_assets", err);
      }
    }

    // ── Step 4: Get preview data (R2 URLs for audio, images, captions) ──
    // Flask returns camelCase: audioUrl, backgroundPaths, volumePerFrame, durationInFrames
    let previewResponse: {
      audioUrl: string;
      backgroundPaths: string[];
      backgroundType: string;
      captions: CaptionEntry[];
      volumePerFrame: number[];
      durationInFrames: number;
      fps: number;
      showCaptions: boolean;
    };

    try {
      metadata.set("stage", "preview_data");
      metadata.set("stageLabel", "Preparing preview...");
      metadata.set("progress", 85);

      const previewDataBody: Record<string, unknown> = { vg_job_id: jobId };
      if (hasPreGeneratedUrls) {
        // Use the mapped URLs (in segment order, with last-URL reuse applied)
        previewDataBody.background_urls = resolvedData.segments.map((s) => s.asset_url);
      }

      const pdRes = await fetch(`${flaskUrl}/vg/preview-data`, {
        method: "POST",
        headers,
        body: JSON.stringify(previewDataBody),
      });

      if (!pdRes.ok) {
        throw new Error(`Flask /vg/preview-data failed (${pdRes.status}): ${await pdRes.text()}`);
      }

      previewResponse = await pdRes.json() as typeof previewResponse;
      console.log("[prepare-assets] /vg/preview-data response keys:", Object.keys(previewResponse));
      console.log("[prepare-assets] /vg/preview-data response:", JSON.stringify({
        audioUrl: previewResponse.audioUrl ? "present" : "missing",
        backgroundPaths: previewResponse.backgroundPaths?.length ?? "missing",
        captions: previewResponse.captions?.length ?? "missing",
        volumePerFrame: previewResponse.volumePerFrame?.length ?? "missing",
        durationInFrames: previewResponse.durationInFrames ?? "missing",
        fps: previewResponse.fps ?? "missing",
      }));
      logger.log("Preview data ready", {
        audioUrl: previewResponse.audioUrl ? "yes" : "no",
        backgrounds: previewResponse.backgroundPaths?.length ?? 0,
        captions: previewResponse.captions?.length ?? 0,
        durationInFrames: previewResponse.durationInFrames,
      });
    } catch (err) {
      fail("preview_data", err);
    }

    metadata.set("stage", "complete");
    metadata.set("stageLabel", "Ready for preview!");
    metadata.set("progress", 100);

    const showCaptions = !!aiStory.captionStyle;

    // Compute per-scene image durations in frames from resolved segment timing
    if (hasPreGeneratedUrls) {
      const fps = previewResponse.fps || 30;
      imageDurations = resolvedData.segments.map((seg) =>
        Math.round((seg.endSec - seg.startSec) * fps)
      );
      logger.log("Image durations (frames)", { imageDurations });
    }

    const previewData = {
      audioUrl: previewResponse.audioUrl,
      backgroundPaths: (previewResponse.backgroundPaths ?? []).filter(
        (p: unknown): p is string => typeof p === "string" && (p as string).startsWith("https://")
      ),
      captions: previewResponse.captions,
      volumePerFrame: previewResponse.volumePerFrame,
      durationInFrames: previewResponse.durationInFrames,
      fps: previewResponse.fps,
      backgroundType: (previewResponse.backgroundType as "video" | "image") || "image",
      showCaptions,
      ...(imageDurations && { imageDurations }),
    };

    // Build creative settings for the Remotion player
    const creativeSettings = {
      captionStyle: aiStory.captionStyle ?? undefined,
      captionFontSize: aiStory.captionFontSize ?? undefined,
      captionTextTransform: aiStory.captionTransform ?? undefined,
      captionPosition: aiStory.captionPosition ?? undefined,
      music: aiStory.music ?? undefined,
      filmGrain: aiStory.filmGrain,
      shakeEffect: aiStory.shakeEffect,
      transitionStyle: aiStory.transitionStyle,
      hookText: aiStory.hook,
      style: "ai-story",
    };

    // Resolve music filename → R2 URL for browser preview
    if (creativeSettings.music) {
      try {
        const muRes = await fetch(`${flaskUrl}/vg/music-urls`, { headers });
        if (muRes.ok) {
          const mapping = await muRes.json() as Record<string, string>;
          const musicUrl = mapping[creativeSettings.music];
          if (musicUrl) {
            (creativeSettings as Record<string, unknown>).musicUrl = musicUrl;
          }
        }
      } catch {
        // Non-critical — preview will work without music URL
      }
    }

    // If libraryItemId is provided, PATCH the library item with preview data
    if (payload.libraryItemId) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
        logger.log("Calling preview-ready webhook", { url: `${appUrl}/api/library/${payload.libraryItemId}/preview-ready`, hasPreviewData: !!previewData });
        const patchRes = await fetch(`${appUrl}/api/library/${payload.libraryItemId}/preview-ready`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "preview",
            previewData: JSON.stringify(previewData),
            creativeSettings: JSON.stringify(creativeSettings),
            resolvedSegments: JSON.stringify(resolvedData.segments),
            durationSec: Math.round(previewResponse.durationInFrames / previewResponse.fps),
          }),
        });
        if (!patchRes.ok) {
          logger.error("preview-ready webhook failed", { status: patchRes.status, body: await patchRes.text() });
        } else {
          logger.log("Library item updated to preview status", { libraryItemId: payload.libraryItemId });
        }
      } catch (err) {
        logger.error("Failed to update library item", { error: err instanceof Error ? err.message : String(err) });
      }
    }

    return {
      previewData,
      resolvedSegments: resolvedData.segments,
      jobId,
    };
  },
});
