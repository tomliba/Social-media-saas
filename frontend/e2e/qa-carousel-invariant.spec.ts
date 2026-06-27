import { test, expect } from "@playwright/test";
import { postCost } from "../src/lib/credits/config";

/**
 * QA invariant (CHEAP / CI-safe): AI Carousel "charge == quote".
 *
 * Guards the fix in ai-carousel/page.tsx where the CostBadge is computed from
 * `chargedSlides = Math.min(slideCount, plannedSlides.length)` and the planner
 * output is clamped to the requested slideCount. The credits CHARGED must never
 * exceed the credits SHOWN, and must equal Math.min(slider, plannerReturned).
 *
 * This spec spends ZERO credits and needs NO Creator/Pro plan and NO real
 * generation. Everything that would cost money or require entitlement is
 * intercepted at the network boundary:
 *   - GET /api/credits/balance  -> stubbed as a Pro account (so the input UI,
 *     not the Creator-plan gate, renders — usePlan() reads this endpoint).
 *   - POST /api/ai-carousel/plan -> stubbed to return a CHOSEN number of slides
 *     (more or fewer than requested) to simulate planner divergence.
 *   - POST /api/ai-carousel/generate-slide -> aborted (must never be reached).
 *   - The chargePost() server action (POST to the page URL with a `next-action`
 *     header) -> the `slides` value is captured from the request body, then the
 *     request is ABORTED so no real deduction happens.
 *
 * Auth/session is the same minted-storageState approach as the other e2e specs
 * (see e2e/global-setup.ts) — no new auth here.
 *
 * Tagged @invariant so it runs in the normal suite and is selectable; it is NOT
 * part of the @expensive real-generation or billing groups.
 */

// Default carousel (no ?style param) is the infographic format at 15 credits/slide.
const FORMAT = "carousel_infographic" as const;

interface InvariantCase {
  name: string;
  sliderValue: number;   // what the user requests on the slider (= what the badge quotes)
  plannerCount: number;  // how many slides the (mocked) planner returns
}

// Parameterized: one case where the planner returns MORE than requested (the
// exact divergence the clamp guards against) and one where it returns FEWER
// (must undercharge to what was produced, never overcharge above the quote).
const CASES: InvariantCase[] = [
  { name: "planner returns MORE than requested (slider=5, planner=8 -> charge 5)", sliderValue: 5, plannerCount: 8 },
  { name: "planner returns FEWER than requested (slider=10, planner=6 -> charge 6)", sliderValue: 10, plannerCount: 6 },
];

function mockPlan(n: number) {
  return {
    slides: Array.from({ length: n }, (_, i) => ({
      number: i + 1,
      type: "content",
      title: `Mock slide ${i + 1}`,
      prompt: `Mock prompt ${i + 1}`,
    })),
  };
}

/** Parse the integer credits value out of a CostBadge ("… 75 credits"). */
function creditsFromBadgeText(text: string): number {
  const m = text.match(/([\d,]+)\s*credits?/i);
  if (!m) throw new Error(`Could not parse credits from badge text: ${JSON.stringify(text)}`);
  return Number(m[1].replace(/,/g, ""));
}

