import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * QA end-to-end for the **Argument** create flow — PREVIEW-FIRST, driven all the
 * way through the full (1080p) render, not stopping at the 360p preview.
 *
 * Cheapest happy path: paste a tiny script, accept defaults, shortest duration.
 *   1. /create/argument → "Paste your own script" → fill lines → 30s
 *      → "Generate Script" → "Continue to Settings" → "Render Video".
 *      That creates a ContentItem (status "preparing") and dispatches a PREVIEW
 *      render (preview:true) via /api/argument/start, then routes to /library.
 *   2. The 360p preview render completes → status flips to "preview" with a
 *      (preview) videoUrl + previewData.output_dir.
 *   3. In /library, open the preview item → "Render Full Quality (1080p)" →
 *      /api/argument/full-render → status flips "rendering" then "ready".
 *
 * We track the item by its stable `id`. Verification polls the production DB
 * (DATABASE_URL in .env.test).
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
      where: { userId: USER_ID, templateId: "Argument", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { id: true, jobId: true, status: true, title: true },
    });
    if (item) {
      console.log(`[qa-argument] new item id=${item.id} jobId=${item.jobId} status=${item.status} title="${item.title}"`);
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
        console.log(`[qa-argument] item ${id} status -> ${item.status}${item.error ? ` (error: ${item.error})` : ""}`);
      }
      if (isDone(item)) return item;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  return snap;
}

test("qa-argument: dispatch → preview → full render → ready in library", async ({ page }) => {
  test.setTimeout(1_500_000); // 25 min: preview render + full render (single-worker backend)
  const startedAt = new Date();

  page.on("response", async (resp) => {
    const u = resp.url();
    if (
      u.includes("/api/argument/generate-script") ||
      u.includes("/api/argument/start") ||
      u.includes("/api/argument/full-render")
    ) {
      const body = await resp.text().catch(() => "<unreadable>");
      console.log(`[qa-argument] ${u.replace(/^https?:\/\/[^/]+/, "")} ${resp.status()} body=${body.slice(0, 400)}`);
    }
  });

  // ── Open the argument create flow ──
  await page.goto("/create/argument", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /AI Argument/i })).toBeVisible();

  // ── Step 0: "Paste your own script" + tiny script + 30s duration ──
  await page.getByRole("button", { name: /Paste your own script/i }).click();
  await page.locator("textarea").first().fill(
    "Peter: Is a hotdog a sandwich?\n" +
      "Stewie: Of course not, you blithering oaf.\n" +
      "Peter: But it's meat in bread!\n" +
      "Stewie: By that logic a taco is a sandwich. Absurd."
  );
  await page.getByRole("button", { name: /\d+ seconds/i }).first().click();
  await page.getByRole("button", { name: /^30 seconds$/i }).click();

  // ── Generate Script → Step 1 (script editor) ──
  await page.getByRole("button", { name: /Generate Script/i }).click();

  const errorBanner = page.locator(
    "text=/insufficient|sign in|require the Pro plan|must be signed|Generation failed|Failed to/i"
  );
  const continueCta = page.getByRole("button", { name: /Continue to Settings/i });
  await Promise.race([
    continueCta.waitFor({ state: "visible", timeout: 90_000 }).catch(() => {}),
    errorBanner.first().waitFor({ state: "visible", timeout: 90_000 }).catch(() => {}),
  ]);
  if (await errorBanner.first().isVisible().catch(() => false)) {
    throw new Error(`Script generation rejected: "${await errorBanner.first().innerText()}"`);
  }
  await expect(continueCta).toBeVisible();

  // Build the script via the UI's "Add line" control and fill each line.
  const addLine = page.getByRole("button", { name: /Add line/i });
  const lineTexts = [
    "Is a hotdog a sandwich? It is clearly meat inside bread.",
    "Absolutely not, you blithering oaf. By that logic a taco is a sandwich too.",
  ];
  let existing = await page.locator("main textarea").count();
  while (existing < lineTexts.length) {
    await addLine.click();
    existing = await page.locator("main textarea").count();
  }
  const lineBoxes = page.locator("main textarea");
  for (let i = 0; i < lineTexts.length; i++) {
    await lineBoxes.nth(i).fill(lineTexts[i]);
  }

  // ── Step 1 → Step 2 ──
  await expect(continueCta).toBeEnabled();
  await continueCta.click();

  // ── Step 2: accept defaults, click "Render Video" (dispatches preview). ──
  const renderCta = page.getByRole("button", { name: /Render Video/i });
  await expect(renderCta).toBeVisible();
  await renderCta.click();

  await Promise.race([
    page.waitForURL(/\/library/i, { timeout: 60_000 }).catch(() => {}),
    errorBanner.first().waitFor({ state: "visible", timeout: 60_000 }).catch(() => {}),
    page.waitForTimeout(15_000),
  ]);
  if (await errorBanner.first().isVisible().catch(() => false)) {
    throw new Error(`Render dispatch rejected: "${await errorBanner.first().innerText()}"`);
  }

  // ── A new ContentItem exists (status "preparing"). Track by stable id. ──
  const itemId = await findNewItemId(startedAt, 60_000);
  expect(itemId, "dispatch should create a ContentItem for the user").toBeTruthy();

  // Wait for the 360p preview render to finish → "preview" WITH a videoUrl
  // (the library modal only offers full-render once the preview URL exists).
  const prepared = await waitForStatus(
    itemId!,
    (s) => (s.status === "preview" && !!s.videoUrl) || s.status === "failed" || s.status === "ready",
    900_000, // up to 15 min for the preview render (single-worker backend)
  );
  console.log(`[qa-argument] after preview: status=${prepared?.status} videoUrl=${prepared?.videoUrl ? "yes" : "no"} error=${prepared?.error ?? ""}`);
  expect(
    prepared?.status,
    `preview render should reach "preview" (got "${prepared?.status}", error="${prepared?.error ?? ""}")`,
  ).not.toBe("failed");
  expect(["preview", "ready"]).toContain(prepared?.status);

  if (prepared?.status === "ready") {
    expect(prepared?.videoUrl, "a ready video must have a videoUrl").toBeTruthy();
    return;
  }

  // ── Export: open the preview item in /library, click "Render Full Quality". ──
  await page.goto("/library", { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });

  // Open the preview modal. The newest card is the item we just created (library
  // is sorted newest-first), and its "Render HD" button (accessible name
  // "movie Render HD") calls onReview to open the modal. The old code clicked the
  // non-interactive "Preview ready" status label, so the modal never opened.
  const openModalBtn = page.getByRole("button", { name: /Render HD/i }).first();
  await expect(openModalBtn).toBeVisible({ timeout: 30_000 });
  await openModalBtn.click();

  const fullRenderBtn = page.getByRole("button", { name: /Render Full Quality/i });
  await expect(fullRenderBtn).toBeVisible({ timeout: 30_000 });
  await fullRenderBtn.click();

  // ── Poll until the full render finishes ("ready") or fails. ──
  const final = await waitForStatus(
    itemId!,
    (s) => s.status === "ready" || s.status === "failed",
    900_000, // up to 15 min
  );
  console.log(`[qa-argument] FINAL: status=${final?.status} jobId=${final?.jobId} videoUrl=${final?.videoUrl ? "yes" : "no"} error=${final?.error ?? ""}`);

  expect(
    final?.status,
    `full render should finish "ready" (got "${final?.status}", error="${final?.error ?? ""}")`,
  ).toBe("ready");
  expect(final?.videoUrl, "a ready video must have a videoUrl").toBeTruthy();
});
