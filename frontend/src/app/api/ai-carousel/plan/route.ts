import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUseImageCarousel, type PlanName } from "@/lib/credits/config";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Paid image carousels are Creator+ (Free tier uses the HTML carousel).
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } });
  if (!canUseImageCarousel((user?.plan as PlanName) ?? "free")) {
    return NextResponse.json(
      { error: "Image carousels require a Creator or Pro plan" },
      { status: 403 }
    );
  }

  try {
    const { topic, tone, slideCount, style } = await req.json();

    if (!topic) {
      return NextResponse.json(
        { error: "topic is required" },
        { status: 400 }
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

    const res = await fetch(`${flaskUrl}/pg/plan_infographic`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        topic,
        tone: tone || "Friendly",
        slide_count: slideCount || 5,
        ...(style ? { style } : {}),
      }),
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
    console.error("ai-carousel plan error:", error);
    return NextResponse.json(
      { error: "Failed to plan infographic" },
      { status: 500 }
    );
  }
}
