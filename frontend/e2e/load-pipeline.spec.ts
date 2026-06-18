import { test, expect, type Page, type Locator, type APIRequestContext } from "@playwright/test";

/**
 * STAGE 2 — Live-UI load test of the real video render pipeline.
 * See LOAD_TEST_HANDOFF.md (repo root) for the full rationale.
 *
 * GOAL: drive the LIVE website UI for all three render types (Argument,
 * AI Story, AI Character) exactly the way a real user does, then detect
 * completion THROUGH THE UI (the /library page), not by hitting the backend
 * or polling the DB. This is the only way to exercise the true production
 * path — in particular Character's "AI Images" background, which routes through
 * Trigger.dev `render-video` → Flask `resolve_visual_assets` (Flux → fal.ai →
 * Gemini → gpt-image-1-mini fallback chain), NOT the no-fallback legacy branch
 * a backend-direct call would hit.
 *
 * LOGIN: cookie-forge, already wired. playwright.e2e.config.ts runs
 * e2e/global-setup.ts, which mints the Auth.js session cookie from .env.test
 * into storageState. No login code lives here; run this spec with:
 *
 *   npx playwright test e2e/load-pipeline.spec.ts --config playwright.e2e.config.ts
 *
 * COMPLETION DETECTION (UI-only): the item we just created is always the NEWEST
 * card (library is newest-first and we finish one type fully before starting the
 * next), so we read the FIRST card in the grid and map its on-screen state:
 *   - "Preparing…" spinner            → preparing
 *   - "Rendering…"/"Generating…"      → rendering
 *   - "Render HD" button              → preview (preview-first types)
 *   - "Review" button                 → ready
 *   - "Render failed"                 → failed
 * The library only auto-refreshes while something is preparing/rendering and
 * stops at preview/ready, so we reload on every poll. Final proof of a playable
 * video = open the Review modal and assert a <video controls> with a real src.
 *
 * REAL COST: each run creates real ContentItems and may charge credits. Runs as
 * the E2E user only. afterAll cleans up every item created during the run via
 * the app's own authenticated API (GET /api/library to find ids → DELETE
 * /api/library/{id}). R2 objects for Character/Story use random keys and are NOT
 * cleaned here (see handoff §4); argument writes deterministic videos/{jobId}.mp4.
 */

// Per-render budget. Backend is single-worker and renders serialize, minutes
// each; preview-first types do TWO renders (preview + full). Generous on purpose.
const PREP_TIMEOUT = 900_000;     // 15 min: dispatch → preview (or ready)
const RENDER_TIMEOUT = 1_500_000; // 25 min: full/HD render → ready
const POLL_INTERVAL = 8_000;

type LibItem = { id: string; title: string; status: string; createdAt: string };

// Items created during this run, tracked for cleanup.
const created: { id: string; title: string }[] = [];
let runStartedAt = 0;

test.beforeAll(() => {
  runStartedAt = Date.now();
});

test.afterAll(async () => {
  // Best-effort UI-layer cleanup: delete every item this run created.
  // afterAll has no `page`, so build an authenticated request context from the
  // saved storageState (same session cookie the browser used).
  const { request } = await import("@playwright/test");
  const baseURL = process.env.E2E_BASE_URL || "https://social-media-saas-9xq4.vercel.app";
  const api = await request.newContext({ baseURL, storageState: "e2e/.auth/state.json" });
  for (const item of created) {
    try {
      const res = await api.delete(`/api/library/${item.id}`);
      console.log(`[load-pipeline] cleanup DELETE ${item.id} ("${item.title}") -> ${res.status()}`);
    } catch (e) {
      console.log(`[load-pipeline] cleanup failed for ${item.id}: ${String(e)}`);
    }
  }
  await api.dispose();
});

// ── Library API helpers (used for tracking/cleanup only, NOT detection) ──

async function listItems(api: APIRequestContext): Promise<LibItem[]> {
  const res = await api.get("/api/library");
  if (!res.ok()) return [];
  const body = await res.json().catch(() => ({}));
  return (body.items ?? []) as LibItem[];
}

/**
 * After a dispatch, find the newest item created since the run started and
 * remember it for cleanup. Returns the item for logging.
 */
