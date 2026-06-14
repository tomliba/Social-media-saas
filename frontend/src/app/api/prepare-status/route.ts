import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/prepare-status?runId=xxx
 *
 * Polls Trigger.dev for the prepare-assets task status.
 * Requires an authenticated session, and the run must be tagged with the
 * caller's user id (set when triggered) so users can only read their own jobs.
 * Returns { status, stage, stageLabel, progress, output? }.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runId = req.nextUrl.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  const secretKey = process.env.TRIGGER_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Trigger.dev not configured" }, { status: 500 });
  }

  try {
    const { runs } = await import("@trigger.dev/sdk");
    const run = await runs.retrieve(runId);

    // Ownership: the run must carry this user's tag.
    if (!run.tags?.includes(`user:${session.user.id}`)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const meta = (run.metadata ?? {}) as Record<string, unknown>;

    if (run.status === "COMPLETED") {
      return NextResponse.json({
        status: "completed",
        stage: meta.stage ?? "complete",
        stageLabel: meta.stageLabel ?? "Complete!",
        progress: 100,
        output: run.output,
      });
    }

    if (run.status === "FAILED" || run.status === "CANCELED" || run.status === "CRASHED") {
      return NextResponse.json({
        status: "failed",
        stage: meta.stage ?? "failed",
        stageLabel: meta.stageLabel ?? "Failed",
        progress: meta.progress ?? 0,
        error: meta.errorMessage ?? "Asset preparation failed",
      });
    }

    // Still running
    return NextResponse.json({
      status: "running",
      stage: meta.stage ?? "queued",
      stageLabel: meta.stageLabel ?? "Preparing...",
      progress: meta.progress ?? 0,
    });
  } catch (err) {
    console.error("Failed to check prepare-assets status:", err);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
