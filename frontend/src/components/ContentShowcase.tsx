const formats = [
  {
    name: "Character video",
    content: (
      <video
        src="/previews/character-video-loop.mp4"
        poster="/previews/character-video-loop.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Character video example"
        className="w-full h-full object-cover"
      />
    ),
  },
  {
    name: "AI Argument",
    content: (
      <video
        src="/previews/argument-loop.mp4"
        poster="/previews/argument-loop.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="AI Argument example"
        className="w-full h-full object-cover"
      />
    ),
  },
  {
    name: "AI voice story",
    content: (
      <video
        src="/previews/ai-story-loop.mp4"
        poster="/previews/ai-story-loop.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="AI voice story example"
        className="w-full h-full object-cover"
      />
    ),
  },
  {
    name: "Skeleton videos",
    content: (
      <video
        src="/previews/skeleton-loop.mp4"
        poster="/previews/skeleton-loop.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Skeleton video example"
        className="w-full h-full object-cover"
      />
    ),
  },
  {
    name: "Carousel",
    content: (
      <div className="w-full h-full bg-surface-container-lowest p-4 flex flex-col gap-2">
        <div className="h-1/2 w-full bg-gradient-to-br from-primary/20 to-primary-container/40 rounded-xl flex items-center justify-center">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontSize: "48px" }}
          >
            view_carousel
          </span>
        </div>
        <div className="flex-1 bg-surface-container-low rounded-xl p-4">
          <div className="h-2 w-1/2 bg-outline-variant/30 rounded-full mb-2" />
          <div className="h-2 w-full bg-outline-variant/30 rounded-full mb-2" />
          <div className="h-2 w-3/4 bg-outline-variant/30 rounded-full" />
        </div>
      </div>
    ),
  },
  {
    name: "Meme Ad",
    content: (
      <div className="w-full h-full bg-surface-container-lowest p-4 flex flex-col gap-2">
        <div className="flex-1 bg-gradient-to-br from-amber-200 to-orange-300 rounded-xl flex items-center justify-center">
          <span
            className="material-symbols-outlined text-orange-700"
            style={{ fontSize: "48px" }}
          >
            sentiment_very_satisfied
          </span>
        </div>
        <div className="h-10 bg-surface-container-low rounded-lg flex items-center justify-center px-3">
          <div className="h-2 w-2/3 bg-outline-variant/40 rounded-full" />
        </div>
      </div>
    ),
  },
];

export default function ContentShowcase() {
  return (
    <section id="features" className="py-24 bg-surface-container-low overflow-hidden">
      <style>{`
        @keyframes showcase-marquee {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
        .showcase-marquee-track {
          animation: showcase-marquee 55s linear infinite;
          will-change: transform;
        }
        .showcase-marquee-viewport:hover .showcase-marquee-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .showcase-marquee-track { animation: none; }
        }
      `}</style>
      <div className="mx-auto max-w-screen-2xl px-6 mb-12">
        <h2 className="font-headline font-bold text-4xl text-on-surface">
          What you can create
        </h2>
      </div>
      {/* Auto-scrolling marquee: the list is rendered twice so the loop is
          seamless. It drifts continuously, pauses on hover, and stops for
          users who prefer reduced motion (see globals.css). */}
      <div className="overflow-hidden pb-12 showcase-marquee-viewport">
        <div className="flex w-max showcase-marquee-track">
          {[...formats, ...formats].map((format, i) => (
            <div
              key={`${format.name}-${i}`}
              aria-hidden={i >= formats.length}
              className="flex-none w-[280px] mr-8 group"
            >
              <div className="aspect-[9/16] rounded-[2rem] overflow-hidden mb-4 shadow-lg group-hover:scale-[1.02] transition-transform">
                {format.content}
              </div>
              <p className="font-headline font-bold text-lg text-center">
                {format.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
