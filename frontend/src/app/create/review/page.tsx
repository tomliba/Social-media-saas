"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import type { renderVideo } from "@trigger/render-video";

const platforms = [
  { key: "web", icon: "public", label: "Web" },
  { key: "reels", icon: "movie", label: "Reels" },
  { key: "yt", icon: "video_library", label: "YouTube" },
  { key: "x", icon: "alternate_email", label: "X" },
];

const gradients = [
  "from-violet-900 via-purple-800 to-indigo-900",
  "from-zinc-600 via-stone-500 to-zinc-700",
  "from-amber-700 via-orange-600 to-red-800",
  "from-emerald-700 via-teal-600 to-cyan-800",
  "from-rose-700 via-pink-600 to-fuchsia-800",
];

interface RunHandle {
  runId: string;
  publicAccessToken: string;
  title: string;
}

// ── Single video card that subscribes to its own Trigger.dev run ──
function VideoRunCard({
  handle,
  index,
  total,
  gradient,
}: {
  handle: RunHandle;
  index: number;
  total: number;
  gradient: string;
}) {
  const { run, error } = useRealtimeRun<typeof renderVideo>(handle.runId, {
    accessToken: handle.publicAccessToken,
  });

  const progress = (run?.metadata?.progress as number) ?? 0;
  const stageLabel = (run?.metadata?.stageLabel as string) ?? "Queued...";
  const isComplete = run?.status === "COMPLETED";
  const isFailed = run?.status === "FAILED" || run?.status === "CANCELED";
  const output = isComplete ? (run?.output as { title: string; videoUrl: string; caption: string } | undefined) : undefined;
  const title = output?.title ?? handle.title;
  const caption = output?.caption ?? null;

  if (error) {
    return <ErrorCard title={handle.title} message={error.message} />;
  }

  if (isComplete) {
    return (
      <ReadyVideoCard
        title={title}
        caption={caption}
        gradient={gradient}
        index={index}
        total={total}
      />
    );
  }

  if (isFailed) {
    return <ErrorCard title={handle.title} message="Render failed — try again" />;
  }

  return (
    <RenderingVideoCard
      title={handle.title}
      stageLabel={stageLabel}
      progress={progress}
    />
  );
}

