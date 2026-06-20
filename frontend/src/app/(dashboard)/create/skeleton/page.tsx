"use client";

import { Suspense } from "react";
import SkeletonSetup from "@/components/create/SkeletonSetup";
import { usePreferenceDefaults } from "@/lib/usePreferenceDefaults";
import { Spinner } from "@/components/ui/Spinner";

export default function SkeletonPage() {
  const { prefs, loaded } = usePreferenceDefaults();
  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }
  return (
    <Suspense>
      <SkeletonSetup prefs={prefs} />
    </Suspense>
  );
}
