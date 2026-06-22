import { test, expect } from "@playwright/test";

/**
 * Hermetic regression proof for the three Creator-mode bug fixes.
 *
 * Bug 1 (animated charge leak): the animated-character review step is Pro-gated
 *   server-side. When the scene-image route returns 403 plan_not_allowed, the
 *   page must show the upgrade screen (gated → defined state), not silently fail.
 * Bug 2 (dead carousel layout buttons): every carousel layout button must reach a
 *   defined state, and "Hand-Drawn (Mono)" must actually deliver the Mono layout
 *   (previously it collided with Color's route).
 *
 * Stubs all network so it makes no DB/render/provider calls. Auth via niche.setup.
 */

// ── Bug 1 (button gate): the animated video-format option is the first line of
//    defense — PRO badge + locked for ineligible tiers, click opens the upgrade
//    screen and never starts generation. The server 403 stays as the backstop. ──
test("Bug 1: animated bg-mode option is PRO-locked; click opens upgrade, no generate call", async ({ page }) => {
  await page.route("**/api/credits/balance", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ plan: "creator", entitledPlan: "creator", balance: 5000 }) }));
  await page.route("**/api/preferences", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) }));

  // If the generate endpoint is ever hit, the gate failed.
  let generateCalled = false;
  await page.route("**/api/character-review/generate-scene-images", (r) => { generateCalled = true; return r.abort(); });

  await page.goto("/create/video-setup", { waitUntil: "networkidle" });

  // Open the background-mode dropdown (the pill shows the default "Smart Mix").
  await page.getByRole("button", { name: /Smart Mix/i }).first().click();

  // The "Animated AI" option is locked for an ineligible tier: PRO badge + upgrade
  // copy + aria-disabled (visually locked).
  const animated = page.getByRole("button", { name: /Animated AI/i }).first();
  await expect(animated).toContainText(/Pro/);
  await expect(animated).toContainText(/Upgrade to Pro/i);
  await expect(animated).toHaveAttribute("aria-disabled", "true");

  // It's aria-disabled (looks locked) but still upsells on click — force past
  // Playwright's actionability check, as a real click would fire. It opens an
  // IN-APP upgrade modal (does NOT navigate away to /pricing) and never generates.
  await animated.click({ force: true });
  await expect(page.getByRole("heading", { name: /Pro feature/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Upgrade to Pro/i })).toBeVisible();
  await expect(page).toHaveURL(/\/create\/video-setup/); // stayed inside the app
  expect(generateCalled).toBe(false);
});

// ── Bug 2: carousel layout buttons all reach a defined state ──
test("Bug 2: every carousel layout button reaches a defined state (mono delivers mono)", async ({ page }) => {
  const URL = "/create/templates?format=carousel";

  // HTML template → advances the in-page flow to the theme step.
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^\s*Editorial/i }).first().click();
  await expect(page.getByRole("heading", { name: /Pick a color theme/i })).toBeVisible();

  // AI Infographic → navigates to the AI carousel generator.
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^\s*AI Infographic/i }).first().click();
  await expect(page).toHaveURL(/\/create\/ai-carousel(\?|$)/);

  // Hand-Drawn (Color) → delivers the Color variant.
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^\s*Hand-Drawn .Color/i }).first().click();
  await expect(page).toHaveURL(/draw=color/);
  await expect(page.getByRole("button", { name: /^\s*Color/i }).first()).toContainText(/check/i);

  // Hand-Drawn (Mono) → delivers the Mono variant (the bug: it used to land on Color).
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^\s*Hand-Drawn .Mono/i }).first().click();
  await expect(page).toHaveURL(/draw=mono/);
  await expect(page.getByRole("button", { name: /^\s*Mono/i }).first()).toContainText(/check/i);
});

// ── Bug 1: ineligible tier is gated at the animated review step (upgrade screen) ──
test("Bug 1: animated-character review shows the upgrade screen when the gen route is gated", async ({ page }) => {
  // Seed the setup the review page reads from sessionStorage.
  await page.addInitScript(() => {
    sessionStorage.setItem("animated-character-setup", JSON.stringify({
      scripts: [{ title: "Test", script: "A short test script about productivity." }],
      template: "Standard", tone: "Funny", character: "Doctor", voice: "default",
      duration: "30s", speed: 1, backgroundMode: "Animated AI",
    }));
  });

  // Stub the script breakdown (cheap text) so the flow reaches the paid image step.
  await page.route("**/api/character-review/generate-script", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      vg_job_id: "stub-job", hook: "hook", cta: "cta",
      scenes: [{ text: "scene one", image_prompt: "a desk", motion_prompt: "" }],
    }) }),
  );
  // The paid scene-image step is Pro-gated server-side → 403 plan_not_allowed.
  await page.route("**/api/character-review/generate-scene-images", (route) =>
    route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({
      error: "plan_not_allowed", format: "animated_character",
    }) }),
  );

  await page.goto("/create/animated-character-review", { waitUntil: "domcontentloaded" });

  // Gated → a defined upgrade state, never a silent dead-end.
  await expect(page.getByRole("heading", { name: /Animated videos are a Pro feature/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Upgrade to Pro/i })).toBeVisible();
});
