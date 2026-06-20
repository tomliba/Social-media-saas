/**
 * Hermetic regression test for the user-chosen niche behavior.
 *
 * Runs against a local dev server (see playwright.niche.config.ts) and STUBS
 * /api/preferences in the browser to simulate "no saved niche" vs "saved niche".
 * It never reads or writes the real account's niche and makes no DB changes.
 *
 * Guards (the 11 checks from the feature's verification):
 *  - empty niche -> first-use modal shows on /create; saved niche -> it does not
 *  - the default niche is empty (not "health and wellness")
 *  - empty niche -> Generate disabled + "enter your niche first" nudge; filling
 *    the niche enables it and clears the nudge (on the flows that require it)
 *  - a saved niche pre-fills the niche field in all four create flows
 */
import { test, expect, type Page } from "@playwright/test";

const SAVED = "personal finance";

// Control niche state entirely in the browser — no real-account read, no DB
// write. Must be installed before the page navigates (usePreferenceDefaults
// fetches /api/preferences once on mount).
async function stubNiche(page: Page, characterNiche: string | null) {
  await page.route("**/api/preferences", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ prefs: { characterNiche } }),
    })
  );
}

async function gotoAuthed(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    throw new Error(
      `Session not accepted (redirected to /login at ${url}). Check AUTH_SECRET in .env.test.`
    );
  }
}

// The niche <input> is the first input after the "Your niche" label in every flow.
const nicheInput = (page: Page) =>
  page.locator('label:has-text("Your niche")').first().locator("xpath=following::input[1]");

const modalHeading = (page: Page) =>
  page.getByRole("heading", { name: /what's your niche\?/i });

test.describe("user-chosen niche", () => {
  test("empty niche -> first-use modal SHOWS on /create", async ({ page }) => {
    await stubNiche(page, null);
    await gotoAuthed(page, "/create");
    await expect(modalHeading(page)).toBeVisible();
  });

  test("saved niche -> first-use modal does NOT show", async ({ page }) => {
    await stubNiche(page, SAVED);
    await gotoAuthed(page, "/create");
    // Page is up...
    await expect(page.getByRole("heading", { name: /what's the format\?/i })).toBeVisible();
    // ...and the modal never appears.
    await expect(modalHeading(page)).toHaveCount(0);
  });

  test("default niche is empty, not 'health and wellness'", async ({ page }) => {
    await stubNiche(page, null);
    await gotoAuthed(page, "/create/templates?format=text");
    await expect(nicheInput(page)).toHaveValue("");
  });

  test("empty niche gates Generate with a nudge; filling it enables (text flow)", async ({ page }) => {
    await stubNiche(page, null);
    await gotoAuthed(page, "/create/templates?format=text");
    const generate = page.getByRole("button", { name: /generate 10 text posts/i });
    // Fill the topic so the empty niche is the only thing blocking Generate.
    await page.getByPlaceholder(/morning routines|productivity myths/i).fill("morning routines");

    await expect(generate).toBeDisabled();
    await expect(page.getByText(/enter your niche first/i)).toBeVisible();

    await nicheInput(page).fill(SAVED);

    await expect(page.getByText(/enter your niche first/i)).toHaveCount(0);
    await expect(generate).toBeEnabled();
  });

  test("empty niche gates the templates 'Generate viral ideas' button", async ({ page }) => {
    await stubNiche(page, null);
    await gotoAuthed(page, "/create/templates?format=video");
    await expect(page.getByRole("button", { name: /generate viral ideas/i })).toBeDisabled();
    await expect(page.getByText(/enter your niche first/i)).toBeVisible();
  });

  // Saved niche pre-fills the niche field in all four create flows.
  for (const [label, url] of [
    ["video-setup (Character)", "/create/video-setup?style=character"],
    ["templates", "/create/templates?format=video"],
    ["skeleton", "/create/skeleton"],
    ["argument", "/create/argument"],
  ] as const) {
    test(`saved niche pre-fills the ${label} flow`, async ({ page }) => {
      await stubNiche(page, SAVED);
      await gotoAuthed(page, url);
      await expect(nicheInput(page)).toHaveValue(SAVED);
    });
  }
});
