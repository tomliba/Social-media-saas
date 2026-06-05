"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// TODO: tune low-balance threshold (placeholder)
const LOW_CREDIT_THRESHOLD = 20;

/** Sidebar credit balance with a subtle low-balance / upgrade prompt. */
export default function CreditBalance() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchBalance = async () => {
      try {
        const res = await fetch("/api/credits/balance");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setBalance(data.balance ?? 0);
      } catch {
        /* ignore — keep last known value */
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

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
