import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import path from "node:path";

/**
 * Render-gate overlap probe (NOT a pass/fail product test).
 *
 * Fires TWO argument-video preview renders concurrently against the live site so
 * their Remotion render subprocesses overlap at the backend. With the global
 * render gate in place, the second must WAIT for the first (one render at a time)
 * instead of running concurrently and OOM-killing the worker.
 *
 * The proof is in the Railway logs (ACQUIRED -> BUSY/WAITING -> RELEASED ->
 * second ACQUIRED), captured separately. This spec's job is only to get two
 * renders dispatched and overlapping. Same account, two contexts — there is no
 * per-user concurrency limit on the dispatch path (only a 10/min rate limit).
 */

const STORAGE = path.join("e2e", ".auth", "state.json");

async function dispatchArgumentPreview(page: Page, label: string): Promise<void> {
  page.on("response", async (resp) => {
    const u = resp.url();
    if (u.includes("/api/argument/start") || u.includes("/api/argument/generate-script")) {
      const body = await resp.text().catch(() => "<unreadable>");
      console.log(`[${label}] ${u.replace(/^https?:\/\/[^/]+/, "")} ${resp.status()} ${body.slice(0, 200)}`);
    }
  });

  await page.goto("/create/argument", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /AI Argument/i })).toBeVisible();

  await page.getByRole("button", { name: /Paste your own script/i }).click();
  await page.locator("textarea").first().fill(
    "Peter: Is a hotdog a sandwich?\n" +
      "Stewie: Of course not, you blithering oaf.\n" +
      "Peter: But it's meat in bread!\n" +
      "Stewie: By that logic a taco is a sandwich. Absurd."
  );
  await page.getByRole("button", { name: /\d+ seconds/i }).first().click();
  await page.getByRole("button", { name: /^30 seconds$/i }).click();

  await page.getByRole("button", { name: /Generate Script/i }).click();

  const continueCta = page.getByRole("button", { name: /Continue to Settings/i });
  const errorBanner = page.locator(
    "text=/insufficient|sign in|require the Pro plan|must be signed|Generation failed|Failed to/i"
  );
  await Promise.race([
    continueCta.waitFor({ state: "visible", timeout: 120_000 }).catch(() => {}),
    errorBanner.first().waitFor({ state: "visible", timeout: 120_000 }).catch(() => {}),
  ]);
  if (await errorBanner.first().isVisible().catch(() => false)) {
    throw new Error(`[${label}] script generation rejected: "${await errorBanner.first().innerText()}"`);
  }
  await expect(continueCta).toBeVisible();

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

  await expect(continueCta).toBeEnabled();
  await continueCta.click();

  const renderCta = page.getByRole("button", { name: /Render Video/i });
  await expect(renderCta).toBeVisible();
  await renderCta.click();
  console.log(`[${label}] clicked Render Video (preview dispatch) @ ${new Date().toISOString()}`);

  await Promise.race([
    page.waitForURL(/\/library/i, { timeout: 90_000 }).catch(() => {}),
    errorBanner.first().waitFor({ state: "visible", timeout: 90_000 }).catch(() => {}),
    page.waitForTimeout(20_000),
  ]);
  if (await errorBanner.first().isVisible().catch(() => false)) {
    throw new Error(`[${label}] render dispatch rejected: "${await errorBanner.first().innerText()}"`);
  }
  console.log(`[${label}] dispatch complete @ ${new Date().toISOString()}`);
}

test("render-gate overlap: fire two argument previews concurrently", async ({ browser }) => {
  test.setTimeout(420_000); // 7 min

  const ctxA: BrowserContext = await browser.newContext({ storageState: STORAGE });
  const ctxB: BrowserContext = await browser.newContext({ storageState: STORAGE });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    // Fire both flows concurrently. Stagger B by a few seconds so the two
    // /api/argument/start calls land close together but not racing the exact
    // same instant (keeps the UI flows from interfering).
    await Promise.all([
      dispatchArgumentPreview(pageA, "A"),
      (async () => {
        await pageB.waitForTimeout(4000);
        await dispatchArgumentPreview(pageB, "B");
      })(),
    ]);

    console.log("[overlap] both argument previews dispatched — renders should now overlap at the gate.");
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});
