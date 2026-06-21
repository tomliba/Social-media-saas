/**
 * Hermetic Playwright WIRING guard for AI-Story billing.
 *
 * Runs against a local dev server (see playwright.billing.config.ts) and STUBS the
 * AI-Story generation routes in the browser, so it NEVER charges real credits and
 * makes NO writes to the real account/ledger. It asserts the browser-observable
 * wiring that connects the UI to the server-side charge gate:
 *
 *   1. Clicking Generate triggers the charge route (/api/generate-scene-images) at
 *      the FIRST scene-image step, keyed on the story's vg_job_id (the base charge
 *      lands there, server-side — not at Export). This catches a "UI unwired from
 *      billing" regression that the route-level test can't see.
 *   2. A 402 from that route surfaces the InsufficientCreditsDialog.
 *
 * The actual charge/idempotency/regen-cap MATH is covered hermetically by
 * src/lib/credits/__tests__/generate-gate.test.ts (`npm run test:billing`); a
 * browser test can't exercise it without writing to the real shared ledger.
 */
import { test, expect, type Page } from "@playwright/test";

const VG = "test-vg-aistory-billing";

// Canned script so the client proceeds to scene-image generation without hitting
// the real LLM. handleGenerate needs scenes[] + vg_job_id; getImagePrompt reads
// scene.image_prompt.
const STORY = {
  script_data: {
    vg_job_id: VG,
    hook: "A door creaks in the dark.",
    cta: "Follow for more.",
    hook_image_prompt: "haunted house exterior at night",
    cta_image_prompt: "full moon over a forest",
    hook_motion_prompt: "",
    cta_motion_prompt: "",
    scenes: [
      { text: "Scene one.", image_prompt: "a dark hallway", motion_prompt: "" },
      { text: "Scene two.", image_prompt: "a creaking door", motion_prompt: "" },
    ],
  },
};

// Stub the on-load + script routes so nothing touches the real account: a saved
// niche (so Generate isn't niche-gated) and a canned story (no real LLM call).
async function stubCommon(page: Page) {
  await page.route("**/api/preferences", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ prefs: { characterNiche: "finance" } }) })
  );
  await page.route("**/api/generate-story", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STORY) })
  );
}

async function gotoAuthed(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    throw new Error(`Session not accepted (redirected to /login at ${url}). Check AUTH_SECRET in .env.test.`);
  }
}

const generateBtn = (page: Page) => page.getByRole("button", { name: /Generate story ideas/i });

test.describe("AI Story billing wiring", () => {
  test("Generate triggers the charge route at the first scene image, keyed on vg_job_id", async ({ page }) => {
    await stubCommon(page);
    await page.route("**/api/generate-scene-images", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          image_urls: ["https://pub.r2.dev/s1.png", "https://pub.r2.dev/s2.png"],
          hook_image_url: "https://pub.r2.dev/h.png",
          cta_image_url: "https://pub.r2.dev/c.png",
        }),
      })
    );

    await gotoAuthed(page, "/create/video-setup?style=ai-story");

    // Clicking Generate must hit the charge route (where the base debit happens
    // server-side), carrying the vg_job_id the charge is keyed on.
    const [req] = await Promise.all([
      page.waitForRequest("**/api/generate-scene-images"),
      generateBtn(page).click(),
    ]);

    const body = req.postDataJSON();
    expect(body.vg_job_id).toBe(VG);
    expect(body.style).toBe("ai-story");
  });

  test("a 402 from the charge route surfaces the InsufficientCreditsDialog", async ({ page }) => {
    await stubCommon(page);
    await page.route("**/api/generate-scene-images", (route) =>
      route.fulfill({
        status: 402,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "insufficient_credits", needed: 8, balance: 2 }),
      })
    );

    await gotoAuthed(page, "/create/video-setup?style=ai-story");
    await generateBtn(page).click();

    await expect(page.getByRole("heading", { name: /out of credits/i })).toBeVisible();
    // The 402's needed/balance propagate into the dialog copy (unique to the dialog,
    // unlike the "8 credits" cost badge elsewhere on the page).
    await expect(page.getByText(/you need\s*8\s*credits but have\s*2/i)).toBeVisible();
  });
});
