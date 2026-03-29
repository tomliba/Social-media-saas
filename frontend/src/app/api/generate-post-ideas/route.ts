import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { topic, tone, niche, platform } = await req.json();

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

    const res = await fetch(`${flaskUrl}/pg/generate_ideas`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        topic,
        tone: tone || "funny_clean",
        language: "English",
        niche: niche || "",
        platform: platform || "instagram",
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
    console.error("generate-post-ideas error:", error);
    return NextResponse.json(
      { error: "Failed to generate ideas" },
      { status: 500 }
    );
  }
}
