"use client";

import { useRouter } from "next/navigation";

function PreviewCard({ src, badge, children, position = "top" }: { src: string; badge?: string; children?: React.ReactNode; position?: "top" | "bottom" | "center" }) {
  return (
    <div className="relative w-full aspect-[4/3] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className={`w-full h-full object-cover ${position === "bottom" ? "object-bottom" : position === "center" ? "object-center" : "object-top"}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      {badge && (
        <div className="absolute top-4 right-4 bg-primary text-on-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          {badge}
        </div>
      )}
      {children}
    </div>
  );
}

const formats = [
  {
    name: "Video",
    description: "AI explainers, tutorials, stories, myth busters",
    badge: "Most popular",
    visual: (
      <PreviewCard src="/previews/cards/character-video.png" badge="Most popular" position="bottom">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
          </div>
        </div>
      </PreviewCard>
    ),
  },
  {
    name: "Image Post",
    description: "AI-generated images with captions",
    visual: <PreviewCard src="/previews/cards/image-post.png" />,
  },
  {
    name: "Carousel",
    description: "Educational slides for Instagram",
    visual: <PreviewCard src="/previews/cards/carousel.png" />,
  },
  {
    name: "Text",
    description: "Captions, threads, hooks for any platform",
    visual: <PreviewCard src="/previews/cards/text-format.png" />,
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
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
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
            <div className="p-4">
              <h3 className="font-headline text-base font-bold mb-0.5">
                {format.name}
              </h3>
              <p className="text-on-surface-variant text-xs leading-snug">{format.description}</p>
            </div>
          </button>
        );
      })}
    </section>
  );
}
