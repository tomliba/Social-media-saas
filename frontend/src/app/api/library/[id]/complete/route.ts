import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCallbackSecret } from "@/lib/callback-auth";
import { refundCredits } from "@/lib/credits";

// POST /api/library/[id]/complete — update item status after render
// Called by Trigger.dev tasks (server-to-server). The route is allow-listed in
// middleware, so it is protected by a shared secret instead of a user session.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Shared-secret auth (prevents runId spoofing) ──
  if (!verifyCallbackSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, videoUrl, thumbnailUrl, renderTimeSec, error, previewData } = body;

  if (!status || !["ready", "failed", "preview"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'ready' or 'failed'" },
      { status: 400 }
    );
  }

  // Look up by item id first, then fall back to jobId (Trigger.dev run ID)
  let item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item) {
    item = await prisma.contentItem.findUnique({ where: { jobId: id } });
  }

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.contentItem.update({
    where: { id: item.id },
    data: {
      status,
      videoUrl: videoUrl ?? null,
      thumbnailUrl: thumbnailUrl ?? null,
      renderTimeSec: renderTimeSec ?? null,
      error: error ?? null,
      ...(previewData !== undefined && { previewData }),
    },
  });

  // ── Refund credits on render failure ──
  // Idempotent on (jobId, "refund"); no-ops for jobs that were never charged
  // (e.g. preview callbacks), so this is safe for all callers of this route.
  if (status === "failed") {
    try {
      await refundCredits({
        userId: item.userId,
        jobId: item.jobId,
        reason: typeof error === "string" && error ? error : "render failed",
      });
    } catch (err) {
      // Don't fail the callback if the refund hiccups — the reconciliation
      // sweep will catch any missed refunds.
      console.error("Refund on failure failed:", err);
    }
  }

  return NextResponse.json({ item: updated });
}
