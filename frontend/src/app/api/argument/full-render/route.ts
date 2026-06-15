import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // Thread this item's jobId to the backend so the full-render uploads to the
  // deterministic key videos/{jobId}.mp4 (read straight off the row, so it
  // provably equals ContentItem.jobId — what the reconcile cron checks for).
  const item = await prisma.contentItem.findUnique({
    where: { id: body.library_item_id },
    select: { jobId: true, userId: true },
  });
  if (item && item.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const res = await fetch(`${flaskUrl}/vg/argument/full-render`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      library_item_id: body.library_item_id,
      output_dir: body.output_dir,
      content_jobid: item?.jobId ?? null,
    }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
