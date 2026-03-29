const testimonials = [
  {
    handle: "@fitness.sarah",
    followers: "230K followers",
    quote:
      "I used to spend my entire Sunday batching content. Now I do it Tuesday at lunch. The AI scripts actually sound like me.",
    color: "from-pink-200 to-rose-300",
    icon: "fitness_center",
  },
  {
    handle: "@tech.tomas",
    followers: "1.2M followers",
    quote:
      "Scaling my YouTube Shorts channel was impossible until this tool. I went from 3 posts a week to 3 posts a day.",
    color: "from-violet-200 to-indigo-300",
    icon: "computer",
  },
  {
    handle: "@growth.lexi",
    followers: "45K followers",
    quote:
      "The Carousel generator is a cheat code. It turns my messy thoughts into professional designs in literally seconds.",
    color: "from-amber-200 to-orange-300",
    icon: "palette",
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 px-6 mx-auto max-w-screen-2xl">
      <h2 className="font-headline font-bold text-4xl text-center mb-16 text-on-surface">
        What our community is saying
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        {testimonials.map((t) => (
          <div
            key={t.handle}
            className="bg-surface-container-lowest p-8 rounded-[1rem] shadow-[0px_20px_40px_rgba(111,51,213,0.06)] border border-outline-variant/10 flex flex-col gap-6"
          >
            {/* Avatar + info */}
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center`}
              >
                <span className="material-symbols-outlined text-white text-2xl">
                  {t.icon}
                </span>
              </div>
              <div>
                <p className="font-bold">{t.handle}</p>
                <p className="text-sm text-on-surface-variant">{t.followers}</p>
              </div>
            </div>

            {/* Stars */}
            <div className="flex text-primary mb-2">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              ))}
            </div>

            {/* Quote */}
            <p className="text-lg leading-relaxed italic text-on-surface-variant">
              &ldquo;{t.quote}&rdquo;
            </p>

            {/* Content thumbnail placeholder */}
            <div
              className={`w-full h-40 rounded-md bg-gradient-to-br ${t.color} opacity-60`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
