"use client";

import { Suspense } from "react";
import ArgumentSetup from "@/components/create/ArgumentSetup";
import { usePreferenceDefaults } from "@/lib/usePreferenceDefaults";
import { Spinner } from "@/components/ui/Spinner";

export default function ArgumentPage() {
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
      <ArgumentSetup prefs={prefs} />
    </Suspense>
  );
}
