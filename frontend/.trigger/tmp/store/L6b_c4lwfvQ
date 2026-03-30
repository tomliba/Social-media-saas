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

// trigger/render-post.ts
init_esm();
var toneMap = {
  Funny: "funny_clean",
  Serious: "educational",
  Cursing: "funny_profanity",
  Edgy: "sarcastic"
};
var platformMap = {
  Instagram: "instagram",
  TikTok: "tiktok",
  Facebook: "facebook",
  LinkedIn: "linkedin",
  X: "x"
};
var stepProgress = {
  2: { active: 15, done: 30, label: "Generating post layouts..." },
  3: { active: 35, done: 50, label: "Creating alternate designs..." },
  4: { active: 55, done: 65, label: "Writing captions..." },
  5: { active: 70, done: 95, label: "Generating images..." }
};
function parseSSELine(line) {
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6));
  } catch {
    return null;
  }
}
__name(parseSSELine, "parseSSELine");
var renderPost = task({
  id: "render-post",
  maxDuration: 300,
  queue: {
    concurrencyLimit: 3
  },
  run: /* @__PURE__ */ __name(async (payload) => {
    logger.log("Starting post render", {
      pgJobId: payload.pgJobId,
      selectedCount: payload.selectedIdeas.length
    });
    metadata.set("stage", "queued");
    metadata.set("stageLabel", "Queued for generation...");
    metadata.set("progress", 0);
    metadata.set("ideaTopics", payload.ideaTopics);
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
        tone
      })
    });
    if (!startRes.ok) {
      const errText = await startRes.text();
      throw new Error(`Flask /pg/start failed (${startRes.status}): ${errText}`);
    }
    metadata.set("stage", "pipeline_started");
    metadata.set("stageLabel", "Post pipeline running...");
    metadata.set("progress", 10);
    const eventsUrl = apiKey ? `${flaskUrl}/pg/events/${payload.pgJobId}?api_key=${apiKey}` : `${flaskUrl}/pg/events/${payload.pgJobId}`;
    const eventsRes = await fetch(eventsUrl, {
      headers: { Accept: "text/event-stream" }
    });
    if (!eventsRes.ok || !eventsRes.body) {
      throw new Error(`Flask /pg/events failed (${eventsRes.status})`);
    }
    const reader = eventsRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResults = [];
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
              const label = isActive ? evt.data.message ?? stepInfo.label : `Step ${evt.data.step} complete`;
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
                caption: r.caption
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
    return { results: finalResults, succeeded, failed };
  }, "run")
});
async function runSimulation(payload) {
  const stages = [
    { label: "Generating post layouts...", progress: 20, ms: 3e3 },
    { label: "Creating alternate designs...", progress: 40, ms: 3e3 },
    { label: "Writing captions...", progress: 60, ms: 2e3 },
    { label: "Generating images...", progress: 85, ms: 5e3 }
  ];
  for (const stage of stages) {
    metadata.set("stageLabel", stage.label);
    metadata.set("progress", stage.progress);
    await new Promise((r) => setTimeout(r, stage.ms));
  }
  const results = payload.ideaTopics.map((topic) => ({
    topic,
    imageUrls: [],
    caption: `${topic} — Created with The Fluid Curator. #content #viral`
  }));
  metadata.set("stage", "complete");
  metadata.set("stageLabel", "Complete!");
  metadata.set("progress", 100);
  metadata.set("results", JSON.parse(JSON.stringify(results)));
  return { results, succeeded: results.length, failed: 0 };
}
__name(runSimulation, "runSimulation");
export {
  renderPost
};
//# sourceMappingURL=render-post.mjs.map
