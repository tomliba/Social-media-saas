"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// ── Scene templates ──

interface SceneTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  promptTemplate: string;
}

const sceneTemplates: SceneTemplate[] = [
  // SOCIAL & MODERN
  {
    id: "video-wall",
    name: "Video Wall",
    category: "Social & Modern",
    icon: "\uD83D\uDCFA",
    description: "Content on a massive TV screen in a shop",
    promptTemplate:
      "A massive video wall display in a modern electronics store. Multiple synchronized screens showing the following content as a sleek digital infographic: {content}. Shoppers in the background gazing up at the screens. Cool blue LED ambient lighting. Format: 1:1 square (1080x1080). Photorealistic, cinematic quality.",
  },
  {
    id: "breaking-news",
    name: "Breaking News",
    category: "Social & Modern",
    icon: "\uD83D\uDD34",
    description: "News anchor with your content on the studio screen",
    promptTemplate:
      "A professional TV news studio setting. A charismatic news anchor sits behind a sleek desk. In the background, a large digital screen displays the following content as a 'Breaking News' infographic: {content}. Include a detailed lower-third ticker, a red-and-white chyron, and realistic studio lighting. Format: 1:1 square (1080x1080). Photorealistic, cinematic quality.",
  },
  {
    id: "cyberpunk-flyer",
    name: "Cyberpunk Flyer",
    category: "Social & Modern",
    icon: "\uD83C\uDF06",
    description: "Holographic flyer in a neon-drenched city",
    promptTemplate:
      "A neon-drenched cyberpunk city street at night. Rain-slicked roads reflect pink and cyan neon signs. A holographic floating flyer in the foreground displays the following content: {content}. Glitch effects on edges, scanlines, futuristic Japanese-inspired signage in background. Format: 1:1 square (1080x1080). Photorealistic, cinematic quality.",
  },
  {
    id: "movie-theater",
    name: "Movie Theater",
    category: "Social & Modern",
    icon: "\uD83C\uDFAC",
    description: "Your content on the big screen, audience silhouettes",
    promptTemplate:
      "A dark movie theater interior. The massive cinema screen displays the following content as a dramatic title card: {content}. Silhouettes of audience members in the foreground, warm projector light beam visible, red velvet seats. Format: 1:1 square (1080x1080). Photorealistic, cinematic quality.",
  },

  // OUTDOOR & URBAN
  {
    id: "graffiti-mural",
    name: "Graffiti Mural",
    category: "Outdoor & Urban",
    icon: "\uD83C\uDFA8",
    description: "Street art on a building wall",
    promptTemplate:
      "A large brick building wall in an urban alley. Vibrant street art graffiti mural that incorporates the following content as bold spray-painted text and illustrations: {content}. Dripping paint, stencil effects, wheat-paste elements. A person walking by for scale. Golden hour lighting. Format: 1:1 square (1080x1080). Photorealistic, cinematic quality.",
  },
  {
    id: "highway-billboard",
    name: "Highway Billboard",
    category: "Outdoor & Urban",
    icon: "\uD83C\uDFD7\uFE0F",
    description: "Giant billboard under construction",
    promptTemplate:
      "A massive highway billboard under construction with scaffolding. Workers on the scaffold installing a giant advertisement that reads: {content}. Blue sky with dramatic clouds, highway with cars below, golden hour lighting. Format: 1:1 square (1080x1080). Photorealistic, cinematic quality.",
  },
  {
    id: "bus-wrap",
    name: "Bus Wrap",
    category: "Outdoor & Urban",
    icon: "\uD83D\uDE8C",
    description: "Full wrap ad on a double-decker bus",
    promptTemplate:
      "A red double-decker bus on a busy city street with a full vinyl wrap advertisement displaying: {content}. Pedestrians on the sidewalk, classic urban buildings, slightly overcast sky for even lighting. Format: 1:1 square (1080x1080). Photorealistic, cinematic quality.",
  },

  // HISTORICAL & ARTISTIC
  {
    id: "classic-newspaper",
    name: "Classic Newspaper",
    category: "Historical & Artistic",
    icon: "\uD83D\uDCF0",
    description: "Vintage broadsheet with your content",
    promptTemplate:
      "A vintage broadsheet newspaper on an old wooden desk. The front page headline and article feature the following content: {content}. Yellowed paper, classic serif typography, black ink illustrations, a cup of coffee and reading glasses nearby. Warm morning light. Format: 1:1 square (1080x1080). Photorealistic, cinematic quality.",
  },
  {
    id: "manga-panel",
    name: "Manga Panel",
    category: "Historical & Artistic",
    icon: "\uD83C\uDDEF\uD83C\uDDF5",
    description: "Black and white manga page with characters discussing your content",
    promptTemplate:
      "A black and white manga comic page with dramatic panel layouts. Expressive anime characters with speech bubbles and action lines discussing the following content: {content}. Screen tones, speed lines, dramatic close-ups. Classic shonen manga style. Format: 1:1 square (1080x1080). High contrast black and white illustration.",
  },
  {
    id: "steampunk",
    name: "Steampunk",
    category: "Historical & Artistic",
    icon: "\u2699\uFE0F",
    description: "Victorian-era infographic on parchment and brass",
    promptTemplate:
      "A Victorian steampunk-style infographic on aged parchment paper. Brass gears, copper pipes, and mechanical elements frame the following content: {content}. Elegant copperplate calligraphy, technical diagrams with leather straps and rivets, sepia tones. Format: 1:1 square (1080x1080). Detailed illustration, vintage aesthetic.",
  },
  {
    id: "cave-painting",
    name: "Cave Painting",
    category: "Historical & Artistic",
    icon: "\uD83E\uDEA8",
    description: "Ancient art on a cavern wall",
    promptTemplate:
      "An ancient cave wall with prehistoric cave paintings that depict the following content using primitive stick figures and symbols: {content}. Red and brown ochre pigments, charcoal black outlines on rough limestone, torchlight illumination, scattered handprints. Format: 1:1 square (1080x1080). Photorealistic cave interior.",
  },
  {
    id: "egyptian-hieroglyphs",
    name: "Egyptian Hieroglyphs",
    category: "Historical & Artistic",
    icon: "\uD83C\uDFDB\uFE0F",
    description: "Carved into a temple wall",
    promptTemplate:
      "An ancient Egyptian temple interior wall with elaborately carved and painted hieroglyphs and illustrations conveying: {content}. Gold leaf accents, lapis lazuli blue, traditional Egyptian art style with profile figures, cartouches, and decorative borders. Torch-lit sandstone. Format: 1:1 square (1080x1080). Photorealistic, cinematic quality.",
  },
  {
    id: "vintage-encyclopedia",
    name: "Vintage Encyclopedia",
    category: "Historical & Artistic",
    icon: "\uD83D\uDCD6",
    description: "Beautiful typeset book page",
    promptTemplate:
      "A beautifully typeset encyclopedia page from a leather-bound vintage book. Elegant serif typography, detailed botanical-style illustrations, margin notes, and cross-references presenting: {content}. Cream colored heavy paper, slight foxing, bookmark ribbon. Format: 1:1 square (1080x1080). Photorealistic, warm library lighting.",
  },

  // EDUCATIONAL & WORKSPACE
  {
    id: "nature-trail-sign",
    name: "Nature Trail Sign",
    category: "Educational & Workspace",
    icon: "\uD83C\uDF32",
    description: "Laser-engraved wooden trail marker",
    promptTemplate:
      "A wooden nature trail information sign in a lush forest clearing. Laser-engraved text and illustrations on dark-stained wood displaying: {content}. Pine trees, dappled sunlight, hiking trail in background, metal mounting posts. Format: 1:1 square (1080x1080). Photorealistic, cinematic quality.",
  },
  {
    id: "whiteboard",
    name: "Whiteboard",
    category: "Educational & Workspace",
    icon: "\uD83D\uDCCB",
    description: "Clean whiteboard with colored markers",
    promptTemplate:
      "A clean office whiteboard with colorful marker drawings and handwritten notes presenting: {content}. Blue, red, green, and black dry-erase markers. Neat diagrams, bullet points, underlined headings, small doodles. Bright office lighting, marker tray at bottom. Format: 1:1 square (1080x1080). Photorealistic, clean look.",
  },
  {
    id: "classroom-chalkboard",
    name: "Classroom Chalkboard",
    category: "Educational & Workspace",
    icon: "\uD83C\uDF93",
    description: "Professor at a chalkboard",
    promptTemplate:
      "A university lecture hall with a large green chalkboard. A professor stands to one side, chalk in hand. The chalkboard displays the following content in white and colored chalk: {content}. Chalk dust, wooden border, overhead fluorescent lighting, lecture hall seating visible. Format: 1:1 square (1080x1080). Photorealistic, cinematic quality.",
  },
  {
    id: "top-secret-briefing",
    name: "Top Secret Briefing",
    category: "Educational & Workspace",
    icon: "\uD83D\uDD75\uFE0F",
    description: "Classified government file",
    promptTemplate:
      "A classified government document spread on a dark wooden desk. Manila folder stamped 'TOP SECRET' in red. Typewriter-font text on yellowed paper revealing: {content}. Paper clips, redacted black bars on some words, coffee ring stain, desk lamp spotlight. Format: 1:1 square (1080x1080). Photorealistic, noir aesthetic.",
  },

  // PHYSICAL PRODUCTS
  {
    id: "tshirt-mockup",
    name: "T-Shirt Mockup",
    category: "Physical Products",
    icon: "\uD83D\uDC55",
    description: "Person wearing a shirt with your content",
    promptTemplate:
      "A person wearing a casual t-shirt with a bold graphic print featuring the following content: {content}. Clean streetwear photography style, urban background slightly blurred, natural daylight, the text and graphics on the shirt are crisp and readable. Format: 1:1 square (1080x1080). Photorealistic, fashion photography quality.",
  },
];

