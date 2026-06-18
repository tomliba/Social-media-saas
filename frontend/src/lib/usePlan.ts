"use client";

import { useEffect, useState } from "react";
import type { PlanName } from "@/lib/credits/config";

export interface PlanInfo {
  plan: PlanName;          // raw plan (display)
  entitledPlan: PlanName;  // status-aware plan (feature gating)
  balance: number;
  loading: boolean;
}

/**
 * Client hook for the current user's plan + credit balance, from
 * GET /api/credits/balance. `plan` is the raw subscription tier (for display);
 * `entitledPlan` is what the user may actually use right now (status-aware) and
 * is what feature locks should gate on.
 */
export function usePlan(): PlanInfo {
  const [info, setInfo] = useState<PlanInfo>({
    plan: "free",
    entitledPlan: "free",
    balance: 0,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    fetch("/api/credits/balance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d) {
          setInfo({
            plan: (d.plan as PlanName) ?? "free",
            entitledPlan: (d.entitledPlan as PlanName) ?? (d.plan as PlanName) ?? "free",
            balance: d.balance ?? 0,
            loading: false,
          });
        } else if (active) {
          setInfo((s) => ({ ...s, loading: false }));
        }
      })
      .catch(() => active && setInfo((s) => ({ ...s, loading: false })));
    return () => {
      active = false;
    };
  }, []);

  return info;
}
