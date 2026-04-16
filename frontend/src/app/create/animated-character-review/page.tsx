"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { triggerVideoRenders } from "@/app/actions/create-videos";
import type { VisualSegment } from "@/lib/video-types";

// ── Maps (same as trigger/render-video.ts) ──

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
  "15s": 15, "30s": 30, "60s": 60, "90s": 90,
};

const characterMap: Record<string, string> = {
  Doctor: "doctor", Professor: "professor", Chef: "chef", Cowboy: "cowboy",
  Robot: "robot", Vampire: "vampire", Wizard: "wizard", "Finance Bro": "finance_bro",
  Alien: "alien", Gamer: "gamer", "Chef Women": "cheff_women",
  "Fitness Men": "fitness_men", "Fitness Women": "fitness_women", Teacher: "teacher",
};

interface SetupData {
  scripts: { title: string; script: string }[];
  template: string;
  tone: string;
  character: string;
  voice: string;
  duration: string;
  speed: number;
  backgroundMode: string;
}

interface Scene {
  text: string;
  image_prompt: string;
  motion_prompt?: string;
}

interface ScriptBreakdown {
  vg_job_id: string;
  hook: string;
  cta: string;
  scenes: Scene[];
}

interface EditableScene {
  text: string;
  image_prompt: string;
  motion_prompt: string;
}

export default function AnimatedCharacterReviewPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [breakdowns, setBreakdowns] = useState<(ScriptBreakdown | null)[]>([]);
  const [sceneImages, setSceneImages] = useState<(string[] | null)[]>([]);
  const [editScenes, setEditScenes] = useState<EditableScene[][]>([]);
  const [loadingScripts, setLoadingScripts] = useState<boolean[]>([]);
  const [loadingImages, setLoadingImages] = useState<boolean[]>([]);
  const [regeneratingScene, setRegeneratingScene] = useState<string | null>(null);
  const [animationStatus, setAnimationStatus] = useState<Record<string, { status: string; video_url: string | null; error: string | null }>>({});
  const [animating, setAnimating] = useState(false);
  const [cachedTimings, setCachedTimings] = useState<({ startSec: number; endSec: number }[] | null)[]>([]);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const animPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("animated-character-setup");
      if (!raw) { setInvalid(true); return; }
      const parsed = JSON.parse(raw) as SetupData;
      if (!parsed.scripts || parsed.scripts.length === 0) { setInvalid(true); return; }
      setSetup(parsed);
    } catch {
      setInvalid(true);
    }
  }, []);

  const fetchBreakdownAndImages = useCallback(async (setupData: SetupData) => {
    const count = setupData.scripts.length;
    setLoadingScripts(new Array(count).fill(true));
    setLoadingImages(new Array(count).fill(false));
    setBreakdowns(new Array(count).fill(null));
    setSceneImages(new Array(count).fill(null));
    setEditScenes(new Array(count).fill([]));
    setCachedTimings(new Array(count).fill(null));

    for (let i = 0; i < count; i++) {
      try {
        // Step 1: Generate script breakdown (scenes)
        const scriptRes = await fetch("/api/character-review/generate-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: setupData.scripts[i].script,
            tone: toneMap[setupData.tone] ?? "funny_clean",
            language: "English",
            duration: durationMap[setupData.duration] ?? 30,
            character: characterMap[setupData.character] ?? "doctor",
            mode: "script",
          }),
        });

        if (!scriptRes.ok) throw new Error("Script breakdown failed");
        const breakdown = await scriptRes.json() as ScriptBreakdown;

        setBreakdowns((prev) => { const next = [...prev]; next[i] = breakdown; return next; });
        setEditScenes((prev) => {
          const next = [...prev];
          next[i] = breakdown.scenes.map((s) => ({
            text: s.text,
            image_prompt: s.image_prompt,
            motion_prompt: s.motion_prompt || "",
          }));
          return next;
        });
        setLoadingScripts((prev) => { const next = [...prev]; next[i] = false; return next; });
        setLoadingImages((prev) => { const next = [...prev]; next[i] = true; return next; });

        // Step 2: Generate scene images
        const imgRes = await fetch("/api/character-review/generate-scene-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vg_job_id: breakdown.vg_job_id,
            scenes: breakdown.scenes,
            style: "character",
            scene_mode: "animated",
          }),
        });

        if (!imgRes.ok) throw new Error("Scene images failed");
        const imgData = await imgRes.json();
        const urls: string[] = imgData.images || imgData.image_urls || imgData.urls || [];

        setSceneImages((prev) => { const next = [...prev]; next[i] = urls; return next; });
      } catch (err) {
        console.error(`Failed for script ${i}:`, err);
        setBreakdowns((prev) => { const next = [...prev]; next[i] = prev[i]; return next; });
        setSceneImages((prev) => { const next = [...prev]; next[i] = null; return next; });
      } finally {
        setLoadingScripts((prev) => { const next = [...prev]; next[i] = false; return next; });
        setLoadingImages((prev) => { const next = [...prev]; next[i] = false; return next; });
      }
    }
  }, []);

  useEffect(() => {
    if (setup) fetchBreakdownAndImages(setup);
  }, [setup, fetchBreakdownAndImages]);

  const handleRegenerateImage = async (scriptIdx: number, sceneIdx: number) => {
    const breakdown = breakdowns[scriptIdx];
    const scene = editScenes[scriptIdx]?.[sceneIdx];
    if (!breakdown || !scene) return;

    const key = `${scriptIdx}-${sceneIdx}`;
    setRegeneratingScene(key);

    try {
      const res = await fetch("/api/regenerate-scene-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vg_job_id: breakdown.vg_job_id,
          scene_index: sceneIdx,
          image_prompt: scene.image_prompt,
          art_style: "realism",
          style: "character",
        }),
      });

      if (!res.ok) throw new Error("Regenerate failed");
      const data = await res.json();
      const newUrl = data.image_url || data.url || data.image;

      if (newUrl) {
        setSceneImages((prev) => {
          const next = prev.map((arr) => (arr ? [...arr] : arr));
          if (next[scriptIdx]) {
            next[scriptIdx]![sceneIdx] = newUrl;
          }
          return next;
        });
      }
    } catch (err) {
      console.error(`Failed to regenerate scene ${sceneIdx} for script ${scriptIdx}:`, err);
    } finally {
      setRegeneratingScene(null);
    }
  };

  const updateScene = (scriptIdx: number, sceneIdx: number, field: keyof EditableScene, value: string) => {
    setEditScenes((prev) => {
      const next = prev.map((arr) => [...arr]);
      if (next[scriptIdx] && next[scriptIdx][sceneIdx]) {
        next[scriptIdx][sceneIdx] = { ...next[scriptIdx][sceneIdx], [field]: value };
      }
      return next;
    });
  };

  const toNumericIndex = (scriptIdx: number, sceneIdx: number) => scriptIdx * 1000 + sceneIdx;
  const toKey = (scriptIdx: number, sceneIdx: number) => `${scriptIdx}-${sceneIdx}`;

  const startAnimationJob = useCallback(async (
    segments: { index: number; image_url: string; motion_prompt: string; duration: number; key: string }[],
    isRetry: boolean,
  ) => {
    if (animPollRef.current) {
      clearInterval(animPollRef.current);
      animPollRef.current = null;
    }

    if (segments.length === 0) {
      setAnimating(false);
      return;
    }

    try {
      const res = await fetch("/api/animate-scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: segments.map((s) => ({
            index: s.index,
            image_url: s.image_url,
            motion_prompt: s.motion_prompt,
            duration: s.duration,
          })),
        }),
      });

      if (!res.ok) {
        console.error("Animate scenes error:", await res.text());
        setAnimating(false);
        return;
      }

      const data = await res.json();
      const jobId = data.job_id as string;

      // Build index→key lookup
      const indexToKey: Record<number, string> = {};
      for (const seg of segments) {
        indexToKey[seg.index] = seg.key;
      }

      const interval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/animate-status/${jobId}`);
          if (pollRes.status === 404) {
            clearInterval(interval);
            animPollRef.current = null;
            setAnimating(false);
            return;
          }
          if (!pollRes.ok) return;
          const pollData = await pollRes.json();

          if (pollData.segments) {
            const updates: Record<string, { status: string; video_url: string | null; error: string | null }> = {};
            for (const [idxStr, val] of Object.entries(pollData.segments)) {
              const v = val as { status: string; video_url: string | null; error: string | null };
              const key = indexToKey[Number(idxStr)];
              if (key) {
                updates[key] = { status: v.status, video_url: v.video_url || null, error: v.error || null };
              }
            }
            setAnimationStatus((prev) => ({ ...prev, ...updates }));
          }

          if (pollData.complete) {
            clearInterval(interval);
            animPollRef.current = null;

            if (!isRetry) {
              const failedSegments = segments.filter((seg) => {
                const latest = pollData.segments?.[String(seg.index)] as { status: string } | undefined;
                return latest?.status === "failed";
              });
              if (failedSegments.length > 0) {
                console.log(`Retrying ${failedSegments.length} failed segments`);
                startAnimationJob(failedSegments, true);
                return;
              }
            }

            setAnimating(false);
          }
        } catch {
          // keep polling on transient errors
        }
      }, 3000);
      animPollRef.current = interval;
    } catch (err) {
      console.error("Animate scenes error:", err);
      setAnimating(false);
    }
  }, []);

  const handleAnimateAll = useCallback(async () => {
    setAnimating(true);
    setAnimationStatus({});

    const segments: { index: number; image_url: string; motion_prompt: string; duration: number; key: string }[] = [];

    for (let i = 0; i < editScenes.length; i++) {
      const images = sceneImages[i];
      if (!images) continue;
      const breakdown = breakdowns[i];

      // ── TTS-based real durations per script ──
      let sceneTiming: { startSec: number; endSec: number }[] | null = null;
      if (breakdown && setup) {
        try {
          const ttsRes = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vg_job_id: breakdown.vg_job_id,
              voice_id: setup.voice,
              speed: setup.speed ?? 1.0,
            }),
          });

          if (ttsRes.ok) {
            const ttsResult = await ttsRes.json();

            const timingRes = await fetch("/api/scene-timing", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                scenes: editScenes[i].map((s) => ({ text: s.text })),
                word_timestamps: ttsResult.word_timestamps,
                audio_duration_ms: ttsResult.audio_duration_ms,
              }),
            });

            if (timingRes.ok) {
              const timingData = await timingRes.json();
              sceneTiming = Array.isArray(timingData) ? timingData : timingData.scene_timings ?? timingData.timings ?? timingData.segments ?? null;
            }
          }
        } catch {
          // Silently fall back to word-count estimates
        }
      }

      // Cache timings for use in render step
      setCachedTimings((prev) => { const next = [...prev]; next[i] = sceneTiming; return next; });

      for (let j = 0; j < editScenes[i].length; j++) {
        const imgUrl = images[j];
        if (!imgUrl) continue;
        const scene = editScenes[i][j];

        let dur: number;
        if (sceneTiming && sceneTiming[j]) {
          const t = sceneTiming[j];
          dur = Math.min(12, Math.max(2, Math.ceil(t.endSec - t.startSec)));
        } else {
          const words = (scene.text || "").split(/\s+/).filter(Boolean).length;
          const estimated = Math.ceil(words / 2.5) + 2;
          dur = Math.min(10, Math.max(5, estimated));
        }

        segments.push({
          index: toNumericIndex(i, j),
          image_url: imgUrl,
          motion_prompt: scene.motion_prompt || "",
          duration: dur,
          key: toKey(i, j),
        });
      }
    }

    if (segments.length === 0) {
      setAnimating(false);
      return;
    }

    startAnimationJob(segments, false);
  }, [editScenes, sceneImages, breakdowns, setup, startAnimationJob]);

  const handleReanimateScene = useCallback((scriptIdx: number, sceneIdx: number) => {
    const images = sceneImages[scriptIdx];
    const scene = editScenes[scriptIdx]?.[sceneIdx];
    const imgUrl = images?.[sceneIdx];
    if (!scene || !imgUrl) return;

    const key = toKey(scriptIdx, sceneIdx);
    setAnimationStatus((prev) => ({
      ...prev,
      [key]: { status: "uploading", video_url: null, error: null },
    }));
    setAnimating(true);

    const words = (scene.text || "").split(/\s+/).filter(Boolean).length;
    const dur = Math.min(10, Math.max(5, Math.ceil(words / 2.5) + 2));

    startAnimationJob([{
      index: toNumericIndex(scriptIdx, sceneIdx),
      image_url: imgUrl,
      motion_prompt: scene.motion_prompt || "",
      duration: dur,
      key,
    }], true);
  }, [editScenes, sceneImages, startAnimationJob]);

  const handleRenderVideo = async () => {
    if (!setup || !allAnimated) return;
    setRendering(true);
    setRenderError(null);

    try {
      const handles = await triggerVideoRenders(
        setup.scripts.map((s, i) => {
          const scenes = editScenes[i] || [];
          const timing = cachedTimings[i];

          const resolvedSegments: VisualSegment[] = scenes.map((scene, j) => {
            const key = toKey(i, j);
            const anim = animationStatus[key];
            const videoUrl = anim?.video_url || null;

            let startSec = 0;
            let endSec = 5;
            if (timing && timing[j]) {
              startSec = timing[j].startSec;
              endSec = timing[j].endSec;
            } else {
              // Fallback: estimate from word count
              const words = (scene.text || "").split(/\s+/).filter(Boolean).length;
              const dur = Math.min(10, Math.max(5, Math.ceil(words / 2.5) + 2));
              startSec = j === 0 ? 0 : (timing?.[j - 1]?.endSec ?? j * dur);
              endSec = startSec + dur;
            }

            return {
              visual_type: "pexels_clip",
              startSec,
              endSec,
              speech: scene.text,
              asset_url: videoUrl,
              data: { asset_url: videoUrl },
            };
          });

          return {
            title: s.title,
            script: s.script,
            template: setup.template,
            settings: {
              tone: setup.tone,
              presenter: setup.character,
              voice: setup.voice,
              background: "Stock footage",
              backgroundMode: "Animated AI",
              duration: setup.duration,
              layout: "Standard",
              speed: setup.speed,
              animate: true,
              assetsReady: true,
              resolvedSegments,
            },
          };
        })
      );

      await Promise.all(
        handles.map(async (h) => {
          const script = setup.scripts.find((s) => s.title === h.title)?.script ?? null;
          await fetch("/api/library", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId: h.runId,
              title: h.title,
              format: "video",
              backgroundMode: "Animated AI",
              script,
              durationSec: parseInt(setup.duration) || null,
              ...(h.directResult && {
                status: h.directResult.status,
                videoUrl: h.directResult.videoUrl ?? null,
                thumbnailUrl: h.directResult.videoUrl ?? null,
              }),
            }),
          });
        })
      );

      sessionStorage.setItem("pending-renders", JSON.stringify(handles));
      sessionStorage.setItem("pending-format", "video");
      router.push("/library");
    } catch (err) {
      console.error("Failed to trigger video renders:", err);
      setRenderError(err instanceof Error ? err.message : "Render failed");
      setRendering(false);
    }
  };

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (animPollRef.current) clearInterval(animPollRef.current);
    };
  }, []);

  // Count animation progress
  const totalScenes = editScenes.reduce((sum, arr) => sum + arr.length, 0);
  const doneScenes = Object.values(animationStatus).filter((s) => s.status === "done").length;
  const allAnimated = totalScenes > 0 && doneScenes === totalScenes;
  const hasAnyImages = sceneImages.some((arr) => arr && arr.some(Boolean));

  if (invalid) {
    return (
      <main className="min-h-screen bg-surface pt-24 pb-48 px-6 max-w-4xl mx-auto">
        <div className="text-center py-20">
          <p className="text-on-surface-variant text-lg mb-6">Setup data not found, please go back</p>
          <button
            onClick={() => router.push("/create/video-setup")}
            className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold font-headline"
          >
            Back to setup
          </button>
        </div>
      </main>
    );
  }

  if (!setup) {
    return (
      <main className="min-h-screen bg-surface pt-24 pb-48 px-6 max-w-4xl mx-auto">
        <div className="text-center py-20">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface pt-8 pb-48 px-6 max-w-4xl mx-auto">
      {/* Back to setup */}
      <Link
        href="/create/video-setup"
        className="mb-8 inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to setup
      </Link>

      <h1 className="text-3xl font-bold font-headline tracking-tight text-on-surface mb-2">
        Review Your Animated Video
      </h1>
      <p className="text-on-surface-variant text-sm mb-10">
        Edit scripts and images before rendering
      </p>

      {/* Per-script sections */}
      {setup.scripts.map((s, i) => {
        const breakdown = breakdowns[i];
        const images = sceneImages[i];
        const scenes = editScenes[i] || [];
        const isLoadingScript = loadingScripts[i];
        const isLoadingImg = loadingImages[i];

        return (
          <div key={i} className="mb-12">
            {/* Script header */}
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-primary/60 font-headline">
                Video {i + 1} of {setup.scripts.length}
              </span>
              <h2 className="text-xl font-bold font-headline text-on-surface mt-1">
                {s.title}
              </h2>
            </div>

            {/* Full script (read-only) */}
            <textarea
              value={s.script}
              readOnly
              className="w-full min-h-[100px] bg-surface text-on-surface-variant font-body leading-relaxed p-4 rounded-xl border border-outline-variant/20 resize-none mb-6"
            />

            {/* Scenes loading */}
            {isLoadingScript && (
              <div className="flex items-center gap-3 py-8 justify-center text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                <span className="text-sm font-medium">Breaking script into scenes...</span>
              </div>
            )}

            {/* Scene cards */}
            {breakdown && scenes.length > 0 && (
              <div className="space-y-6">
                {scenes.map((scene, j) => (
                  <div
                    key={j}
                    className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20"
                  >
                    {(() => {
                      const animKey = toKey(i, j);
                      const anim = animationStatus[animKey];
                      return (
                        <>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary/60 font-headline">
                        Scene {j + 1} of {scenes.length}
                      </span>
                      {/* Re-animate button (visible after any animation attempt) */}
                      {anim && (
                        <button
                          onClick={() => handleReanimateScene(i, j)}
                          disabled={anim.status === "uploading" || anim.status === "animating"}
                          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-opacity disabled:opacity-50"
                        >
                          <span className={`material-symbols-outlined text-sm ${anim.status === "uploading" || anim.status === "animating" ? "animate-spin" : ""}`}>
                            {anim.status === "failed" ? "warning" : anim.status === "done" ? "play_circle" : "progress_activity"}
                          </span>
                          {anim.status === "failed" ? "Retry" : anim.status === "done" ? "Re-animate" : "Animating..."}
                        </button>
                      )}
                    </div>

                    <div className="flex gap-4">
                      {/* Image / Video */}
                      <div className="relative w-[180px] h-[240px] flex-shrink-0 rounded-xl overflow-hidden bg-surface-container-low">
                        {/* Animated video */}
                        {anim?.status === "done" && anim.video_url ? (
                          <>
                            <video
                              src={anim.video_url}
                              autoPlay
                              loop
                              muted
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => handleRegenerateImage(i, j)}
                              className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                              title="Regenerate image"
                            >
                              <span className="material-symbols-outlined text-white text-sm">refresh</span>
                            </button>
                          </>
                        ) : regeneratingScene === `${i}-${j}` ? (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50">
                            <div className="w-8 h-8 border-3 border-violet-200 border-t-primary rounded-full animate-spin" />
                          </div>
                        ) : images && images[j] ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={images[j]}
                              alt={`Scene ${j + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {/* Animating overlay */}
                            {(anim?.status === "uploading" || anim?.status === "animating") && (
                              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                                <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                <span className="text-[10px] text-white font-medium">Animating...</span>
                              </div>
                            )}
                            {/* Failed badge */}
                            {anim?.status === "failed" && (
                              <button
                                onClick={() => handleReanimateScene(i, j)}
                                className="absolute top-1.5 right-1.5 flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/90 hover:bg-red-600 transition-colors"
                                title="Retry animation"
                              >
                                <span className="material-symbols-outlined text-white text-sm">refresh</span>
                                <span className="text-[10px] text-white font-bold">Retry</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleRegenerateImage(i, j)}
                              className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                              title="Regenerate image"
                            >
                              <span className="material-symbols-outlined text-white text-sm">refresh</span>
                            </button>
                          </>
                        ) : isLoadingImg ? (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50">
                            <div className="w-8 h-8 border-3 border-violet-200 border-t-primary rounded-full animate-spin" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                            <button
                              onClick={() => handleRegenerateImage(i, j)}
                              className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-colors"
                            >
                              <span className="material-symbols-outlined text-on-surface-variant text-xl">refresh</span>
                            </button>
                            <span className="text-[10px] text-on-surface-variant/50">Retry</span>
                          </div>
                        )}
                      </div>

                      {/* Text fields */}
                      <div className="flex-1 min-w-0 flex flex-col gap-3">
                        {/* Narration */}
                        <div>
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block font-headline">
                            Narration
                          </label>
                          <textarea
                            value={scene.text}
                            onChange={(e) => updateScene(i, j, "text", e.target.value)}
                            rows={3}
                            className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 text-on-surface font-body text-sm resize-none"
                          />
                        </div>

                        {/* Visual prompt */}
                        <div>
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block font-headline">
                            Visual prompt
                            <span className="font-normal normal-case tracking-normal ml-1 text-on-surface-variant/50">
                              — describes what AI generates for this scene
                            </span>
                          </label>
                          <textarea
                            value={scene.image_prompt}
                            onChange={(e) => updateScene(i, j, "image_prompt", e.target.value)}
                            rows={2}
                            className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 text-on-surface-variant font-body text-sm resize-none"
                          />
                        </div>

                        {/* Motion prompt */}
                        <div>
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block font-headline">
                            Motion prompt
                            <span className="font-normal normal-case tracking-normal ml-1 text-on-surface-variant/50">
                              — camera movement and animation for this scene
                            </span>
                          </label>
                          <textarea
                            value={scene.motion_prompt}
                            onChange={(e) => updateScene(i, j, "motion_prompt", e.target.value)}
                            rows={2}
                            className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 text-on-surface-variant font-body text-sm resize-none"
                          />
                        </div>
                      </div>
                    </div>
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom bar */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl px-8 py-6 shadow-[0px_-10px_30px_rgba(0,0,0,0.03)] flex flex-col items-center gap-3">
        {/* Animate All */}
        <button
          onClick={handleAnimateAll}
          disabled={!hasAnyImages || animating || allAnimated}
          className="w-full max-w-xl py-4 rounded-xl text-base font-bold font-headline flex items-center justify-center gap-3 transition-all active:scale-95 border-2 border-primary text-primary bg-white hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {animating ? (
            <>
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              Animating... {doneScenes}/{totalScenes}
            </>
          ) : allAnimated ? (
            <>
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              All Scenes Animated
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
              Animate All Scenes
            </>
          )}
        </button>

        {/* Render error */}
        {renderError && (
          <p className="text-red-500 text-sm font-medium">{renderError}</p>
        )}

        {/* Render Video */}
        <button
          onClick={handleRenderVideo}
          disabled={!allAnimated || rendering}
          className={`w-full max-w-xl py-5 rounded-xl text-lg font-bold font-headline flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${
            rendering
              ? "bg-primary/80 text-on-primary cursor-wait"
              : "bg-primary text-on-primary shadow-primary/30"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {rendering ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Launching render jobs...
            </>
          ) : (
            <>
              Render Video
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
            </>
          )}
        </button>
      </footer>
    </main>
  );
}
