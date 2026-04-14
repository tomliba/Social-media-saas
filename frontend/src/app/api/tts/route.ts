import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const flaskUrl = process.env.FLASK_API_URL;
  if (!flaskUrl) {
    return NextResponse.json({ error: "Flask backend not configured" }, { status: 503 });
  }

  const body = await req.json();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.FLASK_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(`${flaskUrl}/vg/tts`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: errText }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
