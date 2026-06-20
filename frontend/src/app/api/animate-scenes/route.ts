import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refundCredits } from "@/lib/credits";
import { chargeAnimationSurcharge } from "@/lib/credits/generate-gate";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const flaskUrl = process.env.FLASK_API_URL;
  if (!flaskUrl) {
    return NextResponse.json({ error: "Flask backend not configured" }, { status: 503 });
  }

  const body = await req.json();
  const vgJobId: string | undefined = body.vg_job_id;
  if (!vgJobId) {
    return NextResponse.json({ error: "vg_job_id is required" }, { status: 400 });
  }

  // ── Charge the animation surcharge (animated − static base) BEFORE kicking off
  //    the paid animation provider. Pro-gated, idempotent on `${vgJobId}:animate`. ──
  const charge = await chargeAnimationSurcharge({
    userId,
    vgJobId,
    style: typeof body.style === "string" ? body.style : "ai-story",
    durationSeconds: Number(body.duration) || 0,
  });
  if (!charge.ok) {
    const status = charge.error === "insufficient_credits" ? 402 : 403;
    return NextResponse.json(charge, { status });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.FLASK_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(`${flaskUrl}/vg/animate-scenes`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Animation never started — refund the surcharge (it has no reconcile anchor).
    await refundCredits({ userId, jobId: `${vgJobId}:animate`, reason: "animation start failed" }).catch(() => {});
    const errText = await res.text();
    return NextResponse.json({ error: errText }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
