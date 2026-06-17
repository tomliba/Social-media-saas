import { describe, it, expect } from "vitest";
import {
  videoCost,
  videoBatchCost,
  postCost,
  postBatchCost,
  canUseVideoFormat,
  videoFormatFromBackgroundMode,
  VIDEO_BASE,
} from "@/lib/credits/config";

// These assert the LOCKED pricing numbers actually fire. If a constant in
// config.ts drifts, one of these breaks — that is the point.
// Video pricing is per-second: cost = VIDEO_BASE + ceil(rate × seconds).

describe("videoCost — per-second (base + rate × seconds)", () => {
  it("VIDEO_BASE is 5", () => {
    expect(VIDEO_BASE).toBe(5);
  });

  it("standard lane (0.1/s) = 5 + ceil(0.1 × seconds)", () => {
    expect(videoCost("ai_story", 30)).toBe(8);   // 5 + ceil(3)
    expect(videoCost("ai_story", 90)).toBe(14);  // 5 + ceil(9)
    expect(videoCost("argument", 30)).toBe(8);
    expect(videoCost("ai_images", 30)).toBe(8);
  });

  it("the cheap lanes share the standard rate", () => {
    for (const f of ["stock", "motion", "green", "smart_mix"] as const) {
      expect(videoCost(f, 60)).toBe(11);          // 5 + ceil(6)
    }
  });

  it("skeleton (0.35/s) = 5 + ceil(0.35 × seconds)", () => {
    expect(videoCost("skeleton", 30)).toBe(16);   // 5 + ceil(10.5)
    expect(videoCost("skeleton", 60)).toBe(26);   // 5 + ceil(21)
  });
});

describe("videoCost — animated (2.4/s, Pro-only)", () => {
  it("= 5 + ceil(2.4 × seconds)", () => {
    expect(videoCost("animated_story", 30)).toBe(77);      // 5 + ceil(72)
    expect(videoCost("animated_story", 60)).toBe(149);     // 5 + ceil(144)
    expect(videoCost("animated_character", 90)).toBe(221); // 5 + ceil(216)
  });
});

describe("videoBatchCost", () => {
  it("sums mixed formats", () => {
    expect(
      videoBatchCost([
        { format: "skeleton", durationSeconds: 30 },           // 16
        { format: "smart_mix", durationSeconds: 30 },          // 8
        { format: "animated_character", durationSeconds: 90 }, // 221
      ])
    ).toBe(245);
  });
});

describe("videoFormatFromBackgroundMode", () => {
  it("maps UI labels to formats", () => {
    expect(videoFormatFromBackgroundMode("Smart Mix")).toBe("smart_mix");
    expect(videoFormatFromBackgroundMode("Stock Footage")).toBe("stock");
    expect(videoFormatFromBackgroundMode("AI Images")).toBe("ai_images");
    expect(videoFormatFromBackgroundMode("Motion Graphics")).toBe("motion");
    expect(videoFormatFromBackgroundMode("Green Screen")).toBe("green");
    expect(videoFormatFromBackgroundMode("Animated AI")).toBe("animated_character");
  });

  it("falls back to smart_mix on unknown/empty", () => {
    expect(videoFormatFromBackgroundMode(undefined)).toBe("smart_mix");
    expect(videoFormatFromBackgroundMode("Nonsense")).toBe("smart_mix");
  });
});

describe("postCost", () => {
  it("image_post_ai is 30 per idea", () => {
    expect(postCost("image_post_ai", { ideas: 1 })).toBe(30);
    expect(postCost("image_post_ai", { ideas: 3 })).toBe(90);
  });

  it("a 5-slide gemini carousel is 75", () => {
    expect(postCost("carousel_infographic", { slides: 5 })).toBe(75);
    expect(postCost("carousel_handdrawn", { slides: 5 })).toBe(75);
    expect(postCost("carousel_notebook", { slides: 5 })).toBe(75);
  });

  it("post_cloner is 15", () => {
    expect(postCost("post_cloner")).toBe(15);
  });

  it("free HTML formats are 2", () => {
    for (const f of ["image_post_template", "carousel_designed", "text"] as const) {
      expect(postCost(f)).toBe(2);
    }
  });

  it("single gemini ads are 15", () => {
    for (const f of ["ad_creative", "ai_scene", "meme_ad", "ecommerce_ad"] as const) {
      expect(postCost(f)).toBe(15);
    }
  });
});

describe("postBatchCost", () => {
  it("sums mixed post formats", () => {
    expect(
      postBatchCost([
        { format: "image_post_ai", ideas: 2 },        // 60
        { format: "carousel_notebook", slides: 5 },   // 75
        { format: "text" },                           // 2
      ])
    ).toBe(137);
  });
});

describe("canUseVideoFormat — animation gating", () => {
  it("blocks animation for free and creator, allows it for pro", () => {
    for (const f of ["animated_character", "animated_story"] as const) {
      expect(canUseVideoFormat("free", f)).toBe(false);
      expect(canUseVideoFormat("creator", f)).toBe(false);
      expect(canUseVideoFormat("pro", f)).toBe(true);
    }
  });

  it("allows non-animated formats on every plan", () => {
    for (const plan of ["free", "creator", "pro"] as const) {
      expect(canUseVideoFormat(plan, "stock")).toBe(true);
      expect(canUseVideoFormat(plan, "skeleton")).toBe(true);
    }
  });

  // Matrix completion: stock + skeleton are covered above; assert the remaining
  // non-animated formats across all plans. Note `ai_story` is per-second priced
  // and NOT animation-gated despite the name — only animated_* are Pro-gated.
  it("allows the remaining non-animated formats on all three plans", () => {
    const remaining = [
      "motion",
      "green",
      "smart_mix",
      "ai_story",
      "ai_images",
      "argument",
    ] as const;
    for (const plan of ["free", "creator", "pro"] as const) {
      for (const f of remaining) {
        expect(canUseVideoFormat(plan, f)).toBe(true);
      }
    }
  });
});

describe("batch cost edge cases", () => {
  it("empty batches cost 0", () => {
    expect(videoBatchCost([])).toBe(0);
    expect(postBatchCost([])).toBe(0);
  });

  it("a mixed free + paid post batch sums correctly", () => {
    // image_post_template (free HTML, 2) + ad_creative (single Gemini ad, 15)
    //   + image_post_ai{ideas:1} (30) = 47
    expect(
      postBatchCost([
        { format: "image_post_template" },
        { format: "ad_creative" },
        { format: "image_post_ai", ideas: 1 },
      ])
    ).toBe(47);
  });
});
