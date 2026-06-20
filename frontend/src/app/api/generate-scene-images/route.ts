import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { chargeStoryGenerate, markStoryImagesReady, refundStoryGenerate } from "@/lib/credits/generate-gate";

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

  // ── Charge the static base BEFORE the first paid provider call (Flux). This is
  //    the leak fix: the debit commits server-side in the same request that
  //    triggers generation, so closing the tab — or calling this route directly —
  //    cannot get free image generation. Idempotent on vg_job_id, so Preview/Export
  //    and retries never double-charge. ──
  const charge = await chargeStoryGenerate({
    userId,
    vgJobId,
    style: typeof body.style === "string" ? body.style : "ai-story",
    durationSeconds: Number(body.duration) || 0,
    title: typeof body.title === "string" ? body.title : undefined,
  });
  if (!charge.ok) {
    const status = charge.error === "insufficient_credits" ? 402 : 403;
    return NextResponse.json(charge, { status });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.FLASK_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(`${flaskUrl}/vg/generate-scene-images`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // No images delivered — refund the base server-side and mark the item failed.
    const errText = await res.text();
    await refundStoryGenerate({ userId, vgJobId, reason: "scene generation failed" });
    return NextResponse.json({ error: errText }, { status: res.status });
  }

  // Images delivered — the base charge is consumed; take the item off "preparing"
  // so a long edit session before Export isn't clawed back by the reconcile cron.
  await markStoryImagesReady(vgJobId);

  const data = await res.json();
  return NextResponse.json(data);
}