// ── Ready video card (render complete) ──
function ReadyVideoCard({
  title,
  caption,
  gradient,
  index,
  total,
}: {
  title: string;
  caption: string | null;
  gradient: string;
  index: number;
  total: number;
}) {
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(new Set(["reels"]));
  const [showCaption, setShowCaption] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);

  const togglePlatform = (key: string) => {
    setActivePlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="group animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-tertiary text-on-primary text-xs font-bold">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-tertiary font-headline">
          Video {index + 1} of {total} — Ready
        </span>
      </div>
      <div
        className={`bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(111,51,213,0.04)] transition-all hover:shadow-[0px_20px_40px_rgba(111,51,213,0.08)] ${
          showScheduler ? "border-2 border-primary/20" : ""
        }`}
      >
        {/* Video Preview */}
        <div className="relative aspect-video rounded-lg overflow-hidden mb-6 bg-surface-dim group-hover:scale-[1.01] transition-transform duration-500 shadow-inner">
          <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-headline font-bold mb-4 text-on-surface">{title}</h2>

        {/* Platform Selector */}
        <div className="flex items-center gap-3 mb-6">
          {platforms.map((p) => (
            <button
              key={p.key}
              onClick={() => togglePlatform(p.key)}
              title={p.label}
              className={`p-2 rounded-full transition-colors ${
                activePlatforms.has(p.key)
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container"
              }`}
            >
              <span className="material-symbols-outlined text-sm">{p.icon}</span>
            </button>
          ))}
        </div>

        {/* Caption */}
        {caption && (
          <div className="mb-6 p-4 bg-surface-container-low rounded-md">
            <p className="text-on-surface-variant text-sm leading-relaxed">
              {showCaption ? caption : caption.slice(0, 100) + "... "}
              <button onClick={() => setShowCaption(!showCaption)} className="text-primary font-bold cursor-pointer">
                {showCaption ? "show less" : "see more"}
              </button>
            </p>
          </div>
        )}

        {/* Scheduler */}
        {showScheduler && (
          <div className="mb-6 p-5 bg-surface-container-high/50 rounded-lg">
            <div className="flex items-center gap-2 mb-4 text-primary font-bold text-sm">
              <span className="material-symbols-outlined text-lg">calendar_month</span>
              <span>Set Publication Date</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-surface-container-lowest rounded-sm border border-outline-variant/20">
                <span className="block text-[10px] uppercase tracking-wider text-outline-variant font-bold mb-1">Date</span>
                <span className="font-medium text-on-surface">Mar 31, 2026</span>
              </div>
              <div className="p-3 bg-surface-container-lowest rounded-sm border border-outline-variant/20">
                <span className="block text-[10px] uppercase tracking-wider text-outline-variant font-bold mb-1">Time</span>
                <span className="font-medium text-on-surface">10:00 AM</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowScheduler(!showScheduler)}
            className="flex-1 py-3 rounded-full font-label font-bold shadow-md primary-gradient text-on-primary hover:opacity-90 transition-opacity"
          >
            {showScheduler ? "Confirm Schedule" : "Schedule"}
          </button>
          {!showScheduler && (
            <button className="px-6 py-3 border-2 border-primary text-primary rounded-full font-label font-bold hover:bg-primary/5 transition-colors">
              Post now
            </button>
          )}
          <button className="p-3 text-outline-variant hover:text-error transition-colors">
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Rendering video card (in progress) ──
function RenderingVideoCard({
  title,
  stageLabel,
  progress,
}: {
  title: string;
  stageLabel: string;
  progress: number;
}) {
  return (
    <section className="opacity-80">
      <div className="bg-surface-container-lowest/50 rounded-xl p-6 border-dashed border-2 border-outline-variant/30">
        {/* Shimmer video placeholder */}
        <div className="aspect-video rounded-lg mb-6 shimmer" />

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-headline font-bold text-on-surface-variant">{title}</h2>
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined animate-spin">refresh</span>
            <span className="text-xs font-bold uppercase tracking-widest">Rendering</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full primary-gradient rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between mb-8 text-sm">
          <span className="text-on-surface-variant/60">{stageLabel}</span>
          <span className="text-primary font-bold text-xs">{progress}%</span>
        </div>

        {/* Disabled buttons */}
        <div className="flex items-center gap-3">
          <button disabled className="flex-1 bg-surface-container-highest text-on-surface-variant/40 py-3 rounded-full font-label font-bold cursor-not-allowed">
            Schedule
          </button>
          <button disabled className="px-6 py-3 border-2 border-surface-container-highest text-on-surface-variant/40 rounded-full font-label font-bold cursor-not-allowed">
            Post now
          </button>
          <button disabled className="p-3 text-on-surface-variant/20 cursor-not-allowed">
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Error card ──
function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <section>
      <div className="bg-error-container/20 rounded-xl p-6 border-2 border-error/20">
        <h2 className="text-xl font-headline font-bold text-on-surface mb-2">{title}</h2>
        <div className="flex items-center gap-2 text-error text-sm">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{message}</span>
        </div>
      </div>
    </section>
  );
}

// ── Main review page ──
export default function ReviewPage() {
  const [handles, setHandles] = useState<RunHandle[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("pending-renders");
    if (stored) {
      try {
        setHandles(JSON.parse(stored));
      } catch {
        // invalid data
      }
    }
    setLoaded(true);
  }, []);

  const totalVideos = handles.length;

  // If no handles found, show empty state
  if (loaded && handles.length === 0) {
    return (
      <main className="pt-32 pb-40 px-6 max-w-3xl mx-auto text-center">
        <div className="mb-8">
          <span className="material-symbols-outlined text-6xl text-outline-variant">movie_creation</span>
        </div>
        <h1 className="text-2xl font-headline font-extrabold text-on-surface mb-4">No videos rendering</h1>
        <p className="text-on-surface-variant mb-8">Start by creating videos from the editor.</p>
        <Link
          href="/create"
          className="bg-primary text-on-primary px-10 py-4 rounded-full font-label font-bold shadow-xl hover:scale-105 transition-transform active:scale-95 inline-block"
        >
          Create content
        </Link>
      </main>
    );
  }

  return (
    <main className="pt-32 pb-40 px-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full primary-gradient flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <div>
            <h1 className="text-2xl font-headline font-extrabold tracking-tight text-on-surface">
              Your videos are being created!
            </h1>
            <p className="text-sm text-on-surface-variant">
              {totalVideos} video{totalVideos !== 1 ? "s" : ""} rendering in parallel &middot; You&apos;re free to leave this page
            </p>
          </div>
        </div>
      </div>

      {/* Video Cards */}
      <div className="space-y-10">
        {handles.map((handle, i) => (
          <VideoRunCard
            key={handle.runId}
            handle={handle}
            index={i}
            total={totalVideos}
            gradient={gradients[i % gradients.length]}
          />
        ))}
      </div>

      {/* Footer Navigation */}
      <div className="mt-20 flex flex-col items-center gap-6">
        <Link
          href="/create"
          className="bg-primary text-on-primary px-10 py-4 rounded-full font-label font-bold shadow-xl hover:scale-105 transition-transform active:scale-95"
        >
          Create more content
        </Link>
        <Link
          href="/dashboard"
          className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 font-medium"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
