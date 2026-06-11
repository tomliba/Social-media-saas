import { test, expect } from "@playwright/test";

/**
 * Deterministic prod acceptance for the render path (no LLM): hits the LIVE
 * deployed /api/render-carousel proxy with a real template + theme + slides,
 * exercising Vercel proxy -> Railway headless Chromium -> R2, and confirms it
 * returns real R2 PNG URLs that actually load. Uses the minted session
 * (storageState) from the e2e config.
 */

async function loads(request: import("@playwright/test").APIRequestContext, url: string) {
  const res = await request.get(url);
  const type = res.headers()["content-type"] || "";
  const bytes = (await res.body()).length;
  console.log(`  loads HTTP ${res.status()} type=${type} bytes=${bytes}  ${url}`);
  return res.status() === 200 && type.includes("image") && bytes > 1000;
}

test("live /api/render-carousel proxy returns real R2 image URLs", async ({ request }) => {
  test.setTimeout(180_000);

  // Template Image Post (stats, 1 slide) with real content.
  const imgRes = await request.post("/api/render-carousel", {
    timeout: 120_000,
    data: {
      templateId: "stats", themeId: "dark", width: 1080, height: 1350,
      slides: [{
        label: "ACCEPTANCE", number: "100", unit: "%",
        explanation: "template image post rendered live via backend Chromium",
        percentage: "PASS", source: "prod acceptance test",
      }],
    },
  });
  console.log(`[proxy] image POST -> HTTP ${imgRes.status()}`);
  expect(imgRes.ok(), "proxy must succeed for image post").toBeTruthy();
  const img = await imgRes.json();
  expect(Array.isArray(img.images) && img.images.length === 1, "1 image URL").toBeTruthy();
  console.log(`[proxy] IMAGE POST URL: ${img.images[0]}`);

  // Template Carousel (editorial, 3 slides).
  const carRes = await request.post("/api/render-carousel", {
    timeout: 120_000,
    data: {
      templateId: "editorial", themeId: "midnight_purple", width: 1080, height: 1350,
      slides: [{ handle: "@thefluidcurator" }, { handle: "@thefluidcurator" }, { handle: "@thefluidcurator" }],
    },
  });
  console.log(`[proxy] carousel POST -> HTTP ${carRes.status()}`);
  expect(carRes.ok(), "proxy must succeed for carousel").toBeTruthy();
  const car = await carRes.json();
  expect(Array.isArray(car.images) && car.images.length === 3, "3 carousel URLs").toBeTruthy();
  console.log(`[proxy] CAROUSEL URLS: ${car.images.join(" | ")}`);

  // Every returned URL must actually load as an image from R2.
  console.log("[proxy] verifying URLs load:");
  let allOk = true;
  for (const u of [...img.images, ...car.images]) allOk = (await loads(request, u)) && allOk;
  expect(allOk, "all rendered URLs must load as images").toBeTruthy();
});
