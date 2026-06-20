import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refundCredits } from "@/lib/credits";
import { chargeSceneRegen } from "@/lib/credits/generate-gate";

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

  // ── First SCENE_REGEN_FREE_CAP regens per story are free; after that each
  //    regen is charged BEFORE the Flux call. ──
  const charge = await chargeSceneRegen({ userId, vgJobId });
  if (!charge.ok) {
    return NextResponse.json(charge, { status: 402 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.FLASK_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(`${flaskUrl}/vg/regenerate-single-image`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Regen failed — refund a *paid* regen (count-based keys advance, so the retry
    // still charges; no free retry). Free regens leave only a 0-credit row.
    if (charge.charged) {
      await refundCredits({ userId, jobId: charge.jobId, reason: "scene regen failed" }).catch(() => {});
    }
    const errText = await res.text();
    return NextResponse.json({ error: errText }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
