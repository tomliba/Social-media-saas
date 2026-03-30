"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { imagePostTemplates, carouselThemes } from "@/lib/carousel-templates";

interface ImagePostIdea {
  title: string;
  hook: string;
  tag: string;
}

const defaultShowcaseTheme: Record<string, string> = {
  centered: "light",
  quote: "dark",
  stats: "neon",
  polaroid: "warm",
};

function ThemePreviewCard({
  themeId,
  layoutId,
  selected,
}: {
  themeId: string;
  layoutId: string;
  selected: boolean;
}) {
  const theme = carouselThemes.find((t) => t.id === themeId)!;
  const previewSrc = `/carousel-previews/${layoutId}-${themeId}.png`;
  return (
    <div
      className={`flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${
        selected ? "ring-2 ring-primary shadow-lg scale-105" : "hover:shadow-md hover:scale-[1.02]"
      }`}
      style={{ background: theme.vars["--bg"] }}
    >
      <div className="w-full aspect-[4/5] rounded-lg overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt={`${theme.name} theme preview`}
          className="w-full h-full object-cover"
        />
      </div>
      <span className="text-xs font-bold" style={{ color: theme.vars["--text"] }}>{theme.name}</span>
    </div>
  );
}

export default function ImageTemplatesSection({ niche, tone }: { niche: string; tone: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"layout" | "theme" | "topic" | "ideas">("layout");
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>("dark");
  const [topic, setTopic] = useState("");
  const [ideas, setIdeas] = useState<ImagePostIdea[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const themeSectionRef = useRef<HTMLDivElement>(null);
  const topicSectionRef = useRef<HTMLDivElement>(null);
  const ideasSectionRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };

  const handleLayoutSelect = (id: string) => {
    setSelectedLayout(id);
    setStep("theme");
    scrollTo(themeSectionRef);
  };

  const handleThemeSelect = (id: string) => {
    setSelectedTheme(id);
    setStep("topic");
    scrollTo(topicSectionRef);
  };

  const fetchIdeas = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setIdeas([]);
    setSelectedIdeas(new Set());
    setStep("ideas");

    try {
      const res = await fetch("/api/generate-image-post-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          niche,
          templateName: imagePostTemplates.find((t) => t.id === selectedLayout)?.name || "Centered",
        }),
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      if (data.ideas?.length > 0) {
        setIdeas(data.ideas);
        scrollTo(ideasSectionRef);
      } else {
        setError("No ideas returned — try a different topic");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate ideas");
    } finally {
      setLoading(false);
    }
  }, [topic, niche, selectedLayout]);

  const toggleIdea = (index: number) => {
    setSelectedIdeas((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else if (next.size < 5) next.add(index);
      return next;
    });
  };

  const handleContinue = () => {
    const selected = Array.from(selectedIdeas).map((i) => ideas[i]);
    const params = new URLSearchParams();
    params.set("format", "image");
    params.set("templateId", selectedLayout!);
    params.set("themeId", selectedTheme);
    params.set("tone", tone);
    params.set("niche", niche);
    params.set("ideas", JSON.stringify(selected));
    router.push(`/create/editor?${params.toString()}`);
  };

  return (
    <>
      {/* Step 1: Design Gallery */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold font-headline mb-2">Choose a design</h2>
        <p className="text-on-surface-variant text-sm mb-6">Pick the visual style for your image post</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {imagePostTemplates.map((t) => {
            const isSelected = selectedLayout === t.id;
            const previewTheme = isSelected ? selectedTheme : (defaultShowcaseTheme[t.id] || "dark");
            const previewSrc = `/carousel-previews/${t.id}-${previewTheme}.png`;
            return (
              <button
                key={t.id}
                onClick={() => handleLayoutSelect(t.id)}
                className={`group relative flex flex-col items-center p-4 rounded-xl transition-all active:scale-[0.97] ${
                  isSelected
                    ? "ring-2 ring-primary shadow-[0px_12px_30px_rgba(111,51,213,0.15)] bg-surface-container-lowest"
                    : "bg-surface-container-lowest hover:shadow-lg"
                }`}
              >
                <div className="w-full aspect-[4/5] rounded-lg overflow-hidden mb-3 bg-surface-container-low shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSrc}
                    alt={`${t.name} preview`}
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      isSelected ? "" : "group-hover:scale-105"
                    }`}
                  />
                </div>
                <h3 className="font-bold text-base font-headline">{t.name}</h3>
                <p className="text-xs text-on-surface-variant text-center leading-tight mt-1">{t.description}</p>
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined text-[16px] text-white font-bold">check</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2: Theme Picker */}
      {(step === "theme" || step === "topic" || step === "ideas") && (
        <section ref={themeSectionRef} className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold font-headline mb-2">Pick a color theme</h2>
          <p className="text-on-surface-variant text-sm mb-6">Each theme transforms the entire look of your post</p>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {carouselThemes.map((theme) => (
              <button key={theme.id} onClick={() => handleThemeSelect(theme.id)}>
                <ThemePreviewCard
                  themeId={theme.id}
                  layoutId={selectedLayout || "centered"}
                  selected={selectedTheme === theme.id}
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 3: Topic Input */}
      {(step === "topic" || step === "ideas") && (
        <section ref={topicSectionRef} className="mb-16 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold font-headline mb-2">What&apos;s the topic?</h2>
          <p className="text-on-surface-variant text-sm mb-4">We&apos;ll generate 10 image post ideas based on your topic</p>

          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") fetchIdeas(); }}
            placeholder="e.g., motivational quotes, startup metrics, productivity tips"
            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body mb-4"
          />
          <button
            onClick={fetchIdeas}
            disabled={!topic.trim() || loading}
            className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                Generating ideas...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                Generate 10 ideas
              </>
            )}
          </button>
        </section>
      )}

      {/* Step 4: Ideas */}
      {step === "ideas" && (
        <section ref={ideasSectionRef} className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl font-bold font-headline">
              10 image post ideas
            </h2>
            <button
              onClick={fetchIdeas}
              disabled={loading}
              className="flex items-center gap-1.5 text-primary text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-sm ${loading ? "animate-spin" : ""}`}>refresh</span>
              Regenerate
            </button>
          </div>

          {error && (
            <div className="p-6 rounded-[1rem] bg-red-50 border border-red-200 text-red-700 text-sm font-medium mb-4">
              {error}
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-[1rem] bg-surface-container-low/50">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-outline-variant shimmer" />
                  <div className="flex-grow h-5 shimmer rounded-full" />
                  <div className="w-16 h-5 shimmer rounded-full" />
                </div>
              ))}
            </div>
          )}

          {!loading && ideas.length > 0 && (
            <>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-4 no-scrollbar">
                {ideas.map((idea, i) => {
                  const isChecked = selectedIdeas.has(i);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleIdea(i)}
                      className={`group flex items-start gap-4 p-4 rounded-[1rem] cursor-pointer transition-all ${
                        isChecked
                          ? "bg-surface-container-lowest border-l-4 border-primary"
                          : "bg-surface-container-low/50 hover:bg-surface-container-lowest"
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 ${
                          isChecked ? "border-primary bg-primary" : "border-outline-variant group-hover:border-primary"
                        }`}
                      >
                        {isChecked && (
                          <span className="material-symbols-outlined text-white text-[16px] font-bold">check</span>
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className={`font-headline leading-tight ${isChecked ? "font-semibold text-on-surface" : "font-medium text-on-surface-variant group-hover:text-on-surface transition-colors"}`}>
                          {idea.title}
                        </p>
                        <p className="text-xs text-on-surface-variant/70 mt-1">{idea.hook}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex-shrink-0 ${isChecked ? "bg-surface-container-low text-on-surface-variant" : "bg-surface-container-high/30 text-outline"}`}>
                        {idea.tag}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center gap-2 text-on-surface-variant text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <p>
                  Select up to 5 ideas &middot;{" "}
                  <span className="text-on-surface font-bold">{selectedIdeas.size} selected</span>
                </p>
              </div>
            </>
          )}
        </section>
      )}

      {/* Bottom Action Bar */}
      {selectedIdeas.size > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md px-6 py-6 md:px-12 flex justify-center items-center z-40">
          <div className="max-w-6xl w-full flex justify-end items-center">
            <button
              onClick={handleContinue}
              className="px-10 py-4 primary-gradient text-white rounded-full font-bold font-headline shadow-[0px_10px_30px_rgba(111,51,213,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
            >
              Continue with {selectedIdeas.size} idea{selectedIdeas.size !== 1 ? "s" : ""}
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
