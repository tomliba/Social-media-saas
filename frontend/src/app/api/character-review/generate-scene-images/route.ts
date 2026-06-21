import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { chargeVideo, refundRender } from "@/app/actions/charge-render";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const flaskUrl = process.env.FLASK_API_URL;
  if (!flaskUrl) {
    return NextResponse.json({ error: "FLASK_API_URL not configured" }, { status: 500 });
  }

  const body = await req.json();
  const vgJobId: string | undefined = body.vg_job_id;
  if (!vgJobId) {
    return NextResponse.json({ error: "vg_job_id is required" }, { status: 400 });
  }

  // ── Reserve the charge BEFORE the paid provider call (Nano Banana Pro images ──
  //    → Seedance). This is the animated-character flow's first paid step and is
  //    Pro-only. Mirrors the AI-story generate flow: charge at GENERATE keyed on
  //    the stable vg_job_id, not at export. Effects:
  //      • ineligible tiers (free/creator) get plan_not_allowed → 403 (upgrade
  //        modal) before any asset is generated — no leak, nothing charged;
  //      • eligible (Pro) tiers are charged ONCE here, so generating then
  //        abandoning before export still bills the real provider cost;
  //      • the later export charge (triggerVideoRenders) re-uses this same
  //        vg_job_id and is an idempotent no-op — never double-charges;
  //      • a retry of this route is idempotent on (vg_job_id, render_spend).
  const charge = await chargeVideo({
    jobId: vgJobId,
    format: "animated_character",
    durationSeconds: Number(body.duration) || 0,
  });
  if (!charge.ok) {
    const status =
      charge.error === "insufficient_credits" ? 402 : charge.error === "unauthenticated" ? 401 : 403;
    return NextResponse.json(charge, { status });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.FLASK_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  let res: Response;
  try {
    res = await fetch(`${flaskUrl}/vg/generate-scene-images`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    // Provider never reached — credit the reserve back (reuse the refund path).
    await refundRender({ jobId: vgJobId });
    return NextResponse.json({ error: err instanceof Error ? err.message : "fetch failed" }, { status: 502 });
  }

  if (!res.ok) {
    // Generation failed (no images delivered) — credit the reserve back, net zero.
    await refundRender({ jobId: vgJobId });
    const errText = await res.text();
    return NextResponse.json({ error: errText }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
