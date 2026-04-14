"use client";

import { Suspense } from "react";
import SkeletonSetup from "@/components/create/SkeletonSetup";

export default function SkeletonPage() {
  return (
    <Suspense>
      <SkeletonSetup />
    </Suspense>
  );
}
