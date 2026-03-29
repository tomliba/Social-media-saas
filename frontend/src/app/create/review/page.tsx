"use client";

import { useState } from "react";
import Link from "next/link";

const platforms = [
  { key: "web", icon: "public", label: "Web" },
  { key: "reels", icon: "movie", label: "Reels" },
  { key: "yt", icon: "video_library", label: "YouTube" },
  { key: "x", icon: "alternate_email", label: "X" },
];

interface ReadyVideo {
  title: string;
  caption: string | null;
  gradient: string;
  defaultPlatforms: string[];
  schedulerOpen: boolean;
}

const readyVideos: ReadyVideo[] = [
  {
    title: "The Future of Decentralized Design",
    caption:
      'Exploring how Web3 is reshaping our visual landscape. From generative art to community-owned assets, the creator economy is evolving faster than ever. Here\'s what you need to know about the next wave of digital creativity...',
    gradient: "from-violet-900 via-purple-800 to-indigo-900",
    defaultPlatforms: ["web"],
    schedulerOpen: false,
  },
  {
    title: "5 Productivity Hacks for Creators",
    caption: null,
    gradient: "from-zinc-600 via-stone-500 to-zinc-700",
    defaultPlatforms: [],
    schedulerOpen: true,
  },
  {
    title: "Minimalist Tech Setup 2024",
    caption: null,
    gradient: "from-amber-700 via-orange-600 to-red-800",
    defaultPlatforms: ["reels"],
    schedulerOpen: false,
  },
];

interface RenderingVideo {
  title: string | null;
  status: string | null;
  progress: number;
}

const renderingVideos: RenderingVideo[] = [
  {
    title: "What happens if you stop eating sugar",
    status: "Generating audio synthesis...",
    progress: 33,
  },
  {
    title: null,
    status: null,
    progress: 10,
  },
];

const totalVideos = readyVideos.length + renderingVideos.length;
const readyCount = readyVideos.length;
const progressPercent = Math.round((readyCount / totalVideos) * 100);

// Build interleaved order: Ready 0, Ready 1 (scheduler), Rendering 0, Ready 2, Rendering 1
type CardItem =
  | { type: "ready"; data: ReadyVideo }
  | { type: "rendering"; data: RenderingVideo };

const cardOrder: CardItem[] = [
  { type: "ready", data: readyVideos[0] },
  { type: "ready", data: readyVideos[1] },
  { type: "rendering", data: renderingVideos[0] },
  { type: "ready", data: readyVideos[2] },
  { type: "rendering", data: renderingVideos[1] },
];

