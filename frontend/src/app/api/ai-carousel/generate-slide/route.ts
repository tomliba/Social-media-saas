import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUseImageCarousel, effectivePlan, maxCarouselSlides, type PlanName } from "@/lib/credits/config";

// High-quality gpt-image-1 fallback can take ~60s/slide; allow up to the Pro cap.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await req.json();

    if (!body.prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    // ── Server-side gate (defense-in-depth; the page charges up front) ──
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, subscriptionStatus: true },
    });
    const plan = effectivePlan((user?.plan as PlanName) ?? "free", user?.subscriptionStatus);
    if (!canUseImageCarousel(plan)) {
      return NextResponse.json(
        { error: "Image carousels require a Creator or Pro plan" },
        { status: 403 }
      );
    }
    if (typeof body.slide_number === "number" && body.slide_number > maxCarouselSlides(plan)) {
      return NextResponse.json(
        { error: `Slide ${body.slide_number} exceeds the ${maxCarouselSlides(plan)}-slide cap for your plan` },
        { status: 403 }
      );
    }
    // Require a matching up-front charge for this carousel job (closes the
    // direct-API bypass): the page debits once via chargePost(jobId) before
    // generating, so a post_spend row must exist for this jobId + user.
    if (!body.jobId || typeof body.jobId !== "string") {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }
    const charge = await prisma.creditTransaction.findFirst({
      where: { jobId: body.jobId, type: "post_spend", userId, delta: { lt: 0 } },
      select: { id: true },
    });
    if (!charge) {
      return NextResponse.json(
        { error: "No charge found for this carousel — generate through the app" },
        { status: 402 }
      );
    }

    const flaskUrl = process.env.FLASK_API_URL;
    if (!flaskUrl) {
      return NextResponse.json(
        { error: "FLASK_API_URL not configured" },
        { status: 500 }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const apiKey = process.env.FLASK_API_KEY;
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    const res = await fetch(`${flaskUrl}/pg/generate_ai_slide`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Flask error: ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("ai-carousel generate-slide error:", error);
    return NextResponse.json(
      { error: "Failed to generate slide" },
      { status: 500 }
    );
  }
}
