import Link from "next/link";

// Honest founder-credibility section (replaces the old "testimonials coming
// soon" placeholder). Real follower counts provided by the founder; both
// Instagram profile URLs verified to resolve (HTTP 200). No invented
// quotes/testimonials anywhere — the founder accounts are the social proof.
// `image` is optional: when a real profile image is provided, the card uses it;
// otherwise it falls back to a clean letter monogram (no fake/silhouette photo).
type Account = { handle: string; href: string; followers: string; blurb: string; image?: string };

const accounts: Account[] = [
  {
    handle: "@doctor_curses",
    href: "https://instagram.com/doctor_curses",
    followers: "1.1M followers",
    blurb: "Daily short-form content.",
  },
  {
    handle: "@prof_georgasm",
    href: "https://instagram.com/prof_georgasm",
    followers: "650K followers",
    blurb: "Short-form edutainment.",
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 px-6 mx-auto max-w-screen-2xl">
      <h2 className="font-headline font-bold text-4xl text-center mb-4 text-on-surface">
        Built by creators who live this
      </h2>
      <p className="text-center text-on-surface-variant text-lg max-w-2xl mx-auto mb-12">
        Fluvio is built by the team behind two large short-form accounts that
        produce exactly the kind of content Fluvio makes. We built it to ship our
        own posts faster — now it&apos;s yours.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {accounts.map((a) => (
          <a
            key={a.handle}
            href={a.href}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface-container-lowest p-8 rounded-[1rem] border border-outline-variant/10 hover:border-primary/30 hover:shadow-lg transition-all flex flex-col gap-3 group"
          >
            <div className="flex items-center gap-3">
              {a.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.image}
                  alt={a.handle}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full primary-gradient flex items-center justify-center text-white font-headline font-bold text-lg">
                  {a.handle.replace("@", "").charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-headline font-bold text-on-surface group-hover:text-primary transition-colors">
                  {a.handle}
                </p>
                <p className="text-sm text-on-surface-variant">{a.followers}</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant/40 ml-auto group-hover:text-primary transition-colors">
                open_in_new
              </span>
            </div>
            <p className="text-on-surface-variant text-sm">{a.blurb}</p>
          </a>
        ))}
      </div>
      <p className="text-center text-xs text-on-surface-variant mt-8">
        The same tooling we use on our own accounts.{" "}
        <Link href="/signup" className="text-primary font-semibold hover:underline">
          Try it free
        </Link>
        .
      </p>
    </section>
  );
}
