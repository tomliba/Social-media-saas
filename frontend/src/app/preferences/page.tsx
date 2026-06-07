import Link from "next/link";

// Per-format default preferences aren't built yet. Route kept so direct
// navigation shows a clear "Coming Soon" message (matches the Autopilot treatment).
export default function PreferencesPage() {
  return (
    <div className="max-w-3xl mx-auto py-24 text-center">
      <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-primary-container/30 flex items-center justify-center text-primary">
        <span
          className="material-symbols-outlined text-4xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          tune
        </span>
      </div>

      <span className="inline-block mb-5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-500 text-xs font-bold uppercase tracking-widest">
        Coming Soon
      </span>

      <h1 className="text-4xl font-black font-headline text-on-surface tracking-tight mb-4">
        Preferences are on the way
      </h1>
      <p className="text-lg text-on-surface-variant leading-relaxed max-w-md mx-auto mb-10">
        Set your defaults per video format here soon.
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
