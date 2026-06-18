import Link from "next/link";
import { PLAN_MONTHLY_CREDITS } from "@/lib/credits/config";
import { startSubscriptionCheckout } from "@/app/actions/checkout";

// Three real tiers from config.ts / PLAN_FEATURES. Credit counts come from
// PLAN_MONTHLY_CREDITS so they stay in sync. Display prices mirror the Lemon
// Squeezy variants (Creator 1771372 = $24.99, Pro 1771393 = $59.99); LS is the
// source of truth for the actual charge.
const plans = [
  {
    name: "Free",
    plan: "free" as const,
    price: "$0",
    period: "forever",
    // Output estimate: a standard video or a typical post runs ~5–10 credits
    // (see config.ts: smart_mix/stock 5, ai_story/argument 10, single AI post 10,
    // free template/text posts 5). 30 credits ÷ 10 = 3, ÷ 5 = 6.
    outputs: "≈ 3–6 short videos or posts / month",
    features: [
      `${PLAN_MONTHLY_CREDITS.free} credits / month`,
      "720p video, watermarked",
      "Standard formats",
      "No animated AI video",
    ],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Creator",
    plan: "creator" as const,
    price: "$24.99",
    period: "/mo",
    outputs: "≈ 60–120 short videos or posts / month", // 600 credits ÷ 10–5
    features: [
      `${PLAN_MONTHLY_CREDITS.creator.toLocaleString()} credits / month`,
      "1080p, no watermark",
      "All standard formats",
    ],
    cta: "Choose Creator",
    highlighted: true,
    badge: "Most popular",
  },
  {
    name: "Pro",
    plan: "pro" as const,
    price: "$59.99",
    period: "/mo",
    outputs: "≈ 200–400 short videos or posts / month", // 2000 credits ÷ 10–5 (standard; animated AI costs more)
    features: [
      `${PLAN_MONTHLY_CREDITS.pro.toLocaleString()} credits / month`,
      "Animated AI video",
      "Priority rendering",
      "Commercial license",
      "1080p, no watermark",
    ],
    cta: "Choose Pro",
    highlighted: false,
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-surface-container-low px-6">
      <div className="mx-auto max-w-screen-xl">
        <h2 className="font-headline font-bold text-4xl text-center mb-3">
          Simple, credit-based pricing
        </h2>
        <p className="text-center text-on-surface-variant mb-16 max-w-2xl mx-auto">
          One monthly pool of credits, shared across videos and posts. What a
          create costs depends on its format. Cancel anytime.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-surface-container-lowest p-8 rounded-[1rem] flex flex-col ${
                plan.highlighted
                  ? "border-2 border-primary relative shadow-2xl shadow-primary/10"
                  : ""
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1 rounded-full uppercase">
                  {plan.badge}
                </div>
              )}
              <h3
                className={`font-bold text-xl mb-2 ${
                  plan.highlighted ? "text-primary" : ""
                }`}
              >
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-on-surface-variant text-sm">{plan.period}</span>
              </div>
              <p className="text-sm font-semibold text-primary mb-6">{plan.outputs}</p>
              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className={`flex items-center gap-2 text-sm ${
                      plan.highlighted ? "font-semibold" : ""
                    }`}
                  >
                    <span className="material-symbols-outlined text-primary text-lg">
                      check
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {plan.plan === "free" ? (
                <Link
                  href="/signup"
                  className="w-full py-3 rounded-md font-bold transition-all block text-center bg-surface-container-highest hover:bg-surface-variant"
                >
                  {plan.cta}
                </Link>
              ) : (
                <form action={startSubscriptionCheckout}>
                  <input type="hidden" name="plan" value={plan.plan} />
                  <button
                    type="submit"
                    className={`w-full py-3 rounded-md font-bold transition-all block text-center ${
                      plan.highlighted
                        ? "primary-gradient text-white hover:opacity-90"
                        : "bg-surface-container-highest hover:bg-surface-variant"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
