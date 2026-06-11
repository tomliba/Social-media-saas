import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * QA: Image Post create flow (HTML-template path → /api/render-carousel).
 *
 * Flow driven:
 *   /create/templates?format=image
 *     → pick a "Centered" template (no photo / no author = cheapest)
 *     → pick a color theme  (advances to the text-source step)
 *     → text source "AI writes it" (default) + topic
 *     → "Generate 10 ideas" (Gemini)
 *     → select 1 idea → Continue → /create/editor
 *     → editor generates single-slide content (Gemini) → "Create 1 image post"
 *       → /api/render-carousel renders PNG → /api/library writes a ContentItem
 *         with status "ready", format "image", jobId "img-...".
 *
 * Completion signal = a new ContentItem for the user reaches "ready" in the DB.
 * No Remotion / background render involved — renders synchronously, fast.
 */

const prisma = new PrismaClient();
const USER_ID = process.env.E2E_USER_ID!;

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function findNewImageItem(since: Date, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const item = await prisma.contentItem.findFirst({
      where: { userId: USER_ID, createdAt: { gte: since }, format: "image" },
      orderBy: { createdAt: "desc" },
      select: { id: true, jobId: true, status: true, title: true, videoUrl: true, createdAt: true },
    });
    if (item) return item;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

test("create image post: design → theme → AI ideas → render → ready in library", async ({ page }) => {
  const startedAt = new Date();
  test.setTimeout(600_000);

  // ── Open the image-post create flow ──
  await page.goto("/create/templates?format=image", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Create an image post/i })).toBeVisible();

  // ── Step 1: pick the "Centered" template (simplest; no photo/author) ──
  await page.getByRole("button", { name: /Centered/i }).first().click();

  // ── Step 2: pick a color theme to advance to the text-source step ──
  // Theme buttons live under "Pick a color theme". Click the first theme card.
  await expect(page.getByRole("heading", { name: /Pick a color theme/i })).toBeVisible();
  const themeSection = page.locator("section").filter({ hasText: "Pick a color theme" });
  await themeSection.getByRole("button").first().click();

  // ── Step 3: text source — "AI writes it" is the default. Fill the topic. ──
  await expect(page.getByRole("heading", { name: /Where.?s the text coming from/i })).toBeVisible();
  const topic = page.getByPlaceholder(/motivational quotes, startup metrics/i);
  await expect(topic).toBeVisible();
  await topic.fill("productivity tips");

  // ── Generate 10 ideas (Gemini) ──
  await page.getByRole("button", { name: /Generate 10 ideas/i }).click();

  // ── Step 4: wait for ideas, select the first one ──
  await expect(page.getByRole("heading", { name: /10 image post ideas/i })).toBeVisible({ timeout: 60_000 });
  // Idea rows render under that section; the first selectable row.
  const ideasSection = page.locator("section").filter({ hasText: "10 image post ideas" });
  // Wait until at least one idea row (not a shimmer skeleton) is present.
  const firstIdea = ideasSection.locator("div.cursor-pointer").first();
  await expect(firstIdea).toBeVisible({ timeout: 60_000 });
  await firstIdea.click();

  // ── Continue → editor ──
  await page.getByRole("button", { name: /Continue with 1 idea/i }).click();
  await page.waitForURL(/\/create\/editor/i, { timeout: 30_000 });

  // ── Editor: wait for single-slide content to generate, then create ──
  const errorBanner = page.locator("text=/insufficient|sign in|require the Pro plan|must be signed/i");

  const createBtn = page.getByRole("button", { name: /Create 1 image post/i });
  // Button is disabled while content generates; wait until enabled.
  await expect(createBtn).toBeEnabled({ timeout: 120_000 });
  await createBtn.click();

  // Surface client-side rejections instead of timing out silently.
  await Promise.race([
    page.waitForURL(/\/library/i, { timeout: 120_000 }).catch(() => {}),
    errorBanner.first().waitFor({ state: "visible", timeout: 120_000 }).catch(() => {}),
  ]);
  if (await errorBanner.first().isVisible().catch(() => false)) {
    throw new Error(`Create was rejected on the page: "${await errorBanner.first().innerText()}"`);
  }

  // ── Verify against the DB: a new ready image ContentItem appears ──
  const item = await findNewImageItem(startedAt, 120_000);
  expect(item, "an image ContentItem should be created for the user").toBeTruthy();
  console.log(
    `[qa-image] item job=${item!.jobId} status=${item!.status} title="${item!.title}" hasImage=${item!.videoUrl ? "yes" : "no"}`
  );

  expect(item!.status, `image post should be "ready" (got "${item!.status}")`).toBe("ready");
  expect(item!.videoUrl, "a ready image post must have a rendered image (videoUrl)").toBeTruthy();

  // Acceptance: the rendered image URL must actually load as an image from R2.
  console.log(`[qa-image] IMAGE URL: ${item!.videoUrl}`);
  const imgRes = await page.request.get(item!.videoUrl!);
  console.log(`[qa-image] loads: HTTP ${imgRes.status()} type=${imgRes.headers()["content-type"]} bytes=${(await imgRes.body()).length}`);
  expect(imgRes.status(), "rendered image URL must return 200").toBe(200);
  expect(imgRes.headers()["content-type"] || "", "rendered URL must be an image").toContain("image");
});
