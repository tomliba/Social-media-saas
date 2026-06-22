"use client";

import Link from "next/link";

/**
 * In-app "Upgrade to Pro" modal shown when a free/Creator user clicks a Pro-only
 * feature (animated scenes/backgrounds). It overlays the create flow so the user
 * stays in the app and can dismiss it — unlike a hard redirect to /pricing, which
 * kicks them out of what they were doing. The CTA links to /pricing only if they
 * actively choose to upgrade.
 */
export default function UpgradeModal({
  open,
  onClose,
  feature = "Animated videos",
}: {
  open: boolean;
  onClose: () => void;
  feature?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-600" style={{ fontVariationSettings: "'FILL' 1" }}>
            workspace_premium
          </span>
          <h2 className="text-lg font-semibold text-gray-900">{feature} are a Pro feature</h2>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Upgrade to Pro to unlock animated scenes, priority rendering, and a commercial license.
          You can keep using everything else on your current plan.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Maybe later
          </button>
          <Link
            href="/pricing"
            className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-purple-700"
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    </div>
  );
}
