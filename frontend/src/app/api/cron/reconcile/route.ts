import { NextRequest, NextResponse } from "next/server";
import { runs } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";
import { refundCredits, RECONCILE_STALE_MINUTES } from "@/lib/credits";

// Safety net for the completion callback. Any ContentItem stuck in "rendering"
// past the threshold is reconciled against the source of truth — the Trigger.dev
// run — so we never refund a render that actually succeeded:
//
//   • run succeeded  → mark the item "ready" with the rendered video URL (no refund)
//   • run failed     → refund the charge and mark the item "failed"
//   • still running  → leave it; a later sweep will catch it
//   • unverifiable   → leave it untouched (never refund what we can't confirm failed)
//
// Trigger via cron (e.g. Vercel Cron) with `Authorization: Bearer <CRON_SECRET>`.
export const dynamic = "force-dynamic";

/** Shape of the various render task outputs we may read a URL from. */
interface RenderOutput {
  videoUrl?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  results?: { imageUrls?: string[] }[];
}

function extractUrls(output: unknown): { videoUrl: string | null; thumbnailUrl: string | null } {
  const out = (output ?? {}) as RenderOutput;
  const videoUrl = out.videoUrl ?? null;
  const thumbnailUrl =
    out.thumbnailUrl ?? out.previewUrl ?? out.results?.[0]?.imageUrls?.[0] ?? videoUrl ?? null;
  return { videoUrl, thumbnailUrl };
}

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

  let recovered = 0; // render actually succeeded → marked ready
  let refunded = 0; // render genuinely failed → refunded + marked failed
  let skipped = 0; // still running or could not be verified → left untouched

  for (const item of stuck) {
    try {
      // Only Trigger.dev runs (jobId === run id) can be verified. Direct/local
      // jobs resolve synchronously and should never be stuck here; if one is, we
      // cannot confirm it failed, so we leave it rather than risk a bad refund.
      if (!item.jobId?.startsWith("run_")) {
        skipped++;
        console.warn(`Reconcile: skipping item ${item.id} — jobId "${item.jobId}" is not a Trigger run`);
        continue;
      }

      let run;
      try {
        run = await runs.retrieve(item.jobId);
      } catch (err) {
        // Can't reach Trigger / run not found — don't refund on uncertainty.
        skipped++;
        console.error(`Reconcile: could not retrieve run ${item.jobId} for item ${item.id}:`, err);
        continue;
      }

      if (run.isSuccess) {
        // Render succeeded but the callback never landed — recover, do NOT refund.
        const { videoUrl, thumbnailUrl } = extractUrls(run.output);
        await prisma.contentItem.update({
          where: { id: item.id },
          data: { status: "ready", videoUrl, thumbnailUrl, error: null },
        });
        recovered++;
      } else if (run.isExecuting || run.isQueued || run.isWaiting) {
        // Genuinely still in progress (e.g. long render or a retry) — leave it.
        skipped++;
      } else {
        // Terminal non-success (failed, crashed, cancelled, timed out) — refund.
        // Idempotent; no-ops if the job was never charged (e.g. previews).
        await refundCredits({
          userId: item.userId,
          jobId: item.jobId,
          reason: `render ${run.status.toLowerCase()}`,
        });
        await prisma.contentItem.update({
          where: { id: item.id },
          data: { status: "failed", error: `render ${run.status.toLowerCase()}` },
        });
        refunded++;
      }
    } catch (err) {
      console.error(`Reconcile failed for item ${item.id}:`, err);
    }
  }

  return NextResponse.json({ checked: stuck.length, recovered, refunded, skipped });
}

export const GET = handle;
export const POST = handle;
