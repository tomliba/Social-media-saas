import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * QA E2E: AI voice story (faceless AI-narrated) create flow, driven entirely
 * through the live website UI. Mirrors e2e/create-video.spec.ts but for the
 * "AI voice story" style which has a multi-step path:
 *
 *   1. /create/video-styles → "AI voice story" → /create/video-setup?style=ai-story
 *   2. Setup (defaults: topic=Scary Stories, static scenes, 30s) →
 *      "Generate story ideas" → script-review step (images generate in bg)
 *   3. "Preview video" → charges credits, creates ContentItem (status "preparing"),
 *      fires prepare-assets (Trigger.dev) → navigates to /library
 *   4. prepare-assets completes → item flips to "preview" (previewData populated)
 *   5. In /library, open the item → "Export 1080p HD" → render-preview (Remotion)
 *      → item flips to "rendering" then "ready" with a videoUrl
 *
 * The Remotion export serializes behind concurrencyLimit:1, so "rendering"
 * while queued is expected. We poll the prod DB (DATABASE_URL from .env.test).
 *
 * We track the ContentItem by its stable `id` (the jobId changes at the export
 * step), found as the newest item for the user created after test start.
 */

const prisma = new PrismaClient();
const USER_ID = process.env.E2E_USER_ID || "cmq8asgn300005w91yw84xrqd";

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function findNewItemId(since: Date, timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const item = await prisma.contentItem.findFirst({
      where: { userId: USER_ID, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { id: true, jobId: true, status: true, title: true },
    });
    if (item) {
      console.log(`[e2e] new item id=${item.id} jobId=${item.jobId} status=${item.status} title="${item.title}"`);
      return item.id;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

type Snap = { status: string; videoUrl: string | null; jobId: string | null; error: string | null };

async function waitForStatus(
  id: string,
  isDone: (s: Snap) => boolean,
  timeoutMs: number,
): Promise<Snap | null> {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  let snap: Snap | null = null;
  while (Date.now() < deadline) {
    const item = await prisma.contentItem.findUnique({
      where: { id },
      select: { status: true, videoUrl: true, jobId: true, error: true },
    });
    if (item) {
      snap = item;
      if (item.status !== last) {
        last = item.status;
        console.log(`[e2e] item ${id} status -> ${item.status}${item.error ? ` (error: ${item.error})` : ""}`);
      }
      if (isDone(item)) return item;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  return snap;
}

test("ai-story: setup → generate → preview → export → ready in library", async ({ page }) => {
  test.setTimeout(1_500_000); // 25 min: preview prep + full render (single-worker backend)
  const startedAt = new Date();

  // ── 1. Pick the AI voice story style ──
  await page.goto("/create/video-styles", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /AI voice story/i }).click();
  await page.waitForURL(/\/create\/video-setup\?style=ai-story/i, { timeout: 30_000 });

  // ── 2. Setup: keep cheapest defaults (Scary Stories, Static scenes, 30s). ──
  // Make sure 30s duration is selected (cheapest for per-second pricing).
  await page.getByRole("button", { name: /seconds/i }).first().click();
  await page.getByRole("button", { name: /^30 seconds$/i }).click().catch(() => {});

  // Generate the story script → moves to step 1 (script review).
  await page.getByRole("button", { name: /Generate story ideas/i }).click();

  // Script generation can take a while (Gemini). Wait for either the review
  // step OR a generation error banner so a backend failure is reported clearly.
  const genError = page.locator("text=/Script generation failed|Failed to generate story|No scenes returned/i");
  const reviewHeading = page.getByRole("heading", { name: /Review your story/i });
  await Promise.race([
    reviewHeading.waitFor({ state: "visible", timeout: 120_000 }).catch(() => {}),
    genError.first().waitFor({ state: "visible", timeout: 120_000 }).catch(() => {}),
  ]);
  if (await genError.first().isVisible().catch(() => false)) {
    throw new Error(`Story generation was rejected: "${await genError.first().innerText()}"`);
  }
  await expect(reviewHeading).toBeVisible({ timeout: 5_000 });

  // ── 3. Let scene images finish generating, then Preview video. ──
  // The thumbnail uses a generated image; give images time but don't block forever.
  // Images render in a fire-and-forget call; poll the DOM for spinners to clear.
  await page.waitForTimeout(2000);
  await page
    .waitForFunction(() => !document.querySelector(".animate-spin"), undefined, { timeout: 180_000 })
    .catch(() => { /* proceed even if some images are still loading/errored */ });

  const previewBtn = page.getByRole("button", { name: /Preview video/i });
  await expect(previewBtn).toBeEnabled({ timeout: 15_000 });

  // Surface client-side rejections (credits / plan / auth) instead of timing out.
  const errorBanner = page.locator("text=/insufficient|sign in|require the Pro plan|Please sign in/i");
  await previewBtn.click();

  await Promise.race([
    page.waitForURL(/\/library/i, { timeout: 30_000 }).catch(() => {}),
    errorBanner.first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {}),
  ]);
  if (await errorBanner.first().isVisible().catch(() => false)) {
    throw new Error(`Preview was rejected on the page: "${await errorBanner.first().innerText()}"`);
  }

  // ── 4. A ContentItem should now exist (status "preparing"). ──
  const itemId = await findNewItemId(startedAt, 60_000);
  expect(itemId, "Preview should create a ContentItem for the user").toBeTruthy();

  // Wait for prepare-assets to finish → status "preview" (or "failed").
  const prepared = await waitForStatus(
    itemId!,
    (s) => s.status === "preview" || s.status === "failed" || s.status === "ready",
    900_000, // up to 15 min for asset prep (TTS, images, scene timing, preview data)
  );
  console.log(`[e2e] after prepare: status=${prepared?.status} error=${prepared?.error ?? ""}`);
  expect(
    prepared?.status,
    `prepare-assets should reach "preview" (got "${prepared?.status}", error="${prepared?.error ?? ""}")`,
  ).not.toBe("failed");
  expect(["preview", "ready"]).toContain(prepared?.status);

  // If it somehow already rendered to ready, we're done.
  if (prepared?.status === "ready") {
    expect(prepared?.videoUrl, "a ready video must have a videoUrl").toBeTruthy();
    return;
  }

  // ── 5. Drive the export: open the preview item in /library, Export 1080p HD. ──
  await page.goto("/library", { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });

  // Open the preview modal. The newest card is the item we just created (library
  // is sorted newest-first); its "Render HD" button (accessible name
  // "movie Render HD") calls onReview to open the modal. The old code clicked the
  // non-interactive "Preview ready" status label, so the modal never opened.
  const openModalBtn = page.getByRole("button", { name: /Render HD/i }).first();
  await expect(openModalBtn).toBeVisible({ timeout: 30_000 });
  await openModalBtn.click();

  const exportBtn = page.getByRole("button", { name: /Export 1080p HD/i });
  await expect(exportBtn).toBeVisible({ timeout: 30_000 });
  await exportBtn.click();

  // ── 6. Poll until the Remotion render finishes ("ready") or fails. ──
  // Render queues behind concurrencyLimit:1; allow generous time.
  const final = await waitForStatus(
    itemId!,
    (s) => s.status === "ready" || s.status === "failed",
    1_500_000, // up to 25 min
  );
  console.log(
    `[e2e] FINAL: status=${final?.status} jobId=${final?.jobId} videoUrl=${final?.videoUrl ? "yes" : "no"} error=${final?.error ?? ""}`,
  );

  expect(
    final?.status,
    `render should finish "ready" (got "${final?.status}", error="${final?.error ?? ""}")`,
  ).toBe("ready");
  expect(final?.videoUrl, "a ready video must have a videoUrl").toBeTruthy();
});
