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
}

const videoStyles: VideoStyle[] = [
  {
    id: "character",
    name: "Character video",
    description:
      "AI animated character with voice, lip sync, and custom backgrounds",
    icon: "person_play",
  },
];

// ── Page ──

export default function VideoStylesPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(style: VideoStyle) {
    setSelected(style.id);
    router.push(`/create/video-setup?style=${style.id}`);
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
              className={`group flex flex-col items-start gap-3 rounded-2xl p-5 text-left transition-all
                bg-surface-container-lowest border
                ${
                  isSelected
                    ? "border-2 border-primary"
                    : "border-outline-variant/30 hover:border-outline-variant"
                }`}
            >
              <span className="material-symbols-outlined text-3xl text-primary">
                {style.icon}
              </span>

              <div>
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
