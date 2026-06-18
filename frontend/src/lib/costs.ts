// Provider dollar-cost rates — observability only (NOT credit pricing). The
// backend (Flask) is the source of truth for the *units* (image count + model,
// video seconds, TTS bytes, LLM tokens, transcribe minutes) since that's where
// the providers are actually called; it computes providerCostUsd + breakdown
// and reports them at completion. These same constants must be mirrored in the
// Flask repo (see the instrumentation spec). This module holds the rate table,
// the breakdown TYPE the dashboard reads, and a helper for any unit-based
// computation we do on this side (e.g. the local-dev direct-Flask path).
//
// Confirmed rates (2026-06-18). Ignore the stale "$0.011/s" Seedance code
// comment elsewhere — it is WRONG.

export const PROVIDER_RATES = {
  // Atlas-hosted image models, USD per image
  fluxSchnellPerImage: 0.003,
  fluxDevPerImage: 0.012,
  fluxKontextDevPerImage: 0.025,
  // Atlas-hosted video, USD per second
  seedanceProFastPerSecond: 0.018, // bytedance seedance v1-pro-fast
  // Gemini 2.5 Flash, USD per token
  geminiFlashInputPerToken: 0.30 / 1_000_000,
  geminiFlashOutputPerToken: 2.50 / 1_000_000,
  // Fish Audio TTS, USD per UTF-8 byte ($15 / 1M bytes). NOTE: non-Latin chars
  // are multi-byte → cost from BYTES, not character count.
  fishTtsPerByte: 15 / 1_000_000,
  // OpenAI transcription, USD per minute (pick the model the backend uses)
  whisper1PerMinute: 0.006,
  gpt4oMiniTranscribePerMinute: 0.003,
} as const;

export type FluxModel = "schnell" | "dev" | "kontext-dev";
export type TranscribeModel = "whisper-1" | "gpt-4o-mini-transcribe";

// Shape stored in ContentItem.costBreakdown (Json). Every sub-key optional —
// only the steps a given render used are present. `estimated: true` marks a
// breakdown that contains any unconfirmed-rate component (e.g. gpt-image-1
// fallback) so the dashboard can flag it.
export interface CostBreakdown {
  flux?: { model: FluxModel; images: number; usd: number };
  seedance?: { seconds: number; usd: number };
  tts?: { bytes: number; usd: number };
  llm?: { inputTokens: number; outputTokens: number; usd: number };
  transcribe?: { minutes: number; model: TranscribeModel; usd: number };
  imageGenFallback?: { images: number; usd: number; estimated: true }; // gpt-image-1 / DALL-E tail
  estimated?: boolean;
  totalUsd: number;
}

const FLUX_RATE: Record<FluxModel, number> = {
  schnell: PROVIDER_RATES.fluxSchnellPerImage,
  dev: PROVIDER_RATES.fluxDevPerImage,
  "kontext-dev": PROVIDER_RATES.fluxKontextDevPerImage,
};
const TRANSCRIBE_RATE: Record<TranscribeModel, number> = {
  "whisper-1": PROVIDER_RATES.whisper1PerMinute,
  "gpt-4o-mini-transcribe": PROVIDER_RATES.gpt4oMiniTranscribePerMinute,
};

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

export const fluxCost = (model: FluxModel, images: number) => round4(FLUX_RATE[model] * images);
export const seedanceCost = (seconds: number) => round4(PROVIDER_RATES.seedanceProFastPerSecond * seconds);
export const fishTtsCost = (bytes: number) => round4(PROVIDER_RATES.fishTtsPerByte * bytes);
export const geminiFlashCost = (inputTokens: number, outputTokens: number) =>
  round4(inputTokens * PROVIDER_RATES.geminiFlashInputPerToken + outputTokens * PROVIDER_RATES.geminiFlashOutputPerToken);
export const transcribeCost = (model: TranscribeModel, minutes: number) =>
  round4(TRANSCRIBE_RATE[model] * minutes);

/** Units a render consumed; used for any cost we compute on this side. */
export interface ProviderUnits {
  flux?: { model: FluxModel; images: number };
  seedanceSeconds?: number;
  ttsBytes?: number;
  llm?: { inputTokens: number; outputTokens: number };
  transcribe?: { model: TranscribeModel; minutes: number };
}

/** Build a breakdown + total from raw units. Mirror of the Flask-side logic. */
export function computeProviderCost(units: ProviderUnits): CostBreakdown {
  const b: CostBreakdown = { totalUsd: 0 };
  if (units.flux) b.flux = { ...units.flux, usd: fluxCost(units.flux.model, units.flux.images) };
  if (units.seedanceSeconds != null) b.seedance = { seconds: units.seedanceSeconds, usd: seedanceCost(units.seedanceSeconds) };
  if (units.ttsBytes != null) b.tts = { bytes: units.ttsBytes, usd: fishTtsCost(units.ttsBytes) };
  if (units.llm) b.llm = { ...units.llm, usd: geminiFlashCost(units.llm.inputTokens, units.llm.outputTokens) };
  if (units.transcribe) b.transcribe = { ...units.transcribe, usd: transcribeCost(units.transcribe.model, units.transcribe.minutes) };
  b.totalUsd = round4(
    (b.flux?.usd ?? 0) + (b.seedance?.usd ?? 0) + (b.tts?.usd ?? 0) + (b.llm?.usd ?? 0) + (b.transcribe?.usd ?? 0)
  );
  return b;
}
