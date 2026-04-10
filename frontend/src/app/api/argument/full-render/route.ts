import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const flaskUrl = process.env.FLASK_API_URL;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.FLASK_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(`${flaskUrl}/vg/argument/full-render`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      library_item_id: body.library_item_id,
      output_dir: body.output_dir,
    }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
