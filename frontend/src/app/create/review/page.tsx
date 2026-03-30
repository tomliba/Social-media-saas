"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import type { renderVideo } from "@trigger/render-video";
import type { renderPost } from "@trigger/render-post";

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
  title?: string;
  ideaTopics?: string[];
}

interface VisualSegmentMeta {
  visual_type: string;
  startSec: number;
  endSec: number;
  speech?: string;
  asset_url?: string | null;
  data?: Record<string, any>;
}

// ══════════════════════════════════════════════════════════════
//  VIDEO CARDS (existing)
// ══════════════════════════════════════════════════════════════

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
  const videoUrl = (run?.metadata?.videoUrl as string) ?? "";
  const visualSegments = (run?.metadata?.visualSegments as VisualSegmentMeta[] | undefined) ?? undefined;
  const isComplete = run?.status === "COMPLETED";
  const isFailed = run?.status === "FAILED" || run?.status === "CANCELED";
  const output = isComplete ? (run?.output as { title: string; videoUrl: string; previewUrl: string; caption: string } | undefined) : undefined;
  const title = output?.title ?? handle.title ?? "Untitled";
  const caption = output?.caption ?? null;
  const finalVideoUrl = output?.videoUrl || videoUrl;

  if (error) {
    return <ErrorCard title={handle.title ?? "Video"} message={error.message} />;
  }

  if (isComplete) {
    return (
      <ReadyVideoCard
        title={title}
        caption={caption}
        videoUrl={finalVideoUrl}
        gradient={gradient}
        index={index}
        total={total}
        visualSegments={visualSegments}
      />
    );
  }

  if (isFailed) {
    return <ErrorCard title={handle.title ?? "Video"} message="Render failed — try again" />;
  }

  return (
    <RenderingCard
      title={handle.title ?? "Video"}
      stageLabel={stageLabel}
      progress={progress}
      icon="movie"
    />
  );
}

