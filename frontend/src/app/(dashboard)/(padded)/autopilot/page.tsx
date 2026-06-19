import Link from "next/link";

// Autopilot is not implemented yet. The route is kept so direct navigation
// shows a clear "Coming Soon" message instead of a broken/mock page.
export default function AutopilotPage() {
  return (
    <div className="max-w-3xl mx-auto py-24 text-center">
      <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-primary-container/30 flex items-center justify-center text-primary">
        <span
          className="material-symbols-outlined text-4xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          auto_awesome
        </span>
      </div>

      <span className="inline-block mb-5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-500 text-xs font-bold uppercase tracking-widest">
        Coming Soon
      </span>

      <h1 className="text-4xl font-black font-headline text-on-surface tracking-tight mb-4">
        Autopilot is on the way
      </h1>
      <p className="text-lg text-on-surface-variant leading-relaxed max-w-md mx-auto mb-10">
        Hands-free content that creates and posts for you every day isn&apos;t
        available yet. We&apos;ll let you know the moment it&apos;s ready.
      </p>

      <Link
        href="/create"
        className="inline-block bg-primary text-on-primary px-8 py-4 rounded-full font-label font-bold shadow-lg hover:scale-105 transition-transform active:scale-95"
      >
        Create content now
      </Link>
    </div>
  );
}
