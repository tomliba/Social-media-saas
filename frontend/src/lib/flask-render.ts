/**
 * Direct Flask rendering — bypasses Trigger.dev for local dev.
 *
 * Replicates the orchestration logic from trigger/render-video.ts and
 * trigger/render-post.ts but runs synchronously inside a Next.js server
 * action so only two processes are needed locally (Next.js + Flask).
 */

import { defaultVoice } from "./voices";
import type { VisualSegment } from "./video-types";

// ── Setting maps (duplicated from trigger tasks — they run in a separate runtime) ──

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

const bgModeMap: Record<string, string> = {
  "Stock footage": "pexels",
  "AI images": "ai",
  "Kling video": "pexels",
  "Upload own": "pexels",
};

const backgroundModeMap: Record<string, string> = {
  "Smart Mix": "smart_mix",
  "Stock Footage": "pexels",
  "AI Images": "ai_images",
  "Motion Graphics": "motion_graphics",
};

const layoutMap: Record<string, string> = {
  Standard: "standard",
  "Split screen": "split",
  "Text only": "text_only",
};

const platformMap: Record<string, string> = {
  Instagram: "instagram",
  TikTok: "tiktok",
  Facebook: "facebook",
  LinkedIn: "linkedin",
  X: "x",
};

// ── SSE helpers ──

interface FlaskSSEEvent {
  event: "step" | "complete" | "error" | "ping";
  data: Record<string, unknown>;
}

function parseSSELine(line: string): FlaskSSEEvent | null {
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6)) as FlaskSSEEvent;
  } catch {
    return null;
  }
}

function flaskHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.FLASK_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;
  return headers;
}

function flaskUrl(): string {
  return process.env.FLASK_API_URL || "";
}

// ── Video rendering ──

export interface DirectVideoRequest {
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
  };
}

export interface DirectVideoResult {
  videoUrl: string;
  caption: string;
}

