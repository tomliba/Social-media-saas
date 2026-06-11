import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * QA: Template Carousel create flow (HTML-template path → /api/render-carousel).
 *
 * Flow driven:
 *   /create/templates?format=carousel
 *     → pick the "Editorial" HTML template
 *     → pick a color theme
 *     → topic → "Generate 10 ideas" (Gemini)
 *     → select 1 idea → Continue → /create/editor?format=carousel&templateId=editorial
 *     → editor generates slide content (Gemini) → "Create 1 carousel"
 *       → /api/render-carousel (proxy → backend Chromium → R2) → /api/library writes a
 *         ContentItem format "carousel" status "ready", videoUrl = R2 PNG url.
 *
 * Acceptance: the ready carousel's image URL is a real R2 PNG that actually loads.
 */

const prisma = new PrismaClient();
const USER_ID = process.env.E2E_USER_ID!;

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function findNewCarousel(since: Date, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const item = await prisma.contentItem.findFirst({
      where: { userId: USER_ID, createdAt: { gte: since }, format: "carousel" },
      orderBy: { createdAt: "desc" },
      select: { id: true, jobId: true, status: true, title: true, videoUrl: true, previewData: true, createdAt: true },
    });
    if (item) return item;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

test("template carousel: layout → theme → AI ideas → render → ready in library", async ({ page }) => {
  const startedAt = new Date();
  test.setTimeout(600_000);

  // ── Open the template carousel flow ──
  await page.goto("/create/templates?format=carousel", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Build a carousel/i })).toBeVisible();

  // ── Step 1: pick the "Editorial" HTML template (under the "Templates" group) ──
  await page.getByRole("button", { name: /Editorial/i }).first().click();

  // ── Step 2: pick a color theme ──
  await expect(page.getByRole("heading", { name: /Pick a color theme/i })).toBeVisible();
  const themeSection = page.locator("section").filter({ hasText: "Pick a color theme" });
  await themeSection.getByRole("button").first().click();

  // ── Step 3: topic → generate ideas ──
  await expect(page.getByRole("heading", { name: /What.?s the topic/i })).toBeVisible();
  const topic = page.getByPlaceholder(/habits that changed my life|productivity hacks/i);
  await topic.fill("productivity tips for founders");
  await page.getByRole("button", { name: /Generate 10 ideas/i }).click();

  // ── Step 4: wait for ideas, select the first ──
  await expect(page.getByRole("heading", { name: /10 carousel ideas/i })).toBeVisible({ timeout: 90_000 });
  const ideasSection = page.locator("section").filter({ hasText: "10 carousel ideas" });
  const firstIdea = ideasSection.locator("div.cursor-pointer").first();
  await expect(firstIdea).toBeVisible({ timeout: 90_000 });
  await firstIdea.click();

  // ── Continue → editor ──
  await page.getByRole("button", { name: /Continue with 1 idea/i }).click();
  await page.waitForURL(/\/create\/editor/i, { timeout: 30_000 });

  // ── Editor: wait for slide content to generate, then create ──
  const errorBanner = page.locator("text=/insufficient|sign in|require the Pro plan|must be signed/i");
  const createBtn = page.getByRole("button", { name: /Create 1 carousel/i });
  await expect(createBtn).toBeEnabled({ timeout: 180_000 });
  await createBtn.click();

  await Promise.race([
    page.waitForURL(/\/library/i, { timeout: 180_000 }).catch(() => {}),
    errorBanner.first().waitFor({ state: "visible", timeout: 180_000 }).catch(() => {}),
  ]);
  if (await errorBanner.first().isVisible().catch(() => false)) {
    throw new Error(`Create was rejected on the page: "${await errorBanner.first().innerText()}"`);
  }

  // ── Verify against the DB ──
  const item = await findNewCarousel(startedAt, 120_000);
  expect(item, "a carousel ContentItem should be created for the user").toBeTruthy();
  console.log(
    `[qa-carousel-tpl] item job=${item!.jobId} status=${item!.status} title="${item!.title}" hasImage=${item!.videoUrl ? "yes" : "no"}`
  );
  expect(item!.status, `carousel should be "ready" (got "${item!.status}")`).toBe("ready");
  expect(item!.videoUrl, "a ready carousel must have a rendered image (videoUrl)").toBeTruthy();

  // Acceptance: every rendered slide URL must actually load as an image from R2.
  let urls: string[] = [item!.videoUrl!];
  try {
    const pd = item!.previewData ? JSON.parse(item!.previewData) : null;
    if (pd?.images?.length) urls = pd.images;
  } catch { /* fall back to videoUrl */ }
  console.log(`[qa-carousel-tpl] SLIDE URLS (${urls.length}): ${urls.join(" | ")}`);
  for (const u of urls) {
    const res = await page.request.get(u);
    console.log(`[qa-carousel-tpl] loads: HTTP ${res.status()} type=${res.headers()["content-type"]} ${u}`);
    expect(res.status(), `slide URL must return 200: ${u}`).toBe(200);
    expect(res.headers()["content-type"] || "", "slide URL must be an image").toContain("image");
  }
});
