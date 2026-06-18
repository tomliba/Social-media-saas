import { describe, it, expect } from "vitest";
import {
  ESTIMATOR_ENTRIES,
  estimateCost,
  perPlanEstimate,
  findEntry,
} from "@/lib/credits/estimator";

describe("estimateCost", () => {
  it("AI Story at 30s costs 8 credits", () => {
    const entry = findEntry("AI Story");
    expect(estimateCost(entry, 30)).toBe(8);
  });

  it("AI Carousel at 6 slides costs 90 credits", () => {
    const entry = findEntry("AI Carousel");
    expect(estimateCost(entry, 6)).toBe(90);
  });

  it("AI Image Post at 1 idea costs 30 credits", () => {
    const entry = findEntry("AI Image Post");
    expect(estimateCost(entry, 1)).toBe(30);
  });

  it("a flat ad ignores the control value", () => {
    const entry = findEntry("Single AI Ad");
    expect(estimateCost(entry, 99)).toBe(15);
  });

  it("Animated AI at 30s costs 77 credits", () => {
    const entry = findEntry("Animated AI Video");
    expect(estimateCost(entry, 30)).toBe(77);
  });
});

describe("perPlanEstimate", () => {
  it("AI Story 30s → Free 3, Creator 75, Pro 375", () => {
    const entry = findEntry("AI Story");
    const cells = perPlanEstimate(entry, 30);
    expect(cells).toEqual([
      { plan: "free", available: true, count: 3 },
      { plan: "creator", available: true, count: 75 },
      { plan: "pro", available: true, count: 375 },
    ]);
  });

  it("Animated AI is Pro only on Free and Creator", () => {
    const entry = findEntry("Animated AI Video");
    const cells = perPlanEstimate(entry, 30);
    expect(cells[0]).toEqual({ plan: "free", available: false, label: "Pro only" });
    expect(cells[1]).toEqual({ plan: "creator", available: false, label: "Pro only" });
    expect(cells[2]).toEqual({ plan: "pro", available: true, count: 38 });
  });

  it("AI Carousel shows — for Free, numbers for Creator/Pro", () => {
    const entry = findEntry("AI Carousel");
    const cells = perPlanEstimate(entry, 6);
    expect(cells[0]).toEqual({ plan: "free", available: false, label: "—" });
    expect(cells[1]).toEqual({ plan: "creator", available: true, count: 6 });
    expect(cells[2]).toEqual({ plan: "pro", available: true, count: 33 });
  });
});

describe("ESTIMATOR_ENTRIES", () => {
  it("every slider entry has min/max/default within range", () => {
    for (const e of ESTIMATOR_ENTRIES) {
      if (e.kind === "flat") continue;
      expect(e.min).toBeLessThanOrEqual(e.default!);
      expect(e.default!).toBeLessThanOrEqual(e.max!);
    }
  });
});
