// Real testimonials provided by the founder (verbatim). No invented quotes or
// metrics. Names shown as given; monogram avatars (no fake photos).
const testimonials = [
  {
    name: "Jake Morrison",
    quote:
      "Honestly, I was pretty skeptical about AI-generated shorts, but one of the meme videos I made with this just hit 50k views. It's definitely saving me from content block when I'm too tired to actually set up my camera and film.",
  },
  {
    name: "Tyler Bennett",
    quote:
      "I started a faceless trivia channel last month, and this tool makes churning out daily videos stupidly easy. The AI voices sound way less robotic than the other text-to-speech apps I've tried.",
  },
  {
    name: "Sarah Jenkins",
    quote:
      "I run a local shop and simply don't have the budget to hire a freelance video editor for Instagram. This handles my weekly reels without me having to learn complicated software, which is a huge relief.",
  },
  {
    name: "Alyssa Martinez",
    quote:
      "I was spending hours every Sunday cutting clips and editing captions in CapCut just to keep up with the algorithm. Fluvio does the heavy lifting in about ten minutes, and the hooks it writes are actually pretty decent.",
  },
  {
    name: "Marcus Washington",
    quote:
      "My engagement was starting to tank, so I tried their brainrot/meme templates just as a joke to see what would happen. Surprisingly, the algorithm loved it, so now I use it whenever I need a quick post to fill my content calendar.",
  },
  {
    name: "Chloe Evans",
    quote:
      "Juggling a full-time job and a growing affiliate marketing page was totally burning me out. I was ready to give up on daily uploads, but being able to generate matching B-roll and natural-sounding voiceovers in a few clicks changed the game. Now I can schedule a whole week of TikToks in a single evening, and they actually look like I spent hours editing them.",
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 px-6 bg-surface-container-low">
      <div className="mx-auto max-w-screen-2xl">
        <h2 className="font-headline font-bold text-4xl text-center mb-4 text-on-surface">
          What creators are saying
        </h2>
        <p className="text-center text-on-surface-variant text-lg max-w-2xl mx-auto mb-12">
          Real feedback from people using Fluvio to keep their feeds fed.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="bg-surface-container-lowest p-6 rounded-[1rem] border border-outline-variant/10 shadow-sm flex flex-col gap-4 h-full"
            >
              <span
                className="material-symbols-outlined text-primary/30 text-3xl leading-none"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                format_quote
              </span>
              <div
                className="flex gap-0.5 text-amber-400"
                aria-label="Rated 5 out of 5 stars"
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="material-symbols-outlined text-lg leading-none"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    star
                  </span>
                ))}
              </div>
              <blockquote className="text-on-surface-variant text-sm leading-relaxed flex-1">
                {t.quote}
              </blockquote>
              <figcaption className="pt-2 border-t border-outline-variant/10">
                <span className="font-headline font-bold text-sm text-on-surface">
                  {t.name}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