async function captureNewItem(api: APIRequestContext, label: string, timeoutMs: number): Promise<LibItem> {
  const deadline = Date.now() + timeoutMs;
  const sinceIso = new Date(runStartedAt).toISOString();
  while (Date.now() < deadline) {
    const items = await listItems(api);
    const fresh = items.filter((i) => i.createdAt >= sinceIso && !created.some((c) => c.id === i.id));
    if (fresh.length) {
      const item = fresh[0]; // newest-first
      created.push({ id: item.id, title: item.title });
      console.log(`[load-pipeline] ${label}: new item id=${item.id} status=${item.status} title="${item.title}"`);
      return item;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${label}: no new ContentItem appeared within ${timeoutMs}ms`);
}

// ── UI completion detection (the point of this test) ──

/**
 * The newest library card = the item we just created. Cards are direct children
 * of the content grid (library/page.tsx:977) and are sorted newest-first; we
 * finish one render type fully before creating the next, so the first card is
 * unambiguously ours throughout its lifecycle.
 */
function newestCard(page: Page): Locator {
  return page.locator("div.grid > div.group").first();
}

/**
 * /library is a client component that fetches after load — the card grid only
 * renders ~1-1.5s after navigation/reload. Wait for the first card to appear
 * before reading or clicking, or we read an empty page and see "unknown".
 */
async function waitForLibraryRender(page: Page): Promise<void> {
  await newestCard(page).waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
}

type CardState = "preparing" | "rendering" | "preview" | "ready" | "failed" | "unknown";

async function readCardState(card: Locator): Promise<CardState> {
  if (!(await card.count())) return "unknown";
  if (await card.getByText(/Render failed/i).isVisible().catch(() => false)) return "failed";
  // Preview cards carry BOTH a "Render HD" button AND a "Preview" button, so
  // check "Render HD" (preview-only) FIRST. Note \bReview\b is anchored on
  // purpose: an un-anchored /Review/ also matches "Pre·view".
  if (await card.getByRole("button", { name: /Render HD/i }).isVisible().catch(() => false)) return "preview";
  // "Review" button only renders for ready items.
  if (await card.getByRole("button", { name: /\bReview\b/i }).isVisible().catch(() => false)) return "ready";
  if (await card.getByText(/Rendering\.\.\.|Generating\.\.\./i).isVisible().catch(() => false)) return "rendering";
  if (await card.getByText(/Preparing\.\.\./i).isVisible().catch(() => false)) return "preparing";
  return "unknown";
}

/**
 * Poll the library page (with reloads) until the newest card reaches a state for
 * which `done` returns true, or the budget expires.
 */
async function pollCard(
  page: Page,
  done: (s: CardState) => boolean,
  timeoutMs: number,
  label: string,
): Promise<CardState> {
  const deadline = Date.now() + timeoutMs;
  let last: CardState | "" = "";
  let state: CardState = "unknown";
  while (Date.now() < deadline) {
    await waitForLibraryRender(page);
    state = await readCardState(newestCard(page));
    if (state !== last) {
      last = state;
      console.log(`[load-pipeline] ${label}: newest card -> ${state}`);
    }
    if (done(state)) return state;
    await page.waitForTimeout(POLL_INTERVAL);
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  return state;
}

/** Open the Review modal on the newest (ready) card and assert a playable <video src>. */
async function assertPlayableVideo(page: Page, label: string) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForLibraryRender(page);
  await newestCard(page).getByRole("button", { name: /\bReview\b/i }).first().click();
  const video = page.locator("video[controls]");
  await expect(video, `${label}: ready item should show a playable <video>`).toBeVisible({ timeout: 30_000 });
  const src = await video.first().getAttribute("src");
  console.log(`[load-pipeline] ${label}: ready video src=${src ? src.slice(0, 60) + "…" : "<none>"}`);
  expect(src, `${label}: <video> must have a real src`).toBeTruthy();
  await page.keyboard.press("Escape").catch(() => {});
}

/** Open the newest (preview) card's modal and click its export/full-render button. */
async function exportFromPreview(page: Page, exportName: RegExp, label: string) {
  await waitForLibraryRender(page);
  await newestCard(page).getByRole("button", { name: /Render HD/i }).first().click();
  const exportBtn = page.getByRole("button", { name: exportName });
  await expect(exportBtn, `${label}: export button should appear in the preview modal`).toBeVisible({ timeout: 30_000 });
  await exportBtn.click();
}

const dispatchError = (page: Page) =>
  page.locator("text=/insufficient|sign in|require the Pro plan|must be signed|Generation failed|Failed to/i");

async function failIfRejected(page: Page, label: string) {
  if (await dispatchError(page).first().isVisible().catch(() => false)) {
    throw new Error(`${label}: dispatch rejected on page: "${await dispatchError(page).first().innerText()}"`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 1) ARGUMENT — preview-first. Create → preview → Render Full Quality → ready.
// ════════════════════════════════════════════════════════════════════════════
test("argument: live UI → preview → full render → ready", async ({ page }) => {
  test.setTimeout(PREP_TIMEOUT + RENDER_TIMEOUT + 120_000);
  const api = page.request;

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
  await Promise.race([
    continueCta.waitFor({ state: "visible", timeout: 90_000 }).catch(() => {}),
    dispatchError(page).first().waitFor({ state: "visible", timeout: 90_000 }).catch(() => {}),
  ]);
  await failIfRejected(page, "argument");
  await expect(continueCta).toBeVisible();

  // Step 1 (script editor): the script lines must be present and filled before
  // "Continue to Settings" enables. Build them via the UI's "Add line" control.
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

  await Promise.race([
    page.waitForURL(/\/library/i, { timeout: 60_000 }).catch(() => {}),
    dispatchError(page).first().waitFor({ state: "visible", timeout: 60_000 }).catch(() => {}),
  ]);
  await failIfRejected(page, "argument");

  await captureNewItem(api, "argument", 60_000);

  // Preview render → "preview" (or straight to "ready").
  await page.goto("/library", { waitUntil: "domcontentloaded" });
  const afterPrep = await pollCard(page, (s) => s === "preview" || s === "ready" || s === "failed", PREP_TIMEOUT, "argument");
  expect(afterPrep, `argument preview should reach preview/ready (got ${afterPrep})`).not.toBe("failed");
  expect(["preview", "ready"]).toContain(afterPrep);

  if (afterPrep === "preview") {
    await exportFromPreview(page, /Render Full Quality/i, "argument");
    const final = await pollCard(page, (s) => s === "ready" || s === "failed", RENDER_TIMEOUT, "argument");
    expect(final, `argument full render should be ready (got ${final})`).toBe("ready");
  }

  await assertPlayableVideo(page, "argument");
});

// ════════════════════════════════════════════════════════════════════════════
// 2) AI STORY — preview-first, background HARDCODED to AI Images (no picker).
//    video-styles → AI voice story → generate → preview → Export 1080p HD → ready
// ════════════════════════════════════════════════════════════════════════════
test("ai-story: live UI → preview → HD export → ready", async ({ page }) => {
  test.setTimeout(PREP_TIMEOUT + RENDER_TIMEOUT + 120_000);
  const api = page.request;

  await page.goto("/create/video-styles", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /AI voice story/i }).click();
  await page.waitForURL(/\/create\/video-setup\?style=ai-story/i, { timeout: 30_000 });

  await page.getByRole("button", { name: /seconds/i }).first().click();
  await page.getByRole("button", { name: /^30 seconds$/i }).click().catch(() => {});

  await page.getByRole("button", { name: /Generate story ideas/i }).click();
  const reviewHeading = page.getByRole("heading", { name: /Review your story/i });
  await Promise.race([
    reviewHeading.waitFor({ state: "visible", timeout: 120_000 }).catch(() => {}),
    dispatchError(page).first().waitFor({ state: "visible", timeout: 120_000 }).catch(() => {}),
  ]);
  await failIfRejected(page, "ai-story");
  await expect(reviewHeading).toBeVisible({ timeout: 5_000 });

  // Let fire-and-forget scene images settle (don't block forever).
  await page.waitForTimeout(2000);
  await page
    .waitForFunction(() => !document.querySelector(".animate-spin"), undefined, { timeout: 180_000 })
    .catch(() => {});

  const previewBtn = page.getByRole("button", { name: /Preview video/i });
  await expect(previewBtn).toBeEnabled({ timeout: 15_000 });
  await previewBtn.click();
  await Promise.race([
    page.waitForURL(/\/library/i, { timeout: 30_000 }).catch(() => {}),
    dispatchError(page).first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {}),
  ]);
  await failIfRejected(page, "ai-story");

  await captureNewItem(api, "ai-story", 60_000);

  await page.goto("/library", { waitUntil: "domcontentloaded" });
  const afterPrep = await pollCard(page, (s) => s === "preview" || s === "ready" || s === "failed", PREP_TIMEOUT, "ai-story");
  expect(afterPrep, `ai-story preview should reach preview/ready (got ${afterPrep})`).not.toBe("failed");
  expect(["preview", "ready"]).toContain(afterPrep);

  if (afterPrep === "preview") {
    await exportFromPreview(page, /Export 1080p HD/i, "ai-story");
    const final = await pollCard(page, (s) => s === "ready" || s === "failed", RENDER_TIMEOUT, "ai-story");
    expect(final, `ai-story HD export should be ready (got ${final})`).toBe("ready");
  }

  await assertPlayableVideo(page, "ai-story");
});

// ════════════════════════════════════════════════════════════════════════════
// 3) AI CHARACTER — single-stage (rendering → ready). MUST switch the background
//    mode to "AI Images" ON THE SETUP STEP (before "Create video") to exercise
//    the real resolve_visual_assets chain. The default comes from the user's
//    saved prefs (page.tsx:288), so we don't assume it is "Smart Mix".
// ════════════════════════════════════════════════════════════════════════════
test("ai-character: live UI (AI Images) → render → ready", async ({ page }) => {
  test.setTimeout(RENDER_TIMEOUT + 120_000);
  const api = page.request;

  await page.goto("/create/video-setup", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: /Paste your own script/i }).click();
  await page
    .getByPlaceholder(/Paste your script here/i)
    .fill(
      "Did you know honey never spoils? Archaeologists found pots of honey in " +
        "ancient Egyptian tombs over three thousand years old, and it was still " +
        "perfectly edible. Honey's low moisture and natural acidity make it almost " +
        "impossible for bacteria to grow."
    );

  // ── Switch background mode → AI Images on the SETUP step (the WHOLE point). ──
  // The bg-mode pill shows the current label (any of the backgroundModes); open
  // it, then pick the AI Images option (uniquely identified by its description).
  const bgPill = page.getByRole("button", {
    name: /Smart Mix|Stock Footage|AI Images|Animated AI|Motion Graphics|Green Screen/i,
  }).first();
  await expect(bgPill, "background-mode pill should be on the setup step").toBeVisible({ timeout: 15_000 });
  await bgPill.click();
  const aiImagesOption = page.getByRole("button", { name: /Custom AI-generated images/i });
  await expect(aiImagesOption, "AI Images option should appear in the dropdown").toBeVisible({ timeout: 10_000 });
  await aiImagesOption.click();
  // The pill should now read "AI Images".
  await expect(page.getByRole("button", { name: /AI Images/i }).first()).toBeVisible();

  await page.getByRole("button", { name: /Create video/i }).click();

  const cta = page.getByRole("button", { name: /Accept and create/i });
  await expect(cta).toBeVisible({ timeout: 15_000 });
  await cta.click();

  await Promise.race([
    page.waitForURL(/\/library|\/create\/(review|animated)/i, { timeout: 30_000 }).catch(() => {}),
    dispatchError(page).first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {}),
    page.waitForTimeout(8000),
  ]);
  await failIfRejected(page, "ai-character");

  const item = await captureNewItem(api, "ai-character", 60_000);
  // Sanity: the dispatched item should actually be the AI Images path.
  console.log(`[load-pipeline] ai-character dispatched item title="${item.title}"`);

  // Single-stage: rendering → ready (no preview export step).
  await page.goto("/library", { waitUntil: "domcontentloaded" });
  const final = await pollCard(page, (s) => s === "ready" || s === "failed", RENDER_TIMEOUT, "ai-character");
  expect(final, `ai-character render should be ready (got ${final})`).toBe("ready");

  await assertPlayableVideo(page, "ai-character");
});
