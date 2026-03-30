"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { triggerVideoRenders } from "@/app/actions/create-videos";
import { triggerPostRenders } from "@/app/actions/create-posts";
import { voices, defaultVoice, getVoiceByName } from "@/lib/voices";
import { slideSizes, getTemplateById, getImagePostTemplateById } from "@/lib/carousel-templates";

const characters = [
  { name: "Doctor", emoji: "\u{1F9D1}\u200D\u2695\uFE0F", color: "from-blue-400 to-cyan-300" },
  { name: "Professor", emoji: "\u{1F468}\u200D\u{1F3EB}", color: "from-amber-400 to-yellow-300" },
  { name: "Chef", emoji: "\u{1F468}\u200D\u{1F373}", color: "from-orange-400 to-red-300" },
  { name: "Cowboy", emoji: "\u{1F920}", color: "from-yellow-600 to-amber-400" },
  { name: "Robot", emoji: "\u{1F916}", color: "from-zinc-400 to-slate-300" },
  { name: "Vampire", emoji: "\u{1F9DB}", color: "from-purple-600 to-violet-400" },
  { name: "Wizard", emoji: "\u{1F9D9}", color: "from-indigo-500 to-blue-400" },
  { name: "Finance Bro", emoji: "\u{1F4BC}", color: "from-emerald-500 to-green-400" },
  { name: "Alien", emoji: "\u{1F47D}", color: "from-lime-400 to-green-300" },
];

type SettingKey = "tone" | "presenter" | "voice" | "background" | "backgroundMode" | "duration" | "layout" | "platform";

interface SettingConfig {
  key: SettingKey;
  label: string;
  emoji: string;
  options: { label: string; emoji?: string; icon?: string; badge?: string; desc?: string }[];
}

const videoSettingsConfig: SettingConfig[] = [
  {
    key: "presenter",
    label: "Presenter",
    emoji: "\u{1F9D1}\u200D\u2695\uFE0F",
    options: [],
  },
  {
    key: "voice",
    label: "Voice",
    emoji: "\u{1F3A4}",
    options: voices.map((v) => ({ label: v.name, emoji: v.emoji })),
  },
  {
    key: "backgroundMode",
    label: "Background",
    emoji: "\u2728",
    options: [
      { label: "Smart Mix", emoji: "\u2728", desc: "AI picks the best visuals for each moment" },
      { label: "Stock Footage", emoji: "\u{1F4F9}", desc: "Real video clips from Pexels" },
      { label: "AI Images", emoji: "\u{1F3A8}", desc: "Custom AI-generated images" },
      { label: "Motion Graphics", emoji: "\u2728", desc: "Animated text and diagrams" },
      { label: "AI Video", emoji: "\u{1F916}", badge: "Soon", desc: "Coming soon" },
    ],
  },
  {
    key: "layout",
    label: "Layout",
    emoji: "\u{1F4D0}",
    options: [
      { label: "Standard", emoji: "\u{1F4D0}" },
      { label: "Split screen", emoji: "\u{1F4CA}" },
      { label: "Text only", emoji: "\u{1F4DD}" },
    ],
  },
];

const imageSettingsConfig: SettingConfig[] = [
  {
    key: "platform",
    label: "Platform",
    emoji: "\u{1F4F1}",
    options: [
      { label: "Instagram", emoji: "\u{1F4F7}" },
      { label: "TikTok", emoji: "\u{1F3B5}" },
      { label: "Facebook", emoji: "\u{1F465}" },
      { label: "LinkedIn", emoji: "\u{1F4BC}" },
      { label: "X", emoji: "\u{1D54F}" },
    ],
  },
];

interface Script {
  title: string;
  script: string;
}

interface PostIdea {
  number: number;
  topic: string;
  hook: string;
  headline: string;
}

interface CarouselIdea {
  title: string;
  hook: string;
  slideCount: number;
  tag: string;
}

interface ImagePostIdea {
  title: string;
  hook: string;
  tag: string;
}

interface TextIdea {
  title: string;
  text: string;
  type: string;
  tag: string;
}

