import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * QA end-to-end: Skeleton video happy path — PREVIEW-FIRST, driven all the way
 * through export/render (not stopping at preview).
 *
 * Drives the live site UI at /create/skeleton:
 *   1. Step 0 (Setup): "Paste your own script" (deterministic, no AI topic gen),
 *      static scene mode (default, cheapest), 30s duration (default),
 *      then "Generate story ideas".
 *   2. Step 1 (Review): wait for scene images, then "Preview video". That charges
 *      credits, creates a ContentItem (status "preparing"), dispatches
 *      prepare-assets (Trigger.dev), routes to /library.
 *   3. prepare-assets completes → status flips to "preview" (previewData populated).
 *   4. In /library, open the preview item → "Export 1080p HD" → render-preview
 *      (Remotion) → status flips "rendering" then "ready" with a videoUrl.
 *
 * The jobId changes at the export step, so we track the item by its stable `id`.
 * Verification is against the production DB (DATABASE_URL in .env.test).
 */

const prisma = new PrismaClient();
const USER_ID = process.env.E2E_USER_ID!;

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
      console.log(`[qa-skeleton] new item id=${item.id} jobId=${item.jobId} status=${item.status} title="${item.title}"`);
      return item.id;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

type Snap = { status: string; videoUrl: string | null; jobId: string | null; error: string | null };

async function waitForStatus(id: string, isDone: (s: Snap) => boolean, timeoutMs: number): Promise<Snap | null> {
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
        console.log(`[qa-skeleton] item ${id} status -> ${item.status}${item.error ? ` (error: ${item.error})` : ""}`);
      }
      if (isDone(item)) return item;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  return snap;
}

test("qa-skeleton: setup -> review -> preview -> export -> ready in library", async ({ page }) => {
  test.setTimeout(1_500_000); // 25 min: preview prep + full render (single-worker backend)
  const startedAt = new Date();

  const errorBanner = page.locator(
    "text=/insufficient|sign in|require the Pro plan|must be signed|Failed|No scenes returned/i"
  );

  // ── Open the skeleton create flow ──
  await page.goto("/create/skeleton", { waitUntil: "domcontentloaded" });

  // ── Step 0: "Paste your own script" mode (deterministic, cheapest) ──
  await page.getByRole("button", { name: /Paste your own script/i }).click();
  await page
    .getByPlaceholder(/Paste your narration text here/i)
    .fill(
      "Did you know your bones are stronger than steel? Ounce for ounce, " +
        "human bone can withstand more force than a steel bar of the same weight. " +
        "Your skeleton constantly rebuilds itself, replacing old bone every ten years."
    );

  // Defaults: scene mode = static, duration = 30s. Generate the story.
  await page.getByRole("button", { name: /Generate story ideas/i }).click();

  await Promise.race([
    page.getByRole("heading", { name: /Review your story/i }).waitFor({ state: "visible", timeout: 120_000 }).catch(() => {}),
    errorBanner.first().waitFor({ state: "visible", timeout: 120_000 }).catch(() => {}),
  ]);
  if (await errorBanner.first().isVisible().catch(() => false)) {
    throw new Error(`Script generation rejected on page: "${await errorBanner.first().innerText()}"`);
  }
  await expect(
    page.getByRole("heading", { name: /Review your story/i }),
    "should reach Step 1 (Review your story)"
  ).toBeVisible();

  // ── Step 1: Preview video (static = always enabled) ──
  const preview = page.getByRole("button", { name: /Preview video/i });
  await expect(preview).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(20_000); // let scene images generate
  await expect(preview).toBeEnabled();
  await preview.click();

  await Promise.race([
    page.waitForURL(/\/library/i, { timeout: 30_000 }).catch(() => {}),
    errorBanner.first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {}),
  ]);
  if (await errorBanner.first().isVisible().catch(() => false)) {
    throw new Error(`Preview/dispatch rejected on page: "${await errorBanner.first().innerText()}"`);
  }

  // ── A ContentItem now exists (status "preparing"). Track by stable id. ──
  const itemId = await findNewItemId(startedAt, 90_000);
  expect(itemId, "Preview should create a ContentItem for the user").toBeTruthy();

  // Wait for prepare-assets to finish → "preview" (or failed / already ready).
  const prepared = await waitForStatus(
    itemId!,
    (s) => s.status === "preview" || s.status === "failed" || s.status === "ready",
    900_000, // up to 15 min for asset prep
  );
  console.log(`[qa-skeleton] after prepare: status=${prepared?.status} error=${prepared?.error ?? ""}`);
  expect(
    prepared?.status,
    `prepare-assets should reach "preview" (got "${prepared?.status}", error="${prepared?.error ?? ""}")`,
  ).not.toBe("failed");
  expect(["preview", "ready"]).toContain(prepared?.status);

  if (prepared?.status === "ready") {
    expect(prepared?.videoUrl, "a ready video must have a videoUrl").toBeTruthy();
    return;
  }

  // ── Export: open the preview item in /library, click "Export 1080p HD". ──
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

  // ── Poll until the Remotion render finishes ("ready") or fails. ──
  const final = await waitForStatus(
    itemId!,
    (s) => s.status === "ready" || s.status === "failed",
    900_000, // up to 15 min
  );
  console.log(`[qa-skeleton] FINAL: status=${final?.status} jobId=${final?.jobId} videoUrl=${final?.videoUrl ? "yes" : "no"} error=${final?.error ?? ""}`);

  expect(
    final?.status,
    `render should finish "ready" (got "${final?.status}", error="${final?.error ?? ""}")`,
  ).toBe("ready");
  expect(final?.videoUrl, "a ready video must have a videoUrl").toBeTruthy();
});
