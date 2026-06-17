"use client";

import { useEffect, useState } from "react";
import type { PlanName } from "@/lib/credits/config";

export interface PlanInfo {
  plan: PlanName;
  balance: number;
  loading: boolean;
}

/**
 * Client hook for the current user's plan + credit balance, from
 * GET /api/credits/balance. Used by the create flows to surface plan-gated
 * locks (e.g. animation is Pro-only) and to render live credit costs.
 */
export function usePlan(): PlanInfo {
  const [info, setInfo] = useState<PlanInfo>({ plan: "free", balance: 0, loading: true });

  useEffect(() => {
    let active = true;
    fetch("/api/credits/balance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d) {
          setInfo({ plan: (d.plan as PlanName) ?? "free", balance: d.balance ?? 0, loading: false });
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
