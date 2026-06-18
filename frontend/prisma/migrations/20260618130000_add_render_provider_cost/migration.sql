-- Observability only: measured USD provider cost per render + per-step breakdown.
-- Additive + nullable → zero-downtime, safe on the live shared DB. Does NOT touch
-- credit charging/refund. null = not captured (dashboard falls back to estimate).
ALTER TABLE "ContentItem" ADD COLUMN "providerCostUsd" DOUBLE PRECISION;
ALTER TABLE "ContentItem" ADD COLUMN "costBreakdown" JSONB;
