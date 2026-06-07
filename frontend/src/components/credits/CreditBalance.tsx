import Link from "next/link";

// TODO: tune low-balance threshold (placeholder)
const LOW_CREDIT_THRESHOLD = 20;

/**
 * Sidebar credit balance with a subtle low-balance / upgrade prompt.
 * Presentational — the balance is polled once by the parent Sidebar
 * (via /api/credits/balance) and passed in, avoiding a duplicate fetch.
 */
export default function CreditBalance({ balance }: { balance: number | null }) {
  const low = balance !== null && balance < LOW_CREDIT_THRESHOLD;

  return (
    <div className="px-4 mt-auto">
      <div className="bg-surface-container-highest p-4 rounded-xl mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Credits
          </span>
          <span
            className="material-symbols-outlined text-sm text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            toll
          </span>
        </div>
        <p className="text-2xl font-bold text-on-surface">
          {balance === null ? "—" : balance.toLocaleString()}
        </p>
        {low && (
          <p className="text-xs text-on-surface-variant mt-1">Running low on credits.</p>
        )}
        <Link
          href="/pricing"
          className="block w-full mt-3 py-2 text-center text-sm font-bold text-primary bg-white rounded-lg shadow-sm hover:bg-zinc-50"
        >
          {low ? "Get more credits" : "Upgrade plan"}
        </Link>
      </div>
    </div>
  );
}
