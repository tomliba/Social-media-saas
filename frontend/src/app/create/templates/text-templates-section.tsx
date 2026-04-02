"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface TextIdea {
  title: string;
  text: string;
  type: string;
  tag: string;
}

export default function TextTemplatesSection({ niche, tone }: { niche: string; tone: string }) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [ideas, setIdeas] = useState<TextIdea[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ideasRef = useRef<HTMLDivElement>(null);

  const fetchIdeas = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setIdeas([]);
    setSelectedIdeas(new Set());

    try {
      const res = await fetch("/api/generate-text-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, niche, tone, platform }),
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      if (data.ideas?.length > 0) {
        setIdeas(data.ideas);
        setTimeout(() => ideasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
      } else {
        setError("No ideas returned. Try a different topic");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate ideas");
    } finally {
      setLoading(false);
    }
  }, [topic, niche, tone, platform]);

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
    params.set("format", "text");
    params.set("tone", tone);
    params.set("platform", platform);
    params.set("ideas", JSON.stringify(selected));
    router.push(`/create/editor?${params.toString()}`);
  };

  const typeColors: Record<string, string> = {
    caption: "bg-violet-100 text-violet-700",
    thread: "bg-blue-100 text-blue-700",
    hook: "bg-amber-100 text-amber-700",
    story: "bg-emerald-100 text-emerald-700",
  };

  return (
    <>
      {/* Platform selector */}
      <div className="mb-6">
        <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">Platform</span>
        <div className="flex flex-wrap gap-2">
          {["Instagram", "Twitter/X", "LinkedIn", "TikTok", "Facebook", "Threads"].map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                platform === p
                  ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                  : "bg-surface-container-highest text-on-surface hover:bg-surface-dim"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Topic input */}
      <div className="mb-16 max-w-xl">
        <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
          Topic
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") fetchIdeas(); }}
          placeholder="e.g., morning routines, productivity myths, startup lessons"
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
              Generate 10 text posts
            </>
          )}
        </button>
      </div>

      {/* Ideas */}
      {(loading || ideas.length > 0 || error) && (
        <section ref={ideasRef} className="max-w-4xl">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl font-bold font-headline">10 text post ideas</h2>
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
            <div className="p-6 rounded-[1rem] bg-red-50 border border-red-200 text-red-700 text-sm font-medium mb-4">{error}</div>
          )}

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-[1rem] bg-surface-container-low/50">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-outline-variant shimmer" />
                  <div className="flex-grow h-5 shimmer rounded-full" />
                </div>
              ))}
            </div>
          )}

          {!loading && ideas.length > 0 && (
            <>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-4 no-scrollbar">
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
                        {isChecked && <span className="material-symbols-outlined text-white text-[16px] font-bold">check</span>}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-headline leading-tight ${isChecked ? "font-semibold text-on-surface" : "font-medium text-on-surface-variant group-hover:text-on-surface transition-colors"}`}>
                            {idea.title}
                          </p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${typeColors[idea.type] || "bg-gray-100 text-gray-600"}`}>
                            {idea.type}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant/70 mt-1 line-clamp-2 leading-relaxed">
                          {idea.text.slice(0, 150)}...
                        </p>
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
                <p>Select up to 5 ideas &middot; <span className="text-on-surface font-bold">{selectedIdeas.size} selected</span></p>
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
