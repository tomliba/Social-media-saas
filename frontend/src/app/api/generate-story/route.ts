import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const flaskUrl = process.env.FLASK_API_URL;
    if (!flaskUrl) {
      return NextResponse.json(
        { error: "Flask backend not configured" },
        { status: 503 }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const apiKey = process.env.FLASK_API_KEY;
    if (apiKey) headers["X-API-Key"] = apiKey;

    const style = body.style || "ai-story";

    const res = await fetch(`${flaskUrl}/vg/generate_script`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        topic: body.topic,
        custom_prompt: body.customPrompt || "",
        tone: body.tone || "dramatic",
        style,
        art_style: body.artStyle || "anime",
        duration: body.duration || 30,
        language: body.language || "Auto Detect",
        voice_id: body.voiceId || undefined,
        mode: body.mode || "topic",
        scene_mode: body.scene_mode || "static",
        ...(body.niche && { niche: body.niche }),
        ...(body.pastedScript && { pasted_script: body.pastedScript }),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Flask /vg/generate_script error:", errText);
      return NextResponse.json(
        { error: `Script generation failed (${res.status})` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("generate-story error:", error);
    return NextResponse.json(
      { error: "Failed to generate story" },
      { status: 500 }
    );
  }
}