interface CarouselSlideData {
  slides: Record<string, string>[];
  caption: string;
}

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const format = searchParams.get("format") || "video";
  const isImage = format === "image";
  const isCarousel = format === "carousel";
  const isText = format === "text";
  const template = searchParams.get("template") || "Did You Know";
  const ideasParam = searchParams.get("ideas");
  const toneParam = searchParams.get("tone") || "Funny";
  const durationParam = searchParams.get("duration") || "30s";
  const customPrompt = searchParams.get("customPrompt") || "";
  const pastedScript = searchParams.get("pastedScript") || "";

  // Template-specific params (carousel and image post templates)
  const templateId = searchParams.get("templateId") || "editorial";
  const themeId = searchParams.get("themeId") || "dark";
  const nicheParam = searchParams.get("niche") || "";

  // Image posts with templateId use HTML template rendering, not Flask
  const isTemplateImage = isImage && !!searchParams.get("templateId");

  // Parse ideas based on format
  const videoIdeaTitles: string[] = !isImage && !isCarousel && !isText && ideasParam ? JSON.parse(ideasParam) : [];
  const postIdeas: PostIdea[] = isImage && !isTemplateImage && ideasParam ? JSON.parse(ideasParam) : [];
  const imagePostIdeas: ImagePostIdea[] = isTemplateImage && ideasParam ? JSON.parse(ideasParam) : [];
  const carouselIdeas: CarouselIdea[] = isCarousel && ideasParam ? JSON.parse(ideasParam) : [];
  const textIdeas: TextIdea[] = isText && ideasParam ? JSON.parse(ideasParam) : [];

  // ── Video state ──
  const [scripts, setScripts] = useState<Script[]>(
    pastedScript ? [{ title: "My Script", script: pastedScript }] : []
  );
  const [loading, setLoading] = useState(!isImage && !isCarousel && !isText && !pastedScript);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // ── Image state (legacy Flask flow) — editable hooks ──
  const [editableHooks, setEditableHooks] = useState<string[]>(
    postIdeas.map((idea) => idea.hook)
  );

  // ── Image post template state (HTML template flow) ──
  const [imagePostSlides, setImagePostSlides] = useState<CarouselSlideData[]>([]);
  const [imagePostLoading, setImagePostLoading] = useState(isTemplateImage);

  // ── Carousel state ──
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlideData[]>([]);
  const [carouselLoading, setCarouselLoading] = useState(isCarousel);
  const [carouselSize, setCarouselSize] = useState("instagram");

  // ── Text state ──
  const [editableTexts, setEditableTexts] = useState<string[]>(
    textIdeas.map((idea) => idea.text)
  );

  const [settings, setSettings] = useState<Record<SettingKey, string>>({
    tone: toneParam,
    presenter: "Doctor",
    voice: defaultVoice.name,
    background: "Stock footage",
    backgroundMode: "Smart Mix",
    duration: durationParam,
    layout: "Standard",
    platform: "Instagram",
  });
  const [openPill, setOpenPill] = useState<SettingKey | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const settingsConfig = isImage ? imageSettingsConfig : videoSettingsConfig;

  // ── Video: fetch scripts from Gemini ──
  const fetchScripts = useCallback(async () => {
    if (isImage || pastedScript) {
      setLoading(false);
      return;
    }
    if (!customPrompt && videoIdeaTitles.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          ideas: customPrompt ? [] : videoIdeaTitles,
          tone: settings.tone,
          duration: settings.duration,
          ...(customPrompt ? { customPrompt } : {}),
        }),
      });
      const data = await res.json();
      if (data.scripts) {
        setScripts(data.scripts);
      }
    } catch (err) {
      console.error("Failed to fetch scripts:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  // ── Carousel: fetch slide content from Gemini ──
  useEffect(() => {
    if (!isCarousel || carouselIdeas.length === 0) {
      if (isCarousel) setCarouselLoading(false);
      return;
    }
    setCarouselLoading(true);
    Promise.all(
      carouselIdeas.map(async (idea) => {
        const res = await fetch("/api/generate-carousel-slides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: templateId,
            title: idea.title,
            hook: idea.hook,
            slideCount: idea.slideCount,
            tone: toneParam,
            niche: nicheParam,
          }),
        });
        const data = await res.json();
        return { slides: data.slides || [], caption: data.caption || "" };
      })
    )
      .then((results) => setCarouselSlides(results))
      .catch((err) => console.error("Failed to generate carousel slides:", err))
      .finally(() => setCarouselLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Image post template: fetch single-slide content from Gemini ──
  useEffect(() => {
    if (!isTemplateImage || imagePostIdeas.length === 0) {
      if (isTemplateImage) setImagePostLoading(false);
      return;
    }
    setImagePostLoading(true);
    Promise.all(
      imagePostIdeas.map(async (idea) => {
        const res = await fetch("/api/generate-carousel-slides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId,
            title: idea.title,
            hook: idea.hook,
            slideCount: 1,
            tone: toneParam,
            niche: nicheParam,
          }),
        });
        const data = await res.json();
        return { slides: data.slides || [], caption: data.caption || "" };
      })
    )
      .then((results) => setImagePostSlides(results))
      .catch((err) => console.error("Failed to generate image post content:", err))
      .finally(() => setImagePostLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regenerateScript = async (index: number) => {
    setRegeneratingIndex(index);
    try {
      const res = await fetch("/api/generate-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          ideas: [scripts[index].title],
        }),
      });
      const data = await res.json();
      if (data.scripts?.[0]) {
        setScripts((prev) => {
          const next = [...prev];
          next[index] = data.scripts[0];
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to regenerate script:", err);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpenPill(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const updateScript = (index: number, value: string) => {
    setScripts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], script: value };
      return next;
    });
  };

  const updateHook = (index: number, value: string) => {
    setEditableHooks((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const selectSetting = (key: SettingKey, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setOpenPill(null);
  };

  const [creating, setCreating] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playVoicePreview = (voiceName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingVoice === voiceName) {
      audioRef.current?.pause();
      setPlayingVoice(null);
      return;
    }
    const voice = getVoiceByName(voiceName);
    if (!voice.previewUrl) return;

    setPlayingVoice(voiceName);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(voice.previewUrl);
    audioRef.current = audio;
    audio.onended = () => setPlayingVoice(null);
    audio.onerror = () => setPlayingVoice(null);
    audio.play();
  };

  // ── Video: create videos ──
  const handleCreateVideos = async () => {
    if (scripts.length === 0) return;
    setCreating(true);
    try {
      const handles = await triggerVideoRenders(
        scripts.map((s) => ({
          title: s.title,
          script: s.script,
          template,
          settings,
        }))
      );

      // Create library items for each render
      await Promise.all(
        handles.map(async (h) => {
          const res = await fetch("/api/library", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId: h.runId,
              title: h.title,
              format: "video",
              backgroundMode: settings.backgroundMode ?? null,
              script: scripts.find((s) => s.title === h.title)?.script ?? null,
              durationSec: parseInt(settings.duration) || null,
              // Direct mode: item is already ready (or failed)
              ...(h.directResult && {
                status: h.directResult.status,
                videoUrl: h.directResult.videoUrl ?? null,
              }),
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error("Failed to create library item:", res.status, err);
          }
        })
      );

      // Also store in sessionStorage for backward compatibility with review page
      sessionStorage.setItem("pending-renders", JSON.stringify(handles));
      sessionStorage.setItem("pending-format", "video");
      router.push("/library");
    } catch (err) {
      console.error("Failed to trigger video renders:", err);
      setCreating(false);
    }
  };

  // ── Image: create posts ──
  const handleCreatePosts = async () => {
    if (postIdeas.length === 0) return;
    setCreating(true);
    try {
      const pgJobId = sessionStorage.getItem("pg_job_id");
      if (!pgJobId) {
        throw new Error("pg_job_id not found — go back and generate ideas first");
      }

      const handle = await triggerPostRenders({
        pgJobId,
        selectedIdeas: postIdeas.map((idea) => idea.number),
        ideaTopics: postIdeas.map((idea) => idea.topic),
        settings: {
          tone: settings.tone,
          platform: settings.platform,
        },
      });

      // Create library item for the render
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: handle.runId,
          title: postIdeas.map((i) => i.topic).join(", "),
          format: "image",
          // Direct mode: item is already ready (or failed)
          ...(handle.directResult && {
            status: handle.directResult.status,
          }),
        }),
      });

      sessionStorage.setItem("pending-renders", JSON.stringify([handle]));
      sessionStorage.setItem("pending-format", "image");
      router.push("/library");
    } catch (err) {
      console.error("Failed to trigger post renders:", err);
      setCreating(false);
    }
  };

  // ── Image post template: render single slides ──
  const handleCreateImagePosts = async () => {
    if (imagePostSlides.length === 0) return;
    setCreating(true);
    try {
      const results = [];
      for (let i = 0; i < imagePostSlides.length; i++) {
        const res = await fetch("/api/render-carousel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId,
            themeId,
            slides: imagePostSlides[i].slides,
            width: 1080,
            height: 1350,
          }),
        });
        const data = await res.json();
        results.push({
          title: imagePostIdeas[i]?.title || `Post ${i + 1}`,
          image: data.images?.[0] || "",
          caption: imagePostSlides[i].caption,
        });
      }
      // Create library items for each rendered image post
      for (const r of results) {
        await fetch("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: r.title,
            format: "image",
            status: "ready",
            videoUrl: r.image,
          }),
        });
      }

      sessionStorage.setItem("pending-image-post-results", JSON.stringify(results));
      sessionStorage.setItem("pending-format", "image");
      router.push("/library");
    } catch (err) {
      console.error("Failed to render image posts:", err);
      setCreating(false);
    }
  };

  // ── Carousel: render slides ──
  const handleCreateCarousels = async () => {
    if (carouselSlides.length === 0) return;
    setCreating(true);
    try {
      const size = slideSizes.find((s) => s.id === carouselSize) || slideSizes[0];
      const results = [];
      for (let i = 0; i < carouselSlides.length; i++) {
        const res = await fetch("/api/render-carousel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: templateId,
            themeId: themeId,
            slides: carouselSlides[i].slides,
            width: size.width,
            height: size.height,
          }),
        });
        const data = await res.json();
        results.push({
          title: carouselIdeas[i]?.title || `Carousel ${i + 1}`,
          images: data.images || [],
          caption: carouselSlides[i].caption,
        });
      }
      // Create library items for each rendered carousel
      for (const r of results) {
        await fetch("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: `car-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: r.title,
            format: "carousel",
            templateId: templateId ?? null,
            status: "ready",
          }),
        });
      }

      sessionStorage.setItem("pending-carousel-results", JSON.stringify(results));
      sessionStorage.setItem("pending-format", "carousel");
      router.push("/library");
    } catch (err) {
      console.error("Failed to render carousels:", err);
      setCreating(false);
    }
  };

  // ── Text: just pass through to review ──
  const handleCreateTexts = async () => {
    const results = textIdeas.map((idea, i) => ({
      title: idea.title,
      text: editableTexts[i] || idea.text,
      type: idea.type,
    }));
    // Create library items for each text post
    for (const r of results) {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: `txt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: r.title,
          format: "text",
          script: r.text,
          status: "ready",
        }),
      });
    }

    sessionStorage.setItem("pending-text-results", JSON.stringify(results));
    sessionStorage.setItem("pending-format", "text");
    router.push("/library");
  };

  const itemCount = isCarousel
    ? carouselIdeas.length
    : isText
      ? textIdeas.length
      : isTemplateImage
        ? imagePostIdeas.length
        : isImage
          ? postIdeas.length
          : (scripts.length || videoIdeaTitles.length);
  const itemLabel = isCarousel ? "carousel" : isText ? "text post" : isImage ? "image post" : "video";
  const hasContent = isCarousel
    ? carouselSlides.length > 0
    : isText
      ? textIdeas.length > 0
      : isTemplateImage
        ? imagePostSlides.length > 0
        : isImage
          ? postIdeas.length > 0
          : scripts.length > 0;

  return (
    <main className="pt-24 pb-72 px-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-10 text-on-surface-variant font-headline">
        <Link
          href={`/create/templates?format=${format}`}
          className="p-2 hover:bg-surface-container-highest rounded-full transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-medium">
          <Link
            href="/create"
            className="hover:text-primary cursor-pointer transition-colors"
          >
            Create
          </Link>
          <span className="material-symbols-outlined text-xs">
            chevron_right
          </span>
          <span className="hover:text-primary cursor-pointer transition-colors">
            {isCarousel ? "Carousel" : isText ? "Text" : isImage ? "Image Post" : "Video"}
          </span>
          {!isImage && template !== "Custom" && (
            <>
              <span className="material-symbols-outlined text-xs">
                chevron_right
              </span>
              <span className="hover:text-primary cursor-pointer transition-colors">
                {template}
              </span>
            </>
          )}
          <span className="material-symbols-outlined text-xs">
            chevron_right
          </span>
          <span className="text-on-surface font-bold">
            {itemCount} {itemLabel}{itemCount !== 1 ? "s" : ""}
          </span>
        </nav>
      </div>

      {/* Content Cards */}
      <section className="space-y-8 mb-16">
        <h2 className="text-3xl font-bold font-headline tracking-tight text-on-surface mb-6">
          {isCarousel ? "Review Slide Content" : isText ? "Review Text Posts" : isImage ? "Review Post Ideas" : "Review Scripts"}
        </h2>

        {/* ── Video: Loading skeleton ── */}
        {!isImage && loading && (
          Array.from({ length: videoIdeaTitles.length || 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest rounded-[1rem] p-8 shadow-[0px_20px_40px_rgba(111,51,213,0.06)] border border-outline-variant/10"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                  <div className="h-4 w-24 shimmer rounded-full" />
                  <div className="h-6 w-64 shimmer rounded-full" />
                </div>
                <div className="h-9 w-28 shimmer rounded-full" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-full shimmer rounded-full" />
                <div className="h-4 w-full shimmer rounded-full" />
                <div className="h-4 w-3/4 shimmer rounded-full" />
                <div className="h-4 w-5/6 shimmer rounded-full" />
              </div>
            </div>
          ))
        )}

        {/* ── Video: Script cards ── */}
        {!isImage && !loading && scripts.map((s, i) => (
          <div
            key={i}
            className="bg-surface-container-lowest rounded-[1rem] p-8 shadow-[0px_20px_40px_rgba(111,51,213,0.06)] border border-outline-variant/10 relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/60 font-headline">
                  Video {i + 1} of {itemCount}
                </span>
                <h3 className="text-xl font-bold font-headline text-on-surface">
                  {s.title}
                </h3>
              </div>
              <button
                onClick={() => regenerateScript(i)}
                disabled={regeneratingIndex === i}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container-low hover:bg-surface-container-highest text-on-surface-variant text-sm font-semibold rounded-full transition-all active:scale-95 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-sm ${regeneratingIndex === i ? "animate-spin" : ""}`}>
                  refresh
                </span>
                {regeneratingIndex === i ? "Regenerating..." : "Regenerate"}
              </button>
            </div>
            <div className="relative">
              <textarea
                value={s.script}
                onChange={(e) => updateScript(i, e.target.value)}
                className="w-full min-h-[200px] bg-surface text-on-surface-variant font-body leading-relaxed p-6 rounded-md border-none focus:ring-2 focus:ring-primary/40 resize-none"
                placeholder="Enter script here..."
              />
              <div className="absolute bottom-4 right-4 text-[10px] font-bold text-outline-variant uppercase tracking-tighter">
                AI Generated
              </div>
            </div>
          </div>
        ))}

        {/* ── Carousel: Slide content cards ── */}
        {isCarousel && carouselLoading && (
          Array.from({ length: carouselIdeas.length || 2 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest rounded-[1rem] p-8 shadow-[0px_20px_40px_rgba(111,51,213,0.06)] border border-outline-variant/10">
              <div className="space-y-3">
                <div className="h-6 w-48 shimmer rounded-full" />
                <div className="h-4 w-full shimmer rounded-full" />
                <div className="h-4 w-3/4 shimmer rounded-full" />
                <div className="h-4 w-5/6 shimmer rounded-full" />
              </div>
            </div>
          ))
        )}

        {isCarousel && !carouselLoading && carouselSlides.map((slideData, ci) => (
          <div
            key={ci}
            className="bg-surface-container-lowest rounded-[1rem] p-8 shadow-[0px_20px_40px_rgba(111,51,213,0.06)] border border-outline-variant/10 relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/60 font-headline">
                  Carousel {ci + 1} of {carouselIdeas.length}
                </span>
                <h3 className="text-xl font-bold font-headline text-on-surface">
                  {carouselIdeas[ci]?.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-container/20 rounded-full">
                <span className="material-symbols-outlined text-primary text-sm">view_carousel</span>
                <span className="text-xs font-bold text-primary">{slideData.slides.length} slides</span>
              </div>
            </div>

            <div className="space-y-4">
              {slideData.slides.map((slide, si) => (
                <div key={si} className="bg-surface rounded-lg p-4 border border-outline-variant/10">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-2">
                    Slide {si + 1}
                  </div>
                  {Object.entries(slide)
                    .filter(([key]) => !["slideNumber", "totalSlides", "handle"].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="mb-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50 block mb-1">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </label>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => {
                            setCarouselSlides((prev) => {
                              const next = [...prev];
                              const newSlides = [...next[ci].slides];
                              newSlides[si] = { ...newSlides[si], [key]: e.target.value };
                              next[ci] = { ...next[ci], slides: newSlides };
                              return next;
                            });
                          }}
                          className="w-full bg-surface-container-low text-on-surface font-body text-sm p-2 rounded border-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                    ))}
                </div>
              ))}
            </div>

            {slideData.caption && (
              <div className="mt-4 p-4 bg-surface-container-low rounded-lg">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50 block mb-1">Caption</label>
                <textarea
                  value={slideData.caption}
                  onChange={(e) => {
                    setCarouselSlides((prev) => {
                      const next = [...prev];
                      next[ci] = { ...next[ci], caption: e.target.value };
                      return next;
                    });
                  }}
                  className="w-full min-h-[80px] bg-surface text-on-surface-variant font-body text-sm p-2 rounded border-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>
            )}
          </div>
        ))}

        {/* ── Text: Post cards ── */}
        {isText && textIdeas.map((idea, i) => (
          <div
            key={i}
            className="bg-surface-container-lowest rounded-[1rem] p-8 shadow-[0px_20px_40px_rgba(111,51,213,0.06)] border border-outline-variant/10 relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/60 font-headline">
                  Post {i + 1} of {itemCount}
                </span>
                <h3 className="text-xl font-bold font-headline text-on-surface">
                  {idea.title}
                </h3>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                idea.type === "thread" ? "bg-blue-100 text-blue-700" :
                idea.type === "hook" ? "bg-amber-100 text-amber-700" :
                idea.type === "story" ? "bg-emerald-100 text-emerald-700" :
                "bg-violet-100 text-violet-700"
              }`}>
                {idea.type}
              </span>
            </div>
            <div className="relative">
              <textarea
                value={editableTexts[i] || ""}
                onChange={(e) => {
                  setEditableTexts((prev) => {
                    const next = [...prev];
                    next[i] = e.target.value;
                    return next;
                  });
                }}
                className="w-full min-h-[200px] bg-surface text-on-surface-variant font-body leading-relaxed p-6 rounded-md border-none focus:ring-2 focus:ring-primary/40 resize-none"
                placeholder="Edit the text post..."
              />
              <div className="absolute bottom-4 right-4 text-[10px] font-bold text-outline-variant uppercase tracking-tighter">
                AI Generated
              </div>
            </div>
          </div>
        ))}

        {/* ── Image post template: Single-slide content cards ── */}
        {isTemplateImage && imagePostLoading && (
          Array.from({ length: imagePostIdeas.length || 2 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest rounded-[1rem] p-8 shadow-[0px_20px_40px_rgba(111,51,213,0.06)] border border-outline-variant/10">
              <div className="space-y-3">
                <div className="h-6 w-48 shimmer rounded-full" />
                <div className="h-4 w-full shimmer rounded-full" />
                <div className="h-4 w-3/4 shimmer rounded-full" />
              </div>
            </div>
          ))
        )}

        {isTemplateImage && !imagePostLoading && imagePostSlides.map((slideData, ci) => (
          <div
            key={ci}
            className="bg-surface-container-lowest rounded-[1rem] p-8 shadow-[0px_20px_40px_rgba(111,51,213,0.06)] border border-outline-variant/10 relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/60 font-headline">
                  Post {ci + 1} of {imagePostIdeas.length}
                </span>
                <h3 className="text-xl font-bold font-headline text-on-surface">
                  {imagePostIdeas[ci]?.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-container/20 rounded-full">
                <span className="material-symbols-outlined text-primary text-sm">image</span>
                <span className="text-xs font-bold text-primary">Image Post</span>
              </div>
            </div>

            <div className="space-y-4">
              {slideData.slides.map((slide, si) => (
                <div key={si} className="bg-surface rounded-lg p-4 border border-outline-variant/10">
                  {Object.entries(slide)
                    .filter(([key]) => !["slideNumber", "totalSlides", "handle"].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="mb-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50 block mb-1">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </label>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => {
                            setImagePostSlides((prev) => {
                              const next = [...prev];
                              const newSlides = [...next[ci].slides];
                              newSlides[si] = { ...newSlides[si], [key]: e.target.value };
                              next[ci] = { ...next[ci], slides: newSlides };
                              return next;
                            });
                          }}
                          className="w-full bg-surface-container-low text-on-surface font-body text-sm p-2 rounded border-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                    ))}
                </div>
              ))}
            </div>

            {slideData.caption && (
              <div className="mt-4 p-4 bg-surface-container-low rounded-lg">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50 block mb-1">Caption</label>
                <textarea
                  value={slideData.caption}
                  onChange={(e) => {
                    setImagePostSlides((prev) => {
                      const next = [...prev];
                      next[ci] = { ...next[ci], caption: e.target.value };
                      return next;
                    });
                  }}
                  className="w-full min-h-[80px] bg-surface text-on-surface-variant font-body text-sm p-2 rounded border-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>
            )}
          </div>
        ))}

        {/* ── Image (legacy Flask): Post idea cards ── */}
        {isImage && !isTemplateImage && postIdeas.map((idea, i) => (
          <div
            key={i}
            className="bg-surface-container-lowest rounded-[1rem] p-8 shadow-[0px_20px_40px_rgba(111,51,213,0.06)] border border-outline-variant/10 relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/60 font-headline">
                  Post {i + 1} of {itemCount}
                </span>
                <h3 className="text-xl font-bold font-headline text-on-surface">
                  {idea.topic}
                </h3>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-container/20 rounded-full">
                <span className="material-symbols-outlined text-primary text-sm">image</span>
                <span className="text-xs font-bold text-primary">Image Post</span>
              </div>
            </div>
            {idea.headline && (
              <p className="text-sm font-semibold text-on-surface mb-3">
                {idea.headline}
              </p>
            )}
            <div className="relative">
              <textarea
                value={editableHooks[i] || ""}
                onChange={(e) => updateHook(i, e.target.value)}
                className="w-full min-h-[80px] bg-surface text-on-surface-variant font-body leading-relaxed p-6 rounded-md border-none focus:ring-2 focus:ring-primary/40 resize-none"
                placeholder="Edit the hook text..."
              />
              <div className="absolute bottom-4 right-4 text-[10px] font-bold text-outline-variant uppercase tracking-tighter">
                AI Generated
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Settings Section — Video/Legacy Image only */}
      {!loading && hasContent && !isCarousel && !isText && !isTemplateImage && (
        <section className="mt-16 relative">
          <h2 className="text-3xl font-bold font-headline tracking-tight text-on-surface mb-8">
            Creative Settings
          </h2>
          <div className="flex flex-wrap gap-4 items-start">
            {settingsConfig.map((setting) => {
              const isOpen = openPill === setting.key;
              const currentValue = settings[setting.key];
              const currentEmoji =
                setting.key === "presenter"
                  ? characters.find((c) => c.name === currentValue)?.emoji ||
                    "\u{1F9D1}\u200D\u2695\uFE0F"
                  : setting.options.find((o) => o.label === currentValue)
                      ?.emoji || setting.emoji;

              return (
                <div key={setting.key} className="relative" ref={isOpen ? popoverRef : undefined}>
                  <button
                    onClick={() =>
                      setOpenPill(isOpen ? null : setting.key)
                    }
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold font-headline transition-all ${
                      isOpen
                        ? "bg-secondary-container text-on-secondary-container ring-2 ring-primary"
                        : "bg-surface-container-highest text-on-surface hover:bg-surface-dim"
                    }`}
                  >
                    <span>{currentEmoji}</span>
                    <span>{currentValue}</span>
                    <span className="material-symbols-outlined text-lg">
                      {isOpen ? "expand_less" : "expand_more"}
                    </span>
                  </button>

                  {/* Popover */}
                  {isOpen && (
                    <div className="absolute bottom-full left-0 mb-4 bg-surface-container-lowest rounded-[1rem] shadow-[0px_30px_60px_rgba(111,51,213,0.15)] border border-outline-variant/15 p-6 z-40 min-w-[280px] max-h-[70vh] overflow-y-auto no-scrollbar">
                      {setting.key === "presenter" ? (
                        <>
                          <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 font-headline">
                            Choose Presenter Persona
                          </div>
                          <div className="grid grid-cols-5 gap-4 mb-6">
                            {characters.map((char) => {
                              const isSelected =
                                currentValue === char.name;
                              return (
                                <button
                                  key={char.name}
                                  onClick={() =>
                                    selectSetting("presenter", char.name)
                                  }
                                  className={`flex flex-col items-center gap-2 cursor-pointer transition-opacity ${
                                    isSelected
                                      ? "opacity-100"
                                      : "opacity-40 hover:opacity-100"
                                  }`}
                                >
                                  <div
                                    className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${
                                      isSelected
                                        ? "ring-2 ring-primary ring-offset-2"
                                        : ""
                                    } bg-gradient-to-br ${char.color}`}
                                  >
                                    {char.emoji}
                                  </div>
                                  <span className="text-[10px] font-bold text-center">
                                    {char.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="space-y-3">
                            <button
                              onClick={() =>
                                selectSetting("presenter", "HeyGen Avatar")
                              }
                              className="w-full flex items-center justify-between p-3 bg-surface-container-low rounded-[0.5rem] hover:bg-surface-container-high transition-colors cursor-pointer border border-primary/20"
                            >
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">
                                  video_stable
                                </span>
                                <span className="text-sm font-semibold">
                                  HeyGen realistic avatar
                                </span>
                              </div>
                              <span className="bg-primary-container text-on-primary-container text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-widest">
                                Pro
                              </span>
                            </button>
                            <button
                              onClick={() =>
                                selectSetting("presenter", "Text only")
                              }
                              className="w-full flex items-center gap-3 p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-[0.5rem] hover:bg-surface-container-low transition-colors cursor-pointer text-left"
                            >
                              <span className="material-symbols-outlined text-on-surface-variant">
                                format_quote
                              </span>
                              <span className="text-sm font-semibold">
                                Text only — no presenter
                              </span>
                            </button>
                            <button
                              onClick={() =>
                                selectSetting("presenter", "Upload own")
                              }
                              className="w-full flex items-center gap-3 p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-[0.5rem] hover:bg-surface-container-low transition-colors cursor-pointer text-left"
                            >
                              <span className="material-symbols-outlined text-on-surface-variant">
                                cloud_upload
                              </span>
                              <span className="text-sm font-semibold">
                                Upload your own video
                              </span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 font-headline">
                            {setting.label}
                          </div>
                          <div className="space-y-2">
                            {setting.options.map((opt) => {
                              const isDisabled = opt.badge === "Soon";
                              return (
                              <button
                                key={opt.label}
                                onClick={() =>
                                  !isDisabled && selectSetting(setting.key, opt.label)
                                }
                                disabled={isDisabled}
                                className={`w-full flex items-center justify-between p-3 rounded-[0.5rem] transition-colors text-left ${
                                  isDisabled
                                    ? "bg-surface-container-low opacity-40 cursor-not-allowed"
                                    : currentValue === opt.label
                                      ? "bg-primary/10 ring-1 ring-primary/30 cursor-pointer"
                                      : "bg-surface-container-low hover:bg-surface-container-high cursor-pointer"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {opt.emoji && (
                                    <span>{opt.emoji}</span>
                                  )}
                                  {opt.icon && (
                                    <span className="material-symbols-outlined text-on-surface-variant">
                                      {opt.icon}
                                    </span>
                                  )}
                                  <div>
                                    <span className="text-sm font-semibold block">
                                      {opt.label}
                                    </span>
                                    {opt.desc && (
                                      <span className="text-xs text-on-surface-variant/60 block">
                                        {opt.desc}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {setting.key === "voice" && (
                                    <span
                                      onClick={(e) => playVoicePreview(opt.label, e)}
                                      className={`material-symbols-outlined text-sm p-1 rounded-full hover:bg-primary/20 transition-colors ${
                                        playingVoice === opt.label ? "text-primary animate-pulse" : "text-on-surface-variant"
                                      }`}
                                      style={{ fontVariationSettings: "'FILL' 1" }}
                                    >
                                      {playingVoice === opt.label ? "stop_circle" : "play_circle"}
                                    </span>
                                  )}
                                  {opt.badge && (
                                    <span className="bg-primary-container text-on-primary-container text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-widest">
                                      {opt.badge}
                                    </span>
                                  )}
                                  {currentValue === opt.label && (
                                    <span className="material-symbols-outlined text-primary text-sm">
                                      check
                                    </span>
                                  )}
                                </div>
                              </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-sm text-on-surface-variant">
            Using your defaults &middot; Tap any to change
          </p>
        </section>
      )}

      {/* Carousel: Size picker */}
      {isCarousel && !carouselLoading && carouselSlides.length > 0 && (
        <section className="mt-16">
          <h2 className="text-3xl font-bold font-headline tracking-tight text-on-surface mb-8">
            Slide Size
          </h2>
          <div className="flex flex-wrap gap-3">
            {slideSizes.map((size) => (
              <button
                key={size.id}
                onClick={() => setCarouselSize(size.id)}
                className={`px-5 py-3 rounded-full font-bold text-sm transition-all ${
                  carouselSize === size.id
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                    : "bg-surface-container-highest text-on-surface hover:bg-surface-dim"
                }`}
              >
                {size.label}
                <span className="text-xs opacity-60 ml-1">({size.width}x{size.height})</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Sticky Bottom Bar */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl px-8 py-6 shadow-[0px_-10px_30px_rgba(0,0,0,0.03)] flex flex-col items-center">
        <button
          onClick={isCarousel ? handleCreateCarousels : isText ? handleCreateTexts : isTemplateImage ? handleCreateImagePosts : isImage ? handleCreatePosts : handleCreateVideos}
          disabled={(loading || carouselLoading || imagePostLoading) || creating || !hasContent}
          className={`w-full max-w-xl py-5 rounded-full text-xl font-bold font-headline flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${
            creating
              ? "bg-primary/80 text-on-primary shadow-primary/20 cursor-wait"
              : "primary-gradient text-on-primary shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
        >
          {(loading || carouselLoading || imagePostLoading) ? (
            <>
              <span className="material-symbols-outlined animate-spin">
                progress_activity
              </span>
              {isCarousel || isTemplateImage ? "Generating content..." : "Generating scripts..."}
            </>
          ) : creating ? (
            <>
              <span className="material-symbols-outlined animate-spin">
                progress_activity
              </span>
              {isCarousel ? "Rendering slides..." : isTemplateImage ? "Rendering image posts..." : isText ? "Preparing posts..." : isImage ? "Launching post generation..." : "Launching render jobs..."}
            </>
          ) : (
            <>
              Create {itemCount} {itemLabel}{itemCount !== 1 ? "s" : ""}
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
            </>
          )}
        </button>
        <p className="mt-3 text-xs font-medium text-on-surface-variant flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-tertiary rounded-full" />
          {isCarousel
            ? "Slides render in seconds \u00B7 No background processing needed"
            : isTemplateImage
              ? "Images render in seconds \u00B7 No background processing needed"
              : isText
                ? "Ready instantly \u00B7 No rendering needed"
                : isImage
                  ? "Posts generate in the background \u00B7 ~2 min estimated"
                  : "Videos render in the background \u00B7 We\u2019ll notify you when ready \u00B7 ~7 min estimated"}
        </p>
      </footer>
    </main>
  );
}

export default function EditorPage() {
  return (
    <Suspense>
      <EditorContent />
    </Suspense>
  );
}