function ReadyVideoCard({ video }: { video: ReadyVideo }) {
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(
    new Set(video.defaultPlatforms)
  );
  const [showCaption, setShowCaption] = useState(false);
  const [showScheduler, setShowScheduler] = useState(video.schedulerOpen);

  const togglePlatform = (key: string) => {
    setActivePlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="group">
      <div
        className={`bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(111,51,213,0.04)] transition-all hover:shadow-[0px_20px_40px_rgba(111,51,213,0.08)] ${
          showScheduler ? "border-2 border-primary/20" : ""
        }`}
      >
        {/* Video Preview */}
        <div className="relative aspect-video rounded-lg overflow-hidden mb-6 bg-surface-dim group-hover:scale-[1.01] transition-transform duration-500 shadow-inner">
          <div
            className={`w-full h-full bg-gradient-to-br ${video.gradient}`}
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform">
              <span
                className="material-symbols-outlined text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_arrow
              </span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-headline font-bold mb-4 text-on-surface">
          {video.title}
        </h2>

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
              <span className="material-symbols-outlined text-sm">
                {p.icon}
              </span>
            </button>
          ))}
        </div>

        {/* Caption Preview — only shown if video has a caption */}
        {video.caption && (
          <div className="mb-6 p-4 bg-surface-container-low rounded-md">
            <p className="text-on-surface-variant text-sm leading-relaxed">
              {showCaption
                ? video.caption
                : video.caption.slice(0, 100) + "... "}
              <button
                onClick={() => setShowCaption(!showCaption)}
                className="text-primary font-bold cursor-pointer"
              >
                {showCaption ? "show less" : "see more"}
              </button>
            </p>
          </div>
        )}

        {/* Scheduler (inline date/time display) */}
        {showScheduler && (
          <div className="mb-6 p-5 bg-surface-container-high/50 rounded-lg">
            <div className="flex items-center gap-2 mb-4 text-primary font-bold text-sm">
              <span className="material-symbols-outlined text-lg">
                calendar_month
              </span>
              <span>Set Publication Date</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-surface-container-lowest rounded-sm border border-outline-variant/20">
                <span className="block text-[10px] uppercase tracking-wider text-outline-variant font-bold mb-1">
                  Date
                </span>
                <span className="font-medium text-on-surface">
                  Oct 24, 2024
                </span>
              </div>
              <div className="p-3 bg-surface-container-lowest rounded-sm border border-outline-variant/20">
                <span className="block text-[10px] uppercase tracking-wider text-outline-variant font-bold mb-1">
                  Time
                </span>
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

function RenderingVideoCard({ video }: { video: RenderingVideo }) {
  const isFullSkeleton = !video.title;

  return (
    <section className="opacity-80">
      <div className="bg-surface-container-lowest/50 rounded-xl p-6 border-dashed border-2 border-outline-variant/30">
        {/* Shimmer video placeholder */}
        <div className="aspect-video rounded-lg mb-6 shimmer" />

        {isFullSkeleton ? (
          <>
            <div className="h-6 w-3/4 shimmer rounded-full mb-8" />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-12 bg-surface-container-highest rounded-full shimmer" />
              <div className="w-24 h-12 bg-surface-container-highest rounded-full shimmer" />
            </div>
          </>
        ) : (
          <>
            {/* Title + status */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-headline font-bold text-on-surface-variant">
                {video.title}
              </h2>
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined animate-spin">
                  refresh
                </span>
                <span className="text-xs font-bold uppercase tracking-widest">
                  Rendering
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-8 text-on-surface-variant/60 text-sm">
              <span>{video.status}</span>
              <span className="h-1 w-12 bg-surface-container-highest rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary shimmer"
                  style={{ width: `${video.progress}%` }}
                />
              </span>
            </div>

            {/* Disabled buttons */}
            <div className="flex items-center gap-3">
              <button
                disabled
                className="flex-1 bg-surface-container-highest text-on-surface-variant/40 py-3 rounded-full font-label font-bold cursor-not-allowed"
              >
                Schedule
              </button>
              <button
                disabled
                className="px-6 py-3 border-2 border-surface-container-highest text-on-surface-variant/40 rounded-full font-label font-bold cursor-not-allowed"
              >
                Post now
              </button>
              <button
                disabled
                className="p-3 text-on-surface-variant/20 cursor-not-allowed"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default function ReviewPage() {
  return (
    <main className="pt-32 pb-40 px-6 max-w-3xl mx-auto">
      {/* Status Bar */}
      <div className="mb-12">
        <div className="flex justify-between items-end mb-4">
          <h1 className="text-2xl font-headline font-extrabold tracking-tight text-on-surface">
            {readyCount} of {totalVideos} videos ready
          </h1>
          <span className="text-sm font-label font-bold text-primary">
            {progressPercent}% Complete
          </span>
        </div>
        <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
          <div
            className="h-full primary-gradient rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Video Cards — interleaved ready + rendering */}
      <div className="space-y-10">
        {cardOrder.map((card, i) =>
          card.type === "ready" ? (
            <ReadyVideoCard key={`ready-${i}`} video={card.data} />
          ) : (
            <RenderingVideoCard key={`render-${i}`} video={card.data} />
          )
        )}
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
