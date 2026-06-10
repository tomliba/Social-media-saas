import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/credits/balance — current user's credit balance + plan.
// Returns plan/subscriptionStatus too so the sidebar can show the real plan
// without a second request.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { creditBalance: true, plan: true, subscriptionStatus: true },
  });
  return NextResponse.json({
    balance: user?.creditBalance ?? 0,
    plan: user?.plan ?? "free",
    subscriptionStatus: user?.subscriptionStatus ?? null,
  });
}
