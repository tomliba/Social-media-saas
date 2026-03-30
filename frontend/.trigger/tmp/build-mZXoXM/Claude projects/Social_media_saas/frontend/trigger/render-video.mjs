import {
  logger,
  metadata,
  task
} from "../../../../chunk-BHRND6QY.mjs";
import "../../../../chunk-WBDURXJA.mjs";
import {
  __name,
  init_esm
} from "../../../../chunk-U2X7QK43.mjs";

// trigger/render-video.ts
init_esm();

// src/lib/voices.ts
init_esm();
var voices = [
  // ── Test voices (real Fish Audio IDs) ──
  {
    name: "Deep Male Voice",
    fishAudioId: "728f6ff2240d49308e8137ffe66008e2",
    emoji: "🎙️",
    previewUrl: "/audio/voices/deep-male-voice.mp3"
  },
  {
    name: "Energetic Male Voice",
    fishAudioId: "c203ca8e441c4e8e80562be2eef75a10",
    emoji: "⚡",
    previewUrl: "/audio/voices/energetic-male-voice.mp3"
  }
  // ── Placeholder voices (Tom will provide real IDs) ──
  // {
  //   name: "Deep Narrator",
  //   fishAudioId: "TODO",
  //   emoji: "\u{1F399}\uFE0F",
  // },
  // {
  //   name: "Energetic Host",
  //   fishAudioId: "TODO",
  //   emoji: "\u{26A1}",
  // },
  // {
  //   name: "Calm Teacher",
  //   fishAudioId: "TODO",
  //   emoji: "\u{1F4DA}",
  // },
];
var defaultVoice = voices[0];
function getVoiceByName(name) {
  return voices.find((v) => v.name === name) ?? defaultVoice;
}
__name(getVoiceByName, "getVoiceByName");

