import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCreditBalance } from "@/lib/credits";

// GET /api/credits/balance — current user's credit balance
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const balance = await getCreditBalance(session.user.id);
  return NextResponse.json({ balance });
}
