"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const tones = [
  { label: "Funny", emoji: "\u{1F604}" },
  { label: "Serious", emoji: "\u{1F3AF}" },
  { label: "Cursing", emoji: "\u{1F92C}" },
  { label: "Edgy", emoji: "\u{1F525}" },
  { label: "Motivational", emoji: "\u{1F4AA}" },
  { label: "Storytelling", emoji: "\u{1F4D6}" },
  { label: "Sarcastic", emoji: "\u{1F644}" },
  { label: "Shocked", emoji: "\u{1F92F}" },
  { label: "Conspiracy", emoji: "\u{1F575}\uFE0F" },
  { label: "Friendly", emoji: "\u2615" },
];

export default function RemixPage() {
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [tone, setTone] = useState("Funny");
  const [duration, setDuration] = useState("30s");
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackText, setFallbackText] = useState("");
  const [showFallback, setShowFallback] = useState(false);

  const handleExtractAndGenerate = async () => {
    setError(null);
    setShowFallback(false);

    // If user is in fallback mode and has typed text, use that directly
    if (showFallback && fallbackText.trim()) {
      return generateScript(fallbackText.trim());
    }

    if (!url.trim()) return;

    setExtracting(true);
    try {
      const res = await fetch("/api/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        // 422 = couldn't read link — show fallback textarea
        if (res.status === 422) {
          setShowFallback(true);
          setError(data.error);
          setExtracting(false);
          return;
        }
        setError(data.error || "Failed to extract content");
        setExtracting(false);
        return;
      }

      setExtracting(false);
      await generateScript(data.text, data.title);
    } catch {
      setError("Failed to extract content from URL");
      setExtracting(false);
    }
  };

  const generateScript = async (sourceText: string, title?: string) => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: "Remix",
          ideas: [],
          tone,
          duration,
          customPrompt: `Create an ORIGINAL viral short-form video script inspired by the following content. Do NOT copy it. Extract the core idea and present it in a completely fresh, engaging way with your own angle, examples, and hook.\n\n${title ? `Source title: ${title}\n` : ""}Source content:\n${sourceText}`,
        }),
      });
      const data = await res.json();
      if (data.scripts?.[0]) {
        const params = new URLSearchParams();
        params.set("format", "video");
        params.set("template", "Remix");
        params.set("tone", tone);
        params.set("duration", duration);
        params.set("pastedScript", data.scripts[0].script);
        router.push(`/create/editor?${params.toString()}`);
      } else {
        setError("Failed to generate script — try again");
      }
    } catch {
      setError("Failed to generate script");
    } finally {
      setGenerating(false);
    }
  };

  const isWorking = extracting || generating;

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
            Remix a viral video
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Paste a YouTube or article link — AI creates your original version
          </p>
        </div>
      </header>

      <div className="max-w-2xl space-y-8">
        {/* Tone */}
        <div>
          <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
            Tone
          </span>
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

        {/* Duration */}
        <div>
          <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
            Duration
          </span>
          <div className="flex gap-2">
            {["15s", "30s", "60s"].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  duration === d
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                    : "bg-surface-container-highest text-on-surface hover:bg-surface-dim"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* URL input */}
        <div>
          <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
            Paste a link
          </label>
          <div className="flex gap-3">
            <div className="flex-grow relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50">
                link
              </span>
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setShowFallback(false);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && url.trim()) handleExtractAndGenerate();
                }}
                placeholder="https://youtube.com/watch?v=... or any article URL"
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 pl-12 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body"
              />
            </div>
          </div>
          <p className="text-xs text-on-surface-variant mt-2">
            YouTube, TikTok, blog posts, articles, news stories — any URL with content
          </p>
        </div>

        {/* Fallback textarea — shown when URL extraction fails */}
        {showFallback && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 flex-shrink-0 mt-0.5">
                warning
              </span>
              <span>{error}</span>
            </div>
            <textarea
              value={fallbackText}
              onChange={(e) => setFallbackText(e.target.value)}
              placeholder="Paste the content or describe the video here instead..."
              className="w-full min-h-[200px] bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body leading-relaxed resize-none"
              autoFocus
            />
          </div>
        )}

        {/* Error (non-fallback) */}
        {error && !showFallback && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleExtractAndGenerate}
          disabled={(!url.trim() && !fallbackText.trim()) || isWorking}
          className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isWorking ? (
            <>
              <span className="material-symbols-outlined animate-spin text-sm">
                progress_activity
              </span>
              {extracting ? "Reading link..." : "Generating script..."}
            </>
          ) : (
            <>
              <span
                className="material-symbols-outlined text-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              {showFallback ? "Generate from text" : "Remix into video script"}
            </>
          )}
        </button>
      </div>
    </main>
  );
}
