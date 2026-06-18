import { videoFormatFromBackgroundMode } from "@/lib/credits/config";

/**
 * Single source of truth for deriving a render's "mode" label from the fields
 * ContentItem actually stores (format / templateId / backgroundMode). The exact
 * cost bucket used at charge time is NOT persisted, so this is a best-effort
 * reconstruction — reused everywhere a panel groups renders by mode so the
 * derivation stays consistent.
 */
export function deriveRenderMode(item: {
  format: string;
  backgroundMode: string | null;
  templateId: string | null;
}): string {
  const { format, backgroundMode, templateId } = item;

  if (format === "video") {
    if (templateId === "Argument") return "argument";
    if (templateId === "AI Story") return "ai_story";
    // Character / standard video: bucket from the background mode the UI stamped.
    return videoFormatFromBackgroundMode(backgroundMode);
  }

  // Posts (no per-second video cost bucket).
  if (format === "carousel") return "carousel";
  if (format === "image") return "image_post";
  if (format === "text") return "text";
  return format || "unknown";
}
