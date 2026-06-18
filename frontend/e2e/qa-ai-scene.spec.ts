import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * QA E2E: AI Scene flow (cheapest happy path).
 *
 * Flow (src/app/create/ai-scene/page.tsx):
 *   pick-scene -> content -> generating -> review -> saving -> /library
 *
 * Cheapest path: preselect a scene via ?scene= (jumps to "content"), type the
 * content directly (skip "Let AI write"), Generate ONE image via
 * /api/ai-carousel/generate-slide -> Flask /pg/generate_ai_slide (Gemini, no
 * Remotion), then Save to library.
 *
 * Completion: on save the page POSTs /api/library creating a ContentItem with
 * status "ready", format "image". We verify against the prod DB (DATABASE_URL
 * from .env.test) that the newest item for the user is "ready" with a URL.
 * We also assert the generated image is visible in the review step.
 */

const prisma = new PrismaClient();
const USER_ID = process.env.E2E_USER_ID!;

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function findNewItem(since: Date, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const item = await prisma.contentItem.findFirst({
      where: { userId: USER_ID, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, jobId: true, status: true, title: true,
        format: true, videoUrl: true, createdAt: true,
      },
    });
    if (item) return item;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

test("ai-scene: pick scene -> generate image -> save -> ready in library", async ({ page }) => {
  test.setTimeout(600_000);
  const startedAt = new Date();

  page.on("console", (msg) => {
    if (msg.type() === "error") console.log(`[browser-error] ${msg.text()}`);
  });

  // Preselect the cheapest/simplest scene -> lands on the "content" step.
  await page.goto("/create/ai-scene?scene=video-wall", { waitUntil: "domcontentloaded" });

  // The selected-scene badge confirms we are on the content step.
  await expect(page.getByRole("heading", { name: "AI Scene" })).toBeVisible();

  // Type content directly (no AI write -> deterministic, cheapest).
  const textarea = page.getByPlaceholder(/Type or paste the text\/info/i);
  await expect(textarea).toBeVisible();
  await textarea.fill("Honey never spoils. Found edible in ancient Egyptian tombs.");

  // Click Generate -> generates ONE image. The button's accessible name includes
  // its leading material-symbols icon ligature ("auto_awesome Generate"), so match
  // the trailing word rather than anchoring the whole name (which never matched).
  await page.getByRole("button", { name: /Generate$/ }).click();

  // Surface client-side rejection (credits / auth) instead of timing out.
  const errorBanner = page.locator(
    "text=/insufficient|Please sign in|Generation failed|Flask error/i"
  );

  // Wait for either the review step (image present) or an error banner.
  // Gemini image gen can take a bit; give it generous time.
  const reviewHeading = page.getByRole("heading", { name: /Your AI Scenes/i });
  await Promise.race([
    reviewHeading.waitFor({ state: "visible", timeout: 180_000 }).catch(() => {}),
    errorBanner.first().waitFor({ state: "visible", timeout: 180_000 }).catch(() => {}),
  ]);

  if (await errorBanner.first().isVisible().catch(() => false)) {
    throw new Error(`Generation rejected on page: "${await errorBanner.first().innerText()}"`);
  }

  await expect(reviewHeading, "review step should appear after generation").toBeVisible();

  // Assert a real generated image is shown (data: URL <img>), not a "Failed" tile.
  const genImg = page.locator('img[alt^="Variation"]');
  await expect(genImg.first(), "a generated image must be visible").toBeVisible({ timeout: 30_000 });
  const src = await genImg.first().getAttribute("src");
  console.log(`[qa] generated image src prefix: ${src?.slice(0, 30)}`);
  expect(src && src.startsWith("data:image"), "generated <img> should be a data URL").toBeTruthy();

  // Save to library -> uploads + creates ContentItem(status=ready), redirects to /library.
  const saveBtn = page.getByRole("button", { name: /Save to library/i });
  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();

  // Redirect to /library on success.
  await page.waitForURL(/\/library/i, { timeout: 120_000 }).catch(() => {});

  // Verify against DB: newest item created during this test is ready.
  const item = await findNewItem(startedAt, 120_000);
  console.log(
    `[qa] DB item: id=${item?.id} job=${item?.jobId} status=${item?.status} ` +
    `format=${item?.format} url=${item?.videoUrl ? "yes" : "no"} title="${item?.title}"`
  );

  expect(item, "save should create a ContentItem for the user").toBeTruthy();
  expect(item!.status, `item should be "ready" (got "${item!.status}")`).toBe("ready");
  expect(item!.videoUrl, "a ready image item must have a URL").toBeTruthy();
});
