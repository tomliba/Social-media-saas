import { NextRequest, NextResponse } from "next/server";
import { runs } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";
import { refundCredits, RECONCILE_STALE_MINUTES } from "@/lib/credits";

// Safety net for the completion callbacks. Any ContentItem stuck in a non-terminal
// state ("rendering"/"preparing") past the threshold is reconciled:
//
//   • Trigger.dev jobs (jobId "run_*") — verified against the run (source of truth):
//       - succeeded → mark "ready" with the rendered URL (no refund)
//       - failed    → refund the charge and mark "failed"
//       - running   → leave it; a later sweep will catch it
//       - unverifiable → leave it untouched (never refund what we can't confirm failed)
//   • Non-Trigger jobs (the bypass create flows) — no run to verify, but the charge
//       key == item.jobId, so refund whatever was charged under that key.
//       refundCredits is idempotent and no-ops when there is no unrefunded charge
//       (then we skip + log).
//
// We never select terminal states ("ready"/"failed"/"preview"): a stuck item is by
// definition still non-terminal, and refunding a "ready" item would claw back a
// successful render.
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
    where: { status: { in: ["rendering", "preparing"] }, createdAt: { lt: cutoff } },
  });

  let recovered = 0; // render actually succeeded → marked ready
  let refunded = 0; // render genuinely failed → refunded + marked failed
  let skipped = 0; // still running or could not be verified → left untouched

  for (const item of stuck) {
    try {
      if (item.jobId?.startsWith("run_")) {
        // ── Trigger.dev path: verify against the run (source of truth) ──
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
      } else {
        // ── Non-Trigger path (bypass flows) ──
        // No run to verify, but a non-terminal item past the cutoff is a dead
        // render. The charge key == item.jobId, so refund whatever was charged
        // under it. refundCredits is idempotent and returns a null transaction
        // when there is no unrefunded spend — in which case we skip + log.
        if (!item.jobId) {
          skipped++;
          console.warn(`Reconcile: stuck item ${item.id} has no jobId; skipping`);
          continue;
        }
        const result = await refundCredits({
          userId: item.userId,
          jobId: item.jobId,
          reason: "render stalled (reconcile)",
        });
        if (result.transaction && !result.idempotent) {
          await prisma.contentItem.update({
            where: { id: item.id },
            data: { status: "failed", error: "render stalled" },
          });
          refunded++;
        } else {
          skipped++;
          console.warn(`Reconcile: no unrefunded charge for stuck item ${item.id} (jobId "${item.jobId}"); skipping`);
        }
      }
    } catch (err) {
      console.error(`Reconcile failed for item ${item.id}:`, err);
    }
  }

  return NextResponse.json({ checked: stuck.length, recovered, refunded, skipped });
}

export const GET = handle;
export const POST = handle;
