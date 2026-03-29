"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const videoTemplates = [
  { name: "Did You Know", icon: "lightbulb", example: '"Octopuses have 3 hearts"' },
  { name: "Myth Buster", icon: "verified", example: '"Knuckle cracking is harmless"' },
  { name: "X vs Y", icon: "compare_arrows", example: '"Coffee vs Green Tea"' },
  { name: "Story Time", icon: "auto_stories", example: '"The man who vanished with $200K"' },
  { name: "Top 5", icon: "format_list_numbered", example: '"5 foods killing your gut"' },
  { name: "How-To", icon: "construction", example: '"Fall asleep in 2 minutes"' },
  { name: "Hot Take", icon: "bolt", example: '"Stretching is useless"' },
  { name: "What Happens If", icon: "quiz", example: '"No sugar for 30 days"' },
];

interface VideoIdea {
  title: string;
  tag: string;
}

interface PostIdea {
  number: number;
  topic: string;
  hook: string;
  headline: string;
  idea: string;
}

function TemplatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const format = searchParams.get("format") || "video";
  const isImage = format === "image";

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showIdeas, setShowIdeas] = useState(false);
  const [selectedIdeas, setSelectedIdeas] = useState<Set<number>>(new Set());
  const [videoIdeas, setVideoIdeas] = useState<VideoIdea[]>([]);
  const [postIdeas, setPostIdeas] = useState<PostIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [niche, setNiche] = useState("health and wellness");
  const [topic, setTopic] = useState("");

  const ideasContentRef = useRef<HTMLDivElement>(null);
  const ideasSectionRef = useRef<HTMLDivElement>(null);
  const [ideasHeight, setIdeasHeight] = useState(0);

  useEffect(() => {
    if (showIdeas && ideasContentRef.current) {
      requestAnimationFrame(() => {
        if (ideasContentRef.current) {
          setIdeasHeight(ideasContentRef.current.scrollHeight);
        }
      });
      setTimeout(() => {
        ideasSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } else {
      setIdeasHeight(0);
    }
  }, [showIdeas, videoIdeas, postIdeas, loading]);

  // ── Video idea generation (Gemini via Next.js API) ──
  const fetchVideoIdeas = useCallback(async (template: string | null) => {
    setLoading(true);
    setVideoIdeas([]);
    setSelectedIdeas(new Set());
    setShowIdeas(true);

    try {
      const res = await fetch("/api/generate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: template || "Did You Know",
          niche,
        }),
      });
      const data = await res.json();
      if (data.ideas) {
        setVideoIdeas(data.ideas);
      }
    } catch (err) {
      console.error("Failed to fetch video ideas:", err);
    } finally {
      setLoading(false);
    }
  }, [niche]);

  // ── Image post idea generation (Flask /pg/generate_ideas) ──
  const fetchPostIdeas = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setPostIdeas([]);
    setSelectedIdeas(new Set());
    setShowIdeas(true);

    try {
      const res = await fetch("/api/generate-post-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, niche, platform: "instagram" }),
      });
      const data = await res.json();
      if (data.ideas) {
        setPostIdeas(data.ideas);
      }
      // Store the pg_job_id for later use in /pg/start
      if (data.pg_job_id) {
        sessionStorage.setItem("pg_job_id", data.pg_job_id);
      }
    } catch (err) {
      console.error("Failed to fetch post ideas:", err);
    } finally {
      setLoading(false);
    }
  }, [topic, niche]);

  const handleTemplateClick = (name: string) => {
    setSelectedTemplate(name);
    fetchVideoIdeas(name);
  };

  const handleSkip = () => {
    setSelectedTemplate(null);
    fetchVideoIdeas(null);
  };

  const handleRefresh = () => {
    if (isImage) {
      fetchPostIdeas();
    } else {
      fetchVideoIdeas(selectedTemplate);
    }
  };

  const toggleIdea = (index: number) => {
    setSelectedIdeas((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else if (next.size < 5) {
        next.add(index);
      }
      return next;
    });
  };

  const handleContinue = () => {
    const params = new URLSearchParams();
    params.set("format", format);

    if (isImage) {
      // Pass selected post idea numbers and topics
      const selected = Array.from(selectedIdeas).map((i) => postIdeas[i]);
      params.set("ideas", JSON.stringify(selected.map((idea) => ({
        number: idea.number,
        topic: idea.topic,
        hook: idea.hook,
        headline: idea.headline,
      }))));
    } else {
      const selected = Array.from(selectedIdeas).map((i) => videoIdeas[i].title);
      params.set("template", selectedTemplate || "Did You Know");
      params.set("ideas", JSON.stringify(selected));
    }
    router.push(`/create/editor?${params.toString()}`);
  };

  const ideas = isImage ? postIdeas : videoIdeas;
  const selectedCount = selectedIdeas.size;

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
            {isImage ? "Generate post ideas" : "Pick a style"}
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {isImage
              ? "Enter a topic and we'll create 10 image post ideas"
              : "Select the visual format for your next viral hit"}
          </p>
        </div>
      </header>

      {/* Niche Input — shown for both formats */}
      <div className="mb-8 max-w-xl">
        <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
          Your niche
        </label>
        <input
          type="text"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="e.g., fitness tips, medical facts, personal finance"
          className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body"
        />
      </div>

      {isImage ? (
        /* ── Image Post: Topic input + Generate button ── */
        <div className="mb-16 max-w-xl">
          <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
            Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") fetchPostIdeas(); }}
            placeholder="e.g., morning coffee rituals, why you should drink more water"
            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body mb-4"
          />
          <button
            onClick={fetchPostIdeas}
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
        </div>
      ) : (
        /* ── Video: Template Grid ── */
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {videoTemplates.map((t) => {
              const isSelected = selectedTemplate === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => handleTemplateClick(t.name)}
                  className={`group relative flex flex-col p-5 bg-surface-container-lowest rounded-[1rem] text-left transition-all active:scale-[0.98] ${
                    isSelected
                      ? "ring-2 ring-primary shadow-[0px_20px_40px_rgba(111,51,213,0.12)]"
                      : "hover:shadow-md"
                  }`}
                >
                  <div
                    className={`w-10 h-10 mb-4 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? "bg-primary-container/20 text-primary"
                        : "bg-surface-container-low text-on-surface-variant group-hover:bg-primary-container/10 group-hover:text-primary transition-colors"
                    }`}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={
                        isSelected
                          ? { fontVariationSettings: "'FILL' 1" }
                          : undefined
                      }
                    >
                      {t.icon}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg font-headline text-on-surface mb-1">
                    {t.name}
                  </h3>
                  <p className="text-xs text-on-surface-variant italic leading-relaxed">
                    {t.example}
                  </p>
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-[14px] text-white font-bold">
                        check
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </section>

          {/* Skip link */}
          <div className="text-center mb-16">
            <button
              onClick={handleSkip}
              className="text-primary text-lg font-bold bg-primary/10 hover:bg-primary/15 px-8 py-3 rounded-full transition-all inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined">skip_next</span>
              Skip — just give me viral ideas
            </button>
          </div>
        </>
      )}

      {/* Ideas Section */}
      <div
        ref={ideasSectionRef}
        style={{
          maxHeight: ideasHeight || (showIdeas ? 2000 : 0),
          opacity: showIdeas ? 1 : 0,
          transform: showIdeas ? "translateY(0)" : "translateY(2rem)",
          transition:
            "max-height 0.5s ease-out, opacity 0.4s ease-out, transform 0.4s ease-out",
          overflow: "hidden",
        }}
      >
        <div ref={ideasContentRef}>
          <section className="max-w-4xl">
            <div className="flex items-end justify-between mb-6">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-primary-container"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
                <h2 className="text-2xl font-bold font-headline text-on-surface">
                  {isImage
                    ? "10 image post ideas"
                    : selectedTemplate
                      ? `10 "${selectedTemplate}" ideas`
                      : "10 viral ideas for you"}
                </h2>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-1.5 text-primary text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-sm ${loading ? "animate-spin" : ""}`}>
                  refresh
                </span>
                Generate new ideas
              </button>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-[1rem] bg-surface-container-low/50"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-outline-variant shimmer" />
                    <div className="flex-grow h-5 shimmer rounded-full" />
                    <div className="w-16 h-5 shimmer rounded-full" />
                  </div>
                ))}
              </div>
            )}

            {/* Idea list */}
            {!loading && ideas.length > 0 && (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-4 no-scrollbar">
                {ideas.map((idea, i) => {
                  const isChecked = selectedIdeas.has(i);
                  const title = isImage
                    ? (idea as PostIdea).topic
                    : (idea as VideoIdea).title;
                  const subtitle = isImage
                    ? (idea as PostIdea).hook
                    : null;
                  const tag = isImage ? "post" : (idea as VideoIdea).tag;
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
                          isChecked
                            ? "border-primary bg-primary"
                            : "border-outline-variant group-hover:border-primary"
                        }`}
                      >
                        {isChecked && (
                          <span className="material-symbols-outlined text-white text-[16px] font-bold">
                            check
                          </span>
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p
                          className={`font-headline leading-tight ${
                            isChecked
                              ? "font-semibold text-on-surface"
                              : "font-medium text-on-surface-variant group-hover:text-on-surface transition-colors"
                          }`}
                        >
                          {title}
                        </p>
                        {subtitle && (
                          <p className="text-xs text-on-surface-variant/70 mt-1 leading-relaxed">
                            {subtitle}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex-shrink-0 ${
                          isChecked
                            ? "bg-surface-container-low text-on-surface-variant"
                            : "bg-surface-container-high/30 text-outline"
                        }`}
                      >
                        {tag}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selection counter */}
            {!loading && ideas.length > 0 && (
              <div className="mt-6 flex items-center gap-2 text-on-surface-variant text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <p>
                  Select up to 5 ideas &middot;{" "}
                  <span className="text-on-surface font-bold">
                    {selectedCount} selected
                  </span>
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Bottom Action Bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md px-6 py-6 md:px-12 flex justify-center items-center z-40">
          <div className="max-w-6xl w-full flex justify-end items-center">
            <button
              onClick={handleContinue}
              className="px-10 py-4 primary-gradient text-white rounded-full font-bold font-headline shadow-[0px_10px_30px_rgba(111,51,213,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
            >
              Continue with {selectedCount} idea
              {selectedCount !== 1 ? "s" : ""}
              <span className="material-symbols-outlined text-lg">
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense>
      <TemplatesContent />
    </Suspense>
  );
}
