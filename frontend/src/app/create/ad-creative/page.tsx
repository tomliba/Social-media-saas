"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Visual concepts ──

interface Concept {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const concepts: Concept[] = [
  {
    id: "two_doors",
    name: "Two Doors",
    icon: "door_front",
    description: "Person choosing between old way (red door) and your product (gold door)",
  },
  {
    id: "solo_vs_army",
    name: "Solo vs Army",
    icon: "groups",
    description: "One person alone vs commanding an army of helpers",
  },
  {
    id: "race_track",
    name: "Race Track",
    icon: "speed",
    description: "Falling behind while others speed ahead — until your product appears",
  },
  {
    id: "before_after_split",
    name: "Before / After Split",
    icon: "compare",
    description: "Diagonal split: gray and stressed vs colorful and winning",
  },
  {
    id: "comic_panels",
    name: "Comic Panels",
    icon: "view_column",
    description: "3-panel comic strip: struggle, discovery, transformation",
  },
  {
    id: "control_room",
    name: "Control Room",
    icon: "monitoring",
    description: "Person confidently monitoring automated dashboards",
  },
];

// ── Types ──

interface GeneratedAd {
  variationIndex: number;
  image: string; // base64 data URL
}

type Step = "input" | "concept" | "generating" | "review" | "saving";

export default function AdCreativePage() {
  const router = useRouter();

  // Input state
  const [product, setProduct] = useState("");
  const [description, setDescription] = useState("");

  // Concept state
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);

