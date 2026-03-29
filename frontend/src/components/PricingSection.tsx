import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    features: ["3 videos /mo", "Basic templates", "Watermarked"],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Hobby",
    price: "$12",
    features: ["15 videos /mo", "No watermarks", "All formats"],
    cta: "Select Plan",
    highlighted: false,
  },
  {
    name: "Creator",
    price: "$24",
    features: [
      "Unlimited videos",
      "Custom AI characters",
      "Priority rendering",
      "Multi-brand support",
    ],
    cta: "Go Unlimited",
    highlighted: true,
    badge: "Most popular",
  },
  {
    name: "Agency",
    price: "$49",
    features: ["5 team seats", "Shared library", "Dedicated manager"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-surface-container-low px-6">
      <div className="mx-auto max-w-screen-2xl">
        <h2 className="font-headline font-bold text-4xl text-center mb-16">
          Simple pricing for serious scale
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-on-surface-variant text-sm">/mo</span>
              </div>
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
              <Link
                href="/signup"
                className={`w-full py-3 rounded-md font-bold transition-all block text-center ${
                  plan.highlighted
                    ? "primary-gradient text-white hover:opacity-90"
                    : "bg-surface-container-highest hover:bg-surface-variant"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
