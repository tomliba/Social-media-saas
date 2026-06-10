import Link from "next/link";

// NOTE: real testimonials only. The previous fabricated handles/quotes/follower
// counts were removed. This is an honest "coming soon" placeholder until we have
// genuine creator stories to show.
export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 px-6 mx-auto max-w-screen-2xl">
      <h2 className="font-headline font-bold text-4xl text-center mb-4 text-on-surface">
        Creator stories, coming soon
      </h2>
      <p className="text-center text-on-surface-variant text-lg max-w-2xl mx-auto mb-12">
        We&apos;re just getting started. Real reviews from real creators will land
        here as people start shipping with The Fluid Curator — no invented
        endorsements.
      </p>
      <div className="max-w-md mx-auto bg-surface-container-lowest p-8 rounded-[1rem] border border-dashed border-outline-variant/40 text-center">
        <span
          className="material-symbols-outlined text-primary text-4xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          reviews
        </span>
        <p className="text-on-surface-variant mt-3">
          Tried it and have feedback?{" "}
          {/* TODO: replace with a real contact address / feedback form. */}
          <a
            href="mailto:hello@thefluidcurator.com"
            className="text-primary font-semibold hover:underline"
          >
            Tell us your story
          </a>
          .
        </p>
        <p className="mt-6 text-xs text-on-surface-variant">
          Or just{" "}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            try it free
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
