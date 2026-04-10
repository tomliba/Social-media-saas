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
}

const videoStyles: VideoStyle[] = [
  {
    id: "character",
    name: "Character video",
    description:
      "AI animated character with voice, lip sync, and custom backgrounds",
    icon: "person_play",
    gradient: "from-violet-600 to-indigo-500",
  },
  {
    id: "ai-story",
    name: "AI voice story",
    description:
      "Faceless AI-narrated videos with generated scenes, captions, and music",
    icon: "auto_stories",
    gradient: "from-fuchsia-600 to-purple-500",
    badge: "New",
  },
  {
    id: "argument",
    name: "Argument video",
    description:
      "Two characters debate over gameplay footage",
    icon: "forum",
    gradient: "from-orange-400 to-blue-500",
    badge: "New",
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              {/* Gradient preview area */}
              <div
                className={`w-full h-36 bg-gradient-to-br ${style.gradient} flex items-center justify-center`}
              >
                <span className="material-symbols-outlined text-5xl text-white/90">
                  {style.icon}
                </span>
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
