"use client";

import { useRouter } from "next/navigation";

const formats = [
  {
    name: "Video",
    description: "AI explainers, tutorials, stories, myth busters",
    badge: "Most popular",
    visual: (
      <div className="relative w-full h-64 overflow-hidden bg-gradient-to-br from-violet-900 via-indigo-800 to-purple-700">
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
        {/* Most popular badge */}
        <div className="absolute top-4 right-4 bg-primary text-on-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          Most popular
        </div>
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
            <span
              className="material-symbols-outlined text-primary text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              play_arrow
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    name: "Image Post",
    description: "AI-generated images with captions",
    visual: (
      <div className="relative w-full h-64 overflow-hidden bg-surface-container-low flex items-center justify-center">
        <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-amber-200 via-rose-200 to-violet-300 shadow-lg flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-5xl">
            image
          </span>
        </div>
      </div>
    ),
  },
  {
    name: "Carousel",
    description: "Educational slides for Instagram",
    visual: (
      <div className="relative w-full h-64 overflow-hidden flex items-center justify-center bg-surface-container-low px-12">
        <div className="relative flex">
          <div className="w-32 h-44 bg-white rounded-lg shadow-lg rotate-[-12deg] flex-shrink-0 border border-outline-variant/10" />
          <div className="w-32 h-44 bg-white rounded-lg shadow-lg rotate-[-6deg] absolute left-6 border border-outline-variant/10" />
          <div className="w-32 h-44 bg-primary rounded-lg shadow-xl absolute left-12 flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-3xl">
              view_carousel
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    name: "Text",
    description: "Captions, threads, hooks for any platform",
    visual: (
      <div className="relative w-full h-64 overflow-hidden bg-surface-container-low flex flex-col justify-center gap-4 px-12">
        <div className="h-4 w-3/4 bg-surface-container-highest rounded-full" />
        <div className="h-4 w-full bg-surface-container-highest rounded-full" />
        <div className="h-4 w-2/3 bg-primary/20 rounded-full" />
        <div className="flex gap-4 mt-2">
          <div className="w-8 h-8 rounded-full bg-surface-container-highest" />
          <div className="w-8 h-8 rounded-full bg-surface-container-highest" />
        </div>
      </div>
    ),
  },
];

export default function FormatPicker({
  selectedFormat,
  onSelect,
}: {
  selectedFormat: string | null;
  onSelect: (name: string) => void;
}) {
  const router = useRouter();

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
      {formats.map((format) => {
        const isSelected = selectedFormat === format.name;
        return (
          <button
            key={format.name}
            onClick={() => {
              if (format.name === "Video") {
                router.push("/create/video-styles");
                return;
              }
              onSelect(format.name);
            }}
            className={`group relative flex flex-col items-start text-left overflow-hidden bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.99] ${
              isSelected
                ? "ring-2 ring-primary shadow-lg shadow-primary/10"
                : ""
            }`}
          >
            {format.visual}
            <div className="p-6">
              <h3 className="font-headline text-2xl font-bold mb-1">
                {format.name}
              </h3>
              <p className="text-on-surface-variant">{format.description}</p>
            </div>
          </button>
        );
      })}
    </section>
  );
}
