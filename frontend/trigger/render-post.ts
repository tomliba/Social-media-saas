import { task, metadata, logger } from "@trigger.dev/sdk";

export interface RenderPostPayload {
  /** pg_job_id from Flask /pg/generate_ideas */
  pgJobId: string;
  /** Selected idea numbers (1-indexed) */
  selectedIdeas: number[];
  /** Idea topics for display */
  ideaTopics: string[];
  settings: {
    tone: string;
    platform: string;
  };
}

export interface PostResult {
  topic: string;
  imageUrls: string[];
  caption: string;
}

export interface RenderPostOutput {
  results: PostResult[];
  succeeded: number;
  failed: number;
}

// ── Map frontend tone to Flask tone values ──

const toneMap: Record<string, string> = {
  Funny: "funny_clean",
  Serious: "educational",
  Cursing: "funny_profanity",
  Edgy: "sarcastic",
};

const platformMap: Record<string, string> = {
  Instagram: "instagram",
  TikTok: "tiktok",
  Facebook: "facebook",
  LinkedIn: "linkedin",
  X: "x",
};

// ── SSE event types from Flask /pg/events/<pg_job_id> ──

interface FlaskPGEvent {
  event: "step" | "complete" | "error" | "ping";
  data: {
    step?: number;
    status?: string;
    message?: string;
    results?: {
      topic: string;
      images: string[];
      caption: string;
      run_dir: string;
    }[];
    succeeded?: number;
    failed?: number;
    pg_job_id?: string;
  };
}

// Map Flask pipeline steps to progress percentages and labels
const stepProgress: Record<number, { active: number; done: number; label: string }> = {
  2: { active: 15, done: 30, label: "Generating post layouts..." },
  3: { active: 35, done: 50, label: "Creating alternate designs..." },
  4: { active: 55, done: 65, label: "Writing captions..." },
  5: { active: 70, done: 95, label: "Generating images..." },
};

function parseSSELine(line: string): FlaskPGEvent | null {
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6)) as FlaskPGEvent;
  } catch {
    return null;
  }
}

export const renderPost = task({
  id: "render-post",
  maxDuration: 300,
  queue: {
    concurrencyLimit: 3,
  },
  onFailure: async (params: { ctx: { run: { id: string } }; error: unknown }) => {
    const runId = params.ctx.run.id;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const errMsg = params.error instanceof Error ? params.error.message : "Post render failed";
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
  run: async (payload: RenderPostPayload, { ctx }): Promise<RenderPostOutput> => {
    logger.log("Starting post render", {
      pgJobId: payload.pgJobId,
      selectedCount: payload.selectedIdeas.length,
    });

    metadata.set("stage", "queued");
    metadata.set("stageLabel", "Queued for generation...");
    metadata.set("progress", 0);
    metadata.set("ideaTopics", payload.ideaTopics);

    const runId = ctx.run.id;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const flaskUrl = process.env.FLASK_API_URL;

    if (!flaskUrl) {
      logger.warn("FLASK_API_URL not set — using simulated render");
      const result = await runSimulation(payload);
      try {
        await fetch(`${appUrl}/api/library/${runId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ready" }),
        });
      } catch (err) {
        logger.warn("Failed to update library item (simulation)", { error: String(err) });
      }
      return result;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const apiKey = process.env.FLASK_API_KEY;
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    // ── Step 1: Start the post generation pipeline ──
    metadata.set("stage", "starting");
    metadata.set("stageLabel", "Starting post generation...");
    metadata.set("progress", 5);

    const tone = toneMap[payload.settings.tone] ?? "funny_clean";
    const platform = platformMap[payload.settings.platform] ?? "instagram";

    const startRes = await fetch(`${flaskUrl}/pg/start`, {
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
      const errText = await startRes.text();
      throw new Error(`Flask /pg/start failed (${startRes.status}): ${errText}`);
    }

    metadata.set("stage", "pipeline_started");
    metadata.set("stageLabel", "Post pipeline running...");
    metadata.set("progress", 10);

    // ── Step 2: Stream SSE events ──
    const eventsUrl = apiKey
      ? `${flaskUrl}/pg/events/${payload.pgJobId}?api_key=${apiKey}`
      : `${flaskUrl}/pg/events/${payload.pgJobId}`;

    const eventsRes = await fetch(eventsUrl, {
      headers: { Accept: "text/event-stream" },
    });

    if (!eventsRes.ok || !eventsRes.body) {
      throw new Error(`Flask /pg/events failed (${eventsRes.status})`);
    }

    const reader = eventsRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResults: PostResult[] = [];
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

          if (evt.event === "step" && evt.data.step) {
            const stepInfo = stepProgress[evt.data.step];
            if (stepInfo) {
              const isActive = evt.data.status === "active";
              const progress = isActive ? stepInfo.active : stepInfo.done;
              const label = isActive
                ? (evt.data.message ?? stepInfo.label)
                : `Step ${evt.data.step} complete`;

              metadata.set("stage", `step_${evt.data.step}_${evt.data.status}`);
              metadata.set("stageLabel", label);
              metadata.set("progress", progress);
              logger.log(`Pipeline step: ${evt.data.step} → ${evt.data.status}`, { progress });
            }
          } else if (evt.event === "complete") {
            succeeded = evt.data.succeeded ?? 0;
            failed = evt.data.failed ?? 0;

            if (evt.data.results) {
              finalResults = evt.data.results.map((r) => ({
                topic: r.topic,
                imageUrls: r.images.map(
                  (img) => `${flaskUrl}/pg/image/${r.run_dir}/${img}?api_key=${apiKey || ""}`
                ),
                caption: r.caption,
              }));
            }

            logger.log("Pipeline complete", { succeeded, failed });
            break;
          } else if (evt.event === "error") {
            const msg = evt.data.message || "Unknown pipeline error";
            logger.error("Pipeline error", { message: msg });
            throw new Error(`Flask post render error: ${msg}`);
          }
        }

        if (finalResults.length > 0) break;
      }
    } finally {
      reader.cancel();
    }

    metadata.set("stage", "complete");
    metadata.set("stageLabel", "Complete!");
    metadata.set("progress", 100);
    metadata.set("results", JSON.parse(JSON.stringify(finalResults)));

    // Update library item status to ready
    try {
      await fetch(`${appUrl}/api/library/${runId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready" }),
      });
    } catch (err) {
      logger.warn("Failed to update library item", { error: String(err) });
    }

    return { results: finalResults, succeeded, failed };
  },
});

// ── Simulation fallback ──

async function runSimulation(payload: RenderPostPayload): Promise<RenderPostOutput> {
  const stages = [
    { label: "Generating post layouts...", progress: 20, ms: 3000 },
    { label: "Creating alternate designs...", progress: 40, ms: 3000 },
    { label: "Writing captions...", progress: 60, ms: 2000 },
    { label: "Generating images...", progress: 85, ms: 5000 },
  ];

  for (const stage of stages) {
    metadata.set("stageLabel", stage.label);
    metadata.set("progress", stage.progress);
    await new Promise((r) => setTimeout(r, stage.ms));
  }

  const results: PostResult[] = payload.ideaTopics.map((topic) => ({
    topic,
    imageUrls: [],
    caption: `${topic} — Created with The Fluid Curator. #content #viral`,
  }));

  metadata.set("stage", "complete");
  metadata.set("stageLabel", "Complete!");
  metadata.set("progress", 100);
  metadata.set("results", JSON.parse(JSON.stringify(results)));

  return { results, succeeded: results.length, failed: 0 };
}
