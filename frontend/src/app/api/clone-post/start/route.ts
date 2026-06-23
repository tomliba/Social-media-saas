import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const flaskUrl = process.env.FLASK_API_URL;
  if (!flaskUrl) {
    return NextResponse.json({ error: "Flask backend not configured" }, { status: 503 });
  }

  const body = await req.json();

  // Require a matching up-front charge for this clone (closes the direct-API
  // bypass): the page debits once via chargePost(jobId) before starting, so a
  // post_spend row must exist for this jobId + user.
  if (!body.jobId || typeof body.jobId !== "string") {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }
  const charge = await prisma.creditTransaction.findFirst({
    where: { jobId: body.jobId, type: "post_spend", userId, delta: { lt: 0 } },
    select: { id: true },
  });
  if (!charge) {
    return NextResponse.json(
      { error: "No charge found for this clone — generate through the app" },
      { status: 402 }
    );
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.FLASK_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  let res: Response;
  try {
    res = await fetch(`${flaskUrl}/clone/start`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: "Flask backend is unreachable" }, { status: 502 });
  }

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: errText }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
