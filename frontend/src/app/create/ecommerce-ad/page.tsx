"use client";

import { useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// ── Ad styles ──

interface AdStyle {
  id: string;
  name: string;
  icon: string;
  description: string;
  example: string;
}

const adStyles: AdStyle[] = [
  {
    id: "product_world",
    name: "Product World",
    icon: "view_in_ar",
    description: "Product in bold monochromatic color environment",
    example: "Product floating in a deep blue void with dramatic rim lighting",
  },
  {
    id: "visual_metaphor",
    name: "Visual Metaphor",
    icon: "lightbulb",
    description: "Product reimagined as something unexpected",
    example: "Skincare bottle as a crystal spring, SaaS tool as a rocket",
  },
  {
    id: "before_after",
    name: "Before / After Split",
    icon: "compare",
    description: "Dramatic transformation diagonal split",
    example: "Gray chaotic desk → clean organized workspace with your product",
  },
  {
    id: "lifestyle",
    name: "Lifestyle Scene",
    icon: "self_improvement",
    description: "Product in aspirational real-world context",
    example: "Person using product confidently in their ideal environment",
  },
  {
    id: "social_proof",
    name: "Social Proof",
    icon: "trending_up",
    description: "Big number or testimonial visual",
    example: "Giant '10,000+' with small happy customers below",
  },
  {
    id: "curiosity_hook",
    name: "Curiosity Hook",
    icon: "visibility",
    description: "Intriguing image that demands a click",
    example: "Partially revealed product, mystery box, 'what's inside' angle",
  },
];

// ── Scene builders per style ──

function buildSceneForStyle(
  styleId: string,
  brief: ResearchBrief,
  productName: string,
  headline: string,
): string {
  switch (styleId) {
    case "product_world":
      return `The product "${productName}" floating or standing heroically in a bold monochromatic color environment. Dramatic cinematic rim lighting. The product is the only object — clean, premium, isolated. The environment color reflects the brand energy.`;
    case "visual_metaphor":
      return `The product "${productName}" visually reimagined as a metaphor for its core benefit: "${brief.coreValueProp}". The product transforms into or merges with something powerful and unexpected. ${brief.psychologicalPillars.curiosity}`;
    case "before_after":
      return `Diagonal split composition. Left/top: gray desaturated scene showing the pain — "${brief.painPoints[0] || "frustration and chaos"}". Right/bottom: vivid colorful scene showing the transformation after using "${productName}" — "${brief.top5Benefits[0] || "success"}". The product appears on the winning side.`;
    case "lifestyle":
      return `${brief.icpDescription} — shown in their ideal moment, using "${productName}" naturally and confidently. Aspirational but relatable environment. Warm cinematic lighting. The product is clearly visible and integrated into the scene.`;
    case "social_proof":
      return `A massive, bold number or statistic dominates the center: "${brief.top5Benefits[0] || "10,000+ happy customers"}". Below it, tiny illustrated happy people or icons represent the community. "${productName}" appears prominently. The visual conveys trust and scale.`;
    case "curiosity_hook":
      return `An intriguing, partially-revealed view of "${productName}" that creates mystery and demands attention. ${brief.psychologicalPillars.attention}. The viewer can't help but want to see more. Use dramatic lighting and shadows to create intrigue.`;
    default:
      return `A premium product shot of "${productName}" with dramatic lighting.`;
  }
}

// ── Types ──

interface ResearchBrief {
  coreValueProp: string;
  top5Benefits: string[];
  psychologicalPillars: {
    attention: string;
    curiosity: string;
    emotion: string;
    connection: string;
  };
  customerLanguage: string[];
  painPoints: string[];
  toneAssessment: string;
  icpDescription: string;
  suggestedHeadlines: string[];
}

type Phase = "input" | "researching" | "review-brief" | "pick-styles";

const VISUAL_STYLE =
  "Visual: Dark near-black background (#0A0A0A). Monochromatic color world. High contrast. Cinematic lighting. Product clearly visible and photorealistic. Premium feel. Do NOT use light backgrounds. Do NOT add watermarks or logos. Format: 1:1 square (1080x1080).";

const LAYOUT =
  "Layout: Top 30% = headline on dark gradient, white bold ALL CAPS text. Middle 40% = main visual with product prominent. Bottom 30% = supporting text.";

function EcommerceAdContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedStyle = searchParams.get("style");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Product input
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("");
  const [painPoint, setPainPoint] = useState("");
  const [price, setPrice] = useState("");

  // Photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Research
  const [brief, setBrief] = useState<ResearchBrief | null>(null);

  // Styles
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(
    preselectedStyle ? new Set([preselectedStyle]) : new Set()
  );

  // Flow
  const [phase, setPhase] = useState<Phase>("input");
  const [error, setError] = useState<string | null>(null);


  // ── Photo handling ──
  const handlePhotoSelect = useCallback(async (file: File) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);

    // Read as base64 for passing to Flask
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix to get raw base64
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      setPhotoBase64(base64);
      setPhotoUploading(false);
    };
    reader.onerror = () => {
      setPhotoUploading(false);
    };
    reader.readAsDataURL(file);
  }, [photoPreview]);

  // ── Phase 2: Research ──
  const handleResearch = useCallback(async () => {
    if (!productName.trim()) return;
    setPhase("researching");
    setError(null);

    try {
      const res = await fetch("/api/ecommerce-ad/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          productUrl: productUrl || undefined,
          description,
          audience,
          painPoint,
          price: price || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `API returned ${res.status}`);
      }
      const data: ResearchBrief = await res.json();
      if (!data.coreValueProp) {
        throw new Error("Incomplete research brief. Try again");
      }
      setBrief(data);
      setPhase("review-brief");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
      setPhase("input");
    }
  }, [productName, productUrl, description, audience, painPoint, price]);

  // ── Style selection ──
  const toggleStyle = (id: string) => {
    setSelectedStyles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  };

  const [submitting, setSubmitting] = useState(false);

  // ── Background generation for a single style ──
  const generateOneInBackground = useCallback(async (
    libraryItemId: string,
    pName: string,
    styleBrief: ResearchBrief,
    styleId: string,
    headline: string,
    photo: string | null,
  ) => {
    try {
      const scene = buildSceneForStyle(styleId, styleBrief, pName, headline);
      const prompt = `Photorealistic e-commerce ad creative for "${pName}".
Style: ${adStyles.find((s) => s.id === styleId)?.name || styleId}
Scene: ${scene}
Headline: "${headline}" — white bold ALL CAPS text.
${LAYOUT}
${VISUAL_STYLE}${photo ? "\n\nThe product looks like the attached reference image. Include this exact product appearance in the scene." : ""}`;

      // 1. Generate via Flask
      const genRes = await fetch("/api/ai-carousel/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ...(photo ? { productImageBase64: photo } : {}) }),
      });
      if (!genRes.ok) throw new Error("Generation failed");
      const genData = await genRes.json();
      const image = genData.image?.startsWith("data:")
        ? genData.image
        : `data:image/png;base64,${genData.image}`;

      // 2. Upload to R2
      const uploadRes = await fetch("/api/upload-generated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, filename: `ecom-${styleId}-${Date.now()}` }),
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();

      // 3. Update library entry
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

  // ── Phase 4: Generate — create library entries, redirect, fire background ──
  const handleGenerate = useCallback(async () => {
    if (!brief || selectedStyles.size === 0 || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const styleList = Array.from(selectedStyles);

      for (let i = 0; i < styleList.length; i++) {
        const styleId = styleList[i];
        const styleName = adStyles.find((s) => s.id === styleId)?.name || styleId;
        const headline = brief.suggestedHeadlines[i] || brief.suggestedHeadlines[0] || "TRANSFORM YOUR WORLD";

        // Create library entry with "rendering" status
        const res = await fetch("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: `ecom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: `${productName}: ${styleName}`,
            format: "image",
            status: "rendering",
          }),
        });
        if (!res.ok) throw new Error("Failed to create library entry");
        const { item } = await res.json();

        // Fire background generation (don't await)
        generateOneInBackground(item.id, productName, brief, styleId, headline, photoBase64);
      }

      // Redirect immediately
      router.push("/library");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start generation");
      setSubmitting(false);
    }
  }, [brief, selectedStyles, submitting, productName, photoBase64, generateOneInBackground, router]);

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
            E-Commerce Ad
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Research-backed product ads. 4 unique creatives with strategy
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

      {/* ── Phase 1: Product Input ── */}
      {phase === "input" && (
        <section className="max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold font-headline mb-2">Tell us about your product</h2>
          <p className="text-on-surface-variant text-sm mb-6">AI will research your market and create targeted ad creatives</p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">Product / Service name *</label>
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g., FlowTrack, MealPrep Pro"
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body" />
            </div>

            <div>
              <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">Product URL (optional)</label>
              <input type="text" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://yourproduct.com"
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body" />
            </div>

            <div>
              <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">What does it do? *</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="An AI-powered project management tool that automates task assignments..." rows={3}
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body resize-none" />
            </div>

            <div>
              <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">Target audience</label>
              <input type="text" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Startup founders, marketing teams, freelancers"
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body" />
            </div>

            <div>
              <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">Main pain point</label>
              <textarea value={painPoint} onChange={(e) => setPainPoint(e.target.value)} placeholder="Teams waste hours on manual status updates and missed deadlines" rows={2}
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body resize-none" />
            </div>

            <div>
              <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">Price point (optional)</label>
              <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$29/mo, $199 one-time, Free trial"
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body" />
            </div>

            {/* Photo upload */}
            <div>
              <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">Product image (optional)</label>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }} />
              {photoPreview ? (
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Product" className="w-20 h-20 rounded-xl object-cover" />
                  <div className="flex flex-col gap-1">
                    {photoUploading ? (
                      <span className="text-xs text-on-surface-variant">Processing...</span>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">Ready</span>
                    )}
                    <button onClick={() => { setPhotoPreview(null); setPhotoBase64(null); }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border-2 border-dashed border-outline-variant/30 rounded-xl text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
                  Upload product photo
                </button>
              )}
            </div>
          </div>

          <button onClick={handleResearch} disabled={!productName.trim()}
            className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            Research & strategize
          </button>
        </section>
      )}

      {/* ── Phase 2: Researching ── */}
      {phase === "researching" && (
        <section className="max-w-md mx-auto text-center animate-in fade-in duration-300">
          <span className="material-symbols-outlined animate-spin text-primary text-5xl mb-4">progress_activity</span>
          <h2 className="text-xl font-bold font-headline mb-2">Researching your product...</h2>
          <p className="text-on-surface-variant text-sm">Analyzing market positioning, audience psychology, and creative angles</p>
        </section>
      )}

      {/* ── Phase 3: Review Brief ── */}
      {phase === "review-brief" && brief && (
        <section className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold font-headline mb-2">Product Identity Brief</h2>
          <p className="text-on-surface-variant text-sm mb-6">AI research complete. Review the strategy, then pick ad styles</p>

          <div className="space-y-4 mb-8">
            {/* Core value prop */}
            <div className="p-4 rounded-xl bg-surface-container-lowest">
              <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Core Value Proposition</h4>
              <p className="text-on-surface font-medium">{brief.coreValueProp}</p>
            </div>

            {/* Benefits */}
            <div className="p-4 rounded-xl bg-surface-container-lowest">
              <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Top Benefits</h4>
              <div className="flex flex-wrap gap-2">
                {brief.top5Benefits.map((b, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-primary-container/10 text-primary text-xs font-semibold">{b}</span>
                ))}
              </div>
            </div>

            {/* Psychological pillars */}
            <div className="p-4 rounded-xl bg-surface-container-lowest">
              <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Psychological Angles</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(brief.psychologicalPillars).map(([key, val]) => (
                  <div key={key}>
                    <span className="text-[10px] font-bold uppercase text-on-surface-variant/50">{key}</span>
                    <p className="text-xs text-on-surface">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tone + ICP */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface-container-lowest">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Recommended Tone</h4>
                <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface text-xs font-bold">{brief.toneAssessment.replace(/_/g, " ")}</span>
              </div>
              <div className="p-4 rounded-xl bg-surface-container-lowest">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Customer Language</h4>
                <p className="text-xs text-on-surface">{brief.customerLanguage.slice(0, 3).join(" · ")}</p>
              </div>
            </div>

            {/* Headlines */}
            <div className="p-4 rounded-xl bg-surface-container-lowest">
              <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Suggested Headlines</h4>
              <div className="flex flex-wrap gap-2">
                {brief.suggestedHeadlines.map((h, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface text-xs font-bold uppercase">{h}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setPhase("pick-styles")}
              className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
              Pick ad styles
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
            <button onClick={handleResearch}
              className="px-6 py-3 rounded-full font-bold font-headline text-primary border border-primary/20 hover:bg-primary-container/10 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">refresh</span>
              Regenerate
            </button>
            <button onClick={() => setPhase("input")}
              className="px-6 py-3 rounded-full font-bold font-headline text-on-surface-variant hover:text-on-surface transition-all">
              Back
            </button>
          </div>
        </section>
      )}

      {/* ── Phase 4: Pick Styles ── */}
      {phase === "pick-styles" && (
        <section className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold font-headline mb-2">Pick 4 ad styles</h2>
          <p className="text-on-surface-variant text-sm mb-6">Each generates a unique creative for &ldquo;{productName}&rdquo;</p>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 mb-8">
            {adStyles.map((style) => {
              const isSelected = selectedStyles.has(style.id);
              const atMax = selectedStyles.size >= 4 && !isSelected;
              return (
                <button key={style.id} onClick={() => toggleStyle(style.id)} disabled={atMax}
                  className={`group relative flex flex-col rounded-xl text-left transition-all overflow-hidden active:scale-[0.97] ${
                    isSelected
                      ? "ring-2 ring-primary shadow-lg shadow-primary/10"
                      : atMax
                        ? "bg-surface-container-lowest opacity-40 cursor-not-allowed"
                        : "bg-surface-container-lowest hover:shadow-lg"
                  }`}>
                  <div className="w-full aspect-square overflow-hidden bg-surface-container-low">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/previews/ads/ecom-${style.id}.png`}
                      alt={style.name}
                      className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = "none";
                        el.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-surface-container-low"><span class="material-symbols-outlined text-4xl text-on-surface-variant">${style.icon}</span></div>`;
                      }}
                    />
                  </div>
                  <div className="px-3 py-2.5">
                    <h3 className="font-bold text-sm font-headline mb-0.5">{style.name}</h3>
                    <p className="text-xs text-on-surface-variant leading-snug mb-1">{style.description}</p>
                    <p className="text-[10px] text-on-surface-variant/50 italic">{style.example}</p>
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
            <button onClick={handleGenerate} disabled={selectedStyles.size === 0 || submitting}
              className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  Submitting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  Generate {selectedStyles.size} ad{selectedStyles.size !== 1 ? "s" : ""}
                </>
              )}
            </button>
            <button onClick={() => setPhase("review-brief")}
              className="px-6 py-3 rounded-full font-bold font-headline text-on-surface-variant hover:text-on-surface transition-all">
              Back
            </button>
          </div>

          {selectedStyles.size > 0 && (
            <div className="mt-4 flex items-center gap-2 text-on-surface-variant text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <p><span className="text-on-surface font-bold">{selectedStyles.size}</span> of 4 selected</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default function EcommerceAdPage() {
  return <Suspense><EcommerceAdContent /></Suspense>;
}