  // Flow state
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);

  // Generation state
  const [generatedAds, setGeneratedAds] = useState<GeneratedAd[]>([]);
  const [generatingIndex, setGeneratingIndex] = useState(0);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // ── Step 1 → 2 ──
  const handleContinueToConcept = () => {
    if (!product.trim()) return;
    setStep("concept");
  };

  // ── Step 3: Generate 3 variations ──
  const handleGenerate = useCallback(async () => {
    if (!selectedConcept) return;
    setStep("generating");
    setError(null);
    setGeneratedAds([]);
    setGeneratingIndex(0);

    const results: GeneratedAd[] = [];

    for (let i = 0; i < 3; i++) {
      setGeneratingIndex(i);
      try {
        const res = await fetch("/api/ad-creative/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product,
            description,
            conceptId: selectedConcept,
            variationIndex: i,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Variation ${i + 1} failed`);
        }
        const data = await res.json();
        const image = data.image?.startsWith("data:")
          ? data.image
          : `data:image/png;base64,${data.image}`;
        results.push({ variationIndex: i, image });
        setGeneratedAds([...results]);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Variation ${i + 1} failed`);
        results.push({ variationIndex: i, image: "" });
        setGeneratedAds([...results]);
      }
    }

    setStep("review");
  }, [product, description, selectedConcept]);

  // ── Regenerate one ad ──
  const handleRegenerateAd = useCallback(async (index: number) => {
    setRegeneratingIndex(index);
    setError(null);

    try {
      const res = await fetch("/api/ad-creative/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          description,
          conceptId: selectedConcept,
          variationIndex: index,
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
      setGeneratedAds((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], image };
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegeneratingIndex(null);
    }
  }, [product, description, selectedConcept]);

  // ── Step 5: Save ──
  const handleSave = useCallback(async () => {
    setStep("saving");
    try {
      const images = generatedAds.filter((a) => a.image).map((a) => a.image);
      const results = [{
        title: `${product} — ${concepts.find((c) => c.id === selectedConcept)?.name || "Ad"}`,
        images,
        caption: "",
      }];

      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: results[0].title,
          format: "carousel",
          status: "ready",
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      sessionStorage.setItem("pending-carousel-results", JSON.stringify(results));
      sessionStorage.setItem("pending-format", "carousel");
      router.push("/library");
    } catch (err) {
      console.error("Failed to save ads:", err);
      setError("Failed to save — please try again");
      setStep("review");
    }
  }, [product, selectedConcept, generatedAds, router]);

  const validAdCount = generatedAds.filter((a) => a.image).length;
  const variationLabels = ["Headline focus", "Scene focus", "Product focus"];

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
            Ad Creative
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            AI-generated illustrated ads — cartoon scenes, visual metaphors, comic panels
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

      {/* ── Step 1: Product Info ── */}
      {step === "input" && (
        <section className="max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold font-headline mb-2">What are you advertising?</h2>
          <p className="text-on-surface-variant text-sm mb-6">Tell us about your product or service</p>

          <div className="mb-4">
            <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
              Product / Service name
            </label>
            <input
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g., FlowTrack, MealPrep Pro, CodeShip"
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body"
            />
          </div>

          <div className="mb-8">
            <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
              What does it do?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., An AI-powered project management tool that automates task assignments, tracks deadlines, and generates status reports automatically."
              rows={4}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body resize-none"
            />
          </div>

          <button
            onClick={handleContinueToConcept}
            disabled={!product.trim()}
            className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Pick a visual concept
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </section>
      )}

      {/* ── Step 2: Pick Concept ── */}
      {step === "concept" && (
        <section className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold font-headline mb-2">Pick a visual concept</h2>
          <p className="text-on-surface-variant text-sm mb-6">
            Choose the scene style for your &ldquo;{product}&rdquo; ad
          </p>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 mb-8">
            {concepts.map((concept) => {
              const isSelected = selectedConcept === concept.id;
              return (
                <button
                  key={concept.id}
                  onClick={() => setSelectedConcept(concept.id)}
                  className={`group relative flex flex-col rounded-xl text-left transition-all overflow-hidden active:scale-[0.97] ${
                    isSelected
                      ? "ring-2 ring-primary shadow-lg shadow-primary/10"
                      : "bg-surface-container-lowest hover:shadow-lg"
                  }`}
                >
                  <div className="w-full aspect-square overflow-hidden bg-surface-container-low">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/previews/ads/cartoon-${concept.id}.png`}
                      alt={concept.name}
                      className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = "none";
                        el.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-surface-container-low"><span class="material-symbols-outlined text-4xl text-on-surface-variant">${concept.icon}</span></div>`;
                      }}
                    />
                  </div>
                  <div className="px-3 py-2.5">
                    <h3 className="font-bold text-sm font-headline mb-0.5">{concept.name}</h3>
                    <p className="text-xs text-on-surface-variant leading-snug">{concept.description}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-[16px] text-white font-bold">check</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={!selectedConcept}
              className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              Generate 3 ad variations
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

      {/* ── Step 3: Generating ── */}
      {step === "generating" && (
        <section className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold font-headline mb-2">Creating your ads</h2>
          <p className="text-on-surface-variant text-sm mb-6">
            Generating variation {generatingIndex + 1} of 3...
          </p>

          {/* Progress bar */}
          <div className="w-full h-2 bg-surface-container-high rounded-full mb-8 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((generatingIndex + 1) / 3) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {generatedAds.map((ad, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-surface-container-low">
                {ad.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ad.image} alt={`Variation ${i + 1}`} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center text-on-surface-variant text-sm">
                    Failed
                  </div>
                )}
                <div className="p-3">
                  <p className="text-xs font-bold text-on-surface">{variationLabels[i]}</p>
                </div>
              </div>
            ))}
            {/* Placeholder for current generation */}
            {generatedAds.length < 3 && (
              <div className="rounded-xl overflow-hidden bg-surface-container-low">
                <div className="w-full aspect-square flex flex-col items-center justify-center gap-3">
                  <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                  <span className="text-xs text-on-surface-variant font-medium">Generating...</span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-on-surface">{variationLabels[generatedAds.length]}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Step 4: Review ── */}
      {step === "review" && (
        <section className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold font-headline">Your ad creatives</h2>
              <p className="text-on-surface-variant text-sm mt-1">
                {validAdCount} variation{validAdCount !== 1 ? "s" : ""} generated. Click any ad to regenerate it.
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

          <div className="grid grid-cols-3 gap-6 mb-8">
            {generatedAds.map((ad, i) => {
              const isRegenerating = regeneratingIndex === i;
              return (
                <div key={i} className="group relative rounded-xl overflow-hidden bg-surface-container-lowest shadow-sm hover:shadow-lg transition-all">
                  {ad.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ad.image} alt={`Variation ${i + 1}`} className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center bg-surface-container-low text-on-surface-variant text-sm">
                      Failed
                    </div>
                  )}

                  {/* Regenerate overlay */}
                  <button
                    onClick={() => handleRegenerateAd(i)}
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

                  <div className="p-4">
                    <p className="text-sm font-bold text-on-surface">{variationLabels[i]}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {concepts.find((c) => c.id === selectedConcept)?.name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md px-6 py-6 md:px-12 flex justify-center items-center z-40">
            <div className="max-w-6xl w-full flex justify-between items-center">
              <button
                onClick={() => setStep("concept")}
                className="px-6 py-3 rounded-full font-bold font-headline text-on-surface-variant hover:text-on-surface transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Change concept
              </button>
              <button
                onClick={handleSave}
                disabled={validAdCount === 0}
                className="px-10 py-4 primary-gradient text-white rounded-full font-bold font-headline shadow-[0px_10px_30px_rgba(111,51,213,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                Save to library ({validAdCount} ad{validAdCount !== 1 ? "s" : ""})
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Step 5: Saving ── */}
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
