import { test, expect, type BrowserContext, type Page, type APIRequestContext } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * CONCURRENT load test — N parallel browser contexts hit the live create flows
 * AT THE SAME TIME (Promise.all), to stress the backend's shared resources:
 * the Fish-TTS concurrency gate, the Flux/Atlas image-gen + fallback chain, and
 * the single Remotion render gate. Mixed workload: half "AI voice story", half
 * "AI Character" in AI-Images mode (each Character MUST switch the bg-mode
 * dropdown to "AI Images", not the default Smart Mix).
 *
 * Run:
 *   CONC_N=4  npx playwright test e2e/load-concurrent.spec.ts --config playwright.e2e.config.ts
 *   CONC_N=10 npx playwright test e2e/load-concurrent.spec.ts --config playwright.e2e.config.ts
 *
 * CONCURRENCY-SAFE IDENTITY (critical): under load the "newest library card is
 * mine" trick breaks — N items dispatch at once. Each context instead captures
 * ITS OWN item id from the POST /api/library response (both flows create the
 * ContentItem that way) and polls ONLY that id via GET /api/library. Story
 * export is driven by matching the card on the story's (distinct) title.
 *
 * EVIDENCE: this harness records dispatch + completion per item into
 * load-logs/concurrent-N{N}-results.json. The REAL verdict is the Railway log
 * capture taken in parallel (FISH gate, image-gen fallbacks, render gate),
 * summarised separately in LOAD_CONCURRENT_RESULTS.md.
 *
 * COST/CLEANUP: real ContentItems + real credits (E2E user only). Credit balance
 * is sampled before/after via /api/credits/balance. afterAll deletes every item
 * created. R2 objects (random keys for story/character) are NOT swept here.
 */

const BASE_URL = process.env.E2E_BASE_URL || "https://social-media-saas-9xq4.vercel.app";
const STATE = "e2e/.auth/state.json";
const N = parseInt(process.env.CONC_N || "4", 10);
const STORIES = Math.floor(N / 2);
const CHARS = N - STORIES;
const RESULTS_PATH = path.join("load-logs", `concurrent-N${N}-results.json`);

const PREP_TIMEOUT = 30 * 60_000;   // 30 min: dispatch → preview (TTS + image gen, serialized under load)
const RENDER_TIMEOUT = 45 * 60_000; // 45 min: → ready (render gate serializes every render)
const POLL_MS = 6_000;

const CHAR_SCRIPT =
  "Did you know honey never spoils? Archaeologists found pots of honey in ancient " +
  "Egyptian tombs over three thousand years old, and it was still perfectly edible. " +
  "Honey's low moisture and natural acidity make it almost impossible for bacteria to grow.";

type ItemResult = {
  type: "story" | "character";
  idx: number;
  label: string;
  dispatchOk: boolean;
  itemId: string | null;
  title: string | null;
  finalStatus: string | null;
  videoUrl: string | null;
  video: { ok: boolean; status?: number; contentType?: string; bytes?: number; error?: string } | null;
  error: string | null;
  startedAt: string;
  endedAt: string | null;
};

const created: { id: string; title: string }[] = [];
const results: ItemResult[] = [];
const contexts: BrowserContext[] = [];
let creditsBefore: number | null = null;
let creditsAfter: number | null = null;

// ── helpers ──

/** Capture the item id from this page's POST /api/library (the create call). */
function watchForItemId(page: Page): () => { id: string; status: string; title: string } | null {
  let captured: { id: string; status: string; title: string } | null = null;
  page.on("response", async (resp) => {
    try {
      const req = resp.request();
      const url = resp.url();
      // exactly POST /api/library (not /api/library/{id} PATCH/DELETE)
      if (req.method() === "POST" && /\/api\/library(?:\?.*)?$/.test(url)) {
        const b = await resp.json();
        if (b?.item?.id) captured = { id: b.item.id, status: b.item.status, title: b.item.title };
      }
    } catch {
      /* ignore non-JSON / racing reads */
    }
  });
  return () => captured;
}

