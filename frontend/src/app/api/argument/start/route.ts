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

    const res = await fetch(`${flaskUrl}/vg/argument/start`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        vg_job_id: body.vg_job_id,
        lines: body.lines,
        background_video: body.background_video,
        speed: body.speed,
        caption_style: body.caption_style,
        caption_font_size: body.caption_font_size,
        caption_text_transform: body.caption_text_transform,
        caption_position: body.caption_position,
        music: body.music,
        film_grain: body.film_grain,
        shake_effect: body.shake_effect,
        preview: body.preview,
        library_item_id: body.library_item_id,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Flask /vg/argument/start error:", errText);
      return NextResponse.json(
        { error: `Argument start failed (${res.status})` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("argument/start error:", error);
    return NextResponse.json(
      { error: "Failed to start argument video" },
      { status: 500 }
    );
  }
}
