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
    name: "Skeleton Video",
    content: (
      <div className="w-full h-full bg-gradient-to-br from-cyan-700 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <span
            className="material-symbols-outlined text-cyan-200"
            style={{ fontSize: "64px", fontVariationSettings: "'FILL' 1" }}
          >
            animation
          </span>
          <p className="text-white/60 text-xs mt-2 font-medium">X-ray explainer</p>
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
  {
    name: "Text Video",
    content: (
      <div className="w-full h-full bg-inverse-surface relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-black text-4xl text-center px-4 leading-tight font-headline">
            THE FUTURE IS FLUID
          </span>
        </div>
      </div>
    ),
  },
];

export default function ContentShowcase() {
  return (
    <section id="features" className="py-24 bg-surface-container-low overflow-hidden">
      <div className="mx-auto max-w-screen-2xl px-6 mb-12">
        <h2 className="font-headline font-bold text-4xl text-on-surface">
          What you can create
        </h2>
      </div>
      <div className="flex overflow-x-auto pb-12 px-6 gap-8 no-scrollbar scroll-smooth">
        {formats.map((format) => (
          <div key={format.name} className="flex-none w-[280px] group">
            <div className="aspect-[9/16] rounded-[2rem] overflow-hidden mb-4 shadow-lg group-hover:scale-[1.02] transition-transform">
              {format.content}
            </div>
            <p className="font-headline font-bold text-lg text-center">
              {format.name}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