async function waitForCapture(
  get: () => { id: string; status: string; title: string } | null,
  timeoutMs: number,
): Promise<{ id: string; status: string; title: string } | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const c = get();
    if (c) return c;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

type Snap = { id: string; status: string; videoUrl: string | null };

async function pollItemById(
  req: APIRequestContext,
  id: string,
  done: (s: Snap) => boolean,
  timeoutMs: number,
  label: string,
): Promise<Snap | null> {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  let snap: Snap | null = null;
  while (Date.now() < deadline) {
    try {
      const res = await req.get("/api/library");
      if (res.ok()) {
        const body = await res.json();
        const item = (body.items ?? []).find((i: Snap) => i.id === id);
        if (item) {
          snap = { id: item.id, status: item.status, videoUrl: item.videoUrl ?? null };
          if (item.status !== last) {
            last = item.status;
            console.log(`[conc] ${label} ${id.slice(0, 8)} -> ${item.status}`);
          }
          if (done(snap)) return snap;
        }
      }
    } catch {
      /* transient */
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return snap;
}

/** Verify a ready item's video is actually fetchable (HEAD on the R2 URL). */
async function verifyVideo(req: APIRequestContext, url: string) {
  try {
    const res = await req.head(url);
    const ct = res.headers()["content-type"] || "";
    const bytes = parseInt(res.headers()["content-length"] || "0", 10);
    return { ok: res.ok() && (ct.includes("video") || bytes > 10_000), status: res.status(), contentType: ct, bytes };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function readCredits(page: Page): Promise<number | null> {
  try {
    const res = await page.request.get("/api/credits/balance");
    if (res.ok()) return (await res.json()).balance ?? null;
  } catch {
    /* ignore */
  }
  return null;
}

const rejected = (page: Page) =>
  page.locator("text=/insufficient|Please sign in|require the Pro plan|must be signed|Generation failed|Failed to/i");

// ── per-context flows ──

async function runStory(context: BrowserContext, idx: number): Promise<void> {
  const label = `story#${idx}`;
  const r: ItemResult = {
    type: "story", idx, label, dispatchOk: false, itemId: null, title: null,
    finalStatus: null, videoUrl: null, video: null, error: null,
    startedAt: new Date().toISOString(), endedAt: null,
  };
  const page = await context.newPage();
  const getId = watchForItemId(page);
  try {
    await page.goto("/create/video-styles", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /AI voice story/i }).click();
    await page.waitForURL(/\/create\/video-setup\?style=ai-story/i, { timeout: 30_000 });
    await page.getByRole("button", { name: /seconds/i }).first().click();
    await page.getByRole("button", { name: /^30 seconds$/i }).click().catch(() => {});
    await page.getByRole("button", { name: /Generate story ideas/i }).click();

    const reviewHeading = page.getByRole("heading", { name: /Review your story/i });
    await Promise.race([
      reviewHeading.waitFor({ state: "visible", timeout: 180_000 }).catch(() => {}),
      rejected(page).first().waitFor({ state: "visible", timeout: 180_000 }).catch(() => {}),
    ]);
    if (await rejected(page).first().isVisible().catch(() => false)) {
      throw new Error(`rejected: ${await rejected(page).first().innerText()}`);
    }
    await expect(reviewHeading).toBeVisible({ timeout: 5_000 });

    await page.waitForTimeout(2000);
    await page.waitForFunction(() => !document.querySelector(".animate-spin"), undefined, { timeout: 180_000 }).catch(() => {});

    // Give this story a UNIQUE title so its library card is unambiguously findable
    // under concurrency. AI-generated hooks collide ("This story will make you think
    // twice about camping alone…" appeared verbatim on several at N=10), which breaks
    // any title-based card match. The hook text becomes the ContentItem title (the
    // review step's first textarea is the editable hook → title = editHook).
    const uniqueTag = `LT-${idx}-${Math.random().toString(36).slice(2, 8)}`;
    await page.locator("textarea").first().fill(`${uniqueTag} loadtest story`).catch(() => {});

    const previewBtn = page.getByRole("button", { name: /Preview video/i });
    await expect(previewBtn).toBeEnabled({ timeout: 20_000 });
    await previewBtn.click();
    await page.waitForURL(/\/library/i, { timeout: 40_000 }).catch(() => {});

    const cap = await waitForCapture(getId, 30_000);
    if (!cap) throw new Error("no item id captured from POST /api/library");
    r.itemId = cap.id; r.title = cap.title; r.dispatchOk = true;
    created.push({ id: cap.id, title: cap.title });

    const req = page.request;
    const prep = await pollItemById(req, cap.id, (s) => ["preview", "ready", "failed"].includes(s.status), PREP_TIMEOUT, label);
    r.finalStatus = prep?.status ?? null;

    if (prep?.status === "preview") {
      // Drive the HD export from this story's own card, matched by the UNIQUE tag we
      // injected into the hook/title above (collision-proof under concurrency).
      const snippet = uniqueTag;
      await page.goto("/library", { waitUntil: "domcontentloaded" });
      await page.locator("div.grid > div.group").first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
      const card = page.locator("div.grid > div.group").filter({ hasText: snippet }).first();
      await card.getByRole("button", { name: /Render HD/i }).first().click({ timeout: 20_000 });
      await page.getByRole("button", { name: /Export 1080p HD/i }).click({ timeout: 20_000 });
      const final = await pollItemById(req, cap.id, (s) => ["ready", "failed"].includes(s.status), RENDER_TIMEOUT, label);
      r.finalStatus = final?.status ?? null;
      r.videoUrl = final?.videoUrl ?? null;
    } else {
      r.videoUrl = prep?.videoUrl ?? null;
    }

    if (r.finalStatus === "ready" && r.videoUrl) r.video = await verifyVideo(req, r.videoUrl);
  } catch (e) {
    r.error = String(e);
  } finally {
    r.endedAt = new Date().toISOString();
    await page.close().catch(() => {});
  }
  results.push(r);
}

async function runCharacter(context: BrowserContext, idx: number): Promise<void> {
  const label = `char#${idx}`;
  const r: ItemResult = {
    type: "character", idx, label, dispatchOk: false, itemId: null, title: null,
    finalStatus: null, videoUrl: null, video: null, error: null,
    startedAt: new Date().toISOString(), endedAt: null,
  };
  const page = await context.newPage();
  const getId = watchForItemId(page);
  try {
    await page.goto("/create/video-setup", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Paste your own script/i }).click();
    await page.getByPlaceholder(/Paste your script here/i).fill(CHAR_SCRIPT);

    // Switch background mode → AI Images on the setup step (NOT default Smart Mix).
    const bgPill = page.getByRole("button", {
      name: /Smart Mix|Stock Footage|AI Images|Animated AI|Motion Graphics|Green Screen/i,
    }).first();
    await expect(bgPill, "bg-mode pill present on setup step").toBeVisible({ timeout: 15_000 });
    await bgPill.click();
    const aiOpt = page.getByRole("button", { name: /Custom AI-generated images/i });
    await expect(aiOpt, "AI Images option present").toBeVisible({ timeout: 10_000 });
    await aiOpt.click();
    await expect(page.getByRole("button", { name: /AI Images/i }).first()).toBeVisible();

    await page.getByRole("button", { name: /Create video/i }).click();
    const cta = page.getByRole("button", { name: /Accept and create/i });
    await expect(cta).toBeVisible({ timeout: 15_000 });
    await cta.click();
    await page.waitForURL(/\/library/i, { timeout: 40_000 }).catch(() => {});
    if (await rejected(page).first().isVisible().catch(() => false)) {
      throw new Error(`rejected: ${await rejected(page).first().innerText()}`);
    }

    const cap = await waitForCapture(getId, 30_000);
    if (!cap) throw new Error("no item id captured from POST /api/library");
    r.itemId = cap.id; r.title = cap.title; r.dispatchOk = true;
    created.push({ id: cap.id, title: cap.title });

    const req = page.request;
    const final = await pollItemById(req, cap.id, (s) => ["ready", "failed"].includes(s.status), RENDER_TIMEOUT, label);
    r.finalStatus = final?.status ?? null;
    r.videoUrl = final?.videoUrl ?? null;
    if (r.finalStatus === "ready" && r.videoUrl) r.video = await verifyVideo(req, r.videoUrl);
  } catch (e) {
    r.error = String(e);
  } finally {
    r.endedAt = new Date().toISOString();
    await page.close().catch(() => {});
  }
  results.push(r);
}

// ── cleanup + results dump (always runs) ──

test.afterAll(async () => {
  const { request } = await import("@playwright/test");
  const api = await request.newContext({ baseURL: BASE_URL, storageState: STATE });
  const cleanup: { id: string; status?: number; error?: string }[] = [];
  for (const it of created) {
    try {
      const d = await api.delete(`/api/library/${it.id}`);
      cleanup.push({ id: it.id, status: d.status() });
    } catch (e) {
      cleanup.push({ id: it.id, error: String(e) });
    }
  }
  await api.dispose();
  for (const c of contexts) await c.close().catch(() => {});

  const summary = {
    timestamp: new Date().toISOString(),
    N, stories: STORIES, characters: CHARS,
    creditsBefore, creditsAfter,
    creditsCharged: creditsBefore != null && creditsAfter != null ? creditsBefore - creditsAfter : null,
    dispatched: results.filter((r) => r.dispatchOk).length,
    ready: results.filter((r) => r.finalStatus === "ready").length,
    videoOk: results.filter((r) => r.video?.ok).length,
    failed: results.filter((r) => r.finalStatus === "failed").length,
    stuck: results.filter((r) => r.dispatchOk && !["ready", "failed"].includes(r.finalStatus ?? "")).length,
    deleted: cleanup.filter((c) => c.status === 200).length,
    orphans: created.length - cleanup.filter((c) => c.status === 200).length,
    results: results.sort((a, b) => a.label.localeCompare(b.label)),
    cleanup,
  };
  mkdirSync("load-logs", { recursive: true });
  writeFileSync(RESULTS_PATH, JSON.stringify(summary, null, 2));
  console.log(
    `[conc] N=${N} dispatched=${summary.dispatched}/${N} ready=${summary.ready}/${N} ` +
      `videoOk=${summary.videoOk}/${N} failed=${summary.failed} stuck=${summary.stuck} ` +
      `creditsCharged=${summary.creditsCharged} -> wrote ${RESULTS_PATH}`,
  );
});

test(`concurrent load N=${N} (${STORIES} story + ${CHARS} character, AI-Images)`, async ({ browser }) => {
  test.setTimeout(PREP_TIMEOUT + RENDER_TIMEOUT + 20 * 60_000);

  // Sample credits before.
  {
    const ctx = await browser.newContext({ storageState: STATE });
    const p = await ctx.newPage();
    creditsBefore = await readCredits(p);
    await ctx.close();
    console.log(`[conc] credits before = ${creditsBefore}`);
  }

  // Build N contexts and fire all create flows concurrently.
  const tasks: Promise<void>[] = [];
  for (let i = 0; i < STORIES; i++) {
    const c = await browser.newContext({ storageState: STATE });
    contexts.push(c);
    tasks.push(runStory(c, i + 1));
  }
  for (let i = 0; i < CHARS; i++) {
    const c = await browser.newContext({ storageState: STATE });
    contexts.push(c);
    tasks.push(runCharacter(c, i + 1));
  }
  await Promise.all(tasks);

  // Sample credits after.
  {
    const ctx = await browser.newContext({ storageState: STATE });
    const p = await ctx.newPage();
    creditsAfter = await readCredits(p);
    await ctx.close();
    console.log(`[conc] credits after = ${creditsAfter}`);
  }

  const dispatched = results.filter((r) => r.dispatchOk).length;
  console.log(`[conc] N=${N} dispatched=${dispatched}/${N}`);
  // The go/no-go gate is dispatch. Completion is recorded (not hard-asserted) so
  // a stuck render under load still produces a full results file + cleanup.
  expect(dispatched, `all ${N} contexts should dispatch a ContentItem`).toBe(N);
});
