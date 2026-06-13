// Image-post showcase images live in /public/showcase-posts (01.png … 09.png).
// Shown at their native aspect ratio (mostly square, one tweet) — no padding or
// cropping, so there are no blurred "filler" bands.
const POST_IMAGES = Array.from(
  { length: 9 },
  (_, i) => `/showcase-posts/${String(i + 1).padStart(2, "0")}.png`
);

// A vertical auto-scrolling feed of image posts. The list is rendered twice and
// the track drifts by exactly one set (-50% → 0) for a seamless loop. Pauses on
// hover; honours prefers-reduced-motion (see the <style> block below).
function PostFeed() {
  return (
    <div className="showcase-feed-viewport w-full h-full overflow-hidden bg-surface-container-lowest">
      <div className="showcase-feed-track flex flex-col">
        {[...POST_IMAGES, ...POST_IMAGES].map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            aria-hidden={i >= POST_IMAGES.length}
            loading="lazy"
            className="w-full h-auto block flex-none mb-2"
          />
        ))}
      </div>
    </div>
  );
}

// One carousel's slides live in /public/showcase-carousel (01.png … 09.png).
const CAROUSEL_IMAGES = Array.from(
  { length: 9 },
  (_, i) => `/showcase-carousel/${String(i + 1).padStart(2, "0")}.png`
);

// Vertical auto-scrolling feed of one carousel's slides. Drifts UP so the slides
// appear in order (01 → 09); downward motion would reveal them last-to-first.
// List rendered twice for a seamless loop; pauses on hover; honours reduced-motion.
function CarouselSlideshow() {
  return (
    <div
      className="showcase-carousel-viewport w-full h-full overflow-hidden"
      style={{ backgroundColor: "#faf3d7" }}
    >
      <div className="showcase-carousel-track flex flex-col">
        {[...CAROUSEL_IMAGES, ...CAROUSEL_IMAGES].map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            aria-hidden={i >= CAROUSEL_IMAGES.length}
            loading="lazy"
            className="w-full h-auto block flex-none mb-2 px-2"
          />
        ))}
      </div>
    </div>
  );
}

const formats = [
  {
    name: "Post",
    content: <PostFeed />,
  },
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
    content: <CarouselSlideshow />,
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
        @keyframes showcase-feed {
          from { transform: translateY(-50%); }
          to { transform: translateY(0); }
        }
        .showcase-feed-track {
          animation: showcase-feed 48s linear infinite;
          will-change: transform;
        }
        .showcase-feed-viewport:hover .showcase-feed-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .showcase-feed-track { animation: none; }
        }
        @keyframes showcase-carousel-up {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        .showcase-carousel-track {
          animation: showcase-carousel-up 36s linear infinite;
          will-change: transform;
        }
        .showcase-carousel-viewport:hover .showcase-carousel-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .showcase-carousel-track { animation: none; }
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
