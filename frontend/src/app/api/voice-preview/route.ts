import { NextRequest, NextResponse } from "next/server";

const FLASK_URL = process.env.FLASK_URL || "http://localhost:5000";
const API_KEY = process.env.FLASK_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { voice_id } = await req.json();

    if (!voice_id) {
      return NextResponse.json({ error: "voice_id is required" }, { status: 400 });
    }

    const res = await fetch(`${FLASK_URL}/vg/voice-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({ voice_id }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Voice preview failed" }, { status: res.status });
    }

    const audioBuffer = await res.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("voice-preview error:", error);
    return NextResponse.json({ error: "Failed to get voice preview" }, { status: 500 });
  }
}