const categories = [...new Set(sceneTemplates.map((s) => s.category))];

// ── Tones (reused from ai-carousel) ──

const tones = [
  { label: "Funny", emoji: "\uD83D\uDE04" },
  { label: "Serious", emoji: "\uD83C\uDFAF" },
  { label: "Edgy", emoji: "\uD83D\uDD25" },
  { label: "Motivational", emoji: "\uD83D\uDCAA" },
  { label: "Storytelling", emoji: "\uD83D\uDCD6" },
  { label: "Sarcastic", emoji: "\uD83D\uDE44" },
  { label: "Friendly", emoji: "\u2615" },
];

// ── Types ──

interface GeneratedImage {
  image: string; // base64 data URL
}

type Step = "pick-scene" | "content" | "generating" | "review" | "saving";

function AISceneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedScene = searchParams.get("scene");

  // Step state
  const [step, setStep] = useState<Step>(preselectedScene ? "content" : "pick-scene");
  const [error, setError] = useState<string | null>(null);

  // Scene selection
  const [selectedScene, setSelectedScene] = useState<string | null>(preselectedScene);

  // Content input
  const [contentText, setContentText] = useState("");
  const [tone, setTone] = useState("Friendly");
  const [aiWriteEnabled, setAiWriteEnabled] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiWriting, setAiWriting] = useState(false);

  // Generation state
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [generatingIndex, setGeneratingIndex] = useState(0);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  const scene = sceneTemplates.find((s) => s.id === selectedScene);

  // ── Let AI write content ──
  const handleAiWrite = useCallback(async () => {
    if (!aiTopic.trim()) return;
    setAiWriting(true);
    setError(null);

    try {
      const res = await fetch("/api/ai-scene/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic, tone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate text");
      }
      const data = await res.json();
      setContentText(data.text);
      setAiWriteEnabled(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate text");
    } finally {
      setAiWriting(false);
    }
  }, [aiTopic, tone]);

  // ── Generate 1 variation ──
  const generateOne = useCallback(async (existingResults: GeneratedImage[] = []) => {
    if (!scene || !contentText.trim()) return existingResults;
    const prompt = scene.promptTemplate.replace("{content}", contentText.trim());
    const i = existingResults.length;

    try {
      const res = await fetch("/api/ai-carousel/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: i === 0 ? prompt : prompt + ` Variation ${i + 1} — vary composition, angle, or color palette slightly.`,
          slide_number: i + 1,
          slide_type: "ai_scene",
          title: scene.name,
          topic: contentText.trim().slice(0, 120),
          tone,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Generation failed");
      }
      const data = await res.json();
      const image = data.image?.startsWith("data:")
        ? data.image
        : `data:image/png;base64,${data.image}`;
      const updated = [...existingResults, { image }];
      setGeneratedImages(updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      const updated = [...existingResults, { image: "" }];
      setGeneratedImages(updated);
      return updated;
    }
  }, [scene, contentText, tone]);

  const handleGenerate = useCallback(async () => {
    if (!scene || !contentText.trim()) return;
    setStep("generating");
    setError(null);
    setGeneratedImages([]);
    setGeneratingIndex(0);
    await generateOne([]);
    setStep("review");
  }, [scene, contentText, generateOne]);

  const [generatingMore, setGeneratingMore] = useState(false);
  const handleGenerateMore = useCallback(async () => {
    if (generatedImages.length >= 3) return;
    setGeneratingMore(true);
    setError(null);
    await generateOne(generatedImages);
    setGeneratingMore(false);
  }, [generatedImages, generateOne]);

  // ── Regenerate single ──
  const handleRegenerate = useCallback(async (index: number) => {
    if (!scene) return;
    setRegeneratingIndex(index);
    setError(null);

    const prompt = scene.promptTemplate.replace("{content}", contentText.trim());

    try {
      const res = await fetch("/api/ai-carousel/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt + ` Fresh variation — unique composition, different angle and color palette.`,
          slide_number: index + 1,
          slide_type: "ai_scene",
          title: scene.name,
          topic: contentText.trim().slice(0, 120),
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
      setGeneratedImages((prev) => {
        const next = [...prev];
        next[index] = { image };
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegeneratingIndex(null);
    }
  }, [scene, contentText, tone]);

  // ── Save to library ──
  const handleSave = useCallback(async () => {
    setStep("saving");
    try {
      const validImages = generatedImages.filter((g) => g.image);
      for (let i = 0; i < validImages.length; i++) {
        const img = validImages[i];

        // Upload base64 image to get a real URL
        const uploadRes = await fetch("/api/upload-generated", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: img.image,
            filename: `ais-${scene?.id || "scene"}-${Date.now()}`,
          }),
        });
        if (!uploadRes.ok) throw new Error("Image upload failed");
        const { url } = await uploadRes.json();

        // Save to library with the uploaded URL
        await fetch("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: `ais-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: `${scene?.name ?? "AI Scene"}: ${contentText.trim().slice(0, 60)}`,
            format: "image",
            status: "ready",
            videoUrl: url,
            thumbnailUrl: url,
          }),
        });
      }

      router.push("/library");
    } catch (err) {
      console.error("Failed to save:", err);
      setError("Failed to save. Please try again");
      setStep("review");
    }
  }, [generatedImages, scene, contentText, router]);

  const validCount = generatedImages.filter((g) => g.image).length;

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
            AI Scene
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Your content placed into stunning visual scenes
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

      {/* ── Step 1: Pick Scene ── */}
      {step === "pick-scene" && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {categories.map((cat) => (
            <div key={cat} className="mb-10">
              <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4">
                {cat}
              </h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
                {sceneTemplates
                  .filter((s) => s.category === cat)
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedScene(s.id);
                        setStep("content");
                      }}
                      className={`group relative rounded-xl text-left transition-all overflow-hidden active:scale-[0.97] ${
                        selectedScene === s.id
                          ? "ring-2 ring-primary shadow-lg shadow-primary/10"
                          : "bg-surface-container-lowest hover:shadow-lg"
                      }`}
                    >
                      <div className="w-full aspect-square overflow-hidden bg-surface-container-low">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/previews/scenes/${s.id}.png`}
                          alt={s.name}
                          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-4xl">${s.icon}</div>`;
                          }}
                        />
                      </div>
                      <div className="px-3 py-2.5">
                        <h4 className="font-headline font-bold text-on-surface text-sm mb-0.5">
                          {s.icon} {s.name}
                        </h4>
                        <p className="text-[11px] text-on-surface-variant leading-snug">
                          {s.description}
                        </p>
                      </div>
                      {selectedScene === s.id && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                          <span className="material-symbols-outlined text-[16px] text-white font-bold">check</span>
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Step 2: Content Input ── */}
      {step === "content" && scene && (
        <section className="max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Selected scene badge */}
          <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20">
            <span className="text-2xl">{scene.icon}</span>
            <div>
              <h4 className="font-headline font-bold text-on-surface">{scene.name}</h4>
              <p className="text-xs text-on-surface-variant">{scene.description}</p>
            </div>
            <button
              onClick={() => setStep("pick-scene")}
              className="ml-auto text-primary text-sm font-semibold hover:opacity-80"
            >
              Change
            </button>
          </div>

          {/* AI Write toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setAiWriteEnabled(!aiWriteEnabled)}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  aiWriteEnabled ? "bg-primary" : "bg-surface-container-highest"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                    aiWriteEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
              <span className="text-sm font-bold text-on-surface">Let AI write the content</span>
            </label>
          </div>

          {/* AI topic input */}
          {aiWriteEnabled && (
            <div className="mb-6 p-4 rounded-xl bg-primary-container/5 border border-primary/10">
              <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
                Topic
              </label>
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="e.g., 5 benefits of cold showers"
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body mb-3"
              />
              <button
                onClick={handleAiWrite}
                disabled={!aiTopic.trim() || aiWriting}
                className="px-6 py-2.5 primary-gradient text-on-primary rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {aiWriting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    Writing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    Generate text
                  </>
                )}
              </button>
            </div>
          )}

          {/* Content textarea */}
          <div className="mb-6">
            <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
              Content
            </label>
            <textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              rows={6}
              placeholder="Type or paste the text/info you want displayed in the scene..."
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body resize-none"
            />
          </div>

          {/* Tone */}
          <div className="mb-8">
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

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={!contentText.trim()}
              className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              Generate
            </button>
            <button
              onClick={() => setStep("pick-scene")}
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
          <h2 className="text-2xl font-bold font-headline mb-2">Generating your scene</h2>
          <p className="text-on-surface-variant text-sm mb-6">
            Rendering your AI scene...
          </p>

          {/* Progress bar */}
          <div className="w-full h-2 bg-surface-container-high rounded-full mb-8 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 animate-pulse"
              style={{ width: "80%" }}
            />
          </div>

          <div className="max-w-sm mx-auto">
            <div className="rounded-xl overflow-hidden bg-surface-container-low">
              <div className="w-full aspect-square flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                <span className="text-xs text-on-surface-variant font-medium">Generating...</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Step 4: Review ── */}
      {step === "review" && (
        <section className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold font-headline">Your AI Scenes</h2>
              <p className="text-on-surface-variant text-sm mt-1">
                {validCount} variation{validCount !== 1 ? "s" : ""} generated. Click any to regenerate.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {generatedImages.length < 3 && (
                <button
                  onClick={handleGenerateMore}
                  disabled={generatingMore}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-all disabled:opacity-50"
                >
                  {generatingMore ? (
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">add</span>
                  )}
                  Generate another variation
                </button>
              )}
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1.5 text-primary text-sm font-semibold hover:opacity-80 transition-opacity"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Regenerate All
              </button>
            </div>
          </div>

          <div className={`grid gap-5 mb-8 ${generatedImages.length === 1 ? "grid-cols-1 max-w-sm" : generatedImages.length === 2 ? "grid-cols-2 max-w-2xl" : "grid-cols-3"}`}>
            {generatedImages.map((img, i) => {
              const isRegen = regeneratingIndex === i;
              return (
                <div key={i} className="group relative rounded-xl overflow-hidden bg-surface-container-lowest shadow-sm hover:shadow-lg transition-all">
                  {img.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.image} alt={`Variation ${i + 1}`} className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center bg-surface-container-low text-on-surface-variant text-sm">
                      Failed
                    </div>
                  )}

                  {/* Regenerate overlay */}
                  <button
                    onClick={() => handleRegenerate(i)}
                    disabled={isRegen}
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    {isRegen ? (
                      <span className="material-symbols-outlined animate-spin text-white text-3xl">progress_activity</span>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="material-symbols-outlined text-white text-3xl">refresh</span>
                        <span className="text-white text-xs font-bold">Regenerate</span>
                      </div>
                    )}
                  </button>

                  <div className="p-3">
                    <p className="text-xs font-bold text-on-surface">Variation {i + 1}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md px-6 py-6 md:px-12 flex justify-center items-center z-40">
            <div className="max-w-6xl w-full flex justify-between items-center">
              <button
                onClick={() => setStep("content")}
                className="px-6 py-3 rounded-full font-bold font-headline text-on-surface-variant hover:text-on-surface transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back to content
              </button>
              <button
                onClick={handleSave}
                disabled={validCount === 0}
                className="px-10 py-4 primary-gradient text-white rounded-full font-bold font-headline shadow-[0px_10px_30px_rgba(111,51,213,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                Save to library ({validCount} image{validCount !== 1 ? "s" : ""})
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

export default function AIScenePage() {
  return <Suspense><AISceneContent /></Suspense>;
}
