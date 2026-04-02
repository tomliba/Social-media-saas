"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// ── Style prompt prefixes ──

const HANDDRAWN_COLOR_PREFIX =
  'Generate a hand-drawn carousel slide in a sketchy whiteboard illustration style. Format: 1:1 square (1080x1080). Warm cream background (#FDF6E3), black ink outlines (#2D2D2D), colored accents (coral #EF6351, blue #4BA3D4, green #6BBF6A, yellow #F4C542). Thick wobbly outlines, organic hand-drawn feel. Bold handwritten-style labels. Colored pill badges with white text. Bezier curve arrows. Small doodles and sparkles in empty space. Maximum ~40 words. One main idea per slide. 60px+ margins.\n\n';

const HANDDRAWN_MONO_PREFIX =
  'Generate a hand-drawn carousel slide in a sketchy whiteboard style. Format: 1:1 square (1080x1080). Light cream background, pure black ink outlines only, no color. Thick wobbly lines, dashed connectors, crosshatch fills. Bold handwritten-style labels. Stick figures, simple icons. Maximum ~40 words. One main idea per slide. 60px+ margins.\n\n';

const NOTEBOOK_PREFIX =
  'Generate a carousel slide that looks like a page from a spiral-bound dotted notebook. Format: 1:1 square (1080x1080). Warm cream background (#F5F0E8) with small evenly-spaced dots. BLACK SPIRAL COIL BINDING running down the LEFT edge (12 oval coils, mandatory). Hand-drawn marker text style - bold, slightly imperfect lettering. Colorful doodle icons (gears, folders, lightning bolts, checkmarks, stars). Light blue speech bubbles with dark outlines for quotes or commands. Yellow highlighter strips behind key takeaway text. For comparisons: red-bordered box with X (wrong way) vs green-bordered box with checkmark (right way). Maximum ~30 words per slide. Content starts after the spiral binding (right side of the coils). Bold headlines, readable at phone size.\n\n';

// ── Types ──

interface PlannedSlide {
  number: number;
  type: string;
  title: string;
  prompt: string;
}

interface GeneratedSlide {
  number: number;
  title: string;
  image: string; // base64 data URL
}

type Step = "input" | "planning" | "review-plan" | "generating" | "review-slides" | "saving";
type DrawStyle = "handdrawn_color" | "handdrawn_mono";

const tones = [
  { label: "Funny", emoji: "\u{1F604}" },
  { label: "Serious", emoji: "\u{1F3AF}" },
  { label: "Cursing", emoji: "\u{1F92C}" },
  { label: "Edgy", emoji: "\u{1F525}" },
  { label: "Motivational", emoji: "\u{1F4AA}" },
  { label: "Storytelling", emoji: "\u{1F4D6}" },
  { label: "Sarcastic", emoji: "\u{1F644}" },
  { label: "Shocked", emoji: "\u{1F92F}" },
  { label: "Conspiracy", emoji: "\u{1F575}\uFE0F" },
  { label: "Friendly", emoji: "\u2615" },
];

function AICarouselContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const styleParam = searchParams.get("style");
  const isHanddrawn = styleParam === "handdrawn";
  const isNotebook = styleParam === "notebook";

  // Input state
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Friendly");
  const [slideCount, setSlideCount] = useState(5);
  const [drawStyle, setDrawStyle] = useState<DrawStyle>("handdrawn_color");

  // Flow state
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);

  // Plan state
  const [plannedSlides, setPlannedSlides] = useState<PlannedSlide[]>([]);

  // Generation state
  const [generatedSlides, setGeneratedSlides] = useState<GeneratedSlide[]>([]);
  const [generatingIndex, setGeneratingIndex] = useState(0);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // ── Derive the prompt prefix based on style ──
  const getPromptPrefix = useCallback(() => {
    if (isNotebook) return NOTEBOOK_PREFIX;
    if (!isHanddrawn) return "";
    return drawStyle === "handdrawn_mono" ? HANDDRAWN_MONO_PREFIX : HANDDRAWN_COLOR_PREFIX;
  }, [isHanddrawn, isNotebook, drawStyle]);

  // ── Step 2: Plan ──
  const handlePlan = useCallback(async () => {
    if (!topic.trim()) return;
    setStep("planning");
    setError(null);

    try {
      const res = await fetch("/api/ai-carousel/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          tone,
          slideCount,
          ...(isHanddrawn ? { style: drawStyle } : isNotebook ? { style: "notebook" } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `API returned ${res.status}`);
      }
      const data = await res.json();
      if (!data.slides || data.slides.length === 0) {
        throw new Error("No slides returned. Try a different topic");
      }
      setPlannedSlides(data.slides);
      setStep("review-plan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to plan carousel");
      setStep("input");
    }
  }, [topic, tone, slideCount, isHanddrawn, isNotebook, drawStyle]);

  // ── Step 4: Generate all slides ──
  const handleGenerate = useCallback(async () => {
    setStep("generating");
    setError(null);
    setGeneratedSlides([]);
    setGeneratingIndex(0);

    const prefix = getPromptPrefix();
    const results: GeneratedSlide[] = [];

    for (let i = 0; i < plannedSlides.length; i++) {
      setGeneratingIndex(i);
      try {
        const res = await fetch("/api/ai-carousel/generate-slide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prefix + plannedSlides[i].prompt,
            slide_number: plannedSlides[i].number,
            slide_type: plannedSlides[i].type,
            title: plannedSlides[i].title,
            topic,
            tone,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Slide ${i + 1} failed`);
        }
        const data = await res.json();
        const image = data.image?.startsWith("data:")
          ? data.image
          : `data:image/png;base64,${data.image}`;
        const slide: GeneratedSlide = {
          number: plannedSlides[i].number,
          title: plannedSlides[i].title,
          image,
        };
        results.push(slide);
        setGeneratedSlides([...results]);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Slide ${i + 1} failed`);
        results.push({
          number: plannedSlides[i].number,
          title: plannedSlides[i].title,
          image: "",
        });
        setGeneratedSlides([...results]);
      }
    }

    setStep("review-slides");
  }, [plannedSlides, topic, tone, getPromptPrefix]);

  // ── Regenerate a single slide ──
  const handleRegenerateSlide = useCallback(async (index: number) => {
    setRegeneratingIndex(index);
    setError(null);

    const prefix = getPromptPrefix();

    try {
      const planned = plannedSlides[index];
      const res = await fetch("/api/ai-carousel/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prefix + planned.prompt,
          slide_number: planned.number,
          slide_type: planned.type,
          title: planned.title,
          topic,
          tone,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Regeneration failed");
      }
      const data = await res.json();
      const image = data.image?.startsWith("data:")
        ? data.image
        : `data:image/png;base64,${data.image}`;
      setGeneratedSlides((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], image };
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegeneratingIndex(null);
    }
  }, [plannedSlides, topic, tone, getPromptPrefix]);

  // ── Step 6: Save to library ──
  const handleSave = useCallback(async () => {
    setStep("saving");
    try {
      const validSlides = generatedSlides.filter((s) => s.image);

      for (let i = 0; i < validSlides.length; i++) {
        const slide = validSlides[i];

        // Upload base64 image to get a real URL
        const uploadRes = await fetch("/api/upload-generated", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: slide.image,
            filename: `aic-slide${i + 1}-${Date.now()}`,
          }),
        });
        if (!uploadRes.ok) throw new Error("Image upload failed");
        const { url } = await uploadRes.json();

        // Save to library with the uploaded URL
        const res = await fetch("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: `aic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: `${topic}: Slide ${i + 1}`,
            format: "image",
            status: "ready",
            videoUrl: url,
            thumbnailUrl: url,
          }),
        });
        if (!res.ok) throw new Error("Save failed");
      }

      router.push("/library");
    } catch (err) {
      console.error("Failed to save carousel:", err);
      setError("Failed to save. Please try again");
      setStep("review-slides");
    }
  }, [topic, generatedSlides, router]);

  const validSlideCount = generatedSlides.filter((s) => s.image).length;

  const pageTitle = isNotebook ? "Notebook Carousel" : isHanddrawn ? "Hand-Drawn Carousel" : "AI Infographic Carousel";
  const pageDescription = isNotebook
    ? "Spiral-bound notebook pages with doodles, speech bubbles, and highlighters"
    : isHanddrawn
      ? "Sketchy whiteboard style. Warm, approachable, educational"
      : "AI designs each slide as a unique infographic: diagrams, flow charts, comparisons";

  return (
    <main className="pt-24 pb-32 px-6 md:px-12 lg:px-16 max-w-screen-xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex items-center gap-4">
        <Link
          href="/create"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-lowest hover:bg-surface-container-high transition-all active:scale-90 shadow-sm text-primary"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
            {pageTitle}
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {pageDescription}
          </p>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* ── Step 1: Input ── */}
      {(step === "input" || step === "planning") && (
        <section className="max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Hand-drawn style picker */}
          {isHanddrawn && (
            <div className="mb-6">
              <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
                Drawing style
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDrawStyle("handdrawn_color")}
                  className={`group relative rounded-xl text-left transition-all overflow-hidden active:scale-[0.97] ${
                    drawStyle === "handdrawn_color"
                      ? "ring-2 ring-primary shadow-lg shadow-primary/10"
                      : "hover:shadow-lg"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/previews/ai/handdrawn-color.png" alt="Color style" className="w-full aspect-square object-cover transition-all duration-300 group-hover:scale-105" />
                  <div className="px-3 py-2.5">
                    <h4 className="font-headline font-bold text-sm">Color</h4>
                    <p className="text-xs text-on-surface-variant">Warm, playful, colored accents</p>
                  </div>
                  {drawStyle === "handdrawn_color" && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-[16px] text-white font-bold">check</span>
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setDrawStyle("handdrawn_mono")}
                  className={`group relative rounded-xl text-left transition-all overflow-hidden active:scale-[0.97] ${
                    drawStyle === "handdrawn_mono"
                      ? "ring-2 ring-primary shadow-lg shadow-primary/10"
                      : "hover:shadow-lg"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/previews/ai/handdrawn-mono.png" alt="Mono style" className="w-full aspect-square object-cover transition-all duration-300 group-hover:scale-105" />
                  <div className="px-3 py-2.5">
                    <h4 className="font-headline font-bold text-sm">Mono</h4>
                    <p className="text-xs text-on-surface-variant">Black ink, clean, minimal</p>
                  </div>
                  {drawStyle === "handdrawn_mono" && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-[16px] text-white font-bold">check</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Topic */}
          <div className="mb-6">
            <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
              Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && step === "input") handlePlan(); }}
              placeholder="e.g., How blockchain actually works, 5 sleep habits backed by science"
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body"
            />
          </div>

          {/* Tone */}
          <div className="mb-6">
            <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
              Tone
            </label>
            <div className="flex flex-wrap gap-2">
              {tones.map((t) => (
                <button
                  key={t.label}
                  onClick={() => setTone(t.label)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    tone === t.label
                      ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                      : "bg-surface-container-highest text-on-surface hover:bg-surface-dim"
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slide count */}
          <div className="mb-8">
            <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
              Number of slides: {slideCount}
            </label>
            <input
              type="range"
              min={3}
              max={10}
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-on-surface-variant mt-1">
              <span>3</span>
              <span>10</span>
            </div>
          </div>

          {/* Plan button */}
          <button
            onClick={handlePlan}
            disabled={!topic.trim() || step === "planning"}
            className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {step === "planning" ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Planning your carousel...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                Plan my carousel
              </>
            )}
          </button>
        </section>
      )}

      {/* ── Step 3: Review Plan ── */}
      {step === "review-plan" && (
        <section className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold font-headline mb-2">Your carousel plan</h2>
          <p className="text-on-surface-variant text-sm mb-6">
            {plannedSlides.length} slides planned. Review the narrative arc, then generate.
          </p>

          <div className="space-y-3 mb-8">
            {plannedSlides.map((slide, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-xl bg-surface-container-lowest"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">{slide.number}</span>
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-headline font-bold text-on-surface">{slide.title}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-surface-container-high/30 text-outline">
                      {slide.type}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{slide.prompt}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              Approve & Generate
            </button>
            <button
              onClick={handlePlan}
              className="px-6 py-3 rounded-full font-bold font-headline text-primary border border-primary/20 hover:bg-primary-container/10 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Regenerate Plan
            </button>
            <button
              onClick={() => setStep("input")}
              className="px-6 py-3 rounded-full font-bold font-headline text-on-surface-variant hover:text-on-surface transition-all"
            >
              Back
            </button>
          </div>
        </section>
      )}

      {/* ── Step 4: Generating ── */}
      {step === "generating" && (
        <section className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold font-headline mb-2">Generating slides</h2>
          <p className="text-on-surface-variant text-sm mb-6">
            Creating slide {generatingIndex + 1} of {plannedSlides.length}...
          </p>

          {/* Progress bar */}
          <div className="w-full h-2 bg-surface-container-high rounded-full mb-8 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((generatingIndex + 1) / plannedSlides.length) * 100}%` }}
            />
          </div>

          {/* Growing gallery */}
          {generatedSlides.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {generatedSlides.map((slide, i) => (
                <div key={i} className="rounded-xl overflow-hidden bg-surface-container-low">
                  {slide.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slide.image} alt={slide.title} className="w-full aspect-[4/5] object-cover" />
                  ) : (
                    <div className="w-full aspect-[4/5] flex items-center justify-center text-on-surface-variant text-sm">
                      Failed
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs font-bold text-on-surface truncate">Slide {slide.number}: {slide.title}</p>
                  </div>
                </div>
              ))}
              {/* Placeholder for slide currently generating */}
              {generatedSlides.length < plannedSlides.length && (
                <div className="rounded-xl overflow-hidden bg-surface-container-low">
                  <div className="w-full aspect-[4/5] flex flex-col items-center justify-center gap-3">
                    <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                    <span className="text-xs text-on-surface-variant font-medium">Generating...</span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-on-surface truncate">
                      Slide {plannedSlides[generatedSlides.length]?.number}: {plannedSlides[generatedSlides.length]?.title}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Step 5: Review Slides ── */}
      {step === "review-slides" && (
        <section className="max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold font-headline">Your {isNotebook ? "notebook" : isHanddrawn ? "hand-drawn" : "AI"} carousel</h2>
              <p className="text-on-surface-variant text-sm mt-1">
                {validSlideCount} slide{validSlideCount !== 1 ? "s" : ""} generated. Click any slide to regenerate it.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 text-primary text-sm font-semibold hover:opacity-80 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Regenerate All
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {generatedSlides.map((slide, i) => {
              const isRegenerating = regeneratingIndex === i;
              return (
                <div key={i} className="group relative rounded-xl overflow-hidden bg-surface-container-lowest shadow-sm hover:shadow-lg transition-all">
                  {slide.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slide.image} alt={slide.title} className="w-full aspect-[4/5] object-cover" />
                  ) : (
                    <div className="w-full aspect-[4/5] flex items-center justify-center bg-surface-container-low text-on-surface-variant text-sm">
                      Failed
                    </div>
                  )}

                  {/* Regenerate overlay */}
                  <button
                    onClick={() => handleRegenerateSlide(i)}
                    disabled={isRegenerating}
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    {isRegenerating ? (
                      <span className="material-symbols-outlined animate-spin text-white text-3xl">progress_activity</span>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="material-symbols-outlined text-white text-3xl">refresh</span>
                        <span className="text-white text-xs font-bold">Regenerate</span>
                      </div>
                    )}
                  </button>

                  <div className="p-3">
                    <p className="text-xs font-bold text-on-surface truncate">Slide {slide.number}: {slide.title}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md px-6 py-6 md:px-12 flex justify-center items-center z-40">
            <div className="max-w-6xl w-full flex justify-between items-center">
              <button
                onClick={() => setStep("review-plan")}
                className="px-6 py-3 rounded-full font-bold font-headline text-on-surface-variant hover:text-on-surface transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back to plan
              </button>
              <button
                onClick={handleSave}
                disabled={validSlideCount === 0}
                className="px-10 py-4 primary-gradient text-white rounded-full font-bold font-headline shadow-[0px_10px_30px_rgba(111,51,213,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                Save to library ({validSlideCount} slide{validSlideCount !== 1 ? "s" : ""})
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Step 6: Saving ── */}
      {step === "saving" && (
        <section className="max-w-md mx-auto text-center animate-in fade-in duration-300">
          <span className="material-symbols-outlined animate-spin text-primary text-5xl mb-4">progress_activity</span>
          <h2 className="text-xl font-bold font-headline mb-2">Saving to library...</h2>
          <p className="text-on-surface-variant text-sm">You&apos;ll be redirected in a moment</p>
        </section>
      )}
    </main>
  );
}

export default function AICarouselPage() {
  return (
    <Suspense>
      <AICarouselContent />
    </Suspense>
  );
}
