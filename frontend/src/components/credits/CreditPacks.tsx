"use client";

import { useState } from "react";
import { startTopUpCheckout } from "@/app/actions/checkout";
import { TOPUP_PACKS } from "@/lib/credits/config";

/**
 * "Buy More Credits" entry point on the account page. Collapsed by default;
 * expands to the one-time top-up packs. Each pack is a server-action form that
 * redirects to the Lemon Squeezy hosted checkout (see startTopUpCheckout).
 */
export default function CreditPacks() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full border-2 border-primary text-primary font-label font-bold hover:bg-primary/5 transition-colors active:scale-95"
      >
        <span className="material-symbols-outlined text-lg">add</span>
        Buy More Credits
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-headline">
          One-time top-up
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Cancel
        </button>
      </div>
      {TOPUP_PACKS.map((pack) => (
        <form key={pack.credits} action={startTopUpCheckout}>
          <input type="hidden" name="credits" value={pack.credits} />
          <button
            type="submit"
            className="w-full flex items-center justify-between py-3 px-5 rounded-2xl border-2 border-primary/40 hover:border-primary hover:bg-primary/5 transition-colors active:scale-[0.98]"
          >
            <span className="font-bold text-on-surface">
              {pack.credits.toLocaleString()} credits
            </span>
            <span className="font-bold text-primary">${pack.priceUsd.toFixed(2)}</span>
          </button>
        </form>
      ))}
    </div>
  );
}
