import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const flaskUrl = process.env.FLASK_API_URL;
  if (!flaskUrl) {
    return NextResponse.json({ error: "FLASK_API_URL not configured" }, { status: 500 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.FLASK_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const body = await req.json();
  const res = await fetch(`${flaskUrl}/vg/generate_script`, {
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
