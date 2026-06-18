import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectivePlan, type PlanName } from "@/lib/credits/config";

// GET /api/credits/balance — current user's credit balance + plan.
// Returns the raw plan (for display) plus the status-aware entitledPlan (for
// feature gating) and subscriptionStatus, so the client can render the real
// plan name while gating locks on actual entitlement.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { creditBalance: true, plan: true, subscriptionStatus: true },
  });
  const plan = (user?.plan as PlanName) ?? "free";
  return NextResponse.json({
    balance: user?.creditBalance ?? 0,
    plan,
    entitledPlan: effectivePlan(plan, user?.subscriptionStatus),
    subscriptionStatus: user?.subscriptionStatus ?? null,
  });
}
