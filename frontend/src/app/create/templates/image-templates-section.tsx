"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { imagePostTemplates, carouselThemes } from "@/lib/carousel-templates";
import mammoth from "mammoth";

interface ImagePostIdea {
  title: string;
  hook: string;
  tag: string;
}

type TextSource = "ai_ideas" | "custom_text" | "from_link" | "from_file" | "custom_prompt";

const textSourceOptions: { id: TextSource; icon: string; label: string; desc: string; badge?: string }[] = [
  { id: "ai_ideas",      icon: "auto_awesome", label: "AI writes it",           desc: "Get 10 ideas, pick your favorite" },
  { id: "custom_text",   icon: "edit",         label: "I'll write it",          desc: "Paste or type your own text" },
  { id: "from_link",     icon: "link",         label: "From a link",            desc: "Paste YouTube, TikTok, or article URL" },
  { id: "from_file",     icon: "upload_file",  label: "From a file",            desc: "Upload PDF, document, or article" },
  { id: "custom_prompt", icon: "tune",         label: "Describe what you want", desc: "Tell AI what to write in your own words", badge: "Power user" },
];

const defaultShowcaseTheme: Record<string, string> = {
  centered: "dark",
  quote: "midnight_purple",
  stats: "neon",
  polaroid: "warm",
  tweet: "light",
  hot_take: "ocean",
  definition: "mocha",
  whatsapp: "forest",
  listicle: "sunset_coral",
  checklist: "electric_blue",
  tip_of_day: "blush_pink",
  this_vs_that: "monochrome",
  myth_vs_fact: "neon",
  did_you_know: "warm",
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
  const [step, setStep] = useState<"layout" | "theme" | "source" | "ideas">("layout");
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>("dark");
  const [topic, setTopic] = useState("");
  const [ideas, setIdeas] = useState<ImagePostIdea[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textSource, setTextSource] = useState<TextSource>("ai_ideas");
  const [sourceInput, setSourceInput] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showName, setShowName] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [extracting, setExtracting] = useState(false);

  const themeSectionRef = useRef<HTMLDivElement>(null);
  const sourceSectionRef = useRef<HTMLDivElement>(null);
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
    setStep("source");
    scrollTo(sourceSectionRef);
  };

  const handleSourceAction = async () => {
    if (textSource === "ai_ideas" || textSource === "from_link" || textSource === "custom_prompt") {
      fetchIdeas();
      return;
    }

    if (textSource === "custom_text") {
      // Skip ideas — go straight to editor with user's text
      sessionStorage.setItem("custom_text_input", sourceInput);
      const params = buildEditorParams();
      params.set("textSource", "custom_text");
      router.push(`/create/editor?${params.toString()}`);
      return;
    }

    if (textSource === "from_file" && sourceFile) {
      // Extract text client-side, then generate ideas
      setExtracting(true);
      setError(null);
      try {
        const text = await extractTextFromFile(sourceFile);
        if (!text.trim()) {
          setError("Could not extract any text from this file");
          return;
        }
        // Set the extracted text as sourceInput and call fetchIdeas
        setSourceInput(text);
        // fetchIdeas reads sourceInput from state, but setState is async.
        // Call the API directly here with the extracted text.
        await fetchIdeasWithText(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to read file");
      } finally {
        setExtracting(false);
      }
    }
  };

  const isSourceActionEnabled = (): boolean => {
    switch (textSource) {
      case "ai_ideas": return topic.trim().length > 0;
      case "custom_text": return sourceInput.trim().length > 0;
      case "from_link": return sourceInput.trim().length > 0;
      case "from_file": return sourceFile !== null;
      case "custom_prompt": return sourceInput.trim().length > 0;
    }
  };

  const sourceActionLabel = (): string => {
    switch (textSource) {
      case "ai_ideas": return "Generate 10 ideas";
      case "custom_text": return "Preview post";
      case "from_link": return "Analyze & generate ideas";
      case "from_file": return "Read & generate ideas";
      case "custom_prompt": return "Generate from prompt";
    }
  };

  const fetchIdeas = useCallback(async () => {
    // For ai_ideas, topic is required; for from_link/custom_prompt, sourceInput is required
    if (textSource === "ai_ideas" && !topic.trim()) return;
    if ((textSource === "from_link" || textSource === "custom_prompt") && !sourceInput.trim()) return;

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
          topic: textSource === "ai_ideas" ? topic : undefined,
          niche,
          templateName: imagePostTemplates.find((t) => t.id === selectedLayout)?.name || "Centered",
          tone,
          textSource,
          sourceInput: textSource !== "ai_ideas" ? sourceInput : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `API returned ${res.status}`);
      if (data.ideas?.length > 0) {
        setIdeas(data.ideas);
        scrollTo(ideasSectionRef);
      } else {
        setError("No ideas returned. Try a different input");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate ideas");
    } finally {
      setLoading(false);
    }
  }, [topic, niche, selectedLayout, tone, textSource, sourceInput]);

  // Fetch ideas with explicit text (used by from_file where setState is async)
  const fetchIdeasWithText = async (text: string) => {
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
          niche,
          templateName: imagePostTemplates.find((t) => t.id === selectedLayout)?.name || "Centered",
          tone,
          textSource: "from_file",
          sourceInput: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `API returned ${res.status}`);
      if (data.ideas?.length > 0) {
        setIdeas(data.ideas);
        scrollTo(ideasSectionRef);
      } else {
        setError("No ideas returned. Try a different file");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate ideas");
    } finally {
      setLoading(false);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const name = file.name.toLowerCase();

    if (name.endsWith(".txt") || name.endsWith(".md")) {
      return await file.text();
    }

    if (name.endsWith(".docx")) {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      return result.value;
    }

    if (name.endsWith(".pdf")) {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pages.push(content.items.map((item: any) => item.str).join(" "));
      }
      return pages.join("\n\n");
    }

    throw new Error("Unsupported file type. Use PDF, DOCX, or TXT.");
  };

  const toggleIdea = (index: number) => {
    setSelectedIdeas((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else if (next.size < 5) next.add(index);
      return next;
    });
  };

  const buildEditorParams = (): URLSearchParams => {
    const params = new URLSearchParams();
    params.set("format", "image");
    params.set("templateId", selectedLayout!);
    params.set("themeId", selectedTheme);
    params.set("tone", tone);
    params.set("niche", niche);
    if (photoUrl) params.set("photoUrl", photoUrl);
    if (showName && authorName.trim()) params.set("authorName", authorName.trim());
    return params;
  };

  const handleContinue = () => {
    const selected = Array.from(selectedIdeas).map((i) => ideas[i]);
    const params = buildEditorParams();
    params.set("ideas", JSON.stringify(selected));
    router.push(`/create/editor?${params.toString()}`);
  };

  const selectedTemplate = imagePostTemplates.find((t) => t.id === selectedLayout);
  const templateSupportsPhoto = selectedTemplate?.supportsPhoto === true;
  const templateHasAuthor = selectedTemplate?.placeholders.some(
    (p) => p === "author" || p === "handle" || p === "displayName"
  ) ?? false;

  const handlePhotoSelect = async (file: File) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoError(null);
    setPhotoUploading(true);

    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/upload-photo", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      setPhotoUrl(data.photoUrl);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPhotoUploading(false);
    }
  };
  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoUrl(null);
    setPhotoError(null);
  };

  return (
    <>
      {/* Step 1: Design Gallery */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold font-headline mb-2">Choose a design</h2>
        <p className="text-on-surface-variant text-sm mb-6">Pick the visual style for your image post</p>

        {/* ── AD CREATIVES ── */}
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/50 mb-3">Ad Creatives</p>

        {/* Cartoon Ads */}
        <p className="text-sm font-semibold text-on-surface-variant mb-2 mt-1">Cartoon Ads</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {[
            { id: "two_doors", name: "Two Doors", description: "Person choosing between old way and your product" },
            { id: "solo_vs_army", name: "Solo vs Army", description: "One person alone vs commanding an army of helpers" },
            { id: "race_track", name: "Race Track", description: "Falling behind while others speed ahead" },
            { id: "before_after_split", name: "Before / After Split", description: "Diagonal split: gray and stressed vs colorful and winning" },
            { id: "comic_panels", name: "Comic Panels", description: "3-panel comic strip: struggle, discovery, transformation" },
            { id: "control_room", name: "Control Room", description: "Person confidently monitoring automated dashboards" },
          ].map((ad) => (
            <button
              key={ad.id}
              onClick={() => router.push(`/create/ad-creative?concept=${ad.id}`)}
              className="group flex flex-col rounded-xl bg-surface-container-lowest hover:shadow-lg transition-all active:scale-[0.97] overflow-hidden"
            >
              <div className="w-full aspect-square overflow-hidden bg-surface-container-low">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/previews/ads/cartoon-${ad.id}.png`}
                  alt={ad.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div className="px-3 py-2.5">
                <h3 className="font-bold text-sm font-headline">{ad.name}</h3>
                <p className="text-xs text-on-surface-variant leading-snug">{ad.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Meme Ads */}
        <p className="text-sm font-semibold text-on-surface-variant mb-2">Meme Ads</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {[
            { id: "drake", name: "Drake", description: "Reject old way, approve your product" },
            { id: "expanding_brain", name: "Expanding Brain", description: "Escalating levels, your product = evolved choice" },
            { id: "uno_draw_25", name: "UNO Draw 25", description: "Rather suffer than try the obvious solution" },
            { id: "distracted_boyfriend", name: "Distracted Boyfriend", description: "Attention pulled from status quo to your product" },
            { id: "this_is_fine", name: "This Is Fine", description: "Sitting in chaos pretending everything's okay" },
            { id: "grus_plan", name: "Gru's Plan", description: "4 panels: plan, plan, realize the flaw, same flaw" },
            { id: "tuxedo_pooh", name: "Tuxedo Pooh", description: "Fancy vs simple framing of the same thing" },
            { id: "running_away_balloon", name: "Running Away Balloon", description: "Letting go of the old thing, chasing the new" },
            { id: "virgin_vs_chad", name: "Virgin vs Chad", description: "Weak old approach vs strong new approach" },
            { id: "wojak", name: "Wojak", description: "Relatable 'me thinking about [problem]' format" },
          ].map((meme) => (
            <button
              key={meme.id}
              onClick={() => router.push(`/create/meme-ad?template=${meme.id}`)}
              className="group flex flex-col rounded-xl bg-surface-container-lowest hover:shadow-lg transition-all active:scale-[0.97] overflow-hidden"
            >
              <div className="w-full aspect-square overflow-hidden bg-surface-container-low">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/previews/ads/meme-${meme.id}.png`}
                  alt={meme.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div className="px-3 py-2.5">
                <h3 className="font-bold text-sm font-headline">{meme.name}</h3>
                <p className="text-xs text-on-surface-variant leading-snug">{meme.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* E-Commerce Ads */}
        <p className="text-sm font-semibold text-on-surface-variant mb-2">E-Commerce Ads</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
          {[
            { id: "product_world", name: "Product World", description: "Product in bold monochromatic color environment" },
            { id: "visual_metaphor", name: "Visual Metaphor", description: "Product reimagined as something unexpected" },
            { id: "before_after", name: "Before / After Split", description: "Dramatic transformation diagonal split" },
            { id: "lifestyle", name: "Lifestyle Scene", description: "Product in aspirational real-world context" },
            { id: "social_proof", name: "Social Proof", description: "Big number or testimonial visual" },
            { id: "curiosity_hook", name: "Curiosity Hook", description: "Intriguing image that demands a click" },
          ].map((style) => (
            <button
              key={style.id}
              onClick={() => router.push(`/create/ecommerce-ad?style=${style.id}`)}
              className="group flex flex-col rounded-xl bg-surface-container-lowest hover:shadow-lg transition-all active:scale-[0.97] overflow-hidden"
            >
              <div className="w-full aspect-square overflow-hidden bg-surface-container-low">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/previews/ads/ecom-${style.id}.png`}
                  alt={style.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div className="px-3 py-2.5">
                <h3 className="font-bold text-sm font-headline">{style.name}</h3>
                <p className="text-xs text-on-surface-variant leading-snug">{style.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ── AI SCENES ── */}
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/50 mb-3">AI Scenes</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
          {[
            { id: "video-wall", name: "Video Wall", description: "Content on a massive TV screen in a shop" },
            { id: "breaking-news", name: "Breaking News", description: "News anchor with your content on the studio screen" },
            { id: "cyberpunk-flyer", name: "Cyberpunk Flyer", description: "Holographic flyer in a neon-drenched city" },
            { id: "movie-theater", name: "Movie Theater", description: "Your content on the big screen, audience silhouettes" },
            { id: "graffiti-mural", name: "Graffiti Mural", description: "Street art on a building wall" },
            { id: "highway-billboard", name: "Highway Billboard", description: "Giant billboard under construction" },
            { id: "bus-wrap", name: "Bus Wrap", description: "Full wrap ad on a double-decker bus" },
            { id: "classic-newspaper", name: "Classic Newspaper", description: "Vintage broadsheet with your content" },
            { id: "manga-panel", name: "Manga Panel", description: "Black and white manga page with characters" },
            { id: "steampunk", name: "Steampunk", description: "Victorian-era infographic on parchment and brass" },
            { id: "cave-painting", name: "Cave Painting", description: "Ancient art on a cavern wall" },
            { id: "egyptian-hieroglyphs", name: "Egyptian Hieroglyphs", description: "Carved into a temple wall" },
            { id: "vintage-encyclopedia", name: "Vintage Encyclopedia", description: "Beautiful typeset book page" },
            { id: "nature-trail-sign", name: "Nature Trail Sign", description: "Laser-engraved wooden trail marker" },
            { id: "whiteboard", name: "Whiteboard", description: "Clean whiteboard with colored markers" },
            { id: "classroom-chalkboard", name: "Classroom Chalkboard", description: "Professor at a chalkboard" },
            { id: "top-secret-briefing", name: "Top Secret Briefing", description: "Classified government file" },
            { id: "tshirt-mockup", name: "T-Shirt Mockup", description: "Person wearing a shirt with your content" },
          ].map((scene) => (
            <button
              key={scene.id}
              onClick={() => router.push(`/create/ai-scene?scene=${scene.id}`)}
              className="group flex flex-col rounded-xl bg-surface-container-lowest hover:shadow-lg transition-all active:scale-[0.97] overflow-hidden"
            >
              <div className="w-full aspect-square overflow-hidden bg-surface-container-low">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/previews/scenes/${scene.id}.png`}
                  alt={scene.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div className="px-3 py-2.5">
                <h3 className="font-bold text-sm font-headline">{scene.name}</h3>
                <p className="text-xs text-on-surface-variant leading-snug">{scene.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ── TEMPLATES ── */}
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/50 mb-3">Templates</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {imagePostTemplates.map((t) => {
            const isSelected = selectedLayout === t.id;
            const previewTheme = isSelected ? selectedTheme : (defaultShowcaseTheme[t.id] || "dark");
            const previewSrc = `/carousel-previews/${t.id}-${previewTheme}.png`;
            return (
              <button
                key={t.id}
                onClick={() => handleLayoutSelect(t.id)}
                className={`group relative flex flex-col rounded-xl transition-all active:scale-[0.97] overflow-hidden ${
                  isSelected
                    ? "ring-2 ring-primary shadow-[0px_12px_30px_rgba(111,51,213,0.15)] bg-surface-container-lowest"
                    : "bg-surface-container-lowest hover:shadow-lg"
                }`}
              >
                <div className="w-full aspect-[4/5] overflow-hidden bg-surface-container-low">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSrc}
                    alt={`${t.name} preview`}
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      isSelected ? "" : "group-hover:scale-105"
                    }`}
                  />
                </div>
                <div className="px-3 py-2.5">
                  <h3 className="font-bold text-sm font-headline">{t.name}</h3>
                  <p className="text-xs text-on-surface-variant leading-snug">{t.description}</p>
                </div>
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
      {(step === "theme" || step === "source" || step === "ideas") && (
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

      {/* Step 3: Text Source Selection */}
      {(step === "source" || step === "ideas") && (
        <section ref={sourceSectionRef} className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold font-headline mb-2">Where&apos;s the text coming from?</h2>
          <p className="text-on-surface-variant text-sm mb-6">Choose how you want to create the text for your post</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {textSourceOptions.map((opt) => {
              const isSelected = textSource === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => { setTextSource(opt.id); setSourceInput(""); setSourceFile(null); }}
                  className={`relative flex items-start gap-3 p-4 rounded-xl text-left transition-all ${
                    isSelected
                      ? "ring-2 ring-primary bg-surface-container-lowest shadow-lg"
                      : "bg-surface-container-lowest hover:shadow-md"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-xl mt-0.5 ${isSelected ? "text-primary" : "text-on-surface-variant"}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {opt.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm font-headline">{opt.label}</span>
                      {opt.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">{opt.desc}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-[13px] text-white font-bold">check</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Inline input area — changes based on selected source */}
          <div className="max-w-xl">
            {textSource === "ai_ideas" && (
              <div className="animate-in fade-in duration-300">
                <label className="block text-sm font-semibold font-headline mb-2">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && isSourceActionEnabled()) handleSourceAction(); }}
                  placeholder="e.g., motivational quotes, startup metrics, productivity tips"
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body"
                />
              </div>
            )}

            {textSource === "custom_text" && (
              <div className="animate-in fade-in duration-300">
                <label className="block text-sm font-semibold font-headline mb-2">Your text</label>
                <textarea
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  placeholder="Type or paste the text you want on your image post..."
                  rows={4}
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body resize-none"
                />
              </div>
            )}

            {textSource === "from_link" && (
              <div className="animate-in fade-in duration-300">
                <label className="block text-sm font-semibold font-headline mb-2">URL</label>
                <input
                  type="url"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && isSourceActionEnabled()) handleSourceAction(); }}
                  placeholder="https://youtube.com/watch?v=... or any article URL"
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body"
                />
              </div>
            )}

            {textSource === "from_file" && (
              <div className="animate-in fade-in duration-300">
                <label className="block text-sm font-semibold font-headline mb-2">Upload file</label>
                {!sourceFile ? (
                  <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-outline-variant/30 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
                    <span className="material-symbols-outlined text-2xl text-on-surface-variant">upload_file</span>
                    <span className="text-sm text-on-surface-variant">Click to upload PDF, DOCX, or TXT</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={(e) => setSourceFile(e.target.files?.[0] || null)}
                    />
                  </label>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant/20 rounded-xl">
                    <span className="material-symbols-outlined text-primary">description</span>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-semibold truncate">{sourceFile.name}</p>
                      <p className="text-xs text-on-surface-variant">{(sourceFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={() => setSourceFile(null)}
                      className="text-xs text-primary font-semibold hover:opacity-80"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            )}

            {textSource === "custom_prompt" && (
              <div className="animate-in fade-in duration-300">
                <label className="block text-sm font-semibold font-headline mb-2">Your prompt</label>
                <textarea
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  placeholder="Describe what you want the post to say, the angle, the audience..."
                  rows={4}
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body resize-none"
                />
              </div>
            )}

            {/* Photo upload + name toggle — only for templates that support it */}
            {(templateSupportsPhoto || templateHasAuthor) && (
              <div className="mt-6 pt-6 border-t border-outline-variant/15">
                {templateSupportsPhoto && (
                  <div className="mb-5">
                    <label className="block text-sm font-semibold font-headline mb-2">Your photo <span className="font-normal text-on-surface-variant">(optional)</span></label>
                    {!photoFile ? (
                      <label className="flex items-center gap-4 p-5 border-2 border-dashed border-outline-variant/30 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
                        <span className="material-symbols-outlined text-2xl text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
                        <div>
                          <p className="text-sm font-semibold">Upload your photo</p>
                          <p className="text-xs text-on-surface-variant">Shows next to your name in this template</p>
                        </div>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handlePhotoSelect(f);
                          }}
                        />
                      </label>
                    ) : (
                      <div>
                        <div className="flex items-center gap-4 p-4 bg-surface-container-lowest border border-outline-variant/20 rounded-xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoPreview!}
                            alt="Your photo"
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0 ring-2 ring-primary/20"
                          />
                          <div className="flex-grow min-w-0">
                            <p className="text-sm font-semibold truncate">{photoFile.name}</p>
                            <p className="text-xs text-on-surface-variant">
                              {(photoFile.size / 1024).toFixed(1)} KB
                              {photoUploading && (
                                <span className="ml-2 text-primary">
                                  <span className="material-symbols-outlined animate-spin text-[12px] align-middle mr-1">refresh</span>
                                  Uploading...
                                </span>
                              )}
                              {photoUrl && !photoUploading && (
                                <span className="ml-2 text-green-600">
                                  <span className="material-symbols-outlined text-[12px] align-middle mr-0.5">check_circle</span>
                                  Uploaded
                                </span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={clearPhoto}
                            className="text-xs text-primary font-semibold hover:opacity-80"
                          >
                            Change
                          </button>
                        </div>
                        {photoError && (
                          <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">error</span>
                            {photoError}
                            <button
                              onClick={() => handlePhotoSelect(photoFile)}
                              className="ml-2 text-primary font-semibold hover:opacity-80"
                            >
                              Retry
                            </button>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {templateHasAuthor && (
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          showName ? "border-primary bg-primary" : "border-outline-variant group-hover:border-primary"
                        }`}
                        onClick={() => setShowName(!showName)}
                      >
                        {showName && (
                          <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>
                        )}
                      </div>
                      <span className="text-sm font-semibold font-headline" onClick={() => setShowName(!showName)}>Add my name to this post</span>
                    </label>
                    {showName && (
                      <input
                        type="text"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="Your display name"
                        className="mt-3 w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body text-sm animate-in fade-in duration-300"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleSourceAction}
              disabled={!isSourceActionEnabled() || loading || extracting}
              className="mt-4 px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {extracting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                  Reading file...
                </>
              ) : loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                  Working on it...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  {sourceActionLabel()}
                </>
              )}
            </button>
          </div>
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
