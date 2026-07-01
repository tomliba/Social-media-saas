import { test, expect } from "@playwright/test";

/**
 * Regression: the credit CostBadge must be visible on the FIRST (input) step of
 * the ad-creative and meme-ad flows — including the shortcut path where a
 * concept/template is preselected via URL (?concept= / ?template=, e.g. arriving
 * from the Create hub) and the picker step is skipped, so Generate appears right
 * on the input step. That path previously showed no price. No Generate is
 * clicked, so nothing is charged.
 */

test("ad-creative: input step shows the 15-credit badge (preselected concept)", async ({ page }) => {
  await page.goto("/create/ad-creative?concept=control_room", { waitUntil: "domcontentloaded" });

  // Still on the input step (picker skipped because a concept is preselected).
  await expect(page.getByRole("heading", { name: /What are you advertising\?/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Generate/i })).toBeVisible();

  // The badge is present on this step.
  await expect(page.getByText(/15 credits/i).first()).toBeVisible();
});

test("ad-creative: input step shows the badge without any preselection", async ({ page }) => {
  await page.goto("/create/ad-creative", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /What are you advertising\?/i })).toBeVisible();
  await expect(page.getByText(/15 credits/i).first()).toBeVisible();
});

test("meme-ad: input step shows the 15-credit badge (preselected template)", async ({ page }) => {
  await page.goto("/create/meme-ad?template=reject_approve", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Tell us about your product/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Generate/i })).toBeVisible();
  await expect(page.getByText(/15 credits/i).first()).toBeVisible();
});
