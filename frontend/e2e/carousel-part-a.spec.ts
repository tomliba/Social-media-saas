import { test, expect } from "@playwright/test";

/**
 * Hermetic regression for the Part A carousel bugs on /create/ai-carousel.
 * Runs against a LOCAL dev server with a minted session and STUBS
 * /api/credits/balance (free plan), so it never reads/writes the real ledger
 * and clicks no paid action. Two guards:
 *
 *  A1 — no "opens then jumps" flash: while the plan loads, a skeleton shows,
 *       never the input form (which used to paint then get swapped for the gate).
 *  A2 — the "Use the free HTML carousel" fallback link reaches the carousel
 *       builder (/create/templates?format=carousel), not the video picker.
 */

const FREE_BALANCE = JSON.stringify({
  plan: "free",
  entitledPlan: "free",
  balance: 100,
  subscriptionStatus: null,
});

// Keep the first-use niche modal and other prefs reads out of the way.
async function stubPrefs(page: import("@playwright/test").Page) {
  await page.route("**/api/preferences", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ characterNiche: "fitness" }) }),
  );
}

test("A1: free user sees a skeleton then the gate, never the input form (no flash)", async ({ page }) => {
  await stubPrefs(page);
  // Delay the balance so the loading window is observable.
  await page.route("**/api/credits/balance", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.fulfill({ status: 200, contentType: "application/json", body: FREE_BALANCE });
  });

  await page.goto("/create/ai-carousel", { waitUntil: "domcontentloaded" });

  // During load: skeleton visible, input form NOT painted.
  await expect(page.locator("section[aria-hidden='true'] .shimmer").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Plan my carousel/i })).toHaveCount(0);

  // After the plan resolves: the gate appears and the form was never shown.
  await expect(page.getByRole("heading", { name: /Image carousels are a Creator feature/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Plan my carousel/i })).toHaveCount(0);
});

test("A2: free-HTML fallback link reaches the carousel builder, not the video picker", async ({ page }) => {
  await stubPrefs(page);
  await page.route("**/api/credits/balance", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: FREE_BALANCE }),
  );

  await page.goto("/create/ai-carousel", { waitUntil: "domcontentloaded" });

  const fallback = page.getByRole("link", { name: /Use the free HTML carousel/i });
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveAttribute("href", "/create/templates?format=carousel");

  await fallback.click();
  await expect(page).toHaveURL(/\/create\/templates\?format=carousel/);

  // The carousel builder ("Choose a layout"), NOT the video picker ("Pick a style").
  await expect(page.getByRole("heading", { name: /Choose a layout/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Pick a style$/i })).toHaveCount(0);
});
