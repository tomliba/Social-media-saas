"use server";

import { prepareAssetsViaFlask } from "@/lib/flask-render";
import type { PrepareAssetsPayload } from "../../../trigger/prepare-assets";

export interface PrepareAssetsHandle {
  runId: string;
  publicAccessToken: string;
  title: string;
}

export async function triggerPrepareAssets(
  payload: PrepareAssetsPayload
): Promise<PrepareAssetsHandle> {
  const useTrigger = !!process.env.TRIGGER_SECRET_KEY;

  if (useTrigger) {
    const { tasks } = await import("@trigger.dev/sdk");
    const handle = await tasks.trigger("prepare-assets", payload);

    return {
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken!,
      title: payload.title,
    };
  }

  // ── Direct Flask path (local dev) ──
  // Run synchronously, then update the library item directly
  const result = await prepareAssetsViaFlask(payload);

  // Build creative settings from the payload
  const aiStory = payload.settings.aiStory;
  const creativeSettings = {
    captionStyle: aiStory.captionStyle ?? undefined,
    captionFontSize: aiStory.captionFontSize ?? undefined,
    captionTextTransform: aiStory.captionTransform ?? undefined,
    captionPosition: aiStory.captionPosition ?? undefined,
    music: aiStory.music ?? undefined,
    filmGrain: aiStory.filmGrain,
    shakeEffect: aiStory.shakeEffect,
    transitionStyle: aiStory.transitionStyle,
    hookText: aiStory.hook,
    style: "ai-story",
  };

  // Sanitize backgroundPaths
  const previewData = {
    ...result.previewData,
    backgroundPaths: (result.previewData.backgroundPaths ?? []).filter(
      (p: string) => typeof p === "string" && p.startsWith("https://")
    ),
  };

  // Update library item if libraryItemId was provided
  if (payload.libraryItemId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    console.log("[prepare-assets] Calling preview-ready with libraryItemId:", payload.libraryItemId, "appUrl:", appUrl);
    const prRes = await fetch(`${appUrl}/api/library/${payload.libraryItemId}/preview-ready`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "preview",
        previewData: JSON.stringify(previewData),
        creativeSettings: JSON.stringify(creativeSettings),
        resolvedSegments: JSON.stringify(result.resolvedSegments),
        durationSec: Math.round(result.previewData.durationInFrames / result.previewData.fps),
      }),
    });
    console.log("[prepare-assets] preview-ready response:", prRes.status, await prRes.text());
  }

  return {
    runId: result.jobId,
    publicAccessToken: "",
    title: payload.title,
  };
}