for (const c of CASES) {
  test(`@invariant ai-carousel: charge == quote — ${c.name}`, async ({ page }) => {
    test.setTimeout(60_000);

    const expectedCharge = Math.min(c.sliderValue, c.plannerCount);

    // ── Capture handle for the intercepted charge ──
    let capturedChargeSlides: number | null = null;
    let chargeBodySeen = "";
    let resolveCharge!: () => void;
    const chargeCaptured = new Promise<void>((r) => (resolveCharge = r));

    let generateSlideCalls = 0;

    // 1) usePlan() source — pretend we're Pro so the input UI (slider + badge)
    //    renders instead of the Free-tier gate. Generous balance so no UI banner.
    await page.route("**/api/credits/balance", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ plan: "pro", entitledPlan: "pro", balance: 1_000_000 }),
      })
    );

    // 2) Planner — return the chosen slide count (no real LLM call).
    await page.route("**/api/ai-carousel/plan", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockPlan(c.plannerCount)),
      })
    );

    // 3) Real image generation must never be reached (charge is aborted first).
    await page.route("**/api/ai-carousel/generate-slide", (route) => {
      generateSlideCalls += 1;
      return route.abort("failed");
    });

    // 4) The chargePost() server action posts to the page URL with a
    //    `next-action` header. Capture the `slides` it would charge, then abort
    //    so nothing is actually deducted. Let every other request pass through.
    await page.route("**/create/ai-carousel", async (route) => {
      const req = route.request();
      if (req.method() === "POST") {
        const headers = await req.allHeaders();
        const body = req.postData() ?? req.postDataBuffer()?.toString("utf8") ?? "";
        const isChargeAction =
          "next-action" in headers && /carousel/i.test(body) && /"slides"\s*:\s*\d+/.test(body);
        if (isChargeAction) {
          chargeBodySeen = body;
          const m = body.match(/"slides"\s*:\s*(\d+)/);
          capturedChargeSlides = m ? Number(m[1]) : null;
          resolveCharge();
          await route.abort("failed");
          return;
        }
      }
      await route.continue();
    });

    // ── Open the create flow ──
    await page.goto("/create/ai-carousel", { waitUntil: "domcontentloaded" });

    // Input UI must render (NOT the Creator gate). Fail loudly if the plan stub
    // didn't take and we got gated.
    const topic = page.getByPlaceholder(/How blockchain actually works/i);
    const gate = page.getByText(/Image carousels are a Creator feature/i);
    await Promise.race([
      topic.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {}),
      gate.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {}),
    ]);
    if (await gate.isVisible().catch(() => false)) {
      throw new Error("Got the Creator gate — /api/credits/balance stub did not take.");
    }
    await expect(topic, "input UI should render with the Pro stub").toBeVisible();

    await topic.fill("Why the sky is blue");

    // ── Set the slider to the requested value ──
    const slider = page.locator('input[type="range"]');
    await slider.focus();
    await slider.press("Home"); // -> min (3)
    for (let v = 3; v < c.sliderValue; v++) await slider.press("ArrowRight");
    await expect(
      page.getByText(new RegExp(`Number of slides:\\s*${c.sliderValue}\\b`, "i")),
      `slider should read ${c.sliderValue}`
    ).toBeVisible();

    // ── Read the credits the badge SHOWS at the create step ──
    const badge = page.locator('[title="Credit cost for this generation"]').first();
    await expect(badge).toBeVisible();
    const badgeCredits = creditsFromBadgeText((await badge.innerText()).trim());
    console.log(`[invariant] slider=${c.sliderValue} planner=${c.plannerCount} badge=${badgeCredits} credits`);

    // Sanity: the badge quotes the requested slideCount.
    expect(badgeCredits, "badge must quote the requested slide count").toBe(
      postCost(FORMAT, { slides: c.sliderValue })
    );

    // ── Plan -> review ──
    await page.getByRole("button", { name: /Plan my carousel/i }).click();
    await expect(
      page.getByRole("heading", { name: /Your carousel plan/i }),
      "review-plan step should render"
    ).toBeVisible({ timeout: 20_000 });

    // ── Approve & Generate fires chargePost() first; we capture and abort it ──
    await page.getByRole("button", { name: /Approve & Generate/i }).click();
    await Promise.race([
      chargeCaptured,
      new Promise<void>((_, rej) => setTimeout(() => rej(new Error("charge action never fired")), 20_000)),
    ]);

    console.log(
      `[invariant] charged slides=${capturedChargeSlides} (expected ${expectedCharge}); ` +
        `charge credits=${capturedChargeSlides == null ? "?" : postCost(FORMAT, { slides: capturedChargeSlides })}; ` +
        `body~=${chargeBodySeen.slice(0, 120)}`
    );

    // ── THE INVARIANT ──
    expect(capturedChargeSlides, "charge request must carry a slides count").not.toBeNull();

    // Charged count is exactly Math.min(slider, plannerReturned).
    expect(capturedChargeSlides, "charge slides must equal min(slider, plannerReturned)").toBe(expectedCharge);

    // Never charge more credits than the badge displayed.
    const chargedCredits = postCost(FORMAT, { slides: capturedChargeSlides! });
    expect(chargedCredits, "charged credits must never exceed the quoted badge credits").toBeLessThanOrEqual(
      badgeCredits
    );

    // When the planner returned >= requested, charge must EQUAL the quote exactly.
    if (c.plannerCount >= c.sliderValue) {
      expect(capturedChargeSlides, "with enough planned slides, charge == requested").toBe(c.sliderValue);
      expect(chargedCredits, "with enough planned slides, charged credits == badge credits").toBe(badgeCredits);
    }

    // No real generation happened.
    expect(generateSlideCalls, "real slide generation must never be reached").toBe(0);

    console.log(`[invariant] PASS — ${c.name}`);
  });
}