export async function renderVideoViaFlask(
  payload: DirectVideoRequest
): Promise<DirectVideoResult> {
  const base = flaskUrl();
  if (!base) {
    // No Flask either — return empty (simulation)
    return { videoUrl: "", caption: `${payload.title} — Created with The Fluid Curator.` };
  }

  const headers = flaskHeaders();
  const tone = toneMap[payload.settings.tone] ?? "funny_clean";
  const duration = durationMap[payload.settings.duration] ?? 60;
  const character = characterMap[payload.settings.presenter] ?? "doctor";
  // voice is now a Fish Audio ID (passed directly from the voice picker)
  const voiceId = payload.settings.voice || defaultVoice.fishAudioId;
  const bgMode = bgModeMap[payload.settings.background] ?? "pexels";
  const backgroundMode =
    backgroundModeMap[payload.settings.backgroundMode ?? "Smart Mix"] ?? "smart_mix";
  const layout = layoutMap[payload.settings.layout] ?? "standard";
  const speed = payload.settings.speed ?? 1.0;

  // Step 1: Generate script breakdown
  const scriptRes = await fetch(`${base}/vg/generate_script`, {
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
    throw new Error(`Flask /vg/generate_script failed (${scriptRes.status}): ${await scriptRes.text()}`);
  }

  const scriptData = (await scriptRes.json()) as {
    vg_job_id: string;
    script: string;
    hook: string;
    cta: string;
    scenes: { text: string; image_prompt: string }[];
  };

  const jobId = scriptData.vg_job_id;

  // Steps 2 & 3: Visual plan + TTS in parallel
  const [visualPlanRes, ttsRes] = await Promise.all([
    fetch(`${base}/vg/visual-plan`, {
      method: "POST",
      headers,
      body: JSON.stringify({ vg_job_id: jobId, background_mode: backgroundMode }),
    }),
    fetch(`${base}/vg/tts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ vg_job_id: jobId, voice_id: voiceId, speed }),
    }),
  ]);

  if (!visualPlanRes.ok) {
    throw new Error(`Flask /vg/visual-plan failed (${visualPlanRes.status}): ${await visualPlanRes.text()}`);
  }
  if (!ttsRes.ok) {
    throw new Error(`Flask /vg/tts failed (${ttsRes.status}): ${await ttsRes.text()}`);
  }

  const visualPlanData = (await visualPlanRes.json()) as { segments: VisualSegment[] };

  // Step 4: Resolve assets
  const resolveRes = await fetch(`${base}/vg/resolve-assets`, {
    method: "POST",
    headers,
    body: JSON.stringify({ vg_job_id: jobId, segments: visualPlanData.segments }),
  });

  if (!resolveRes.ok) {
    throw new Error(`Flask /vg/resolve-assets failed (${resolveRes.status}): ${await resolveRes.text()}`);
  }

  const resolvedData = (await resolveRes.json()) as { segments: VisualSegment[] };

  // Step 5: Render
  const renderRes = await fetch(`${base}/vg/render`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      vg_job_id: jobId,
      voice_id: voiceId,
      bg_mode: bgMode,
      layout,
      speed,
      visualSegments: resolvedData.segments,
    }),
  });

  if (!renderRes.ok) {
    throw new Error(`Flask /vg/render failed (${renderRes.status}): ${await renderRes.text()}`);
  }

  // Step 6: Stream SSE for completion
  const apiKey = process.env.FLASK_API_KEY;
  const eventsRes = await fetch(`${base}/vg/events/${jobId}`, {
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

        if (evt.event === "complete") {
          videoFilename = (evt.data.video_filename as string) || "final_video.mp4";
          outputDir = (evt.data.output_dir as string) || "";
          break;
        } else if (evt.event === "error") {
          throw new Error(`Flask render error: ${evt.data.message || "Unknown error"}`);
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

  return {
    videoUrl,
    caption: `${scriptData.hook} ${scriptData.cta}`,
  };
}

// ── Post rendering ──

export interface DirectPostRequest {
  pgJobId: string;
  selectedIdeas: number[];
  ideaTopics: string[];
  settings: {
    tone: string;
    platform: string;
  };
}

export interface DirectPostResult {
  topic: string;
  imageUrls: string[];
  caption: string;
}

export interface DirectPostOutput {
  results: DirectPostResult[];
  succeeded: number;
  failed: number;
}

export async function renderPostViaFlask(
  payload: DirectPostRequest
): Promise<DirectPostOutput> {
  const base = flaskUrl();
  if (!base) {
    // No Flask — return empty simulation
    const results: DirectPostResult[] = payload.ideaTopics.map((topic) => ({
      topic,
      imageUrls: [],
      caption: `${topic} — Created with The Fluid Curator.`,
    }));
    return { results, succeeded: results.length, failed: 0 };
  }

  const headers = flaskHeaders();
  const apiKey = process.env.FLASK_API_KEY;
  const tone = toneMap[payload.settings.tone] ?? "funny_clean";
  const platform = platformMap[payload.settings.platform] ?? "instagram";

  // Step 1: Start pipeline
  const startRes = await fetch(`${base}/pg/start`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      pg_job_id: payload.pgJobId,
      selected: payload.selectedIdeas,
      platform,
      tone,
    }),
  });

  if (!startRes.ok) {
    throw new Error(`Flask /pg/start failed (${startRes.status}): ${await startRes.text()}`);
  }

  // Step 2: Stream SSE for completion
  const eventsUrl = apiKey
    ? `${base}/pg/events/${payload.pgJobId}?api_key=${apiKey}`
    : `${base}/pg/events/${payload.pgJobId}`;

  const eventsRes = await fetch(eventsUrl, {
    headers: { Accept: "text/event-stream" },
  });

  if (!eventsRes.ok || !eventsRes.body) {
    throw new Error(`Flask /pg/events failed (${eventsRes.status})`);
  }

  const reader = eventsRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResults: DirectPostResult[] = [];
  let succeeded = 0;
  let failed = 0;

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

        if (evt.event === "complete") {
          succeeded = (evt.data.succeeded as number) ?? 0;
          failed = (evt.data.failed as number) ?? 0;

          const rawResults = evt.data.results as
            | { topic: string; images: string[]; caption: string; run_dir: string }[]
            | undefined;

          if (rawResults) {
            finalResults = rawResults.map((r) => ({
              topic: r.topic,
              imageUrls: r.images.map(
                (img) => `${base}/pg/image/${r.run_dir}/${img}?api_key=${apiKey || ""}`
              ),
              caption: r.caption,
            }));
          }
          break;
        } else if (evt.event === "error") {
          throw new Error(`Flask post render error: ${evt.data.message || "Unknown error"}`);
        }
      }

      if (finalResults.length > 0) break;
    }
  } finally {
    reader.cancel();
  }

  return { results: finalResults, succeeded, failed };
}