// trigger/render-video.ts
var toneMap = {
  Funny: "funny_clean",
  Serious: "educational",
  Cursing: "funny_profanity",
  Edgy: "sarcastic"
};
var durationMap = {
  "15s": 15,
  "30s": 30,
  "60s": 60,
  "AI picks": 60
};
var characterMap = {
  Doctor: "doctor",
  Professor: "professor",
  Chef: "chef",
  Cowboy: "cowboy",
  Robot: "robot",
  Vampire: "vampire",
  Wizard: "wizard",
  "Finance Bro": "finance_bro",
  Alien: "alien"
};
var bgModeMap = {
  "Stock footage": "pexels",
  "AI images": "ai",
  "Kling video": "pexels",
  // Pro feature — falls back to Pexels for now
  "Upload own": "pexels"
  // Upload not yet implemented — falls back to Pexels
};
var layoutMap = {
  Standard: "standard",
  "Split screen": "split",
  "Text only": "text_only"
};
var stepProgress = {
  parallel: { active: 25, done: 50, label: "Generating audio & fetching backgrounds..." },
  lipsync: { active: 55, done: 65, label: "Creating word-level timestamps..." },
  remotion: { active: 70, done: 95, label: "Rendering video with Remotion..." }
};
var simulationStages = [
  { name: "generating_script", label: "Preparing script...", progress: 10, durationMs: 3e3 },
  { name: "generating_audio", label: "Generating audio synthesis...", progress: 25, durationMs: 5e3 },
  { name: "fetching_backgrounds", label: "Fetching background footage...", progress: 40, durationMs: 4e3 },
  { name: "transcribing", label: "Creating word timestamps...", progress: 55, durationMs: 3e3 },
  { name: "rendering_video", label: "Rendering video...", progress: 70, durationMs: 8e3 },
  { name: "finalizing", label: "Finalizing export...", progress: 90, durationMs: 2e3 }
];
function parseSSELine(line) {
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6));
  } catch {
    return null;
  }
}
__name(parseSSELine, "parseSSELine");
var renderVideo = task({
  id: "render-video",
  maxDuration: 300,
  queue: {
    concurrencyLimit: 5
  },
  run: /* @__PURE__ */ __name(async (payload) => {
    logger.log("Starting video render", { title: payload.title, template: payload.template });
    metadata.set("stage", "queued");
    metadata.set("stageLabel", "Queued for rendering...");
    metadata.set("progress", 0);
    metadata.set("title", payload.title);
    const flaskUrl = process.env.FLASK_API_URL;
    if (!flaskUrl) {
      logger.warn("FLASK_API_URL not set — using simulated render");
      return runSimulation(payload);
    }
    const headers = {
      "Content-Type": "application/json"
    };
    const apiKey = process.env.FLASK_API_KEY;
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }
    metadata.set("stage", "generating_script");
    metadata.set("stageLabel", "Generating script breakdown...");
    metadata.set("progress", 5);
    const tone = toneMap[payload.settings.tone] ?? "funny_clean";
    const duration = durationMap[payload.settings.duration] ?? 60;
    const character = characterMap[payload.settings.presenter] ?? "doctor";
    const voice = getVoiceByName(payload.settings.voice ?? defaultVoice.name);
    const voiceId = voice.fishAudioId;
    const bgMode = bgModeMap[payload.settings.background] ?? "pexels";
    const layout = layoutMap[payload.settings.layout] ?? "standard";
    logger.log("Settings mapped", { tone, duration, character, voiceId, bgMode, layout });
    const scriptRes = await fetch(`${flaskUrl}/vg/generate_script`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        topic: payload.script,
        tone,
        language: "English",
        duration,
        character,
        mode: "script"
        // We already have a script from Gemini — Flask generates scenes
      })
    });
    if (!scriptRes.ok) {
      const errText = await scriptRes.text();
      throw new Error(`Flask /vg/generate_script failed (${scriptRes.status}): ${errText}`);
    }
    const scriptData = await scriptRes.json();
    const jobId = scriptData.vg_job_id;
    logger.log("Script generated", { jobId, sceneCount: scriptData.scenes.length });
    metadata.set("stage", "script_ready");
    metadata.set("stageLabel", "Script ready — starting pipeline...");
    metadata.set("progress", 15);
    const startRes = await fetch(`${flaskUrl}/vg/start`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        vg_job_id: jobId,
        voice_id: voiceId,
        bg_mode: bgMode,
        layout
      })
    });
    if (!startRes.ok) {
      const errText = await startRes.text();
      throw new Error(`Flask /vg/start failed (${startRes.status}): ${errText}`);
    }
    metadata.set("stage", "pipeline_started");
    metadata.set("stageLabel", "Video pipeline running...");
    metadata.set("progress", 20);
    const eventsRes = await fetch(`${flaskUrl}/vg/events/${jobId}`, {
      headers: {
        Accept: "text/event-stream",
        ...apiKey ? { "X-API-Key": apiKey } : {}
      }
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
              const label = isActive ? evt.data.message ?? stepInfo.label : `${evt.data.step} complete`;
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
        }
        if (videoFilename) break;
      }
    } finally {
      reader.cancel();
    }
    if (!videoFilename || !outputDir) {
      throw new Error("SSE stream ended without a complete event");
    }
    const flaskPath = `/vg/preview/${outputDir}/${videoFilename}`;
    const videoUrl = `/api/video-proxy?path=${encodeURIComponent(flaskPath)}`;
    const previewUrl = videoUrl;
    metadata.set("stage", "complete");
    metadata.set("stageLabel", "Complete!");
    metadata.set("progress", 100);
    metadata.set("videoUrl", videoUrl);
    logger.log("Render complete", { title: payload.title, videoUrl });
    return {
      title: payload.title,
      videoUrl,
      previewUrl,
      caption: `${scriptData.hook} ${scriptData.cta}`
    };
  }, "run")
});
async function runSimulation(payload) {
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
    caption: `${payload.title} — Created with The Fluid Curator. #content #creator #viral`
  };
}
__name(runSimulation, "runSimulation");
export {
  renderVideo
};
//# sourceMappingURL=render-video.mjs.map
