"use client";

import Link from "next/link";

/**
 * Shown when a create action is blocked because the user lacks enough credits.
 * Reused across all create flows (video-setup, editor, animated review).
 */
export default function InsufficientCreditsDialog({
  needed,
  balance,
  onClose,
}: {
  needed: number;
  balance: number;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">Not enough credits</h2>
        <p className="mt-2 text-sm text-gray-600">
          This needs <span className="font-semibold">{needed}</span> credits, but you
          have <span className="font-semibold">{balance}</span>.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <Link
            href="/pricing"
            className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-purple-700"
          >
            Get more credits
          </Link>
        </div>
      </div>
    </div>
  );
}
