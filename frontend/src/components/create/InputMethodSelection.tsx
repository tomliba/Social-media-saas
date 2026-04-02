"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const templatePills = ["Did You Know", "Myth Buster", "X vs Y", "Top 5"];

const trendingThumbnailColors = [
  "from-violet-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
];

const inputMethods = [
  {
    id: "templates",
    icon: "grid_view",
    iconFill: true,
    title: "Pick a template",
    description: "10 AI-generated viral ideas based on your niche",
    highlighted: true,
    formats: ["Video", "Image Post", "Carousel", "Text"],
    extra: (
      <div className="flex flex-wrap gap-2">
        {templatePills.map((pill) => (
          <span
            key={pill}
            className="px-3 py-1 rounded-full bg-surface-container text-xs font-semibold text-on-surface-variant"
          >
            {pill}
          </span>
        ))}
      </div>
    ),
  },
  {
    id: "ai-infographic",
    icon: "auto_awesome",
    iconFill: true,
    title: "AI Infographic Carousel",
    description: "AI designs each slide as a unique infographic: diagrams, flow charts, comparisons",
    highlighted: true,
    formats: ["Carousel"],
  },
  {
    id: "handdrawn",
    icon: "draw",
    iconFill: true,
    title: "Hand-Drawn Carousel",
    description: "Sketchy whiteboard style. Warm, approachable, educational",
    highlighted: true,
    formats: ["Carousel"],
  },
  {
    id: "notebook",
    icon: "menu_book",
    iconFill: true,
    title: "Notebook Carousel",
    description: "Spiral-bound notebook pages with doodles, speech bubbles, and highlighters",
    highlighted: true,
    formats: ["Carousel"],
  },
  {
    id: "paste-script",
    icon: "edit_note",
    title: "Paste your own script",
    description: "Paste your text and AI turns it into a video",
    formats: ["Video"],
  },
  {
    id: "remix",
    icon: "link",
    title: "Remix a viral video",
    description: "Paste a link and AI analyzes and creates your version",
    formats: ["Video"],
  },
  {
    id: "upload",
    icon: "upload_file",
    title: "Upload content",
    description: "PDF, document, or text. AI turns it into a video",
    formats: ["Video"],
  },
  {
    id: "trending",
    icon: "local_fire_department",
    iconFill: true,
    title: "Trending now",
    description: "Skeleton explainer, Before/After, and more",
    trending: true,
    extra: (
      <div className="flex gap-3">
        {trendingThumbnailColors.map((color, i) => (
          <div
            key={i}
            className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color}`}
          />
        ))}
      </div>
    ),
  },
];

export default function InputMethodSelection({
  selectedFormat,
}: {
  selectedFormat: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    if (selectedFormat === "Carousel") {
      router.push("/create/templates?format=carousel");
    } else if (selectedFormat === "Image Post") {
      router.push("/create/templates?format=image");
    }
  }, [selectedFormat, router]);

  if (selectedFormat === "Carousel" || selectedFormat === "Image Post") {
    return null;
  }

  return (
    <section className="max-w-3xl mx-auto">
      <h2 className="font-headline text-2xl font-bold mb-8 flex items-center gap-3">
        <span className="w-8 h-1 bg-primary rounded-full" />
        How do you want to start?
      </h2>

      <div className="flex flex-col gap-4">
        {inputMethods
          .filter((method) => method.formats?.includes(selectedFormat ?? ""))
          .map((method) => {
          const isHighlighted = method.highlighted;
          const isTrending = method.trending;

          return (
            <button
              key={method.id}
              onClick={() => {
                  const formatMap: Record<string, string> = {
                    "Video": "video",
                    "Image Post": "image",
                    "Carousel": "carousel",
                    "Text": "text",
                  };
                  const format = formatMap[selectedFormat ?? ""] || "video";
                  if (method.id === "paste-script") {
                    router.push("/create/paste-script");
                  } else if (method.id === "remix") {
                    router.push("/create/remix");
                  } else if (method.id === "upload") {
                    router.push("/create/upload-content");
                  } else {
                    router.push(`/create/templates?format=${format}`);
                  }
              }}
              className={`group flex items-center gap-6 p-6 bg-surface-container-lowest rounded-xl transition-all text-left relative overflow-hidden ${
                isHighlighted
                  ? "border-2 border-primary/20 shadow-[0px_4px_20px_rgba(111,51,213,0.08)] hover:border-primary/40 cursor-pointer"
                  : isTrending
                      ? "shadow-sm border border-tertiary-container/30"
                      : "shadow-sm"
              }`}
            >
              {/* Decorative blob for highlighted */}
              {isHighlighted && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
              )}
              {/* Gradient overlay for trending */}
              {isTrending && (
                <div className="absolute inset-0 bg-gradient-to-r from-tertiary-container/5 to-transparent rounded-xl pointer-events-none" />
              )}

              {/* Icon */}
              <div
                className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${
                  isHighlighted
                    ? "bg-primary-container/20 text-primary"
                    : isTrending
                      ? "bg-tertiary-container/10 text-tertiary"
                      : "bg-surface-container-low text-on-surface-variant"
                }`}
              >
                <span
                  className="material-symbols-outlined text-3xl"
                  style={
                    method.iconFill
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined
                  }
                >
                  {method.icon}
                </span>
              </div>

              {/* Content */}
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-headline text-xl font-bold">
                    {method.title}
                  </h4>
                  {isTrending && (
                    <span className="text-[10px] bg-tertiary text-on-tertiary px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                      New
                    </span>
                  )}
                </div>
                <p className="text-on-surface-variant mb-3">
                  {method.description}
                </p>
                {method.extra}
              </div>

              {/* Arrow */}
              <span
                className="material-symbols-outlined text-outline-variant transition-transform group-hover:translate-x-1"
              >
                chevron_right
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