function ReadyVideoCard({
  title,
  caption,
  videoUrl,
  gradient,
  index,
  total,
  visualSegments,
}: {
  title: string;
  caption: string | null;
  videoUrl: string;
  gradient: string;
  index: number;
  total: number;
  visualSegments?: VisualSegmentMeta[];
}) {
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(new Set(["reels"]));
  const [showScheduler, setShowScheduler] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const togglePlatform = (key: string) => {
    setActivePlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasVideo = videoUrl && !videoError;

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
        <div className="relative aspect-video rounded-lg overflow-hidden mb-6 bg-black group-hover:scale-[1.01] transition-transform duration-500 shadow-inner">
          {hasVideo ? (
            <video
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain"
              onError={() => setVideoError(true)}
            />
          ) : (
            <>
              <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Segment Timeline */}
        {visualSegments && visualSegments.length > 0 && (
          <SegmentTimeline segments={visualSegments} />
        )}

        <h2 className="text-xl font-headline font-bold mb-4 text-on-surface">{title}</h2>
        <PlatformSelector activePlatforms={activePlatforms} onToggle={togglePlatform} />
        <CaptionBlock caption={caption} />
        <SchedulerBlock show={showScheduler} />
        <ActionButtons showScheduler={showScheduler} onToggleScheduler={() => setShowScheduler(!showScheduler)} />
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
//  SEGMENT TIMELINE
// ══════════════════════════════════════════════════════════════

const segmentTypeColors: Record<string, string> = {
  pexels_clip: "#3b82f6",
  ai_image: "#8b5cf6",
  animated_list: "#22c55e",
  stat_counter: "#22c55e",
  diagram: "#22c55e",
  comparison: "#22c55e",
  quote_highlight: "#22c55e",
  title_card: "#22c55e",
  icon_grid: "#22c55e",
};

const segmentTypeLabels: Record<string, string> = {
  pexels_clip: "Pexels",
  ai_image: "AI Image",
  animated_list: "List",
  stat_counter: "Stat",
  diagram: "Diagram",
  comparison: "Compare",
  quote_highlight: "Quote",
  title_card: "Title",
  icon_grid: "Icons",
};

function SegmentTimeline({ segments }: { segments: VisualSegmentMeta[] }) {
  const totalDuration = Math.max(...segments.map((s) => s.endSec), 1);

  return (
    <div className="mb-6 mt-4">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="material-symbols-outlined text-xs text-on-surface-variant/50">timeline</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Visual Segments</span>
      </div>
      <div className="flex gap-[2px] rounded-lg overflow-hidden">
        {segments.map((seg, i) => {
          const widthPct = ((seg.endSec - seg.startSec) / totalDuration) * 100;
          const color = segmentTypeColors[seg.visual_type] || "#6b7280";
          const label = segmentTypeLabels[seg.visual_type] || seg.visual_type;

          return (
            <div
              key={i}
              className="flex flex-col items-center min-w-0"
              style={{ width: `${widthPct}%` }}
            >
              <div
                className="w-full h-8 flex items-center justify-center rounded-sm"
                style={{ backgroundColor: color }}
                title={`${label}: ${seg.startSec.toFixed(1)}s – ${seg.endSec.toFixed(1)}s`}
              >
                <span className="text-[10px] font-bold text-white truncate px-1">
                  {label}
                </span>
              </div>
              <span className="text-[9px] text-on-surface-variant/50 mt-1 truncate w-full text-center">
                {seg.startSec.toFixed(0)}-{seg.endSec.toFixed(0)}s
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3">
        <span className="flex items-center gap-1 text-[10px] text-on-surface-variant/60">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: "#3b82f6" }} />
          Pexels
        </span>
        <span className="flex items-center gap-1 text-[10px] text-on-surface-variant/60">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: "#8b5cf6" }} />
          AI Image
        </span>
        <span className="flex items-center gap-1 text-[10px] text-on-surface-variant/60">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: "#22c55e" }} />
          Motion Graphics
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  IMAGE POST CARDS (new)
// ══════════════════════════════════════════════════════════════

function PostRunCard({ handle }: { handle: RunHandle }) {
  const { run, error } = useRealtimeRun<typeof renderPost>(handle.runId, {
    accessToken: handle.publicAccessToken,
  });

  const progress = (run?.metadata?.progress as number) ?? 0;
  const stageLabel = (run?.metadata?.stageLabel as string) ?? "Queued...";
  const isComplete = run?.status === "COMPLETED";
  const isFailed = run?.status === "FAILED" || run?.status === "CANCELED";
  const output = isComplete
    ? (run?.output as { results: { topic: string; imageUrls: string[]; caption: string }[]; succeeded: number; failed: number } | undefined)
    : undefined;

  if (error) {
    return <ErrorCard title="Image Posts" message={error.message} />;
  }

  if (isComplete && output) {
    return (
      <>
        {output.results.map((result, i) => (
          <ReadyPostCard
            key={i}
            topic={result.topic}
            imageUrls={result.imageUrls}
            caption={result.caption}
            index={i}
            total={output.results.length}
          />
        ))}
      </>
    );
  }

  if (isFailed) {
    return <ErrorCard title="Image Posts" message="Generation failed — try again" />;
  }

  return (
    <RenderingCard
      title={`Generating ${handle.ideaTopics?.length ?? 0} posts`}
      stageLabel={stageLabel}
      progress={progress}
      icon="image"
    />
  );
}

function ReadyPostCard({
  topic,
  imageUrls,
  caption,
  index,
  total,
}: {
  topic: string;
  imageUrls: string[];
  caption: string;
  index: number;
  total: number;
}) {
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(new Set(["reels"]));
  const [showScheduler, setShowScheduler] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

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
          Post {index + 1} of {total} — Ready
        </span>
      </div>
      <div
        className={`bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(111,51,213,0.04)] transition-all hover:shadow-[0px_20px_40px_rgba(111,51,213,0.08)] ${
          showScheduler ? "border-2 border-primary/20" : ""
        }`}
      >
        {/* Image preview */}
        {imageUrls.length > 0 ? (
          <div className="mb-6">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-surface-container-low group-hover:scale-[1.01] transition-transform duration-500 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrls[activeImage]}
                alt={topic}
                className="w-full h-full object-cover"
              />
            </div>
            {imageUrls.length > 1 && (
              <div className="flex gap-2 mt-3 justify-center">
                {imageUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      activeImage === i ? "border-primary shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Variant ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-square rounded-lg mb-6 bg-gradient-to-br from-amber-200 via-rose-200 to-violet-300 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-5xl">image</span>
          </div>
        )}

        <h2 className="text-xl font-headline font-bold mb-4 text-on-surface">{topic}</h2>
        <PlatformSelector activePlatforms={activePlatforms} onToggle={togglePlatform} />
        <CaptionBlock caption={caption} />
        <SchedulerBlock show={showScheduler} />
        <ActionButtons showScheduler={showScheduler} onToggleScheduler={() => setShowScheduler(!showScheduler)} />
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════

function PlatformSelector({ activePlatforms, onToggle }: { activePlatforms: Set<string>; onToggle: (key: string) => void }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {platforms.map((p) => {
        const isActive = activePlatforms.has(p.key);
        return (
          <button
            key={p.key}
            onClick={() => onToggle(p.key)}
            title={`${p.label}${isActive ? " (active)" : ""}`}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-all duration-200 text-sm font-medium ${
              isActive
                ? "bg-primary text-on-primary shadow-md ring-2 ring-primary/30"
                : "bg-surface-container-low text-on-surface-variant/50 hover:bg-surface-container-high hover:text-on-surface-variant"
            }`}
          >
            <span
              className="material-symbols-outlined text-lg"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {p.icon}
            </span>
            <span className="text-xs font-bold">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CaptionBlock({ caption }: { caption: string | null }) {
  if (!caption) return null;
  return (
    <div className="mb-6 p-4 bg-surface-container-low rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-sm text-on-surface-variant/60">notes</span>
        <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Caption</span>
      </div>
      <p className="text-on-surface-variant text-sm leading-relaxed whitespace-pre-line min-h-[5lh]">
        {caption}
      </p>
    </div>
  );
}

function SchedulerBlock({ show }: { show: boolean }) {
  if (!show) return null;
  return (
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
  );
}

function ActionButtons({ showScheduler, onToggleScheduler }: { showScheduler: boolean; onToggleScheduler: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onToggleScheduler}
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
  );
}

function RenderingCard({
  title,
  stageLabel,
  progress,
  icon,
}: {
  title: string;
  stageLabel: string;
  progress: number;
  icon: string;
}) {
  return (
    <section className="opacity-80">
      <div className="bg-surface-container-lowest/50 rounded-xl p-6 border-dashed border-2 border-outline-variant/30">
        <div className={`${icon === "image" ? "aspect-square" : "aspect-video"} rounded-lg mb-6 shimmer`} />

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-headline font-bold text-on-surface-variant">{title}</h2>
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined animate-spin">refresh</span>
            <span className="text-xs font-bold uppercase tracking-widest">Generating</span>
          </div>
        </div>

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

// ══════════════════════════════════════════════════════════════
//  CAROUSEL CARDS
// ══════════════════════════════════════════════════════════════

interface CarouselResult {
  title: string;
  images: string[];
  caption: string;
}

function ReadyCarouselCard({
  result,
  index,
  total,
}: {
  result: CarouselResult;
  index: number;
  total: number;
}) {
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(new Set(["reels"]));
  const [showScheduler, setShowScheduler] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

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
          Carousel {index + 1} of {total} — Ready
        </span>
      </div>
      <div
        className={`bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(111,51,213,0.04)] transition-all hover:shadow-[0px_20px_40px_rgba(111,51,213,0.08)] ${
          showScheduler ? "border-2 border-primary/20" : ""
        }`}
      >
        {/* Horizontal scrollable slide preview */}
        {result.images.length > 0 && (
          <div className="mb-6">
            <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-surface-container-low shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.images[activeSlide]}
                alt={`Slide ${activeSlide + 1}`}
                className="w-full h-full object-contain"
              />
              {/* Slide counter */}
              <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-bold">
                {activeSlide + 1} / {result.images.length}
              </div>
              {/* Nav arrows */}
              {activeSlide > 0 && (
                <button
                  onClick={() => setActiveSlide((p) => p - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center hover:bg-white transition-colors"
                >
                  <span className="material-symbols-outlined text-on-surface">chevron_left</span>
                </button>
              )}
              {activeSlide < result.images.length - 1 && (
                <button
                  onClick={() => setActiveSlide((p) => p + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center hover:bg-white transition-colors"
                >
                  <span className="material-symbols-outlined text-on-surface">chevron_right</span>
                </button>
              )}
            </div>
            {/* Thumbnail strip */}
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
              {result.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`w-14 h-[70px] rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                    activeSlide === i ? "border-primary shadow-md" : "border-transparent opacity-50 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-xl font-headline font-bold mb-4 text-on-surface">{result.title}</h2>
        <PlatformSelector activePlatforms={activePlatforms} onToggle={togglePlatform} />
        <CaptionBlock caption={result.caption} />
        <SchedulerBlock show={showScheduler} />
        <ActionButtons showScheduler={showScheduler} onToggleScheduler={() => setShowScheduler(!showScheduler)} />
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
//  TEXT CARDS
// ══════════════════════════════════════════════════════════════

interface TextResult {
  title: string;
  text: string;
  type: string;
}

function ReadyTextCard({
  result,
  index,
  total,
}: {
  result: TextResult;
  index: number;
  total: number;
}) {
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(new Set(["reels"]));
  const [showScheduler, setShowScheduler] = useState(false);
  const [copied, setCopied] = useState(false);

  const togglePlatform = (key: string) => {
    setActivePlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const typeColors: Record<string, string> = {
    caption: "bg-violet-100 text-violet-700",
    thread: "bg-blue-100 text-blue-700",
    hook: "bg-amber-100 text-amber-700",
    story: "bg-emerald-100 text-emerald-700",
  };

  return (
    <section className="group animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-tertiary text-on-primary text-xs font-bold">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-tertiary font-headline">
          Text {index + 1} of {total} — Ready
        </span>
      </div>
      <div
        className={`bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(111,51,213,0.04)] transition-all hover:shadow-[0px_20px_40px_rgba(111,51,213,0.08)] ${
          showScheduler ? "border-2 border-primary/20" : ""
        }`}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-headline font-bold text-on-surface">{result.title}</h2>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${typeColors[result.type] || "bg-gray-100 text-gray-600"}`}>
              {result.type}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant text-xs font-bold transition-colors"
            >
              <span className="material-symbols-outlined text-sm">{copied ? "check" : "content_copy"}</span>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="p-5 bg-surface rounded-lg mb-6 whitespace-pre-line text-on-surface-variant font-body leading-relaxed text-sm">
          {result.text}
        </div>

        <PlatformSelector activePlatforms={activePlatforms} onToggle={togglePlatform} />
        <SchedulerBlock show={showScheduler} />
        <ActionButtons showScheduler={showScheduler} onToggleScheduler={() => setShowScheduler(!showScheduler)} />
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
//  IMAGE POST (template-rendered) CARDS
// ══════════════════════════════════════════════════════════════

interface ImagePostResult {
  title: string;
  image: string;
  caption: string;
}

function ReadyImagePostCard({
  result,
  index,
  total,
}: {
  result: ImagePostResult;
  index: number;
  total: number;
}) {
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(new Set(["reels"]));
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
          Post {index + 1} of {total} — Ready
        </span>
      </div>
      <div
        className={`bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(111,51,213,0.04)] transition-all hover:shadow-[0px_20px_40px_rgba(111,51,213,0.08)] ${
          showScheduler ? "border-2 border-primary/20" : ""
        }`}
      >
        {result.image && (
          <div className="mb-6">
            <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-surface-container-low shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.image}
                alt={result.title}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        <h2 className="text-xl font-headline font-bold mb-4 text-on-surface">{result.title}</h2>
        <PlatformSelector activePlatforms={activePlatforms} onToggle={togglePlatform} />
        <CaptionBlock caption={result.caption} />
        <SchedulerBlock show={showScheduler} />
        <ActionButtons showScheduler={showScheduler} onToggleScheduler={() => setShowScheduler(!showScheduler)} />
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN REVIEW PAGE
// ══════════════════════════════════════════════════════════════

export default function ReviewPage() {
  const [handles, setHandles] = useState<RunHandle[]>([]);
  const [format, setFormat] = useState<string>("video");
  const [carouselResults, setCarouselResults] = useState<CarouselResult[]>([]);
  const [textResults, setTextResults] = useState<TextResult[]>([]);
  const [imagePostResults, setImagePostResults] = useState<ImagePostResult[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const storedFormat = sessionStorage.getItem("pending-format") || "video";
    setFormat(storedFormat);

    if (storedFormat === "carousel") {
      const stored = sessionStorage.getItem("pending-carousel-results");
      if (stored) {
        try { setCarouselResults(JSON.parse(stored)); } catch { /* invalid */ }
      }
    } else if (storedFormat === "text") {
      const stored = sessionStorage.getItem("pending-text-results");
      if (stored) {
        try { setTextResults(JSON.parse(stored)); } catch { /* invalid */ }
      }
    } else if (storedFormat === "image") {
      // Check for template-rendered image posts first, then fall back to Trigger.dev renders
      const imagePostStored = sessionStorage.getItem("pending-image-post-results");
      if (imagePostStored) {
        try { setImagePostResults(JSON.parse(imagePostStored)); } catch { /* invalid */ }
      } else {
        const stored = sessionStorage.getItem("pending-renders");
        if (stored) {
          try { setHandles(JSON.parse(stored)); } catch { /* invalid */ }
        }
      }
    } else {
      const stored = sessionStorage.getItem("pending-renders");
      if (stored) {
        try { setHandles(JSON.parse(stored)); } catch { /* invalid */ }
      }
    }
    setLoaded(true);
  }, []);

  const isImage = format === "image";
  const isCarousel = format === "carousel";
  const isText = format === "text";
  const isTemplateImage = isImage && imagePostResults.length > 0;
  const hasContent = isCarousel ? carouselResults.length > 0 : isText ? textResults.length > 0 : isTemplateImage ? true : handles.length > 0;
  const totalItems = isCarousel ? carouselResults.length : isText ? textResults.length : isTemplateImage ? imagePostResults.length : handles.length;

  if (loaded && !hasContent) {
    const icon = isCarousel ? "view_carousel" : isText ? "text_fields" : isImage ? "image" : "movie_creation";
    const label = isCarousel ? "carousels" : isText ? "text posts" : isImage ? "image posts" : "videos";
    return (
      <main className="pt-32 pb-40 px-6 max-w-3xl mx-auto text-center">
        <div className="mb-8">
          <span className="material-symbols-outlined text-6xl text-outline-variant">{icon}</span>
        </div>
        <h1 className="text-2xl font-headline font-extrabold text-on-surface mb-4">
          No {label} generating
        </h1>
        <p className="text-on-surface-variant mb-8">Start by creating content from the editor.</p>
        <Link
          href="/create"
          className="bg-primary text-on-primary px-10 py-4 rounded-full font-label font-bold shadow-xl hover:scale-105 transition-transform active:scale-95 inline-block"
        >
          Create content
        </Link>
      </main>
    );
  }

  const headerText = isCarousel
    ? "Your carousels are ready!"
    : isText
      ? "Your text posts are ready!"
      : isTemplateImage
        ? "Your image posts are ready!"
        : isImage
          ? "Your posts are being created!"
          : "Your videos are being created!";

  const subText = isCarousel
    ? `${totalItems} carousel${totalItems !== 1 ? "s" : ""} rendered successfully`
    : isText
      ? `${totalItems} text post${totalItems !== 1 ? "s" : ""} ready to publish`
      : isTemplateImage
        ? `${totalItems} image post${totalItems !== 1 ? "s" : ""} rendered successfully`
        : isImage
          ? `${handles[0]?.ideaTopics?.length ?? 0} posts generating \u00B7 You\u2019re free to leave this page`
          : `${totalItems} video${totalItems !== 1 ? "s" : ""} rendering in parallel \u00B7 You\u2019re free to leave this page`;

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
              {headerText}
            </h1>
            <p className="text-sm text-on-surface-variant">{subText}</p>
          </div>
        </div>
      </div>

      {/* Content Cards */}
      <div className="space-y-10">
        {isCarousel
          ? carouselResults.map((result, i) => (
              <ReadyCarouselCard key={i} result={result} index={i} total={carouselResults.length} />
            ))
          : isText
            ? textResults.map((result, i) => (
                <ReadyTextCard key={i} result={result} index={i} total={textResults.length} />
              ))
            : isTemplateImage
              ? imagePostResults.map((result, i) => (
                  <ReadyImagePostCard key={i} result={result} index={i} total={imagePostResults.length} />
                ))
              : isImage
                ? handles.map((handle) => (
                    <PostRunCard key={handle.runId} handle={handle} />
                  ))
                : handles.map((handle, i) => (
                    <VideoRunCard
                      key={handle.runId}
                      handle={handle}
                      index={i}
                      total={totalItems}
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
