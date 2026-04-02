"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    description: "Person choosing between the old way (red door) and your product (gold door)",
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
    description: "Falling behind while others speed ahead, until your product appears",
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

type Step = "input" | "concept";

function AdCreativeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedConcept = searchParams.get("concept");

  // Input state
  const [product, setProduct] = useState("");
  const [description, setDescription] = useState("");

  // Concept state
  const [selectedConcept, setSelectedConcept] = useState<string | null>(preselectedConcept);

  // Flow state
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Step 1 → 2 ──
  const handleContinueToConcept = () => {
    if (!product.trim()) return;
    if (selectedConcept) {
      handleGenerate();
    } else {
      setStep("concept");
    }
  };

  // ── Background generation: generate image, upload to R2, update library entry ──
  const generateInBackground = useCallback(async (libraryItemId: string, prod: string, desc: string, conceptId: string, variationIndex: number) => {
    try {
      // 1. Generate image via server-side route (builds prompt + calls Flask)
      const res = await fetch("/api/ad-creative/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: prod, description: desc, conceptId, variationIndex }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      const image = data.image?.startsWith("data:")
        ? data.image
        : `data:image/png;base64,${data.image}`;

      // 2. Upload to R2
      const uploadRes = await fetch("/api/upload-generated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, filename: `ad-${conceptId}-${Date.now()}` }),
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();

      // 3. Update library entry with final URL
      await fetch(`/api/library/${libraryItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready", videoUrl: url, thumbnailUrl: url }),
      });
    } catch (err) {
      await fetch(`/api/library/${libraryItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "failed", error: err instanceof Error ? err.message : "Generation failed" }),
      }).catch(() => {});
    }
  }, []);

  // ── Generate: create library entry, redirect, fire background work ──
  const handleGenerate = useCallback(async () => {
    if (!selectedConcept || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const conceptName = concepts.find((c) => c.id === selectedConcept)?.name || "Ad";
      const title = `${product}: ${conceptName}`;

      // Create library entry with "rendering" status
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          format: "image",
          status: "rendering",
        }),
      });
      if (!res.ok) throw new Error("Failed to create library entry");
      const { item } = await res.json();

      // Fire background generation (don't await)
      generateInBackground(item.id, product, description, selectedConcept, 0);

      // Redirect immediately
      router.push("/library");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start generation");
      setSubmitting(false);
    }
  }, [selectedConcept, submitting, product, description, generateInBackground, router]);

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
            AI-generated illustrated ads: cartoon scenes, visual metaphors, comic panels
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
            disabled={!product.trim() || submitting}
            className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Submitting...
              </>
            ) : (
              <>
                {selectedConcept ? "Generate" : "Pick a visual concept"}
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </>
            )}
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
              disabled={!selectedConcept || submitting}
              className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  Submitting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  Generate
                </>
              )}
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
    </main>
  );
}

export default function AdCreativePage() {
  return <Suspense><AdCreativeContent /></Suspense>;
}
