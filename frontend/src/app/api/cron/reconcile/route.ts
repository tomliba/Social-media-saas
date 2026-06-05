import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refundCredits, RECONCILE_STALE_MINUTES } from "@/lib/credits";

// Safety net for the fire-and-forget completion callback: any ContentItem stuck
// in "rendering" past the threshold is refunded and marked failed.
//
// Trigger via cron (e.g. Vercel Cron) with `Authorization: Bearer <CRON_SECRET>`.
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RECONCILE_STALE_MINUTES * 60 * 1000);
  const stuck = await prisma.contentItem.findMany({
    where: { status: "rendering", createdAt: { lt: cutoff } },
  });

  let reconciled = 0;
  for (const item of stuck) {
    try {
      // Idempotent; no-ops if the job was never charged (e.g. previews).
      await refundCredits({
        userId: item.userId,
        jobId: item.jobId,
        reason: "render timeout",
      });
      await prisma.contentItem.update({
        where: { id: item.id },
        data: { status: "failed", error: "render timeout" },
      });
      reconciled++;
    } catch (err) {
      console.error(`Reconcile failed for item ${item.id}:`, err);
    }
  }

  return NextResponse.json({ checked: stuck.length, reconciled });
}

export const GET = handle;
export const POST = handle;
