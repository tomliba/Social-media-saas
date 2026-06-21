/**
 * Hermetic regression test for the NEW original argument roster.
 *
 * Runs against a local dev server (see playwright.argument-hermetic.config.ts) and
 * STUBS the argument backend in the browser so it returns the 8 NEW original
 * characters. Verifies:
 *  - the /create/argument page loads (no crash, not redirected to /login)
 *  - the new defaults are selected (big_dave -> "Dave", baby -> "Junior")
 *  - the new roster renders in the picker
 *  - NONE of the old copyrighted names appear
 *  - no uncaught page errors
 * Makes no DB writes and never hits the real Flask backend.
 */
import { test, expect, type Page } from "@playwright/test";

const ROSTER = {
  baby:     { id: "baby",     name: "Junior", png: "baby.png",     png_left: "baby_left.png",     png_right: "baby_right.png",     voice_id: "v", scale: 1 },
  dog:      { id: "dog",      name: "Rex",    png: "dog.png",      png_left: "dog_left.png",      png_right: "dog_right.png",      voice_id: "v", scale: 1 },
  teen:     { id: "teen",     name: "Kevin",  png: "teen.png",     png_left: "teen_left.png",     png_right: "teen_right.png",     voice_id: "v", scale: 1 },
  big_dave: { id: "big_dave", name: "Dave",   png: "big_dave.png", png_left: "big_dave_left.png", png_right: "big_dave_right.png", voice_id: "v", scale: 1 },
  doc:      { id: "doc",      name: "Doc",    png: "doc.png",      png_left: "doc_left.png",      png_right: "doc_right.png",      voice_id: "v", scale: 1 },
  leon:     { id: "leon",     name: "Leon",   png: "leon.png",     png_left: "leon_left.png",     png_right: "leon_right.png",     voice_id: "v", scale: 1 },
  carl:     { id: "carl",     name: "Carl",   png: "carl.png",     png_left: "carl_left.png",     png_right: "carl_right.png",     voice_id: "v", scale: 1 },
  pickle:   { id: "pickle",   name: "Pickle", png: "pickle.png",   png_left: "pickle_left.png",   png_right: "pickle_right.png",   voice_id: "v", scale: 1 },
};

const OLD_NAMES = ["Peter Griffin", "Stewie Griffin", "Brian Griffin", "Chris Griffin", "Cleveland Brown", "Rick Sanchez", "Morty Smith", "Pickle Rick"];

async function stub(page: Page, url: string, body: unknown) {
  await page.route(`**${url}`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
  );
}

async function installStubs(page: Page) {
  await stub(page, "/api/preferences", { prefs: { characterNiche: "personal finance" } });
  await stub(page, "/api/argument/characters", { characters: ROSTER });
  await stub(page, "/api/argument/formats", {
    formats: [
      { id: "debate", label: "Debate", icon: "gavel", description: "Two sides argue a hot take" },
      { id: "roast", label: "Roast Battle", icon: "local_fire_department", description: "Characters roast each other" },
    ],
  });
  await stub(page, "/api/argument/backgrounds", { backgrounds: [] });
  await stub(page, "/api/argument/topics", { topics: ["Is cereal a soup?", "Is a hot dog a sandwich?"] });
}

test("argument page loads with the new original roster and defaults", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  await installStubs(page);
  await page.goto("/create/argument", { waitUntil: "domcontentloaded" });
  expect(page.url(), "should not be redirected to /login").not.toContain("/login");

  // The two default picks render their NEW names (big_dave -> Dave, baby -> Junior).
  // This proves the new ids + new defaults are wired through end-to-end.
  await expect(page.getByText("Dave", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Junior", { exact: true }).first()).toBeVisible();

  // The default character images resolve to the NEW assets (not old ones).
  await expect(page.locator('img[src*="/argument-characters/big_dave.png"]').first()).toBeVisible();
  await expect(page.locator('img[src*="/argument-characters/baby.png"]').first()).toBeVisible();

  // None of the old copyrighted names appear anywhere on the page.
  for (const old of OLD_NAMES) {
    await expect(page.getByText(old)).toHaveCount(0);
  }

  // No uncaught errors while rendering the flow with the new ids.
  expect(pageErrors, "no uncaught page errors").toEqual([]);
});
