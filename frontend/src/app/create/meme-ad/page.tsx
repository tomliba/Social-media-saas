"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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

interface LabelVariation {
  panel1: string;
  panel2: string;
  panel3?: string;
  panel4?: string;
}

interface GeneratedMeme {
  variationIndex: number;
  labels: LabelVariation;
  image: string; // base64 data URL
}

type Step = "input" | "template" | "generating" | "review" | "saving";

export default function MemeAdPage() {
  const router = useRouter();

  // Input state
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [painPoint, setPainPoint] = useState("");
  const [audience, setAudience] = useState("");

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Flow state
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);

  // Generation state
  const [generatedMemes, setGeneratedMemes] = useState<GeneratedMeme[]>([]);
  const [generatingIndex, setGeneratingIndex] = useState(0);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [labelVariations, setLabelVariations] = useState<LabelVariation[]>([]);

  // ── Build image prompt from template + labels ──
  const buildImagePrompt = useCallback((templateId: string, labels: LabelVariation) => {
    const tmpl = memeTemplates.find((t) => t.id === templateId);
    if (!tmpl) return "";

    const panelLines: string[] = [];
    if (labels.panel1) panelLines.push(`Panel 1: Text: '${labels.panel1}'`);
    if (labels.panel2) panelLines.push(`Panel 2: Text: '${labels.panel2}'`);
    if (labels.panel3) panelLines.push(`Panel 3: Text: '${labels.panel3}'`);
    if (labels.panel4) panelLines.push(`Panel 4: Text: '${labels.panel4}'`);

    return `Illustrated cartoon meme in the "${tmpl.name}" format. ${tmpl.panelLayout}\n\n${panelLines.join("\n")}\n\nThe meme is an ad for "${productName}" — ${description || productName}.\nPain point: ${painPoint || "general frustration"}. Target: ${audience || "general"}.\n\n${MEME_STYLE}`;
  }, [productName, description, painPoint, audience]);

  // ── Step 1 → 2 ──
  const handleContinueToTemplate = () => {
    if (!productName.trim()) return;
    setStep("template");
  };

  // ── Step 3: Generate labels then images ──
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate) return;
    setStep("generating");
    setError(null);
    setGeneratedMemes([]);
    setGeneratingIndex(0);
    setLabelVariations([]);

    // First: get 3 label variations from Gemini
    let variations: LabelVariation[];
    try {
      const labelsRes = await fetch("/api/meme-ad/generate-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          description,
          painPoint,
          audience,
          memeTemplate: selectedTemplate,
        }),
      });
      if (!labelsRes.ok) {
        const data = await labelsRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate labels");
      }
      const labelsData = await labelsRes.json();
      variations = labelsData.variations;
      if (!variations || variations.length === 0) {
        throw new Error("No label variations returned");
      }
      setLabelVariations(variations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate labels");
      setStep("template");
      return;
    }

    // Then: generate images for each variation
    const results: GeneratedMeme[] = [];

    for (let i = 0; i < Math.min(variations.length, 3); i++) {
      setGeneratingIndex(i);
      const prompt = buildImagePrompt(selectedTemplate, variations[i]);
      try {
        const res = await fetch("/api/ai-carousel/generate-slide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Meme ${i + 1} failed`);
        }
        const data = await res.json();
        const image = data.image?.startsWith("data:")
          ? data.image
          : `data:image/png;base64,${data.image}`;
        results.push({ variationIndex: i, labels: variations[i], image });
        setGeneratedMemes([...results]);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Meme ${i + 1} failed`);
        results.push({ variationIndex: i, labels: variations[i], image: "" });
        setGeneratedMemes([...results]);
      }
    }

    setStep("review");
  }, [selectedTemplate, productName, description, painPoint, audience, buildImagePrompt]);

  // ── Regenerate one meme ──
  const handleRegenerateMeme = useCallback(async (index: number) => {
    setRegeneratingIndex(index);
    setError(null);

    const labels = labelVariations[index];
    if (!labels || !selectedTemplate) {
      setRegeneratingIndex(null);
      return;
    }

    const prompt = buildImagePrompt(selectedTemplate, labels);
    try {
      const res = await fetch("/api/ai-carousel/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Regeneration failed");
      }
      const data = await res.json();
      const image = data.image?.startsWith("data:")
        ? data.image
        : `data:image/png;base64,${data.image}`;
      setGeneratedMemes((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], image };
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegeneratingIndex(null);
    }
  }, [labelVariations, selectedTemplate, buildImagePrompt]);

  // ── Step 5: Save ──
  const handleSave = useCallback(async () => {
    setStep("saving");
    try {
      const tmpl = memeTemplates.find((t) => t.id === selectedTemplate);
      const images = generatedMemes.filter((m) => m.image).map((m) => m.image);
      const title = `${productName} — ${tmpl?.name || "Meme"} Ad`;
      const results = [{ title, images, caption: "" }];

      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: `meme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          format: "carousel",
          status: "ready",
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      sessionStorage.setItem("pending-carousel-results", JSON.stringify(results));
      sessionStorage.setItem("pending-format", "carousel");
      router.push("/library");
    } catch (err) {
      console.error("Failed to save memes:", err);
      setError("Failed to save — please try again");
      setStep("review");
    }
  }, [productName, selectedTemplate, generatedMemes, router]);

  const validMemeCount = generatedMemes.filter((m) => m.image).length;

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
            AI-generated meme ads — Drake, Expanding Brain, UNO Draw 25, and more
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
            disabled={!productName.trim()}
            className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Pick a meme template
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
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
              disabled={!selectedTemplate}
              className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              Generate 3 meme ads
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
          <h2 className="text-2xl font-bold font-headline mb-2">Creating your meme ads</h2>
          <p className="text-on-surface-variant text-sm mb-6">
            {labelVariations.length === 0
              ? "Generating meme labels..."
              : `Rendering meme ${generatingIndex + 1} of 3...`}
          </p>

          {/* Progress bar */}
          <div className="w-full h-2 bg-surface-container-high rounded-full mb-8 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: labelVariations.length === 0 ? "10%" : `${((generatingIndex + 1) / 3) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {generatedMemes.map((meme, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-surface-container-low">
                {meme.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={meme.image} alt={`Meme ${i + 1}`} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center text-on-surface-variant text-sm">
                    Failed
                  </div>
                )}
                <div className="p-3">
                  <p className="text-xs font-bold text-on-surface">Variation {i + 1}</p>
                </div>
              </div>
            ))}
            {/* Placeholder */}
            {generatedMemes.length < 3 && (
              <div className="rounded-xl overflow-hidden bg-surface-container-low">
                <div className="w-full aspect-square flex flex-col items-center justify-center gap-3">
                  <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                  <span className="text-xs text-on-surface-variant font-medium">
                    {labelVariations.length === 0 ? "Writing labels..." : "Generating..."}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-on-surface">Variation {generatedMemes.length + 1}</p>
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
              <h2 className="text-2xl font-bold font-headline">Your meme ads</h2>
              <p className="text-on-surface-variant text-sm mt-1">
                {validMemeCount} meme{validMemeCount !== 1 ? "s" : ""} generated. Click any to regenerate.
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
            {generatedMemes.map((meme, i) => {
              const isRegenerating = regeneratingIndex === i;
              return (
                <div key={i} className="group relative rounded-xl overflow-hidden bg-surface-container-lowest shadow-sm hover:shadow-lg transition-all">
                  {meme.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={meme.image} alt={`Meme ${i + 1}`} className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center bg-surface-container-low text-on-surface-variant text-sm">
                      Failed
                    </div>
                  )}

                  {/* Regenerate overlay */}
                  <button
                    onClick={() => handleRegenerateMeme(i)}
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
                    <p className="text-sm font-bold text-on-surface">Variation {i + 1}</p>
                    {meme.labels && (
                      <p className="text-xs text-on-surface-variant mt-1 truncate">
                        {meme.labels.panel1} / {meme.labels.panel2}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md px-6 py-6 md:px-12 flex justify-center items-center z-40">
            <div className="max-w-6xl w-full flex justify-between items-center">
              <button
                onClick={() => setStep("template")}
                className="px-6 py-3 rounded-full font-bold font-headline text-on-surface-variant hover:text-on-surface transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Change template
              </button>
              <button
                onClick={handleSave}
                disabled={validMemeCount === 0}
                className="px-10 py-4 primary-gradient text-white rounded-full font-bold font-headline shadow-[0px_10px_30px_rgba(111,51,213,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                Save to library ({validMemeCount} meme{validMemeCount !== 1 ? "s" : ""})
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
