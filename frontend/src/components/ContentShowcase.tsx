const formats = [
  {
    name: "AI Video",
    content: (
      <div className="w-full h-full bg-gradient-to-br from-inverse-surface to-primary-dim flex items-center justify-center">
        <div className="text-center">
          <span
            className="material-symbols-outlined text-white"
            style={{ fontSize: "64px", fontVariationSettings: "'FILL' 1" }}
          >
            smart_display
          </span>
          <p className="text-white/70 text-xs mt-2 font-medium">
            AI Explainer
          </p>
        </div>
      </div>
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
    name: "Quote Card",
    content: (
      <div className="w-full h-full primary-gradient p-8 flex items-center justify-center">
        <div className="text-white text-center italic font-headline text-xl font-bold">
          &ldquo;Your output is only as good as your curation.&rdquo;
        </div>
      </div>
    ),
  },
  {
    name: "Thread",
    content: (
      <div className="w-full h-full bg-white p-6">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-container flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-2 w-1/3 bg-surface-variant rounded-full" />
              <div className="h-2 w-full bg-surface-container rounded-full" />
            </div>
          </div>
          <div className="h-2 w-full bg-surface-container rounded-full" />
          <div className="h-2 w-2/3 bg-surface-container rounded-full" />
          <div className="border-l-2 border-primary-container ml-4 pl-4 mt-4 space-y-2">
            <div className="h-2 w-full bg-surface-container rounded-full" />
            <div className="h-2 w-3/4 bg-surface-container rounded-full" />
          </div>
          <div className="border-l-2 border-primary-container ml-4 pl-4 space-y-2">
            <div className="h-2 w-full bg-surface-container rounded-full" />
            <div className="h-2 w-1/2 bg-surface-container rounded-full" />
          </div>
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
    <section className="py-24 bg-surface-container-low overflow-hidden">
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
