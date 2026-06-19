"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Video styles ──

interface VideoStyle {
  id: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
  badge?: string;
  preview?: string;
  previewPosition?: "top" | "bottom" | "center";
}

const videoStyles: VideoStyle[] = [
  {
    id: "character",
    name: "Character video",
    description:
      "AI animated character with voice, lip sync, and custom backgrounds",
    icon: "person_play",
    gradient: "from-violet-600 to-indigo-500",
    preview: "/previews/cards/character-video.png",
    previewPosition: "bottom",
  },
  {
    id: "ai-story",
    name: "AI voice story",
    description:
      "Faceless AI-narrated videos with generated scenes, captions, and music",
    icon: "auto_stories",
    gradient: "from-fuchsia-600 to-purple-500",
    badge: "New",
    preview: "/previews/cards/ai-story.png",
  },
  {
    id: "argument",
    name: "Argument video",
    description:
      "Two characters debate over gameplay footage",
    icon: "forum",
    gradient: "from-orange-400 to-blue-500",
    badge: "New",
    preview: "/previews/cards/argument-video.png",
    previewPosition: "bottom",
  },
  {
    id: "skeleton",
    name: "Skeleton videos",
    description:
      "3D X-ray skeleton explainers trending on TikTok, Reels, and Shorts",
    icon: "skeleton",
    gradient: "from-cyan-700 to-slate-800",
    badge: "Trending",
    preview: "/previews/cards/skeleton-video.png",
  },
];

// ── Page ──

export default function VideoStylesPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(style: VideoStyle) {
    setSelected(style.id);
    if (style.id === "argument") {
      router.push("/create/argument");
    } else if (style.id === "skeleton") {
      router.push("/create/skeleton");
    } else {
      router.push(`/create/video-setup?style=${style.id}`);
    }
  }

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      {/* Back */}
      <Link
        href="/create"
        className="mb-8 inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back
      </Link>

      {/* Header */}
      <div className="mb-10">
        <h1 className="font-headline font-bold text-3xl text-on-surface mb-2">
          Pick a style
        </h1>
        <p className="text-on-surface-variant text-base">
          Select the visual format for your next viral hit
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {videoStyles.map((style) => {
          const isSelected = selected === style.id;

          return (
            <button
              key={style.id}
              onClick={() => handleSelect(style)}
              className={`group relative flex flex-col items-start gap-3 rounded-2xl overflow-hidden text-left transition-all
                bg-surface-container-lowest border
                ${
                  isSelected
                    ? "border-2 border-primary"
                    : "border-outline-variant/30 hover:border-outline-variant"
                }`}
            >
              {/* Preview area */}
              <div className="relative w-full aspect-[3/4] overflow-hidden">
                {style.preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={style.preview} alt="" className={`w-full h-full object-cover ${style.previewPosition === "bottom" ? "object-bottom" : "object-top"}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  </>
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${style.gradient} flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-5xl text-white/90">{style.icon}</span>
                  </div>
                )}
              </div>

              {/* Badge */}
              {style.badge && (
                <span className="absolute top-3 right-3 bg-white/90 text-primary text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {style.badge}
                </span>
              )}

              <div className="p-5 pt-2">
                <h3 className="font-headline font-semibold text-base text-on-surface mb-1">
                  {style.name}
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {style.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
