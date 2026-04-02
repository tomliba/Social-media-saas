"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// ── Meme templates ──

interface MemeTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  panelCount: number;
  panelLayout: string;
}

const memeTemplates: MemeTemplate[] = [
  {
    id: "drake",
    name: "Drake",
    icon: "thumb_down",
    description: "Reject old way, approve your product",
    panelCount: 2,
    panelLayout: "Two horizontal panels stacked vertically. Top panel: person with hand up rejecting/refusing something, looking away disapprovingly. Bottom panel: same person pointing and smiling approvingly at something.",
  },
  {
    id: "expanding_brain",
    name: "Expanding Brain",
    icon: "psychology",
    description: "Escalating levels, your product = evolved choice",
    panelCount: 4,
    panelLayout: "Four horizontal panels stacked vertically. Each shows a person's head with an increasingly glowing/expanding brain. Panel 1: small brain. Panel 2: medium glowing brain. Panel 3: large radiant brain. Panel 4: cosmic galaxy brain with light rays.",
  },
  {
    id: "uno_draw_25",
    name: "UNO Draw 25",
    icon: "style",
    description: "Rather suffer than try the obvious solution",
    panelCount: 2,
    panelLayout: "Two panels. Left: an UNO card showing a choice/action. Right: person holding a massive stack of cards (chose to draw 25 instead of doing the thing).",
  },
  {
    id: "distracted_boyfriend",
    name: "Distracted Boyfriend",
    icon: "person_search",
    description: "Attention pulled from status quo to your product",
    panelCount: 3,
    panelLayout: "Three labeled figures walking on a street. The boyfriend (center) is turning his head to look at the attractive other woman (right) while his girlfriend (left) looks on disapprovingly.",
  },
  {
    id: "this_is_fine",
    name: "This Is Fine",
    icon: "local_fire_department",
    description: "Sitting in chaos pretending everything's okay",
    panelCount: 2,
    panelLayout: "Two panels. Panel 1: cartoon character sitting calmly at a table in a room engulfed in flames, saying 'This is fine'. Panel 2: close-up of the character, still calm, surrounded by more flames.",
  },
  {
    id: "grus_plan",
    name: "Gru's Plan",
    icon: "assignment",
    description: "4 panels: plan, plan, realize the flaw, same flaw",
    panelCount: 4,
    panelLayout: "Four panels showing a villain presenting a plan on a whiteboard. Panel 1: presenting step 1 confidently. Panel 2: presenting step 2 confidently. Panel 3: reading an unexpected flaw on the board. Panel 4: double-take, shocked realization at the same flaw.",
  },
  {
    id: "tuxedo_pooh",
    name: "Tuxedo Winnie Pooh",
    icon: "checkroom",
    description: "Fancy vs simple framing of the same thing",
    panelCount: 2,
    panelLayout: "Two horizontal panels. Top: regular casual Winnie the Pooh with a basic label. Bottom: Winnie the Pooh wearing a tuxedo and monocle with a sophisticated label.",
  },
  {
    id: "running_away_balloon",
    name: "Running Away Balloon",
    icon: "air_balloon",
    description: "Letting go of the old thing, chasing the new",
    panelCount: 3,
    panelLayout: "Three panels showing a person running. A balloon floats away behind them (the thing they abandoned). They run eagerly toward something ahead (the new thing).",
  },
  {
    id: "virgin_vs_chad",
    name: "Virgin vs Chad",
    icon: "compare_arrows",
    description: "Weak old approach vs strong new approach",
    panelCount: 2,
    panelLayout: "Two side-by-side panels. Left: a timid, hunched-over character labeled with the weak/old approach. Right: a confident, muscular character labeled with the strong/new approach.",
  },
  {
    id: "wojak",
    name: "Wojak",
    icon: "sentiment_stressed",
    description: "Relatable 'me thinking about [problem]' format",
    panelCount: 2,
    panelLayout: "Two panels. Panel 1: a simple line-art character with a thought bubble showing the internal struggle. Panel 2: the character's reaction or action in response.",
  },
];

// ── Style block ──

const MEME_STYLE =
  "Style: Bold cartoon/illustrated, NOT photorealistic. Clean high-contrast illustration with bold outlines and flat colors. White bold text with black outline on each panel label. 1:1 square format (1080x1080). Do NOT add any logos, watermarks, or footer bars. Do NOT add any text beyond the specified panel labels. Maximum 8 words per panel label.";

// ── Types ──

type Step = "input" | "template";

function MemeAdContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTemplate = searchParams.get("template");

  // Input state
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [painPoint, setPainPoint] = useState("");
  const [audience, setAudience] = useState("");

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(preselectedTemplate);

  // Flow state
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Step 1 → 2 ──
  const handleContinueToTemplate = () => {
    if (!productName.trim()) return;
    if (selectedTemplate) {
      handleGenerate();
    } else {
      setStep("template");
    }
  };

  // ── Background generation: generate image, upload to R2, update library entry ──
  const generateInBackground = useCallback(async (libraryItemId: string, templateId: string, pName: string, desc: string, pain: string, aud: string) => {
    try {
      // 1. Fetch labels from Gemini
      const labelsRes = await fetch("/api/meme-ad/generate-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: pName,
          description: desc,
          painPoint: pain,
          audience: aud,
          memeTemplate: templateId,
        }),
      });
      if (!labelsRes.ok) throw new Error("Failed to generate labels");
      const labelsData = await labelsRes.json();
      const variation = labelsData.variations?.[0];
      if (!variation) throw new Error("No label variations returned");

      // 2. Build prompt and generate image via Flask
      const tmpl = memeTemplates.find((t) => t.id === templateId);
      if (!tmpl) throw new Error("Unknown template");
      const panelLines: string[] = [];
      if (variation.panel1) panelLines.push(`Panel 1: Text: '${variation.panel1}'`);
      if (variation.panel2) panelLines.push(`Panel 2: Text: '${variation.panel2}'`);
      if (variation.panel3) panelLines.push(`Panel 3: Text: '${variation.panel3}'`);
      if (variation.panel4) panelLines.push(`Panel 4: Text: '${variation.panel4}'`);
      const prompt = `Illustrated cartoon meme in the "${tmpl.name}" format. ${tmpl.panelLayout}\n\n${panelLines.join("\n")}\n\nThe meme is an ad for "${pName}" — ${desc || pName}.\nPain point: ${pain || "general frustration"}. Target: ${aud || "general"}.\n\n${MEME_STYLE}`;

      const genRes = await fetch("/api/ai-carousel/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!genRes.ok) throw new Error("Generation failed");
      const genData = await genRes.json();
      const image = genData.image?.startsWith("data:")
        ? genData.image
        : `data:image/png;base64,${genData.image}`;

      // 3. Upload to R2
      const uploadRes = await fetch("/api/upload-generated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, filename: `meme-${templateId}-${Date.now()}` }),
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();

      // 4. Update library entry with final URL
      await fetch(`/api/library/${libraryItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready", videoUrl: url, thumbnailUrl: url }),
      });
    } catch (err) {
      // Mark as failed
      await fetch(`/api/library/${libraryItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "failed", error: err instanceof Error ? err.message : "Generation failed" }),
      }).catch(() => {});
    }
  }, []);

  // ── Generate: create library entry, redirect, fire background work ──
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const tmpl = memeTemplates.find((t) => t.id === selectedTemplate);
      const title = `${productName}: ${tmpl?.name || "Meme"} Ad`;

      // Create library entry with "rendering" status
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: `meme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          format: "image",
          status: "rendering",
        }),
      });
      if (!res.ok) throw new Error("Failed to create library entry");
      const { item } = await res.json();

      // Fire background generation (don't await)
      generateInBackground(item.id, selectedTemplate, productName, description, painPoint, audience);

      // Redirect immediately
      router.push("/library");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start generation");
      setSubmitting(false);
    }
  }, [selectedTemplate, submitting, productName, description, painPoint, audience, generateInBackground, router]);

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
            Meme Ad
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            AI-generated meme ads: Drake, Expanding Brain, UNO Draw 25, and more
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
          <h2 className="text-2xl font-bold font-headline mb-2">Tell us about your product</h2>
          <p className="text-on-surface-variant text-sm mb-6">We&apos;ll turn it into meme gold</p>

          <div className="mb-4">
            <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
              Product / Service name
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., FlowTrack, MealPrep Pro, CodeShip"
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body"
            />
          </div>

          <div className="mb-4">
            <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
              What does it do?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., An AI-powered project management tool that automates task assignments and tracks deadlines."
              rows={3}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body resize-none"
            />
          </div>

          <div className="mb-4">
            <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
              Pain point it solves
            </label>
            <textarea
              value={painPoint}
              onChange={(e) => setPainPoint(e.target.value)}
              placeholder="e.g., Teams waste hours every week on manual status updates and missed deadlines."
              rows={2}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body resize-none"
            />
          </div>

          <div className="mb-8">
            <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
              Target audience
            </label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g., Startup founders, marketing teams, freelancers"
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body"
            />
          </div>

          <button
            onClick={handleContinueToTemplate}
            disabled={!productName.trim() || submitting}
            className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Submitting...
              </>
            ) : (
              <>
                {selectedTemplate ? "Generate" : "Pick a meme template"}
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </>
            )}
          </button>
        </section>
      )}

      {/* ── Step 2: Pick Meme Template ── */}
      {step === "template" && (
        <section className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold font-headline mb-2">Pick a meme format</h2>
          <p className="text-on-surface-variant text-sm mb-6">
            Choose the meme style for your &ldquo;{productName}&rdquo; ad
          </p>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 mb-8">
            {memeTemplates.map((tmpl) => {
              const isSelected = selectedTemplate === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`group relative flex flex-col rounded-xl text-left transition-all overflow-hidden active:scale-[0.97] ${
                    isSelected
                      ? "ring-2 ring-primary shadow-lg shadow-primary/10"
                      : "bg-surface-container-lowest hover:shadow-lg"
                  }`}
                >
                  <div className="w-full aspect-square overflow-hidden bg-surface-container-low">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/previews/ads/meme-${tmpl.id}.png`}
                      alt={tmpl.name}
                      className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = "none";
                        el.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-surface-container-low"><span class="material-symbols-outlined text-3xl text-on-surface-variant">${tmpl.icon}</span></div>`;
                      }}
                    />
                  </div>
                  <div className="px-3 py-2.5">
                    <h3 className="font-bold text-sm font-headline mb-0.5">{tmpl.name}</h3>
                    <p className="text-[11px] text-on-surface-variant leading-snug">{tmpl.description}</p>
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
              disabled={!selectedTemplate || submitting}
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

export default function MemeAdPage() {
  return <Suspense><MemeAdContent /></Suspense>;
}
