import Link from "next/link";

export default function DashboardNav() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm flex justify-between items-center px-6 py-3">
      <Link
        href="/"
        className="text-2xl font-bold bg-gradient-to-br from-violet-600 to-violet-400 bg-clip-text text-transparent font-headline tracking-tight"
      >
        The Fluid Curator
      </Link>
      <div className="flex items-center gap-3">
        <button className="bg-primary text-on-primary px-5 py-2 rounded-full font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
          Create
        </button>
        <button className="p-2 text-on-surface-variant hover:bg-zinc-100 transition-colors rounded-full">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="p-1 rounded-full border border-outline-variant/20">
          <span className="material-symbols-outlined text-3xl">
            account_circle
          </span>
        </button>
      </div>
    </nav>
  );
}
