import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * End-to-end: a logged-in user creates a video from the website and it lands
 * "ready" in their library. Runs against the deployed app with a pre-minted
 * Auth.js session (see e2e/global-setup.ts) — no manual Google login.
 *
 * The full chain exercised: create UI -> dispatch (Trigger.dev) -> Flask render
 * on Railway -> completion callback -> ContentItem flips to "ready" with a video.
 *
 * Verification is done against the production DB (DATABASE_URL in .env.test):
 * we poll the ContentItem the dispatch creates until it is ready or failed.
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
      select: { id: true, jobId: true, status: true, title: true, createdAt: true },
    });
    if (item) return item;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

async function waitForTerminal(jobId: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    const item = await prisma.contentItem.findUnique({
      where: { jobId },
      select: { status: true, videoUrl: true, error: true },
    });
    if (item && item.status !== last) {
      last = item.status;
      console.log(`[e2e] item ${jobId.slice(0, 18)} status -> ${item.status}`);
    }
    if (item && (item.status === "ready" || item.status === "failed")) return item;
    await new Promise((r) => setTimeout(r, 4000));
  }
  return prisma.contentItem.findUnique({
    where: { jobId },
    select: { status: true, videoUrl: true, error: true },
  });
}

test("create-video: dispatch → backend render → callback → ready in library", async ({ page }) => {
  const startedAt = new Date();

  // ── Open the character-video create flow ──
  await page.goto("/create/video-setup", { waitUntil: "domcontentloaded" });

  // ── Step 0: paste a script (deterministic; no AI script-gen step) ──
  await page.getByRole("button", { name: /Paste your own script/i }).click();
  await page
    .getByPlaceholder(/Paste your script here/i)
    .fill(
      "Did you know honey never spoils? Archaeologists found pots of honey in " +
        "ancient Egyptian tombs over three thousand years old, and it was still " +
        "perfectly edible. Honey's low moisture and natural acidity make it almost " +
        "impossible for bacteria to grow."
    );
  // Note: the button's accessible name includes the trailing arrow icon's
  // ligature text, so match a substring rather than an exact string.
  await page.getByRole("button", { name: /Create video/i }).click();

  // ── Step 1: accept defaults (Doctor, Smart Mix) and create ──
  const cta = page.getByRole("button", { name: /Accept and create/i });
  await expect(cta).toBeVisible();
  await cta.click();

  // Surface client-side rejections (credits / plan / auth) instead of timing out.
  const errorBanner = page.locator("text=/insufficient|sign in|require the Pro plan|must be signed/i");
  await Promise.race([
    page.waitForURL(/\/create\/(review|animated)/i, { timeout: 30_000 }).catch(() => {}),
    errorBanner.first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {}),
    page.waitForTimeout(8000),
  ]);
  if (await errorBanner.first().isVisible().catch(() => false)) {
    throw new Error(`Create was rejected on the page: "${await errorBanner.first().innerText()}"`);
  }

  // ── Verify against the DB: a new ContentItem appears, then becomes ready ──
  const item = await findNewItem(startedAt, 60_000);
  expect(item, "dispatch should create a ContentItem for the user").toBeTruthy();
  console.log(`[e2e] dispatched: job=${item!.jobId} status=${item!.status} title="${item!.title}"`);

  // A real smart_mix render can take 5–8 min end to end; poll generously.
  const final = await waitForTerminal(item!.jobId, 600_000);
  console.log(`[e2e] FINAL: status=${final?.status} videoUrl=${final?.videoUrl ? "yes" : "no"} error=${final?.error ?? ""}`);

  expect(
    final?.status,
    `render should finish "ready" (got "${final?.status}", error="${final?.error ?? ""}")`
  ).toBe("ready");
  expect(final?.videoUrl, "a ready video must have a videoUrl").toBeTruthy();
});
