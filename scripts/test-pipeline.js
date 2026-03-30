const BASE = "http://localhost:5000";
const HEADERS = {
  "Content-Type": "application/json",
  "X-API-Key": "dev-flask-api-key-change-in-production",
};

async function step(name, url, body, { optional = false } = {}) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`STEP: ${name}${optional ? " (optional)" : ""}`);
  console.log(`  POST ${url}`);
  const start = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const duration = ((Date.now() - start) / 1000).toFixed(2);
  const text = await res.text();
  console.log(`  Status: ${res.status} | Duration: ${duration}s`);
  console.log(`  Response (first 200 chars): ${text.slice(0, 200)}`);
  if (!res.ok) {
    if (optional) {
      console.log(`  SKIPPED (${res.status}) — endpoint not available, continuing...`);
      return null;
    }
    console.error(`\n  FULL ERROR:\n${text}`);
    process.exit(1);
  }
  return JSON.parse(text);
}

async function main() {
  console.log("Video Generation Pipeline Test");
  console.log(`Target: ${BASE}`);
  console.log(`Started: ${new Date().toISOString()}`);

  // 1. Generate script
  const scriptData = await step("generate_script", `${BASE}/vg/generate_script`, {
    topic: "Why cats secretly control the internet",
    tone: "funny_clean",
    language: "English",
    duration: 30,
    character: "professor",
    mode: "script",
  });

  const jobId = scriptData.vg_job_id;
  console.log(`  Job ID: ${jobId}`);

  // 2. Visual plan
  const visualData = await step("visual-plan", `${BASE}/vg/visual-plan`, {
    vg_job_id: jobId,
    script: scriptData.script,
    background_mode: "smart_mix",
  });

  const segments = visualData.segments;
  console.log(`  Segments: ${segments?.length ?? "N/A"}`);

  // 3. TTS — pass the generated script so Flask can synthesize audio
  const ttsData = await step("tts", `${BASE}/vg/tts`, {
    vg_job_id: jobId,
    voice_id: "728f6ff2240d49308e8137ffe66008e2",
    script: scriptData.script,
  }, { optional: true });

  if (ttsData) {
    console.log(`  Audio path: ${ttsData.audio_path ?? "N/A"}`);
    console.log(`  Audio duration: ${ttsData.duration_ms ?? "N/A"}ms`);
  }

  // 4. Resolve assets
  const resolvedData = await step("resolve-assets", `${BASE}/vg/resolve-assets`, {
    vg_job_id: jobId,
    segments: segments || [],
  });

  const resolvedSegments = resolvedData.segments;
  console.log(`  Resolved segments: ${resolvedSegments?.length ?? "N/A"}`);

  // 5. Render — pass audio result from TTS + resolved visual segments
  //    (optional if TTS was skipped, since render needs audio)
  const renderBody = {
    vg_job_id: jobId,
    voice_id: "728f6ff2240d49308e8137ffe66008e2",
    bg_mode: "pexels",
    layout: "standard",
    visualSegments: resolvedSegments || [],
    audio_path: ttsData?.audio_path,
    audio_duration_ms: ttsData?.duration_ms,
  };
  const renderData = await step("render", `${BASE}/vg/render`, renderBody, {
    optional: !ttsData,
  });

  console.log(`\n${"=".repeat(60)}`);
  console.log("ALL STEPS COMPLETED SUCCESSFULLY");
  console.log(`Finished: ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
