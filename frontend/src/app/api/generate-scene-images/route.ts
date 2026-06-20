import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { chargeStoryGenerate } from "@/lib/credits/generate-gate";

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
    // The charge stands; the "preparing" ContentItem anchored at the charge lets
    // the reconcile cron refund an abandoned/stuck job server-side. (Refunding here
    // would free a retry, since the idempotent charge won't re-debit.)
    const errText = await res.text();
    return NextResponse.json({ error: errText }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
