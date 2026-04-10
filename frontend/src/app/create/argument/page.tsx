"use client";

import { Suspense } from "react";
import ArgumentSetup from "@/components/create/ArgumentSetup";

export default function ArgumentPage() {
  return (
    <Suspense>
      <ArgumentSetup />
    </Suspense>
  );
}
